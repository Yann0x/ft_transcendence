/* ============================================
   TOURNAMENTS - ft_transcendance
   ============================================ */

// Import types from shared folder (mounted from backend/shared/with_front in Docker)
import type { Tournament, TournamentPlayer, TournamentMatch } from '../shared/types.js'
import { App } from './app'
import Router from './router'
import { I18n } from './i18n'

interface TournamentState {
  tournaments: {
    waiting: Tournament[]
    in_progress: Tournament[]
    finished: Tournament[]
  }
  currentTournament: Tournament | null
  myPlayerId: string | null
  ws: WebSocket | null
}

const state: TournamentState = {
  tournaments: {
    waiting: [],
    in_progress: [],
    finished: []
  },
  currentTournament: null,
  myPlayerId: null,
  ws: null
}

export const Tournaments = {
  
  /**
   * Initialize the tournaments page
   */
  init(): void {
    console.log('🏆 Tournaments module initialized')
    
    this.connectWebSocket()
    this.setupEventListeners()
    this.fetchTournaments()
    
    // Check if we should view a specific tournament (after returning from a match)
    const tournamentToView = sessionStorage.getItem('view_tournament_after_match')
    if (tournamentToView) {
      sessionStorage.removeItem('view_tournament_after_match')
      // Wait a bit for tournaments to load, then view the specific tournament
      setTimeout(() => {
        this.viewTournament(tournamentToView)
      }, 500)
    }
  },

  /**
   * Cleanup when leaving page
   */
  cleanup(): void {
    if (state.ws) {
      state.ws.close()
      state.ws = null
    }
    state.currentTournament = null
    state.myPlayerId = null
  },

  /**
   * Connect to tournament WebSocket for live updates
   */
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

  /**
   * Handle WebSocket messages
   */
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

  /**
   * Handle tournament update
   */
  handleTournamentUpdate(tournament: Tournament): void {
    // Update in lists
    this.updateTournamentInLists(tournament)
    
    // If viewing this tournament, update the detail view
    if (state.currentTournament?.odId === tournament.odId) {
      state.currentTournament = tournament
      this.renderTournamentDetail()
    }
  },

  /**
   * Update tournament in the appropriate list
   */
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

  /**
   * Handle tournament deletion
   */
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

  /**
   * Fetch tournaments from API
   */
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

  /**
   * Setup event listeners
   */
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
  },

  /**
   * Open create tournament modal
   */
  openCreateModal(): void {
    const modal = document.getElementById('create-tournament-modal')
    const aliasInput = document.getElementById('creator-alias-input') as HTMLInputElement
    const aliasSection = document.getElementById('creator-alias-section')
    
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

  /**
   * Close create tournament modal
   */
  closeCreateModal(): void {
    const modal = document.getElementById('create-tournament-modal')
    modal?.classList.add('hidden')
  },

  /**
   * Open join tournament modal
   */
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

  /**
   * Close join tournament modal
   */
  closeJoinModal(): void {
    const modal = document.getElementById('join-tournament-modal')
    modal?.classList.add('hidden')
  },

  /**
   * Handle create tournament form submission
   */
  async handleCreateTournament(e: Event): Promise<void> {
    e.preventDefault()
    
    const nameInput = document.getElementById('tournament-name-input') as HTMLInputElement
    const aliasInput = document.getElementById('creator-alias-input') as HTMLInputElement
    const playerCountInputs = document.querySelectorAll('input[name="player-count"]') as NodeListOf<HTMLInputElement>
    
    let maxPlayers = 4
    playerCountInputs.forEach(input => {
      if (input.checked) maxPlayers = parseInt(input.value)
    })
    
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
          name: nameInput.value.trim() || undefined
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

  /**
   * Handle join tournament form submission
   */
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

  /**
   * Join tournament directly (for logged in users)
   */
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

  /**
   * Leave tournament
   */
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

  /**
   * View tournament details
   */
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

  /**
   * Show list view
   */
  showListView(): void {
    // Unsubscribe from tournament updates
    if (state.currentTournament && state.ws?.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({
        type: 'unsubscribe',
        tournamentId: state.currentTournament.odId
      }))
    }
    
    state.currentTournament = null
    
    document.getElementById('tournament-lists-view')?.classList.remove('hidden')
    document.getElementById('tournament-detail-view')?.classList.add('hidden')
  },

  /**
   * Show detail view
   */
  showDetailView(): void {
    document.getElementById('tournament-lists-view')?.classList.add('hidden')
    document.getElementById('tournament-detail-view')?.classList.remove('hidden')
  },

  /**
   * Render tournament lists
   */
  renderTournamentLists(): void {
    this.renderTournamentList('available-tournaments', state.tournaments.waiting, 'waiting')
    this.renderTournamentList('active-tournaments', state.tournaments.in_progress, 'in_progress')
    this.renderTournamentList('finished-tournaments', state.tournaments.finished, 'finished')
  },

  /**
   * Render a single tournament list
   */
  renderTournamentList(containerId: string, tournaments: Tournament[], status: string): void {
    const container = document.getElementById(containerId)
    if (!container) return
    
    if (tournaments.length === 0) {
      // Show empty state (already in HTML)
      const emptyState = container.querySelector('.empty-state')
      if (emptyState) {
        emptyState.classList.remove('hidden')
      }
      // Remove any tournament cards
      container.querySelectorAll('.tournament-card').forEach(el => el.remove())
      return
    }
    
    // Hide empty state
    const emptyState = container.querySelector('.empty-state')
    if (emptyState) {
      emptyState.classList.add('hidden')
    }
    
    // Clear existing cards
    container.querySelectorAll('.tournament-card').forEach(el => el.remove())
    
    // Add tournament cards
    tournaments.forEach(tournament => {
      const card = this.createTournamentCard(tournament, status)
      container.appendChild(card)
    })
  },

  /**
   * Create a tournament card element
   */
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

  /**
   * Handle join button click
   */
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

  /**
   * Render tournament detail view
   */
  renderTournamentDetail(): void {
    const tournament = state.currentTournament
    if (!tournament) return
    
    // Tournament info
    const nameEl = document.getElementById('detail-tournament-name')
    const statusEl = document.getElementById('detail-tournament-status')
    const playerCountEl = document.getElementById('detail-player-count')
    const formatEl = document.getElementById('detail-format')
    const currentMatchInfoEl = document.getElementById('detail-current-match-info')
    const currentMatchEl = document.getElementById('detail-current-match')
    const actionsEl = document.getElementById('detail-tournament-actions')
    
    if (nameEl) nameEl.textContent = tournament.odName || `Tournoi #${tournament.odId.slice(-6)}`
    
    const statusTexts: Record<string, string> = {
      'waiting': I18n.translate('tournaments.waiting_players'),
      'in_progress': I18n.translate('tournaments.status_in_progress'),
      'finished': I18n.translate('tournaments.status_finished')
    }
    if (statusEl) statusEl.textContent = statusTexts[tournament.odStatus] || tournament.odStatus
    
    if (playerCountEl) playerCountEl.textContent = `${tournament.odPlayers.length}/${tournament.odMaxPlayers}`
    if (formatEl) formatEl.textContent = `${tournament.odMaxPlayers} ${I18n.translate('tournaments.players_format')}`
    
    // Current match info
    if (tournament.odCurrentMatch) {
      const currentMatch = tournament.odMatches.find((m: TournamentMatch) => m.odId === tournament.odCurrentMatch)
      if (currentMatch && currentMatchInfoEl && currentMatchEl) {
        currentMatchInfoEl.classList.remove('hidden')
        currentMatchEl.textContent = `${currentMatch.odPlayer1?.odAlias || 'TBD'} vs ${currentMatch.odPlayer2?.odAlias || 'TBD'} (${currentMatch.odScore1} - ${currentMatch.odScore2})`
      }
    } else {
      currentMatchInfoEl?.classList.add('hidden')
    }
    
    // Actions
    if (actionsEl) {
      const isParticipant = tournament.odPlayers.some((p: TournamentPlayer) => p.odId === state.myPlayerId)
      // Note: myPlayer is computed but may be used for future features
      const _myPlayer = tournament.odPlayers.find((p: TournamentPlayer) => p.odId === state.myPlayerId)
      
      let actionsHtml = ''
      
      if (tournament.odStatus === 'waiting') {
        if (isParticipant) {
          actionsHtml = `<button id="btn-leave-tournament" class="btn btn-outline text-red-400 border-red-400 hover:bg-red-400/10">${I18n.translate('tournaments.leave_btn')}</button>`
        } else {
          actionsHtml = `<button id="btn-join-detail" class="btn btn-secondary">${I18n.translate('tournaments.join_btn')}</button>`
        }
      } else if (tournament.odStatus === 'in_progress' && isParticipant) {
        // Check if it's my turn to play
        const currentMatch = tournament.odMatches.find((m: TournamentMatch) => m.odId === tournament.odCurrentMatch)
        if (currentMatch && 
            (currentMatch.odPlayer1?.odId === state.myPlayerId || currentMatch.odPlayer2?.odId === state.myPlayerId) &&
            currentMatch.odStatus === 'ready') {
          actionsHtml = `<button id="btn-play-match" class="btn btn-primary animate-pulse">${I18n.translate('tournaments.play_match')}</button>`
        }
      } else if (tournament.odStatus === 'finished' && tournament.odWinner) {
        actionsHtml = `<span class="text-xl">🏆 ${I18n.translate('tournaments.winner')}: <strong class="text-emerald-400">${this.escapeHtml(tournament.odWinner.odAlias)}</strong></span>`
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
    }
    
    // Players list
    this.renderPlayersList(tournament)
    
    // Bracket
    this.renderBracket(tournament)
  },

  /**
   * Render players list
   */
  renderPlayersList(tournament: Tournament): void {
    const container = document.getElementById('detail-players-list')
    if (!container) return
    
    container.innerHTML = ''
    
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
  },

  /**
   * Render tournament bracket
   */
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

  /**
   * Start my match - navigate to game via SPA router
   */
  startMyMatch(): void {
    const tournament = state.currentTournament
    if (!tournament || !state.myPlayerId) return
    
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

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}
