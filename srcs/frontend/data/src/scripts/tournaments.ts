// import types from shared folder (mounted from backend/shared/with_front in Docker)
import type { Tournament, TournamentPlayer, TournamentMatch } from '../shared/types.js'
import { App } from './app'
import Router from './router'
import { I18n } from './i18n'
import { 
  LocalTournamentSystem, 
  type LocalTournament, 
  type LocalTournamentMatch, 
  type LocalTournamentPlayer 
} from './local-tournament'

// union type for both online and local tournaments
type AnyTournament = Tournament | LocalTournament;
type AnyMatch = TournamentMatch | LocalTournamentMatch;
type AnyPlayer = TournamentPlayer | LocalTournamentPlayer;

interface TournamentState {
  tournaments: {
    waiting: Tournament[]
    in_progress: Tournament[]
    finished: Tournament[]
  }
  localFinishedTournaments: LocalTournament[]  // Finished local tournaments
  currentTournament: AnyTournament | null
  currentLocalTournament: LocalTournament | null  // Active local tournament
  myPlayerId: string | null
  ws: WebSocket | null
  pendingLocalTournament: {
    name?: string
    maxPlayers: 2 | 4 | 8
  } | null
}

const state: TournamentState = {
  tournaments: {
    waiting: [],
    in_progress: [],
    finished: []
  },
  localFinishedTournaments: [],
  currentTournament: null,
  currentLocalTournament: null,
  myPlayerId: null,
  ws: null,
  pendingLocalTournament: null
}

// helper to check if tournament is local
function isLocalTournament(tournament: AnyTournament | null): tournament is LocalTournament {
  return tournament !== null && 'odIsLocal' in tournament && tournament.odIsLocal === true;
}

export const Tournaments = {
  
  // init the tournaments page
  init(): void {
    console.log('🏆 Tournaments module initialized')
    
    this.loadLocalFinishedTournaments()  // Load saved local tournaments
    this.connectWebSocket()
    this.setupEventListeners()
    this.fetchTournaments()
    
    // Check if we should restore a local tournament (after returning from a match)
    const localTournamentState = sessionStorage.getItem('local_tournament_state')
    const localTournamentResult = sessionStorage.getItem('local_tournament_result')
    
    if (localTournamentState && localTournamentResult) {
      try {
        const tournament = JSON.parse(localTournamentState) as LocalTournament
        const result = JSON.parse(localTournamentResult) as { matchId: string; score1: number; score2: number }
        
        console.log('🏠 Restoring local tournament after match')
        
        // Restore the tournament
        this.restoreLocalTournament(tournament)
        
        // Process the match result
        this.onLocalMatchEnd(result.matchId, result.score1, result.score2)
        
        // Clear session storage
        sessionStorage.removeItem('local_tournament_state')
        sessionStorage.removeItem('local_tournament_result')
        
        // Show the tournament detail view
        this.showDetailView()
        return
      } catch (e) {
        console.error('Failed to restore local tournament:', e)
        sessionStorage.removeItem('local_tournament_state')
        sessionStorage.removeItem('local_tournament_result')
      }
    }
    
    // Check if we should view a specific tournament (after returning from an online match)
    const tournamentToView = sessionStorage.getItem('view_tournament_after_match')
    if (tournamentToView) {
      sessionStorage.removeItem('view_tournament_after_match')
      // Wait a bit for tournaments to load, then view the specific tournament
      setTimeout(() => {
        this.viewTournament(tournamentToView)
      }, 500)
    }

    // Check if we should view a specific tournament (after accepting invite from chat)
    const selectedTournamentId = sessionStorage.getItem('selectedTournamentId')
    if (selectedTournamentId) {
      sessionStorage.removeItem('selectedTournamentId')
      // Wait for tournaments to load, then view the specific tournament
      setTimeout(() => {
        this.viewTournament(selectedTournamentId)
      }, 500)
    }
  },

  //
  // Cleanup when leaving page

  cleanup(): void {
    if (state.ws) {
      state.ws.close()
      state.ws = null
    }
    state.currentTournament = null
    state.currentLocalTournament = null
    state.myPlayerId = null
    state.pendingLocalTournament = null
  },

  //
  // Connect to tournament WebSocket for live updates

  connectWebSocket(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/tournament/ws`
    
    state.ws = new WebSocket(wsUrl)
    
    state.ws.onopen = () => {
      console.log('[Tournament WS] Connected')
    }
    
    state.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        this.handleWebSocketMessage(message)
      } catch (e) {
        console.error('[Tournament WS] Invalid message:', e)
      }
    }
    
    state.ws.onclose = () => {
      console.log('[Tournament WS] Disconnected')
      // Reconnect after delay
      setTimeout(() => {
        if (document.getElementById('tournaments-page')) {
          this.connectWebSocket()
        }
      }, 3000)
    }
    
    state.ws.onerror = (error) => {
      console.error('[Tournament WS] Error:', error)
    }
  },

  //
  // Handle WebSocket messages

  handleWebSocketMessage(message: { type: string; [key: string]: any }): void {
    console.log('[Tournament WS] Received message:', message.type)
    
    switch (message.type) {
      case 'tournaments_list':
        state.tournaments = message.tournaments
        this.renderTournamentLists()
        break
        
      case 'tournament_update':
        console.log('[Tournament WS] Tournament update:', message.tournament?.odId, 'players:', message.tournament?.odPlayers?.length)
        this.handleTournamentUpdate(message.tournament)
        break
        
      case 'tournament_deleted':
        this.handleTournamentDeleted(message.tournamentId)
        break
    }
  },

  //
  // Handle tournament update

  handleTournamentUpdate(tournament: Tournament): void {
    // Update in lists
    this.updateTournamentInLists(tournament)
    
    // If viewing this tournament, update the detail view
    if (state.currentTournament?.odId === tournament.odId) {
      state.currentTournament = tournament
      this.renderTournamentDetail()
    }
  },

  //
  // Update tournament in the appropriate list

  updateTournamentInLists(tournament: Tournament): void {
    // Remove from all lists first
    state.tournaments.waiting = state.tournaments.waiting.filter(t => t.odId !== tournament.odId)
    state.tournaments.in_progress = state.tournaments.in_progress.filter(t => t.odId !== tournament.odId)
    state.tournaments.finished = state.tournaments.finished.filter(t => t.odId !== tournament.odId)
    
    // Add to appropriate list
    switch (tournament.odStatus) {
      case 'waiting':
        state.tournaments.waiting.push(tournament)
        break
      case 'in_progress':
        state.tournaments.in_progress.push(tournament)
        break
      case 'finished':
        state.tournaments.finished.push(tournament)
        break
    }
    
    this.renderTournamentLists()
  },

  //
  // Handle tournament deletion

  handleTournamentDeleted(tournamentId: string): void {
    state.tournaments.waiting = state.tournaments.waiting.filter(t => t.odId !== tournamentId)
    state.tournaments.in_progress = state.tournaments.in_progress.filter(t => t.odId !== tournamentId)
    state.tournaments.finished = state.tournaments.finished.filter(t => t.odId !== tournamentId)
    
    this.renderTournamentLists()
    
    // If viewing this tournament, go back to list
    if (state.currentTournament?.odId === tournamentId) {
      state.currentTournament = null
      this.showListView()
      alert(I18n.translate('tournaments.alert_deleted'))
    }
  },

  //
  // Fetch tournaments from API

  async fetchTournaments(): Promise<void> {
    try {
      const response = await fetch('/api/tournament/list')
      if (response.ok) {
        state.tournaments = await response.json()
        this.renderTournamentLists()
      }
    } catch (error) {
      console.error('Failed to fetch tournaments:', error)
    }
  },

  //
  // Setup event listeners

  setupEventListeners(): void {
    // Create tournament button
    const createBtn = document.getElementById('btn-create-tournament')
    createBtn?.addEventListener('click', () => this.openCreateModal())
    
    // Close create modal
    const closeCreateModal = document.getElementById('close-create-modal')
    closeCreateModal?.addEventListener('click', () => this.closeCreateModal())
    
    // Create tournament form
    const createForm = document.getElementById('create-tournament-form') as HTMLFormElement
    createForm?.addEventListener('submit', (e) => this.handleCreateTournament(e))
    
    // Close join modal
    const closeJoinModal = document.getElementById('close-join-modal')
    closeJoinModal?.addEventListener('click', () => this.closeJoinModal())
    
    // Join tournament form
    const joinForm = document.getElementById('join-tournament-form') as HTMLFormElement
    joinForm?.addEventListener('submit', (e) => this.handleJoinTournament(e))
    
    // Back to list button
    const backBtn = document.getElementById('btn-back-to-list')
    backBtn?.addEventListener('click', () => this.showListView())
    
    // Close modals on outside click
    document.getElementById('create-tournament-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeCreateModal()
    })
    document.getElementById('join-tournament-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeJoinModal()
    })
    document.getElementById('local-aliases-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeAliasesModal()
    })
    
    // Local mode toggle - show/hide hint and alias section
    const modeInputs = document.querySelectorAll('input[name="tournament-mode"]') as NodeListOf<HTMLInputElement>
    modeInputs.forEach(input => {
      input.addEventListener('change', () => this.handleModeChange())
    })
    
    // Close aliases modal
    const closeAliasesModal = document.getElementById('close-aliases-modal')
    closeAliasesModal?.addEventListener('click', () => this.closeAliasesModal())
    
    // Local aliases form
    const aliasesForm = document.getElementById('local-aliases-form') as HTMLFormElement
    aliasesForm?.addEventListener('submit', (e) => this.handleCreateLocalTournament(e))
  },
  
  //
  // Handle tournament mode change (online/local)

  handleModeChange(): void {
    const modeInputs = document.querySelectorAll('input[name="tournament-mode"]') as NodeListOf<HTMLInputElement>
    let isLocal = false
    modeInputs.forEach(input => {
      if (input.checked && input.value === 'local') isLocal = true
    })
    
    const localHint = document.getElementById('local-mode-hint')
    const aliasSection = document.getElementById('creator-alias-section')
    
    if (isLocal) {
      localHint?.classList.remove('hidden')
      aliasSection?.classList.add('hidden') // Hide single alias for local mode
    } else {
      localHint?.classList.add('hidden')
      // Show alias section only if user is not logged in
      if (!App.me?.name) {
        aliasSection?.classList.remove('hidden')
      }
    }
  },

  //
  // Open create tournament modal

  openCreateModal(): void {
    const modal = document.getElementById('create-tournament-modal')
    const aliasInput = document.getElementById('creator-alias-input') as HTMLInputElement
    const aliasSection = document.getElementById('creator-alias-section')
    const localHint = document.getElementById('local-mode-hint')
    
    // Reset mode to online
    const onlineInput = document.querySelector('input[name="tournament-mode"][value="online"]') as HTMLInputElement
    if (onlineInput) onlineInput.checked = true
    localHint?.classList.add('hidden')
    
    // If user is logged in, pre-fill alias and hide the input
    if (App.me?.name) {
      aliasInput.value = App.me.name
      aliasSection?.classList.add('hidden')
    } else {
      aliasInput.value = ''
      aliasSection?.classList.remove('hidden')
    }
    
    modal?.classList.remove('hidden')
  },

  //
  // Close create tournament modal

  closeCreateModal(): void {
    const modal = document.getElementById('create-tournament-modal')
    modal?.classList.add('hidden')
  },
  
  //
  // Open aliases modal for local tournament

  openAliasesModal(maxPlayers: number, tournamentName?: string): void {
    const modal = document.getElementById('local-aliases-modal')
    const container = document.getElementById('aliases-inputs-container')
    
    if (!container) return
    
    // Store pending tournament info
    state.pendingLocalTournament = {
      name: tournamentName,
      maxPlayers: maxPlayers as 2 | 4 | 8
    }
    
    // Generate input fields for each player
    container.innerHTML = ''
    for (let i = 0; i < maxPlayers; i++) {
      const isCreator = i === 0 && App.me?.name
      const defaultValue = isCreator ? App.me?.name : ''
      
      const inputHtml = `
        <div class="flex items-center gap-3">
          <span class="text-neutral-400 w-24">${I18n.translate('tournaments.player')} ${i + 1}${isCreator ? ' 👑' : ''}</span>
          <input type="text" 
                 id="alias-input-${i}" 
                 class="flex-1 bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 ${isCreator ? 'border-blue-500/50' : ''}"
                 placeholder="${I18n.translate('tournaments.alias_placeholder')}"
                 value="${defaultValue || ''}"
                 maxlength="20"
                 required
                 ${isCreator ? 'readonly' : ''}>
        </div>
      `
      container.insertAdjacentHTML('beforeend', inputHtml)
    }
    
    modal?.classList.remove('hidden')
  },
  
  //
  // Close aliases modal

  closeAliasesModal(): void {
    const modal = document.getElementById('local-aliases-modal')
    modal?.classList.add('hidden')
    state.pendingLocalTournament = null
  },

  //
  // Open join tournament modal

  openJoinModal(tournamentId: string): void {
    const modal = document.getElementById('join-tournament-modal')
    const tournamentIdInput = document.getElementById('join-tournament-id') as HTMLInputElement
    const aliasInput = document.getElementById('join-alias-input') as HTMLInputElement
    
    tournamentIdInput.value = tournamentId
    
    // If user is logged in, pre-fill alias
    if (App.me?.name) {
      aliasInput.value = App.me.name
    } else {
      aliasInput.value = ''
    }
    
    modal?.classList.remove('hidden')
  },

  //
  // Close join tournament modal

  closeJoinModal(): void {
    const modal = document.getElementById('join-tournament-modal')
    modal?.classList.add('hidden')
  },

  //
  // Handle create tournament form submission

  async handleCreateTournament(e: Event): Promise<void> {
    e.preventDefault()
    
    const nameInput = document.getElementById('tournament-name-input') as HTMLInputElement
    const aliasInput = document.getElementById('creator-alias-input') as HTMLInputElement
    const playerCountInputs = document.querySelectorAll('input[name="player-count"]') as NodeListOf<HTMLInputElement>
    const modeInputs = document.querySelectorAll('input[name="tournament-mode"]') as NodeListOf<HTMLInputElement>
    
    let maxPlayers = 4
    playerCountInputs.forEach(input => {
      if (input.checked) maxPlayers = parseInt(input.value)
    })
    
    let isLocal = false
    modeInputs.forEach(input => {
      if (input.checked && input.value === 'local') isLocal = true
    })
    
    const tournamentName = nameInput.value.trim() || undefined
    
    // If local mode, open aliases modal instead
    if (isLocal) {
      this.closeCreateModal()
      this.openAliasesModal(maxPlayers, tournamentName)
      return
    }
    
    // Online mode - continue with existing logic
    const alias = aliasInput.value.trim() || App.me?.name
    if (!alias) {
      alert(I18n.translate('tournaments.alert_enter_alias'))
      return
    }
    
    try {
      const response = await fetch('/api/tournament/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxPlayers,
          creatorAlias: alias,
          creatorUserId: App.me?.id,
          name: tournamentName
        })
      })
      
      if (response.ok) {
        const tournament: Tournament = await response.json()
        state.myPlayerId = tournament.odCreatedBy.odId
        
        // Save player ID in session storage
        if (state.myPlayerId) {
          sessionStorage.setItem(`tournament_player_${tournament.odId}`, state.myPlayerId)
        }
        
        this.closeCreateModal()
        this.viewTournament(tournament.odId)
      } else {
        const error = await response.json()
        alert(error.error || I18n.translate('tournaments.alert_create_error'))
      }
    } catch (error) {
      console.error('Failed to create tournament:', error)
      alert(I18n.translate('tournaments.alert_connection_error'))
    }
  },
  
  //
  // Handle create local tournament (from aliases modal)

  handleCreateLocalTournament(e: Event): void {
    e.preventDefault()
    
    if (!state.pendingLocalTournament) {
      console.error('No pending local tournament')
      return
    }
    
    const { maxPlayers, name } = state.pendingLocalTournament
    
    // Collect all aliases
    const aliases: string[] = []
    for (let i = 0; i < maxPlayers; i++) {
      const input = document.getElementById(`alias-input-${i}`) as HTMLInputElement
      if (input) {
        aliases.push(input.value.trim())
      }
    }
    
    // Validate aliases
    const validation = LocalTournamentSystem.validateAliases(aliases)
    if (!validation.valid) {
      alert(validation.error || I18n.translate('tournaments.alert_invalid_aliases'))
      return
    }
    
    // Create local tournament
    const creatorAlias = App.me?.name || undefined
    const tournament = LocalTournamentSystem.createLocalTournament(
      maxPlayers,
      aliases,
      name,
      creatorAlias
    )
    
    // Store locally
    state.currentLocalTournament = tournament
    state.currentTournament = tournament
    state.myPlayerId = tournament.odPlayers[0]?.odId || null
    
    console.log('🏠 Local tournament created:', tournament.odId)
    
    this.closeAliasesModal()
    this.showDetailView()
    this.renderTournamentDetail()
  },

  //
  // Handle join tournament form submission

  async handleJoinTournament(e: Event): Promise<void> {
    e.preventDefault()
    
    const tournamentIdInput = document.getElementById('join-tournament-id') as HTMLInputElement
    const aliasInput = document.getElementById('join-alias-input') as HTMLInputElement
    
    const tournamentId = tournamentIdInput.value
    const alias = aliasInput.value.trim()
    
    if (!alias) {
      alert(I18n.translate('tournaments.alert_enter_alias'))
      return
    }
    
    try {
      const response = await fetch(`/api/tournament/${tournamentId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alias,
          userId: App.me?.id
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        state.myPlayerId = result.playerId
        
        // Save player ID in session storage
        if (state.myPlayerId) {
          sessionStorage.setItem(`tournament_player_${tournamentId}`, state.myPlayerId)
        }
        
        this.closeJoinModal()
        this.viewTournament(tournamentId)
      } else {
        const error = await response.json()
        alert(error.error || I18n.translate('tournaments.alert_join_error'))
      }
    } catch (error) {
      console.error('Failed to join tournament:', error)
      alert(I18n.translate('tournaments.alert_connection_error'))
    }
  },

  //
  // Join tournament directly (for logged in users)

  async joinTournamentDirect(tournamentId: string): Promise<void> {
    if (!App.me?.name) {
      this.openJoinModal(tournamentId)
      return
    }
    
    try {
      const response = await fetch(`/api/tournament/${tournamentId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alias: App.me.name,
          userId: App.me.id
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        state.myPlayerId = result.playerId
        if (state.myPlayerId) {
          sessionStorage.setItem(`tournament_player_${tournamentId}`, state.myPlayerId)
        }
        this.viewTournament(tournamentId)
      } else {
        const error = await response.json()
        if (error.error === 'This alias is already taken in this tournament') {
          this.openJoinModal(tournamentId)
        } else {
          alert(error.error || I18n.translate('tournaments.alert_join_error'))
        }
      }
    } catch (error) {
      console.error('Failed to join tournament:', error)
      alert(I18n.translate('tournaments.alert_connection_error'))
    }
  },

  //
  // Leave tournament

  async leaveTournament(tournamentId: string): Promise<void> {
    const playerId = sessionStorage.getItem(`tournament_player_${tournamentId}`)
    if (!playerId) {
      alert(I18n.translate('tournaments.alert_not_in_tournament'))
      return
    }
    
    if (!confirm(I18n.translate('tournaments.confirm_leave'))) {
      return
    }
    
    try {
      const response = await fetch(`/api/tournament/${tournamentId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      })
      
      if (response.ok) {
        sessionStorage.removeItem(`tournament_player_${tournamentId}`)
        state.myPlayerId = null
        this.showListView()
      } else {
        const error = await response.json()
        alert(error.error || I18n.translate('tournaments.alert_error'))
      }
    } catch (error) {
      console.error('Failed to leave tournament:', error)
      alert(I18n.translate('tournaments.alert_connection_error'))
    }
  },

  //
  // Show invite friend modal

  async showInviteFriendModal(tournamentId: string): Promise<void> {
    // Get online friends
    const onlineFriends: Array<{id: string; name: string; avatar?: string}> = []
    
    App.friendsMap.forEach((friend, friendId) => {
      if (App.onlineUsersMap.has(friendId)) {
        onlineFriends.push({
          id: friendId,
          name: friend.name || 'Unknown',
          avatar: friend.avatar
        })
      }
    })

    if (onlineFriends.length === 0) {
      alert(I18n.translate('tournaments.no_online_friends') || 'No online friends to invite')
      return
    }

    // Create modal
    const existingModal = document.getElementById('invite-friend-modal')
    if (existingModal) existingModal.remove()

    const modal = document.createElement('div')
    modal.id = 'invite-friend-modal'
    modal.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-50'
    modal.innerHTML = `
      <div class="bg-neutral-800 rounded-lg p-6 max-w-md w-full mx-4 border border-neutral-700">
        <h3 class="text-xl font-bold text-white mb-4">${I18n.translate('tournaments.invite_friend') || 'Invite Friend'}</h3>
        <p class="text-neutral-400 text-sm mb-4">${I18n.translate('tournaments.select_friend') || 'Select a friend to invite to this tournament'}</p>
        <div class="space-y-2 max-h-64 overflow-y-auto">
          ${onlineFriends.map(friend => `
            <button class="invite-friend-btn w-full flex items-center gap-3 p-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition" data-friend-id="${friend.id}">
              <img src="${friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&background=3b82f6&color=fff`}" 
                   alt="${friend.name}" class="w-10 h-10 rounded-full object-cover">
              <div class="text-left">
                <p class="text-white font-medium">${this.escapeHtml(friend.name)}</p>
                <p class="text-green-400 text-xs">Online</p>
              </div>
            </button>
          `).join('')}
        </div>
        <div class="flex justify-end mt-4">
          <button id="invite-modal-cancel" class="btn btn-outline">${I18n.translate('cancel') || 'Cancel'}</button>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    // Bind events
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove()
    })

    document.getElementById('invite-modal-cancel')?.addEventListener('click', () => {
      modal.remove()
    })

    modal.querySelectorAll('.invite-friend-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const friendId = (btn as HTMLElement).dataset.friendId
        if (friendId) {
          await this.sendTournamentInvite(tournamentId, friendId)
          modal.remove()
        }
      })
    })
  },

  //
  // Send tournament invitation

  async sendTournamentInvite(tournamentId: string, friendId: string): Promise<void> {
    try {
      // Import dynamically to avoid circular dependencies
      const { sendTournamentInvitation } = await import('./social/social-commands')
      
      await sendTournamentInvitation(tournamentId, friendId)
      
      const friend = App.cachedUsers.get(friendId)
      alert(`${I18n.translate('tournaments.invitation_sent') || 'Invitation sent to'} ${friend?.name || 'friend'}!`)
    } catch (error: any) {
      console.error('Failed to send tournament invitation:', error)
      alert(error.message || I18n.translate('tournaments.invitation_failed') || 'Failed to send invitation')
    }
  },

  //
  // View tournament details

  async viewTournament(tournamentId: string): Promise<void> {
    try {
      const response = await fetch(`/api/tournament/${tournamentId}`)
      if (response.ok) {
        state.currentTournament = await response.json()
        
        // Check if we have a player ID for this tournament
        const savedPlayerId = sessionStorage.getItem(`tournament_player_${tournamentId}`)
        if (savedPlayerId) {
          state.myPlayerId = savedPlayerId
        }
        
        // Subscribe to this tournament's updates
        if (state.ws?.readyState === WebSocket.OPEN) {
          state.ws.send(JSON.stringify({
            type: 'subscribe',
            tournamentId
          }))
        }
        
        this.showDetailView()
        this.renderTournamentDetail()
      } else {
        alert(I18n.translate('tournaments.alert_not_found'))
      }
    } catch (error) {
      console.error('Failed to fetch tournament:', error)
      alert(I18n.translate('tournaments.alert_connection_error'))
    }
  },

  //
  // Show list view

  showListView(): void {
    // Unsubscribe from tournament updates (only for online tournaments)
    if (state.currentTournament && !isLocalTournament(state.currentTournament) && state.ws?.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({
        type: 'unsubscribe',
        tournamentId: state.currentTournament.odId
      }))
    }
    
    // Clear local tournament if leaving (it's non-persistent)
    if (state.currentLocalTournament) {
      state.currentLocalTournament = null
    }
    
    state.currentTournament = null
    
    document.getElementById('tournament-lists-view')?.classList.remove('hidden')
    document.getElementById('tournament-detail-view')?.classList.add('hidden')
  },

  //
  // Show detail view

  showDetailView(): void {
    document.getElementById('tournament-lists-view')?.classList.add('hidden')
    document.getElementById('tournament-detail-view')?.classList.remove('hidden')
  },

  //
  // Load finished local tournaments from localStorage

  loadLocalFinishedTournaments(): void {
    try {
      const stored = localStorage.getItem('local_finished_tournaments')
      console.log('[Tournaments] Loading local finished tournaments from localStorage:', stored)
      if (stored) {
        state.localFinishedTournaments = JSON.parse(stored)
        console.log('[Tournaments] Loaded', state.localFinishedTournaments.length, 'local finished tournaments')
      }
    } catch (e) {
      console.error('Failed to load local finished tournaments:', e)
      state.localFinishedTournaments = []
    }
  },

  //
  // Save a finished local tournament to localStorage

  saveLocalFinishedTournament(tournament: LocalTournament): void {
    console.log('[Tournaments] Saving finished local tournament:', tournament.odId)
    // Add to state
    state.localFinishedTournaments.unshift(tournament)  // Add at beginning (most recent first)
    
    // Keep only last 20 tournaments
    if (state.localFinishedTournaments.length > 20) {
      state.localFinishedTournaments = state.localFinishedTournaments.slice(0, 20)
    }
    
    // Save to localStorage
    try {
      localStorage.setItem('local_finished_tournaments', JSON.stringify(state.localFinishedTournaments))
      console.log('[Tournaments] Saved to localStorage, total:', state.localFinishedTournaments.length)
    } catch (e) {
      console.error('Failed to save local finished tournaments:', e)
    }
  },

  //
  // Render tournament lists

  renderTournamentLists(): void {
    this.renderTournamentList('available-tournaments', state.tournaments.waiting, 'waiting')
    this.renderTournamentList('active-tournaments', state.tournaments.in_progress, 'in_progress')
    this.renderTournamentList('finished-tournaments', state.tournaments.finished, 'finished')
    // Also render local finished tournaments
    this.renderLocalFinishedTournaments()
    
    // Update counts
    const availableCount = document.getElementById('available-count')
    const activeCount = document.getElementById('active-count')
    const finishedCount = document.getElementById('finished-count')
    
    if (availableCount) availableCount.textContent = `(${state.tournaments.waiting.length})`
    if (activeCount) activeCount.textContent = `(${state.tournaments.in_progress.length})`
    if (finishedCount) finishedCount.textContent = `(${state.tournaments.finished.length + state.localFinishedTournaments.length})`
  },

  //
  // Render a single tournament list

  renderTournamentList(containerId: string, tournaments: Tournament[], status: string): void {
    const container = document.getElementById(containerId)
    if (!container) return
    
    // Check if there are any tournaments (online or local for finished)
    const hasLocalFinished = containerId === 'finished-tournaments' && state.localFinishedTournaments.length > 0
    const isEmpty = tournaments.length === 0 && !hasLocalFinished
    
    if (isEmpty) {
      // Show empty state (already in HTML)
      const emptyState = container.querySelector('.empty-state-compact')
      if (emptyState) {
        emptyState.classList.remove('hidden')
      }
      // Remove any tournament cards
      container.querySelectorAll('.tournament-card').forEach(el => el.remove())
      return
    }
    
    // Hide empty state
    const emptyState = container.querySelector('.empty-state-compact')
    if (emptyState) {
      emptyState.classList.add('hidden')
    }
    
    // Clear existing cards (but not local ones for finished list)
    container.querySelectorAll('.tournament-card:not(.local-tournament-card)').forEach(el => el.remove())
    
    // Add tournament cards
    tournaments.forEach(tournament => {
      const card = this.createTournamentCard(tournament, status)
      container.appendChild(card)
    })
  },

  //
  // Render local finished tournaments in the finished list

  renderLocalFinishedTournaments(): void {
    console.log('[Tournaments] renderLocalFinishedTournaments called, count:', state.localFinishedTournaments.length)
    const container = document.getElementById('finished-tournaments')
    if (!container) {
      console.log('[Tournaments] finished-tournaments container not found!')
      return
    }
    
    // Remove existing local tournament cards
    container.querySelectorAll('.local-tournament-card').forEach(el => el.remove())
    
    // Add local finished tournament cards
    state.localFinishedTournaments.forEach(tournament => {
      console.log('[Tournaments] Creating card for local tournament:', tournament.odId)
      const card = this.createLocalTournamentCard(tournament)
      container.appendChild(card)
    })
    
    // Update empty state visibility
    const hasAny = state.tournaments.finished.length > 0 || state.localFinishedTournaments.length > 0
    const emptyState = container.querySelector('.empty-state-compact')
    if (emptyState) {
      emptyState.classList.toggle('hidden', hasAny)
    }
  },

  //
  // Create a local tournament card element

  createLocalTournamentCard(tournament: LocalTournament): HTMLElement {
    const card = document.createElement('div')
    card.className = 'tournament-card local-tournament-card bg-neutral-900 rounded-lg border border-neutral-800 p-4 hover:border-neutral-600 transition cursor-pointer'
    card.dataset.localTournamentId = tournament.odId
    
    const name = tournament.odName || `Tournoi Local #${tournament.odId.slice(-6)}`
    const playerCount = tournament.odPlayers.length
    const maxPlayers = tournament.odMaxPlayers
    
    const statusBadge = `<span class="badge badge-neutral">${I18n.translate('tournaments.status_finished')}</span>`
    const localBadge = `<span class="badge badge-info">🏠 ${I18n.translate('tournaments.mode_local')}</span>`
    let winnerDisplay = ''
    if (tournament.odWinner) {
      winnerDisplay = `<span class="text-emerald-400 text-sm">🏆 ${this.escapeHtml(tournament.odWinner.odAlias)}</span>`
    }
    
    // Format date
    const createdAt = new Date(tournament.odCreatedAt)
    const dateStr = createdAt.toLocaleDateString()
    
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <h3 class="font-bold text-lg">${this.escapeHtml(name)}</h3>
            ${statusBadge}
            ${localBadge}
          </div>
          <div class="text-sm text-neutral-400">
            <span>${playerCount}/${maxPlayers} ${I18n.translate('tournaments.players_format')}</span>
            <span class="mx-2">•</span>
            <span>${dateStr}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${winnerDisplay}
          <button class="btn btn-outline text-sm view-btn">${I18n.translate('tournaments.view_btn')}</button>
        </div>
      </div>
    `
    
    // Event listeners
    const viewBtn = card.querySelector('.view-btn')
    viewBtn?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.viewLocalTournament(tournament)
    })
    
    card.addEventListener('click', () => {
      this.viewLocalTournament(tournament)
    })
    
    return card
  },

  //
  // View a finished local tournament

  viewLocalTournament(tournament: LocalTournament): void {
    state.currentTournament = tournament
    state.currentLocalTournament = tournament
    this.showDetailView()
    this.renderTournamentDetail()
  },

  //
  // Create a tournament card element

  createTournamentCard(tournament: Tournament, status: string): HTMLElement {
    const card = document.createElement('div')
    card.className = 'tournament-card bg-neutral-900 rounded-lg border border-neutral-800 p-4 hover:border-neutral-600 transition cursor-pointer'
    card.dataset.tournamentId = tournament.odId
    
    const name = tournament.odName || `Tournoi #${tournament.odId.slice(-6)}`
    const playerCount = tournament.odPlayers.length
    const maxPlayers = tournament.odMaxPlayers
    
    let statusBadge = ''
    let actionButton = ''
    
    switch (status) {
      case 'waiting':
        statusBadge = `<span class="badge badge-success">${I18n.translate('tournaments.status_waiting')}</span>`
        actionButton = `<button class="btn btn-outline text-sm join-btn" data-tournament-id="${tournament.odId}">${I18n.translate('tournaments.join_btn')}</button>`
        break
      case 'in_progress':
        statusBadge = `<span class="badge badge-warning">${I18n.translate('tournaments.status_in_progress')}</span>`
        // Show current match info
        const currentMatch = tournament.odMatches.find((m: TournamentMatch) => m.odId === tournament.odCurrentMatch)
        if (currentMatch) {
          actionButton = `<span class="text-amber-400 text-sm">${currentMatch.odPlayer1?.odAlias || 'TBD'} vs ${currentMatch.odPlayer2?.odAlias || 'TBD'}</span>`
        }
        break
      case 'finished':
        statusBadge = `<span class="badge badge-neutral">${I18n.translate('tournaments.status_finished')}</span>`
        if (tournament.odWinner) {
          actionButton = `<span class="text-emerald-400 text-sm">🏆 ${tournament.odWinner.odAlias}</span>`
        }
        break
    }
    
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <h3 class="font-bold text-lg">${this.escapeHtml(name)}</h3>
            ${statusBadge}
          </div>
          <div class="text-sm text-neutral-400">
            <span>${playerCount}/${maxPlayers} ${I18n.translate('tournaments.players_format')}</span>
            <span class="mx-2">•</span>
            <span>${I18n.translate('tournaments.created_by')} ${this.escapeHtml(tournament.odCreatedBy.odAlias)}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${actionButton}
          <button class="btn btn-outline text-sm view-btn">${I18n.translate('tournaments.view_btn')}</button>
        </div>
      </div>
    `
    
    // Event listeners
    card.querySelector('.view-btn')?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.viewTournament(tournament.odId)
    })
    
    card.querySelector('.join-btn')?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.handleJoinClick(tournament.odId)
    })
    
    card.addEventListener('click', () => {
      this.viewTournament(tournament.odId)
    })
    
    return card
  },

  //
  // Handle join button click

  handleJoinClick(tournamentId: string): void {
    // Check if already in this tournament
    const existingPlayerId = sessionStorage.getItem(`tournament_player_${tournamentId}`)
    if (existingPlayerId) {
      this.viewTournament(tournamentId)
      return
    }
    
    // If logged in, try direct join, otherwise open modal
    if (App.me?.name) {
      this.joinTournamentDirect(tournamentId)
    } else {
      this.openJoinModal(tournamentId)
    }
  },

  //
  // Render tournament detail view

  renderTournamentDetail(): void {
    const tournament = state.currentTournament
    if (!tournament) return
    
    const isLocal = isLocalTournament(tournament)
    
    // Tournament info
    const nameEl = document.getElementById('detail-tournament-name')
    const statusEl = document.getElementById('detail-tournament-status')
    const playerCountEl = document.getElementById('detail-player-count')
    const formatEl = document.getElementById('detail-format')
    const currentMatchInfoEl = document.getElementById('detail-current-match-info')
    const currentMatchEl = document.getElementById('detail-current-match')
    const actionsEl = document.getElementById('detail-tournament-actions')
    
    // Add local badge to name if local tournament
    const baseName = tournament.odName || `Tournoi #${tournament.odId.slice(-6)}`
    if (nameEl) nameEl.textContent = isLocal ? `🏠 ${baseName}` : baseName
    
    const statusTexts: Record<string, string> = {
      'waiting': I18n.translate('tournaments.waiting_players'),
      'in_progress': I18n.translate('tournaments.status_in_progress'),
      'finished': I18n.translate('tournaments.status_finished')
    }
    if (statusEl) {
      const statusText = statusTexts[tournament.odStatus] || tournament.odStatus
      statusEl.textContent = isLocal ? `${statusText} (${I18n.translate('tournaments.mode_local')})` : statusText
    }
    
    if (playerCountEl) playerCountEl.textContent = `${tournament.odPlayers.length}/${tournament.odMaxPlayers}`
    if (formatEl) formatEl.textContent = `${tournament.odMaxPlayers} ${I18n.translate('tournaments.players_format')}`
    
    // Current match info
    if (tournament.odCurrentMatch) {
      const currentMatch = tournament.odMatches.find((m: AnyMatch) => m.odId === tournament.odCurrentMatch)
      if (currentMatch && currentMatchInfoEl && currentMatchEl) {
        currentMatchInfoEl.classList.remove('hidden')
        currentMatchEl.textContent = `${currentMatch.odPlayer1?.odAlias || 'TBD'} vs ${currentMatch.odPlayer2?.odAlias || 'TBD'} (${currentMatch.odScore1} - ${currentMatch.odScore2})`
      }
    } else {
      currentMatchInfoEl?.classList.add('hidden')
    }
    
    // Actions
    if (actionsEl) {
      let actionsHtml = ''
      
      if (isLocal) {
        // Local tournament - simplified actions
        if (tournament.odStatus === 'in_progress') {
          const currentMatch = tournament.odMatches.find((m: AnyMatch) => m.odId === tournament.odCurrentMatch)
          if (currentMatch && currentMatch.odStatus === 'ready') {
            actionsHtml = `<button id="btn-play-local-match" class="btn btn-primary animate-pulse">${I18n.translate('tournaments.play_match')}</button>`
          } else if (currentMatch && currentMatch.odStatus === 'playing') {
            actionsHtml = `<span class="text-amber-400">${I18n.translate('tournaments.match_in_progress')}</span>`
          }
        } else if (tournament.odStatus === 'finished' && tournament.odWinner) {
          actionsHtml = `<span class="text-xl">🏆 ${I18n.translate('tournaments.winner')}: <strong class="text-emerald-400">${this.escapeHtml(tournament.odWinner.odAlias)}</strong></span>`
        }
      } else {
        // Online tournament - existing logic
        const isParticipant = tournament.odPlayers.some((p: AnyPlayer) => p.odId === state.myPlayerId)
        
        if (tournament.odStatus === 'waiting') {
          if (isParticipant) {
            actionsHtml = `
              <button id="btn-leave-tournament" class="btn btn-outline text-red-400 border-red-400 hover:bg-red-400/10">${I18n.translate('tournaments.leave_btn')}</button>
            `
          } else {
            actionsHtml = `<button id="btn-join-detail" class="btn btn-secondary">${I18n.translate('tournaments.join_btn')}</button>`
          }
        } else if (tournament.odStatus === 'in_progress' && isParticipant) {
          // Check if it's my turn to play
          const currentMatch = tournament.odMatches.find((m: AnyMatch) => m.odId === tournament.odCurrentMatch)
          if (currentMatch && 
              (currentMatch.odPlayer1?.odId === state.myPlayerId || currentMatch.odPlayer2?.odId === state.myPlayerId) &&
              currentMatch.odStatus === 'ready') {
            actionsHtml = `<button id="btn-play-match" class="btn btn-primary animate-pulse">${I18n.translate('tournaments.play_match')}</button>`
          }
        } else if (tournament.odStatus === 'finished' && tournament.odWinner) {
          actionsHtml = `<span class="text-xl">🏆 ${I18n.translate('tournaments.winner')}: <strong class="text-emerald-400">${this.escapeHtml(tournament.odWinner.odAlias)}</strong></span>`
        }
      }
      
      actionsEl.innerHTML = actionsHtml
      
      // Bind action button events
      document.getElementById('btn-leave-tournament')?.addEventListener('click', () => {
        this.leaveTournament(tournament.odId)
      })
      
      document.getElementById('btn-join-detail')?.addEventListener('click', () => {
        this.handleJoinClick(tournament.odId)
      })
      
      document.getElementById('btn-play-match')?.addEventListener('click', () => {
        this.startMyMatch()
      })
      
      document.getElementById('btn-play-local-match')?.addEventListener('click', () => {
        this.startLocalMatch()
      })
    }
    
    // Players list
    this.renderPlayersList(tournament as Tournament)
    
    // Bracket
    this.renderBracket(tournament as Tournament)
  },

  //
  // Render players list

  renderPlayersList(tournament: Tournament): void {
    const container = document.getElementById('detail-players-list')
    if (!container) return
    
    container.innerHTML = ''
    
    // Check if current user is a participant (can invite others)
    const isParticipant = tournament.odPlayers.some((p: TournamentPlayer) => p.odId === state.myPlayerId)
    const canInvite = isParticipant && tournament.odStatus === 'waiting'
    
    for (let i = 0; i < tournament.odMaxPlayers; i++) {
      const player = tournament.odPlayers[i]
      const card = document.createElement('div')
      
      if (player) {
        const isMe = player.odId === state.myPlayerId
        const isCreator = player.odIsCreator
        
        card.className = `p-3 rounded-lg border ${isMe ? 'border-blue-500 bg-blue-500/10' : 'border-neutral-700 bg-neutral-800'}`
        card.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="text-lg">${isCreator ? '👑' : '🎮'}</span>
            <span class="font-medium ${isMe ? 'text-blue-400' : ''}">${this.escapeHtml(player.odAlias)}</span>
            ${isMe ? `<span class="text-xs text-blue-400">${I18n.translate('tournaments.you')}</span>` : ''}
          </div>
        `
      } else if (canInvite) {
        // Show invite button for empty slots when user is a participant
        card.className = 'p-3 rounded-lg border border-dashed border-orange-500/30 bg-neutral-800/50 hover:bg-orange-500/10 hover:border-orange-400/50 transition-all cursor-pointer invite-slot-btn'
        card.dataset.tournamentId = tournament.odId
        card.innerHTML = `
          <div class="flex items-center gap-2 text-orange-400">
            <span class="text-lg">➕</span>
            <span>${I18n.translate('tournaments.invite_friend') || 'Invite Friend'}</span>
          </div>
        `
      } else {
        card.className = 'p-3 rounded-lg border border-dashed border-neutral-700 bg-neutral-800/50'
        card.innerHTML = `
          <div class="flex items-center gap-2 text-neutral-500">
            <span class="text-lg">⏳</span>
            <span>${I18n.translate('tournaments.slot_waiting')}</span>
          </div>
        `
      }
      
      container.appendChild(card)
    }
    
    // Bind invite slot button events
    if (canInvite) {
      container.querySelectorAll('.invite-slot-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tournamentId = (btn as HTMLElement).dataset.tournamentId
          if (tournamentId) {
            this.showInviteFriendModal(tournamentId)
          }
        })
      })
    }
  },

  //
  // Render tournament bracket

  renderBracket(tournament: Tournament): void {
    const container = document.getElementById('bracket-container')
    if (!container) return
    
    const totalRounds = tournament.odMaxPlayers === 2 ? 1 : (tournament.odMaxPlayers === 4 ? 2 : 3)
    const roundNames = tournament.odMaxPlayers === 2
      ? [I18n.translate('tournaments.round_final')]
      : (tournament.odMaxPlayers === 4 
        ? [I18n.translate('tournaments.round_semis'), I18n.translate('tournaments.round_final')]
        : [I18n.translate('tournaments.round_quarters'), I18n.translate('tournaments.round_semis'), I18n.translate('tournaments.round_final')])
    
    let html = '<div class="bracket-grid">'
    
    for (let round = 0; round < totalRounds; round++) {
      const matchesInRound = tournament.odMatches.filter((m: TournamentMatch) => m.odRound === round)
      
      html += `
        <div class="bracket-round">
          <div class="bracket-round-title">${roundNames[round]}</div>
          <div class="bracket-matches">
      `
      
      matchesInRound.forEach((match: TournamentMatch) => {
        const isCurrent = match.odId === tournament.odCurrentMatch
        const isFinished = match.odStatus === 'finished'
        const isPlaying = match.odStatus === 'playing'
        
        let matchClass = 'bracket-match'
        if (isCurrent) matchClass += ' bracket-match-current'
        if (isFinished) matchClass += ' bracket-match-finished'
        
        const player1 = match.odPlayer1
        const player2 = match.odPlayer2
        const winner = match.odWinner
        
        html += `
          <div class="${matchClass}">
            <div class="bracket-player ${winner?.odId === player1?.odId ? 'bracket-winner' : ''} ${isPlaying && player1 ? 'bracket-playing' : ''}">
              <span class="bracket-player-name">${player1?.odAlias || 'TBD'}</span>
              <span class="bracket-score">${match.odScore1}</span>
            </div>
            <div class="bracket-vs">vs</div>
            <div class="bracket-player ${winner?.odId === player2?.odId ? 'bracket-winner' : ''} ${isPlaying && player2 ? 'bracket-playing' : ''}">
              <span class="bracket-player-name">${player2?.odAlias || 'TBD'}</span>
              <span class="bracket-score">${match.odScore2}</span>
            </div>
            ${isPlaying ? '<div class="bracket-live">🔴 LIVE</div>' : ''}
          </div>
        `
      })
      
      html += `
          </div>
        </div>
      `
    }
    
    // Winner display
    if (tournament.odStatus === 'finished' && tournament.odWinner) {
      html += `
        <div class="bracket-winner-display">
          <div class="bracket-round-title">🏆 Champion</div>
          <div class="bracket-champion">
            ${this.escapeHtml(tournament.odWinner.odAlias)}
          </div>
        </div>
      `
    }
    
    html += '</div>'
    container.innerHTML = html
  },

  //
  // Start my match - navigate to game via SPA router (online tournaments)

  startMyMatch(): void {
    const tournament = state.currentTournament
    if (!tournament || !state.myPlayerId || isLocalTournament(tournament)) return
    
    const currentMatch = tournament.odMatches.find((m: TournamentMatch) => m.odId === tournament.odCurrentMatch)
    if (!currentMatch) return
    
    // Store tournament match info for game integration
    sessionStorage.setItem('tournament_match', JSON.stringify({
      tournamentId: tournament.odId,
      matchId: currentMatch.odId,
      playerId: state.myPlayerId,
      isPlayer1: currentMatch.odPlayer1?.odId === state.myPlayerId
    }))
    
    // Navigate to game page with tournament mode using SPA router
    Router.navigate(`/play?tournament=${tournament.odId}&match=${currentMatch.odId}`)
  },
  
  //
  // Start a local tournament match - navigate to game with local mode

  startLocalMatch(): void {
    const tournament = state.currentLocalTournament
    if (!tournament) return
    
    const currentMatch = tournament.odMatches.find(m => m.odId === tournament.odCurrentMatch)
    if (!currentMatch || currentMatch.odStatus !== 'ready') return
    
    // Mark match as playing
    LocalTournamentSystem.startMatch(tournament, currentMatch.odId)
    
    // Store local tournament match info for game integration
    sessionStorage.setItem('local_tournament_match', JSON.stringify({
      tournamentId: tournament.odId,
      matchId: currentMatch.odId,
      player1Alias: currentMatch.odPlayer1?.odAlias,
      player2Alias: currentMatch.odPlayer2?.odAlias
    }))
    
    // Save tournament state BEFORE navigating (so game can restore it on end)
    sessionStorage.setItem('local_tournament_state', JSON.stringify(tournament))
    
    // Navigate to game page with local tournament mode
    Router.navigate(`/play?local_tournament=${tournament.odId}&match=${currentMatch.odId}`)
  },
  
  //
  // Called when a local tournament match ends (from game module)

  onLocalMatchEnd(matchId: string, score1: number, score2: number): void {
    const tournament = state.currentLocalTournament
    if (!tournament) return
    
    console.log(`[Local Tournament] Match ${matchId} ended: ${score1} - ${score2}`)
    
    // Update the match and progress the tournament
    const result = LocalTournamentSystem.endMatch(tournament, matchId, score1, score2)
    
    if (result.success) {
      // Update local stats (wins + points)
      this.updateLocalStats(score1, score2, result.winner !== undefined)
      
      // Update the view
      state.currentTournament = tournament
      this.renderTournamentDetail()
      
      if (result.tournamentEnded) {
        console.log(`[Local Tournament] Tournament ended! Winner: ${tournament.odWinner?.odAlias}`)
        // Save to finished local tournaments
        this.saveLocalFinishedTournament(tournament)
        // Clear current local tournament
        state.currentLocalTournament = null
        // Re-render lists to show the finished tournament
        this.renderTournamentLists()
      }
    }
  },
  
  //
  // Update local tournament stats (non-persistent but counted globally)

  updateLocalStats(score1: number, score2: number, _hasWinner: boolean): void {
    // Get existing local stats from session
    const existingStats = sessionStorage.getItem('local_tournament_stats')
    let stats = existingStats ? JSON.parse(existingStats) : {
      matchesPlayed: 0,
      pointsScored: 0,
      pointsConceded: 0
    }
    
    // Update stats (both players' points are counted)
    stats.matchesPlayed += 1
    stats.pointsScored += score1 + score2  // Total points in match
    stats.pointsConceded += score1 + score2  // Same for local (both on same device)
    
    sessionStorage.setItem('local_tournament_stats', JSON.stringify(stats))
  },
  
  //
  // Get current local tournament (for game module)

  getCurrentLocalTournament(): LocalTournament | null {
    return state.currentLocalTournament
  },
  
  //
  // Restore local tournament state (after returning from game)

  restoreLocalTournament(tournamentData: LocalTournament): void {
    state.currentLocalTournament = tournamentData
    state.currentTournament = tournamentData
  },

  //
  // Escape HTML to prevent XSS

  escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}
