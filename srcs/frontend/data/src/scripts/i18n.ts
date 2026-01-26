type TranslationMap = Record<string, string>;

const STORAGE_KEY = 'language';
const DEFAULT_LANG = 'fr';
const SUPPORTED_LANGS = ['fr', 'en', 'es'] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];

const translations: Record<SupportedLang, TranslationMap> = {
  fr: {
    // App
    'app.title': 'ft_transcendance',
    
    // Navigation
    'nav.play': 'Jouer',
    'nav.tournaments': 'Tournois',
    'nav.chat': 'Chat',
    'nav.friends': 'Amis',
    'nav.stats': 'Stats',
    'nav.login': 'Connexion',
    'nav.signup': 'Inscription',
    'nav.language': 'Langue',
    'nav.contrast': 'Contraste élevé',
    'nav.social': 'Social',
    
    // Footer
    'footer.copy': '© 2025 ft_transcendence - École 42',
    'footer.about': 'À propos',
    'footer.rules': 'Règles',
    'footer.contact': 'Contact',
    
    // Auth
    'auth.login': 'Connexion',
    'auth.signup': 'Inscription',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.username': "Nom d'utilisateur",
    'auth.remember': 'Se souvenir de moi',
    'auth.login_submit': 'Se connecter',
    'auth.no_account': 'Pas encore inscrit ?',
    'auth.create_account': 'Créer un compte',
    'auth.have_account': 'Vous avez un compte ?',
    'auth.login_link': 'Se connecter',
    'auth.terms': "J'accepte les conditions d'utilisation",
    'auth.signup_submit': "S'inscrire",
    'auth.or_continue': 'ou continuer avec',
    'auth.oauth_42': 'Se connecter avec 42',
    'auth.email_placeholder': 'votre@email.com',
    'auth.password_placeholder': '••••••••',
    'auth.username_placeholder': 'votre_username',
    
    // Home
    'home.game_title': 'Pong Arena',
    'home.status_online': 'En ligne',
    'home.status_offline': 'Hors-ligne',
    'home.players_online': '42 joueurs connectés',
    'home.players_waiting': 'en attente',
    'home.game_area_placeholder': 'Zone de jeu - À implémenter',
    'home.controls': '⌨️ W/S ou ↑/↓ - Déplacer',
    'home.first_to': '🎯 Premier à 11 points',
    'home.settings': '⚙️ Paramètres',
    'home.quick_stats': 'Statistiques rapides',
    'home.view_all': 'Voir tout',
    'home.stat_games': 'Parties jouées',
    'home.stat_wins': 'Victoires',
    'home.stat_rank': 'Classement',
    'home.stat_tournaments': 'Tournois gagnés',
    'home.controls_move': 'W/S ou ↑/↓ - Déplacer',
    'home.controls_start': 'ESPACE - Démarrer',
    'home.controls_pause': 'ÉCHAP - Pause',
    'home.btn_solo': 'Solo',
    'home.btn_local': 'PvP Local',
    'home.btn_pvp': 'PvP Online',
    'home.difficulty_easy': 'Facile',
    'home.difficulty_normal': 'Normal',
    'home.difficulty_hard': 'Difficile',
    
    // Game messages
    'game.choose_mode': 'Choisissez Solo ou PvP pour jouer',
    'game.select_mode_below': 'Sélectionnez un mode ci-dessous',
    'game.tournament_match': 'Match de Tournoi',
    'game.waiting_opponent': 'En attente d\'un adversaire...',
    'game.connecting': 'Connexion...',
    'game.press_space_start': 'Appuyez sur ESPACE pour commencer',
    'game.paused': 'PAUSE',
    'game.press_esc_resume': 'Appuyez sur ÉCHAP pour reprendre',
    'game.opponent_disconnected': 'Adversaire déconnecté',
    'game.waiting_reconnection': 'En attente de reconnexion...',
    'game.victory': '🏆 Victoire !',
    'game.defeat': 'Défaite',
    'game.you_advance': 'Vous avancez ! Retour au tournoi...',
    'game.you_advance_tournament': 'Vous avancez ! Retour au tournoi...',
    'game.returning_tournament': 'Retour au tournoi...',
    'game.you_win_space': 'Vous gagnez ! Appuyez sur ESPACE pour une nouvelle partie',
    'game.press_space_restart': 'Appuyez sur ESPACE pour recommencer',
    'game.left_wins': 'Gauche gagne !',
    'game.right_wins': 'Droite gagne !',
    'game.wins': 'gagne',
    
    // Stats
    'stats.title': 'Statistiques',
    'stats.subtitle': 'Retrouvez ici vos statistiques de jeu et votre progression',
    'stats.games_played': 'Parties jouées',
    'stats.win_rate': 'Taux de victoire',
    'stats.global_rank': 'Classement global',
    'stats.tournaments_won': 'Tournois gagnés',
    'stats.game_stats_title': 'Statistiques de jeu',
    'stats.wins': 'Victoires',
    'stats.losses': 'Défaites',
    'stats.points_scored': 'Points marqués',
    'stats.points_allowed': 'Points encaissés',
    'stats.performance_title': 'Performances',
    'stats.best_score': 'Meilleur score',
    'stats.worst_score': 'Pire score',
    'stats.streak': 'Série de victoires',
    'stats.winrate_evolution': 'Évolution du winrate',
    'stats.recent_games': 'Dernières parties',
    'stats.table_type': 'Type',
    'stats.table_opponent': 'Adversaire',
    'stats.table_score': 'Score',
    'stats.table_result': 'Résultat',
    'stats.table_date': 'Date',
    'stats.no_data': 'Aucune donnée pour le moment',
    'stats.no_games': 'Aucune partie jouée',
    'stats.login_required': 'Connectez-vous pour voir vos statistiques',
    'stats.login_required_title': 'Connexion requise',
    'stats.login_required_desc': 'Connectez-vous pour accéder à vos statistiques détaillées et suivre votre progression.',
    'stats.error': 'Erreur lors du chargement des statistiques',
    'stats.result_win': 'Victoire',
    'stats.result_loss': 'Défaite',
    
    // Friends
    'friends.title': 'Mes Amis',
    'friends.subtitle': 'Gérez vos amis et consultez leur profil',
    'friends.list_title': 'Liste des amis',
    'friends.empty_title': "Vous n'avez pas encore d'amis",
    'friends.empty_subtitle': "Invitez d'autres joueurs pour commencer à construire votre réseau !",
    'friends.blocked_title': 'Utilisateurs bloqués',
    'friends.blocked_empty_title': 'Aucun utilisateur bloqué',
    'friends.blocked_empty_subtitle': 'Les utilisateurs bloqués apparaîtront ici',
    'friends.my_friends': 'Mes amis',
    'friends.no_friends': "Pas encore d'amis",
    'friends.search_to_add': 'Cherchez des utilisateurs pour en ajouter !',
    
    // Chat / Social
    'chat.direct': 'Direct',
    'chat.tournaments': 'Tournois',
    'chat.search_placeholder': 'Chercher...',
    'chat.no_direct': 'Aucune conversation directe',
    'chat.tournament_notifications': 'Notifications Tournois',
    'chat.tournament_notifications_desc': 'Alertes et prochains matchs',
    'chat.tournament_general': 'Chat Général',
    'chat.tournament_general_desc': 'Discussions tournois',
    'chat.select_conversation': 'Sélectionnez une conversation',
    'chat.select_subtitle': '-',
    'chat.view_profile': 'Voir le profil',
    'chat.invite_play': 'Inviter à jouer',
    'chat.block_user': "Bloquer l'utilisateur",
    'chat.welcome': '💬 Sélectionnez une conversation pour commencer',
    'chat.welcome_subtitle': 'Ou lancez une nouvelle discussion',
    'chat.message_placeholder': 'Écrivez votre message...',
    'chat.send': 'Envoyer',
    'chat.conversations': 'Conversations',
    'chat.search_conversations': 'Rechercher des conversations...',
    'chat.no_conversations': 'Aucune conversation',
    'chat.start_chatting': 'Commencez à discuter avec un ami !',
    'chat.select_to_start': 'Sélectionnez une conversation pour commencer',
    'chat.search_friend': 'Ou cherchez un ami pour discuter !',
    'chat.type_message': 'Tapez un message...',
    'chat.search_users': 'Chercher des utilisateurs...',
    'chat.search_results': 'RÉSULTATS DE RECHERCHE',
    
    // Tournaments
    'tournaments.title': 'Tournois',
    'tournaments.create': 'Créer un tournoi',
    'tournaments.subtitle': "Participez à des tournois et affrontez d'autres joueurs",
    'tournaments.active': 'Tournois en cours',
    'tournaments.available': 'Tournois disponibles',
    'tournaments.past': 'Tournois terminés',
    'tournaments.none_active': 'Aucun tournoi en cours',
    'tournaments.none_active_sub': 'Les tournois actifs apparaîtront ici',
    'tournaments.none_available': 'Aucun tournoi disponible',
    'tournaments.none_available_sub': 'Attendez ou créez un nouveau tournoi',
    'tournaments.none_past': 'Aucun tournoi terminé',
    'tournaments.none_past_sub': "L'historique des tournois apparaîtra ici",
    'tournaments.back': '← Retour aux tournois',
    'tournaments.waiting_players': 'En attente de joueurs',
    'tournaments.players': 'Joueurs:',
    'tournaments.format': 'Format:',
    'tournaments.players_format': 'joueurs',
    'tournaments.current_match': 'Match en cours:',
    'tournaments.participants': 'Participants',
    'tournaments.bracket': 'Bracket',
    'tournaments.create_title': 'Créer un tournoi',
    'tournaments.name_label': 'Nom du tournoi (optionnel)',
    'tournaments.name_placeholder': 'Ex: Tournoi du weekend',
    'tournaments.player_count': 'Nombre de joueurs',
    'tournaments.test': 'test',
    'tournaments.alias_label': 'Votre pseudo pour ce tournoi',
    'tournaments.alias_placeholder': 'Entrez votre pseudo',
    'tournaments.alias_hint': 'Ce nom sera affiché pendant le tournoi',
    'tournaments.create_btn': 'Créer le tournoi',
    'tournaments.join_title': 'Rejoindre le tournoi',
    'tournaments.join_btn': 'Rejoindre',
    'tournaments.view_btn': 'Voir',
    'tournaments.leave_btn': 'Quitter',
    'tournaments.play_match': '🎮 Jouer le match',
    'tournaments.created_by': 'Créé par',
    'tournaments.status_waiting': 'En attente',
    'tournaments.status_in_progress': 'En cours',
    'tournaments.status_finished': 'Terminé',
    'tournaments.you': '(vous)',
    'tournaments.slot_waiting': 'En attente...',
    'tournaments.winner': 'Gagnant',
    'tournaments.round_quarters': 'Quarts de finale',
    'tournaments.round_semis': 'Demi-finales',
    'tournaments.round_final': 'Finale',
    'tournaments.confirm_leave': 'Êtes-vous sûr de vouloir quitter ce tournoi ?',
    'tournaments.alert_deleted': 'Ce tournoi a été supprimé',
    'tournaments.alert_enter_alias': 'Veuillez entrer un pseudo',
    'tournaments.alert_create_error': 'Erreur lors de la création du tournoi',
    'tournaments.alert_connection_error': 'Erreur de connexion',
    'tournaments.alert_join_error': 'Erreur lors de la connexion au tournoi',
    'tournaments.alert_not_in_tournament': 'Vous n\'êtes pas dans ce tournoi',
    'tournaments.alert_error': 'Erreur',
    'tournaments.alert_not_found': 'Tournoi non trouvé',
    // Local tournaments
    'tournaments.mode_label': 'Mode de jeu',
    'tournaments.mode_online': 'En ligne',
    'tournaments.mode_local': 'Local',
    'tournaments.local_hint': '⚠️ Tous les joueurs joueront sur cet appareil (W/S vs ↑/↓)',
    'tournaments.aliases_title': 'Pseudos des joueurs',
    'tournaments.aliases_subtitle': 'Entrez le pseudo de chaque participant',
    'tournaments.player': 'Joueur',
    'tournaments.start_local_tournament': 'Lancer le tournoi',
    'tournaments.alert_invalid_aliases': 'Pseudos invalides',
    'tournaments.match_in_progress': 'Match en cours...',
    'tournaments.returning': 'Retour au tournoi...',
    
    // Intro
    'intro.tagline': 'Le Pong nouvelle génération',
    
    // Settings
    'settings': 'Paramètres',
    'settings.title': 'Paramètres du compte',
    'settings.avatar_hint': 'Cliquez pour changer votre avatar',
    'settings.name': "Nom d'utilisateur",
    'settings.email': 'Email',
    'settings.change_password': 'Changer le mot de passe',
    'settings.new_password': 'Nouveau mot de passe',
    'settings.confirm_password': 'Confirmer le mot de passe',
    'settings.password_hint': 'Laissez vide pour garder le mot de passe actuel',
    'settings.save': 'Enregistrer les modifications',
    'settings.blocked_users': 'Utilisateurs bloqués',
    'settings.no_blocked_users': 'Aucun utilisateur bloqué',
    'settings.danger_zone': 'Zone de danger',
    'settings.delete_account': 'Supprimer mon compte',
    'settings.delete_warning': 'Cette action est irréversible. Toutes vos données seront supprimées.',
    'settings.unblock': 'Débloquer',
    
    // Profile
    'profile.offline': 'Hors ligne',
    'profile.online': 'En ligne',
    'profile.statistics': 'Statistiques',
    'profile.games_played': 'Parties jouées',
    'profile.win_rate': 'Taux de victoire',
    'profile.wins': 'Victoires',
    'profile.losses': 'Défaites',
    'profile.add_friend': 'Ajouter en ami',
    'profile.remove_friend': 'Retirer des amis',
    'profile.send_message': 'Envoyer un message',
    'profile.block': 'Bloquer',
    
    // Accessibility
    'accessibility.title': 'Accessibilité',
    'accessibility.close': 'Fermer',
    'accessibility.high_contrast': 'Contraste élevé',
    'accessibility.high_contrast_desc': 'Améliore la lisibilité avec des couleurs contrastées',
    'accessibility.font_size': 'Taille du texte',
    'accessibility.font_size_desc': 'Ajuster la taille des caractères',
    'accessibility.reduced_motion': 'Réduire les animations',
    'accessibility.reduced_motion_desc': 'Désactive les animations et transitions',
    'accessibility.focus_highlight': 'Surbrillance du focus',
    'accessibility.focus_highlight_desc': 'Met en évidence l\'élément actif au clavier',
    'accessibility.keyboard_shortcuts': 'Raccourcis clavier',
    'accessibility.shortcut_navigate': 'Naviguer',
    'accessibility.shortcut_activate': 'Activer',
    'accessibility.shortcut_close': 'Fermer',
    'accessibility.skip_to_content': 'Aller au contenu principal',
    'accessibility.contrast_enabled': 'Contraste élevé activé',
    'accessibility.contrast_disabled': 'Contraste élevé désactivé',
    'accessibility.font_size_changed': 'Taille du texte modifiée',
    'accessibility.motion_reduced': 'Animations réduites',
    'accessibility.motion_enabled': 'Animations activées',
    'accessibility.focus_enabled': 'Surbrillance du focus activée',
    'accessibility.focus_disabled': 'Surbrillance du focus désactivée',
    
    // Logout
    'logout': 'Déconnexion',
  },
  
  en: {
    // App
    'app.title': 'ft_transcendance',
    
    // Navigation
    'nav.play': 'Play',
    'nav.tournaments': 'Tournaments',
    'nav.chat': 'Chat',
    'nav.friends': 'Friends',
    'nav.stats': 'Stats',
    'nav.login': 'Log in',
    'nav.signup': 'Sign up',
    'nav.language': 'Language',
    'nav.contrast': 'High contrast',
    'nav.social': 'Social',
    
    // Footer
    'footer.copy': '© 2025 ft_transcendence - Ecole 42',
    'footer.about': 'About',
    'footer.rules': 'Rules',
    'footer.contact': 'Contact',
    
    // Auth
    'auth.login': 'Log in',
    'auth.signup': 'Sign up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.username': 'Username',
    'auth.remember': 'Remember me',
    'auth.login_submit': 'Log in',
    'auth.no_account': "Don't have an account?",
    'auth.create_account': 'Create an account',
    'auth.have_account': 'Already have an account?',
    'auth.login_link': 'Log in',
    'auth.terms': 'I accept the terms of service',
    'auth.signup_submit': 'Sign up',
    'auth.or_continue': 'or continue with',
    'auth.oauth_42': 'Log in with 42',
    'auth.email_placeholder': 'you@email.com',
    'auth.password_placeholder': '••••••••',
    'auth.username_placeholder': 'your_username',
    
    // Home
    'home.game_title': 'Pong Arena',
    'home.status_online': 'Online',
    'home.status_offline': 'Offline',
    'home.players_online': '42 players online',
    'home.players_waiting': 'waiting',
    'home.game_area_placeholder': 'Game area - Coming soon',
    'home.controls': '⌨️ W/S or ↑/↓ - Move',
    'home.first_to': '🎯 First to 11 points',
    'home.settings': '⚙️ Settings',
    'home.quick_stats': 'Quick stats',
    'home.view_all': 'View all',
    'home.stat_games': 'Games played',
    'home.stat_wins': 'Wins',
    'home.stat_rank': 'Rank',
    'home.stat_tournaments': 'Tournaments won',
    'home.controls_move': 'W/S or ↑/↓ - Move',
    'home.controls_start': 'SPACE - Start',
    'home.controls_pause': 'ESC - Pause',
    'home.btn_solo': 'Solo',
    'home.btn_local': 'Local PvP',
    'home.btn_pvp': 'Online PvP',
    'home.difficulty_easy': 'Easy',
    'home.difficulty_normal': 'Normal',
    'home.difficulty_hard': 'Hard',
    
    // Game messages
    'game.choose_mode': 'Choose a game mode',
    'game.select_mode_below': 'Select a mode below',
    'game.tournament_match': 'Tournament Match',
    'game.waiting_opponent': 'Waiting for opponent...',
    'game.connecting': 'Connecting...',
    'game.press_space_start': 'Press SPACE to start',
    'game.paused': 'PAUSED',
    'game.press_esc_resume': 'Press ESC to resume',
    'game.opponent_disconnected': 'OPPONENT DISCONNECTED',
    'game.waiting_reconnection': 'Waiting for reconnection...',
    'game.victory': '🏆 Victory!',
    'game.defeat': 'Defeated',
    'game.you_advance': 'You advance! Returning to tournament...',
    'game.you_advance_tournament': 'You advance! Returning to tournament...',
    'game.returning_tournament': 'Returning to tournament...',
    'game.you_win_space': 'You win! Press SPACE to find a new game',
    'game.press_space_restart': 'Press SPACE to restart',
    'game.left_wins': 'Left wins!',
    'game.right_wins': 'Right wins!',
    'game.wins': 'wins',
    
    // Stats
    'stats.title': 'Stats',
    'stats.subtitle': 'Track your game stats and progression',
    'stats.games_played': 'Games played',
    'stats.win_rate': 'Win rate',
    'stats.global_rank': 'Global rank',
    'stats.tournaments_won': 'Tournaments won',
    'stats.game_stats_title': 'Game stats',
    'stats.wins': 'Wins',
    'stats.losses': 'Losses',
    'stats.points_scored': 'Points scored',
    'stats.points_allowed': 'Points allowed',
    'stats.performance_title': 'Performance',
    'stats.best_score': 'Best score',
    'stats.worst_score': 'Worst score',
    'stats.streak': 'Win streak',
    'stats.winrate_evolution': 'Winrate evolution',
    'stats.recent_games': 'Recent games',
    'stats.table_type': 'Type',
    'stats.table_opponent': 'Opponent',
    'stats.table_score': 'Score',
    'stats.table_result': 'Result',
    'stats.table_date': 'Date',
    'stats.no_data': 'No data yet',
    'stats.no_games': 'No games played',
    'stats.login_required': 'Log in to view your stats',
    'stats.login_required_title': 'Login required',
    'stats.login_required_desc': 'Log in to access your detailed stats and track your progress.',
    'stats.error': 'Error loading stats',
    'stats.result_win': 'Win',
    'stats.result_loss': 'Loss',
    
    // Friends
    'friends.title': 'My Friends',
    'friends.subtitle': 'Manage your friends and view their profiles',
    'friends.list_title': 'Friends list',
    'friends.empty_title': "You don't have friends yet",
    'friends.empty_subtitle': 'Invite other players to start building your network!',
    'friends.blocked_title': 'Blocked users',
    'friends.blocked_empty_title': 'No blocked users',
    'friends.blocked_empty_subtitle': 'Blocked users will appear here',
    'friends.my_friends': 'My friends',
    'friends.no_friends': 'No friends yet',
    'friends.search_to_add': 'Search users to add friends!',
    
    // Chat / Social
    'chat.direct': 'Direct',
    'chat.tournaments': 'Tournaments',
    'chat.search_placeholder': 'Search...',
    'chat.no_direct': 'No direct conversations',
    'chat.tournament_notifications': 'Tournament notifications',
    'chat.tournament_notifications_desc': 'Alerts and upcoming matches',
    'chat.tournament_general': 'General chat',
    'chat.tournament_general_desc': 'Tournament discussions',
    'chat.select_conversation': 'Select a conversation',
    'chat.select_subtitle': '-',
    'chat.view_profile': 'View profile',
    'chat.invite_play': 'Invite to play',
    'chat.block_user': 'Block user',
    'chat.welcome': '💬 Select a conversation to begin',
    'chat.welcome_subtitle': 'Or start a new discussion',
    'chat.message_placeholder': 'Write your message...',
    'chat.send': 'Send',
    'chat.conversations': 'Conversations',
    'chat.search_conversations': 'Search conversations...',
    'chat.no_conversations': 'No conversations',
    'chat.start_chatting': 'Start chatting with a friend!',
    'chat.select_to_start': 'Select a conversation to start',
    'chat.search_friend': 'Or search for a friend to chat!',
    'chat.type_message': 'Type a message...',
    'chat.search_users': 'Search users...',
    'chat.search_results': 'SEARCH RESULTS',
    
    // Tournaments
    'tournaments.title': 'Tournaments',
    'tournaments.create': 'Create a tournament',
    'tournaments.subtitle': 'Join tournaments and face other players',
    'tournaments.active': 'Active tournaments',
    'tournaments.available': 'Available tournaments',
    'tournaments.past': 'Past tournaments',
    'tournaments.none_active': 'No active tournaments',
    'tournaments.none_active_sub': 'Active tournaments will appear here',
    'tournaments.none_available': 'No available tournaments',
    'tournaments.none_available_sub': 'Wait or create a new tournament',
    'tournaments.none_past': 'No completed tournaments',
    'tournaments.none_past_sub': 'Tournament history will appear here',
    'tournaments.back': '← Back to tournaments',
    'tournaments.waiting_players': 'Waiting for players',
    'tournaments.players': 'Players:',
    'tournaments.format': 'Format:',
    'tournaments.players_format': 'players',
    'tournaments.current_match': 'Current match:',
    'tournaments.participants': 'Participants',
    'tournaments.bracket': 'Bracket',
    'tournaments.create_title': 'Create a tournament',
    'tournaments.name_label': 'Tournament name (optional)',
    'tournaments.name_placeholder': 'Ex: Weekend tournament',
    'tournaments.player_count': 'Number of players',
    'tournaments.test': 'test',
    'tournaments.alias_label': 'Your alias for this tournament',
    'tournaments.alias_placeholder': 'Enter your alias',
    'tournaments.alias_hint': 'This name will be displayed during the tournament',
    'tournaments.create_btn': 'Create tournament',
    'tournaments.join_title': 'Join tournament',
    'tournaments.join_btn': 'Join',
    'tournaments.view_btn': 'View',
    'tournaments.leave_btn': 'Leave',
    'tournaments.play_match': '🎮 Play match',
    'tournaments.created_by': 'Created by',
    'tournaments.status_waiting': 'Waiting',
    'tournaments.status_in_progress': 'In progress',
    'tournaments.status_finished': 'Finished',
    'tournaments.you': '(you)',
    'tournaments.slot_waiting': 'Waiting...',
    'tournaments.winner': 'Winner',
    'tournaments.round_quarters': 'Quarter-finals',
    'tournaments.round_semis': 'Semi-finals',
    'tournaments.round_final': 'Final',
    'tournaments.confirm_leave': 'Are you sure you want to leave this tournament?',
    'tournaments.alert_deleted': 'This tournament has been deleted',
    'tournaments.alert_enter_alias': 'Please enter an alias',
    'tournaments.alert_create_error': 'Error creating tournament',
    'tournaments.alert_connection_error': 'Connection error',
    'tournaments.alert_join_error': 'Error joining tournament',
    'tournaments.alert_not_in_tournament': 'You are not in this tournament',
    'tournaments.alert_error': 'Error',
    'tournaments.alert_not_found': 'Tournament not found',
    // Local tournaments
    'tournaments.mode_label': 'Game mode',
    'tournaments.mode_online': 'Online',
    'tournaments.mode_local': 'Local',
    'tournaments.local_hint': '⚠️ All players will play on this device (W/S vs ↑/↓)',
    'tournaments.aliases_title': 'Player aliases',
    'tournaments.aliases_subtitle': 'Enter each participant\'s alias',
    'tournaments.player': 'Player',
    'tournaments.start_local_tournament': 'Start tournament',
    'tournaments.alert_invalid_aliases': 'Invalid aliases',
    'tournaments.match_in_progress': 'Match in progress...',
    'tournaments.returning': 'Returning to tournament...',
    
    // Intro
    'intro.tagline': 'The next-gen Pong',
    
    // Settings
    'settings': 'Settings',
    'settings.title': 'Account settings',
    'settings.avatar_hint': 'Click to change your avatar',
    'settings.name': 'Username',
    'settings.email': 'Email',
    'settings.change_password': 'Change password',
    'settings.new_password': 'New password',
    'settings.confirm_password': 'Confirm password',
    'settings.password_hint': 'Leave empty to keep current password',
    'settings.save': 'Save changes',
    'settings.blocked_users': 'Blocked users',
    'settings.no_blocked_users': 'No blocked users',
    'settings.danger_zone': 'Danger zone',
    'settings.delete_account': 'Delete my account',
    'settings.delete_warning': 'This action is irreversible. All your data will be deleted.',
    'settings.unblock': 'Unblock',
    
    // Profile
    'profile.offline': 'Offline',
    'profile.online': 'Online',
    'profile.statistics': 'Statistics',
    'profile.games_played': 'Games played',
    'profile.win_rate': 'Win rate',
    'profile.wins': 'Wins',
    'profile.losses': 'Losses',
    'profile.add_friend': 'Add friend',
    'profile.remove_friend': 'Remove friend',
    'profile.send_message': 'Send message',
    'profile.block': 'Block',
    
    // Accessibility
    'accessibility.title': 'Accessibility',
    'accessibility.close': 'Close',
    'accessibility.high_contrast': 'High contrast',
    'accessibility.high_contrast_desc': 'Improves readability with contrasting colors',
    'accessibility.font_size': 'Text size',
    'accessibility.font_size_desc': 'Adjust character size',
    'accessibility.reduced_motion': 'Reduce animations',
    'accessibility.reduced_motion_desc': 'Disables animations and transitions',
    'accessibility.focus_highlight': 'Focus highlight',
    'accessibility.focus_highlight_desc': 'Highlights the active element when using keyboard',
    'accessibility.keyboard_shortcuts': 'Keyboard shortcuts',
    'accessibility.shortcut_navigate': 'Navigate',
    'accessibility.shortcut_activate': 'Activate',
    'accessibility.shortcut_close': 'Close',
    'accessibility.skip_to_content': 'Skip to main content',
    'accessibility.contrast_enabled': 'High contrast enabled',
    'accessibility.contrast_disabled': 'High contrast disabled',
    'accessibility.font_size_changed': 'Text size changed',
    'accessibility.motion_reduced': 'Animations reduced',
    'accessibility.motion_enabled': 'Animations enabled',
    'accessibility.focus_enabled': 'Focus highlight enabled',
    'accessibility.focus_disabled': 'Focus highlight disabled',
    
    // Logout
    'logout': 'Log out',
  },
  
  es: {
    // App
    'app.title': 'ft_transcendance',
    
    // Navigation
    'nav.play': 'Jugar',
    'nav.tournaments': 'Torneos',
    'nav.chat': 'Chat',
    'nav.friends': 'Amigos',
    'nav.stats': 'Estadísticas',
    'nav.login': 'Iniciar sesión',
    'nav.signup': 'Registrarse',
    'nav.language': 'Idioma',
    'nav.contrast': 'Alto contraste',
    'nav.social': 'Social',
    
    // Footer
    'footer.copy': '© 2025 ft_transcendence - Ecole 42',
    'footer.about': 'Acerca de',
    'footer.rules': 'Reglas',
    'footer.contact': 'Contacto',
    
    // Auth
    'auth.login': 'Iniciar sesión',
    'auth.signup': 'Registrarse',
    'auth.email': 'Correo electrónico',
    'auth.password': 'Contraseña',
    'auth.username': 'Nombre de usuario',
    'auth.remember': 'Recordarme',
    'auth.login_submit': 'Iniciar sesión',
    'auth.no_account': '¿No tienes cuenta?',
    'auth.create_account': 'Crear una cuenta',
    'auth.have_account': '¿Ya tienes cuenta?',
    'auth.login_link': 'Iniciar sesión',
    'auth.terms': 'Acepto los términos de servicio',
    'auth.signup_submit': 'Registrarse',
    'auth.or_continue': 'o continuar con',
    'auth.oauth_42': 'Iniciar sesión con 42',
    'auth.email_placeholder': 'tu@email.com',
    'auth.password_placeholder': '••••••••',
    'auth.username_placeholder': 'tu_usuario',
    
    // Home
    'home.game_title': 'Pong Arena',
    'home.status_online': 'En línea',
    'home.status_offline': 'Desconectado',
    'home.players_online': '42 jugadores conectados',
    'home.players_waiting': 'esperando',
    'home.game_area_placeholder': 'Área de juego - Próximamente',
    'home.controls': '⌨️ W/S o ↑/↓ - Mover',
    'home.first_to': '🎯 Primero en 11 puntos',
    'home.settings': '⚙️ Configuración',
    'home.quick_stats': 'Estadísticas rápidas',
    'home.view_all': 'Ver todo',
    'home.stat_games': 'Partidas jugadas',
    'home.stat_wins': 'Victorias',
    'home.stat_rank': 'Clasificación',
    'home.stat_tournaments': 'Torneos ganados',
    'home.controls_move': 'W/S o ↑/↓ - Mover',
    'home.controls_start': 'ESPACIO - Iniciar',
    'home.controls_pause': 'ESC - Pausa',
    'home.btn_solo': 'Solo',
    'home.btn_local': 'PvP Local',
    'home.btn_pvp': 'PvP Online',
    'home.difficulty_easy': 'Fácil',
    'home.difficulty_normal': 'Normal',
    'home.difficulty_hard': 'Difícil',
    
    // Game messages
    'game.choose_mode': 'Elige un modo de juego',
    'game.select_mode_below': 'Selecciona un modo abajo',
    'game.tournament_match': 'Partido de Torneo',
    'game.waiting_opponent': 'Esperando oponente...',
    'game.connecting': 'Conectando...',
    'game.press_space_start': 'Presiona ESPACIO para empezar',
    'game.paused': 'PAUSA',
    'game.press_esc_resume': 'Presiona ESC para continuar',
    'game.opponent_disconnected': 'OPONENTE DESCONECTADO',
    'game.waiting_reconnection': 'Esperando reconexión...',
    'game.victory': '🏆 ¡Victoria!',
    'game.defeat': 'Derrotado',
    'game.you_advance': '¡Avanzas! Volviendo al torneo...',
    'game.you_advance_tournament': '¡Avanzas! Volviendo al torneo...',
    'game.returning_tournament': 'Volviendo al torneo...',
    'game.you_win_space': '¡Ganas! Presiona ESPACIO para un nuevo juego',
    'game.press_space_restart': 'Presiona ESPACIO para reiniciar',
    'game.left_wins': '¡Izquierda gana!',
    'game.right_wins': '¡Derecha gana!',
    'game.wins': 'gana',
    
    // Stats
    'stats.title': 'Estadísticas',
    'stats.subtitle': 'Consulta tus estadísticas de juego y tu progreso',
    'stats.games_played': 'Partidas jugadas',
    'stats.win_rate': 'Tasa de victorias',
    'stats.global_rank': 'Clasificación global',
    'stats.tournaments_won': 'Torneos ganados',
    'stats.game_stats_title': 'Estadísticas de juego',
    'stats.wins': 'Victorias',
    'stats.losses': 'Derrotas',
    'stats.points_scored': 'Puntos anotados',
    'stats.points_allowed': 'Puntos recibidos',
    'stats.performance_title': 'Rendimiento',
    'stats.best_score': 'Mejor puntuación',
    'stats.worst_score': 'Peor puntuación',
    'stats.streak': 'Racha de victorias',
    'stats.winrate_evolution': 'Evolución del winrate',
    'stats.recent_games': 'Partidas recientes',
    'stats.table_type': 'Tipo',
    'stats.table_opponent': 'Oponente',
    'stats.table_score': 'Puntuación',
    'stats.table_result': 'Resultado',
    'stats.table_date': 'Fecha',
    'stats.no_data': 'Sin datos por el momento',
    'stats.no_games': 'Ninguna partida jugada',
    'stats.login_required': 'Inicia sesión para ver tus estadísticas',
    'stats.login_required_title': 'Inicio de sesión requerido',
    'stats.login_required_desc': 'Inicia sesión para acceder a tus estadísticas detalladas y seguir tu progreso.',
    'stats.error': 'Error al cargar las estadísticas',
    'stats.result_win': 'Victoria',
    'stats.result_loss': 'Derrota',
    
    // Friends
    'friends.title': 'Mis Amigos',
    'friends.subtitle': 'Gestiona tus amigos y consulta sus perfiles',
    'friends.list_title': 'Lista de amigos',
    'friends.empty_title': 'Aún no tienes amigos',
    'friends.empty_subtitle': '¡Invita a otros jugadores para empezar a construir tu red!',
    'friends.blocked_title': 'Usuarios bloqueados',
    'friends.blocked_empty_title': 'Sin usuarios bloqueados',
    'friends.blocked_empty_subtitle': 'Los usuarios bloqueados aparecerán aquí',
    'friends.my_friends': 'Mis amigos',
    'friends.no_friends': 'Sin amigos aún',
    'friends.search_to_add': '¡Busca usuarios para añadir amigos!',
    
    // Chat / Social
    'chat.direct': 'Directo',
    'chat.tournaments': 'Torneos',
    'chat.search_placeholder': 'Buscar...',
    'chat.no_direct': 'Sin conversaciones directas',
    'chat.tournament_notifications': 'Notificaciones de torneos',
    'chat.tournament_notifications_desc': 'Alertas y próximos partidos',
    'chat.tournament_general': 'Chat general',
    'chat.tournament_general_desc': 'Discusiones de torneos',
    'chat.select_conversation': 'Selecciona una conversación',
    'chat.select_subtitle': '-',
    'chat.view_profile': 'Ver perfil',
    'chat.invite_play': 'Invitar a jugar',
    'chat.block_user': 'Bloquear usuario',
    'chat.welcome': '💬 Selecciona una conversación para comenzar',
    'chat.welcome_subtitle': 'O inicia una nueva discusión',
    'chat.message_placeholder': 'Escribe tu mensaje...',
    'chat.send': 'Enviar',
    'chat.conversations': 'Conversaciones',
    'chat.search_conversations': 'Buscar conversaciones...',
    'chat.no_conversations': 'Sin conversaciones',
    'chat.start_chatting': '¡Empieza a chatear con un amigo!',
    'chat.select_to_start': 'Selecciona una conversación para empezar',
    'chat.search_friend': '¡O busca un amigo para chatear!',
    'chat.type_message': 'Escribe un mensaje...',
    'chat.search_users': 'Buscar usuarios...',
    'chat.search_results': 'RESULTADOS DE BÚSQUEDA',
    
    // Tournaments
    'tournaments.title': 'Torneos',
    'tournaments.create': 'Crear un torneo',
    'tournaments.subtitle': 'Participa en torneos y enfréntate a otros jugadores',
    'tournaments.active': 'Torneos en curso',
    'tournaments.available': 'Torneos disponibles',
    'tournaments.past': 'Torneos terminados',
    'tournaments.none_active': 'Sin torneos en curso',
    'tournaments.none_active_sub': 'Los torneos activos aparecerán aquí',
    'tournaments.none_available': 'Sin torneos disponibles',
    'tournaments.none_available_sub': 'Espera o crea un nuevo torneo',
    'tournaments.none_past': 'Sin torneos terminados',
    'tournaments.none_past_sub': 'El historial de torneos aparecerá aquí',
    'tournaments.back': '← Volver a torneos',
    'tournaments.waiting_players': 'Esperando jugadores',
    'tournaments.players': 'Jugadores:',
    'tournaments.format': 'Formato:',
    'tournaments.players_format': 'jugadores',
    'tournaments.current_match': 'Partido actual:',
    'tournaments.participants': 'Participantes',
    'tournaments.bracket': 'Bracket',
    'tournaments.create_title': 'Crear un torneo',
    'tournaments.name_label': 'Nombre del torneo (opcional)',
    'tournaments.name_placeholder': 'Ej: Torneo del fin de semana',
    'tournaments.player_count': 'Número de jugadores',
    'tournaments.test': 'prueba',
    'tournaments.alias_label': 'Tu alias para este torneo',
    'tournaments.alias_placeholder': 'Ingresa tu alias',
    'tournaments.alias_hint': 'Este nombre se mostrará durante el torneo',
    'tournaments.create_btn': 'Crear torneo',
    'tournaments.join_title': 'Unirse al torneo',
    'tournaments.join_btn': 'Unirse',
    'tournaments.view_btn': 'Ver',
    'tournaments.leave_btn': 'Salir',
    'tournaments.play_match': '🎮 Jugar mi partido',
    'tournaments.created_by': 'Creado por',
    'tournaments.status_waiting': 'En espera',
    'tournaments.status_in_progress': 'En curso',
    'tournaments.status_finished': 'Terminado',
    'tournaments.you': '(tú)',
    'tournaments.slot_waiting': 'Esperando...',
    'tournaments.winner': 'Ganador',
    'tournaments.round_quarters': 'Cuartos de final',
    'tournaments.round_semis': 'Semifinales',
    'tournaments.round_final': 'Final',
    'tournaments.confirm_leave': '¿Estás seguro de que quieres salir de este torneo?',
    'tournaments.alert_deleted': 'Este torneo ha sido eliminado',
    'tournaments.alert_enter_alias': 'Por favor ingresa un alias',
    'tournaments.alert_create_error': 'Error al crear el torneo',
    'tournaments.alert_connection_error': 'Error de conexión',
    'tournaments.alert_join_error': 'Error al unirse al torneo',
    'tournaments.alert_not_in_tournament': 'No estás en este torneo',
    'tournaments.alert_error': 'Error',
    'tournaments.alert_not_found': 'Torneo no encontrado',
    // Local tournaments
    'tournaments.mode_label': 'Modo de juego',
    'tournaments.mode_online': 'En línea',
    'tournaments.mode_local': 'Local',
    'tournaments.local_hint': '⚠️ Todos los jugadores jugarán en este dispositivo (W/S vs ↑/↓)',
    'tournaments.aliases_title': 'Alias de los jugadores',
    'tournaments.aliases_subtitle': 'Ingresa el alias de cada participante',
    'tournaments.player': 'Jugador',
    'tournaments.start_local_tournament': 'Iniciar torneo',
    'tournaments.alert_invalid_aliases': 'Alias inválidos',
    'tournaments.match_in_progress': 'Partido en curso...',
    'tournaments.returning': 'Volviendo al torneo...',
    
    // Intro
    'intro.tagline': 'El Pong de nueva generación',
    
    // Settings
    'settings': 'Configuración',
    'settings.title': 'Configuración de la cuenta',
    'settings.avatar_hint': 'Haz clic para cambiar tu avatar',
    'settings.name': 'Nombre de usuario',
    'settings.email': 'Correo electrónico',
    'settings.change_password': 'Cambiar contraseña',
    'settings.new_password': 'Nueva contraseña',
    'settings.confirm_password': 'Confirmar contraseña',
    'settings.password_hint': 'Deja vacío para mantener la contraseña actual',
    'settings.save': 'Guardar cambios',
    'settings.blocked_users': 'Usuarios bloqueados',
    'settings.no_blocked_users': 'Sin usuarios bloqueados',
    'settings.danger_zone': 'Zona de peligro',
    'settings.delete_account': 'Eliminar mi cuenta',
    'settings.delete_warning': 'Esta acción es irreversible. Todos tus datos serán eliminados.',
    'settings.unblock': 'Desbloquear',
    
    // Profile
    'profile.offline': 'Desconectado',
    'profile.online': 'En línea',
    'profile.statistics': 'Estadísticas',
    'profile.games_played': 'Partidas jugadas',
    'profile.win_rate': 'Tasa de victorias',
    'profile.wins': 'Victorias',
    'profile.losses': 'Derrotas',
    'profile.add_friend': 'Añadir amigo',
    'profile.remove_friend': 'Eliminar amigo',
    'profile.send_message': 'Enviar mensaje',
    'profile.block': 'Bloquear',
    
    // Accessibility
    'accessibility.title': 'Accesibilidad',
    'accessibility.close': 'Cerrar',
    'accessibility.high_contrast': 'Alto contraste',
    'accessibility.high_contrast_desc': 'Mejora la legibilidad con colores contrastados',
    'accessibility.font_size': 'Tamaño del texto',
    'accessibility.font_size_desc': 'Ajustar el tamaño de los caracteres',
    'accessibility.reduced_motion': 'Reducir animaciones',
    'accessibility.reduced_motion_desc': 'Desactiva las animaciones y transiciones',
    'accessibility.focus_highlight': 'Resaltar foco',
    'accessibility.focus_highlight_desc': 'Resalta el elemento activo al usar el teclado',
    'accessibility.keyboard_shortcuts': 'Atajos de teclado',
    'accessibility.shortcut_navigate': 'Navegar',
    'accessibility.shortcut_activate': 'Activar',
    'accessibility.shortcut_close': 'Cerrar',
    'accessibility.skip_to_content': 'Ir al contenido principal',
    'accessibility.contrast_enabled': 'Alto contraste activado',
    'accessibility.contrast_disabled': 'Alto contraste desactivado',
    'accessibility.font_size_changed': 'Tamaño del texto modificado',
    'accessibility.motion_reduced': 'Animaciones reducidas',
    'accessibility.motion_enabled': 'Animaciones activadas',
    'accessibility.focus_enabled': 'Resaltado del foco activado',
    'accessibility.focus_disabled': 'Resaltado del foco desactivado',
    
    // Logout
    'logout': 'Cerrar sesión',
  }
};

let currentLang: SupportedLang = DEFAULT_LANG;

function resolveLanguage(lang: string): SupportedLang {
  if (SUPPORTED_LANGS.includes(lang as SupportedLang)) {
    return lang as SupportedLang;
  }
  return DEFAULT_LANG;
}

function translate(key: string): string {
  const translation = translations[currentLang]?.[key] ?? translations[DEFAULT_LANG]?.[key];

  if (!translation) {
    // Fallback humain : transformer la clé en texte lisible
    console.warn(`[i18n] Missing translation for key: ${key}`);
    return key.split('.').pop()?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || key;
  }

  return translation;
}

function applyTranslations(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = translate(key);
    }
  });

  root.querySelectorAll<HTMLElement>('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
      el.placeholder = translate(key);
    }
  });

  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      el.setAttribute('title', translate(key));
    }
  });

  const title = document.querySelector('title[data-i18n]');
  if (title) {
    title.textContent = translate('app.title');
  } else {
    document.title = translate('app.title');
  }
}

function updateFlagSelection(): void {
  // Update the main button text to show current language
  const currentLangBtn = document.getElementById('current-lang');
  if (currentLangBtn) {
    currentLangBtn.textContent = currentLang.toUpperCase();
  }

  // Legacy support for old flag buttons (if any)
  const flags = document.querySelectorAll<HTMLButtonElement>('.lang-flag');
  flags.forEach((flag) => {
    const lang = flag.getAttribute('data-lang');
    if (lang === currentLang) {
      flag.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'ring-offset-neutral-900');
    } else {
      flag.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'ring-offset-neutral-900');
    }
  });
}

function setLanguage(lang: string, persist = true): void {
  currentLang = resolveLanguage(lang);
  document.documentElement.lang = currentLang;
  if (persist) {
    localStorage.setItem(STORAGE_KEY, currentLang);
  }
  applyTranslations(document);
  updateFlagSelection();
}

function getLanguage(): string {
  return currentLang;
}

function bindControls(): void {
  // Language dropdown toggle
  const languageBtn = document.getElementById('btn-language');
  const languageMenu = document.getElementById('language-menu');

  if (languageBtn && languageMenu) {
    languageBtn.onclick = (e) => {
      e.stopPropagation();
      const isHidden = languageMenu.classList.contains('hidden');
      languageMenu.classList.toggle('hidden', !isHidden);
      languageBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    };

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!languageMenu.contains(e.target as Node) && !languageBtn.contains(e.target as Node)) {
        languageMenu.classList.add('hidden');
        languageBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Bind language options
  const langOptions = document.querySelectorAll<HTMLButtonElement>('.lang-option');
  langOptions.forEach((option) => {
    option.onclick = () => {
      const lang = option.getAttribute('data-lang');
      if (lang) {
        setLanguage(lang);
        // Close menu after selection
        if (languageMenu) {
          languageMenu.classList.add('hidden');
          languageBtn?.setAttribute('aria-expanded', 'false');
        }
      }
    };
  });

  // Legacy flag buttons support (if any)
  const flags = document.querySelectorAll<HTMLButtonElement>('.lang-flag');
  flags.forEach((flag) => {
    flag.onclick = () => {
      const lang = flag.getAttribute('data-lang');
      if (lang) {
        setLanguage(lang);
      }
    };
  });

  // Legacy select support (if still present)
  const select = document.getElementById('lang-select') as HTMLSelectElement | null;
  if (select) {
    select.value = currentLang;
    select.onchange = () => setLanguage(select.value);
  }

  updateFlagSelection();
}

function init(): void {
  const stored = localStorage.getItem(STORAGE_KEY);
  const browserLang = navigator.language?.toLowerCase();
  let inferred: SupportedLang = 'en';
  
  if (browserLang?.startsWith('fr')) {
    inferred = 'fr';
  } else if (browserLang?.startsWith('es')) {
    inferred = 'es';
  }
  
  const initial = resolveLanguage(stored || inferred);
  setLanguage(initial, false);
  bindControls();
}

function refresh(): void {
  applyTranslations(document);
  bindControls();
}

export const I18n = {
  init,
  refresh,
  applyTranslations,
  setLanguage,
  getLanguage,
  translate,
};