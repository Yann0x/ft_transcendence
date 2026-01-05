type TranslationMap = Record<string, string>;

const STORAGE_KEY = 'language';
const DEFAULT_LANG = 'fr';
const SUPPORTED_LANGS = ['fr', 'en'] as const;

const translations: Record<(typeof SUPPORTED_LANGS)[number], TranslationMap> = {
  fr: {
    'app.title': 'ft_transcendance',
    'nav.play': 'Jouer',
    'nav.tournaments': 'Tournois',
    'nav.chat': 'Chat',
    'nav.friends': 'Amis',
    'nav.stats': 'Stats',
    'nav.login': 'Connexion',
    'nav.signup': 'Inscription',
    'nav.language': 'Langue',
    'nav.contrast': 'Contraste élevé',
    'footer.copy': '© 2025 ft_transcendence - École 42',
    'footer.about': 'À propos',
    'footer.rules': 'Règles',
    'footer.contact': 'Contact',
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
    'home.game_title': 'Pong Arena',
    'home.status_online': 'En ligne',
    'home.players_online': '42 joueurs connectés',
    'home.game_area_placeholder': 'Zone de jeu - À implémenter',
    'home.controls': '⌨️ W/S ou ↑/↓ - Déplacer',
    'home.first_to': '🎯 Premier à 11 points',
    'home.settings': '⚙️ Paramètres',
    'home.stat_games': 'Parties jouées',
    'home.stat_wins': 'Victoires',
    'home.stat_rank': 'Classement',
    'home.stat_tournaments': 'Tournois gagnés',
    'stats.title': 'Mes Statistiques',
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
    'stats.elo': 'ELO',
    'stats.recent_games': 'Dernières parties',
    'stats.table_opponent': 'Adversaire',
    'stats.table_score': 'Score',
    'stats.table_result': 'Résultat',
    'stats.table_date': 'Date',
    'stats.no_data': 'Aucune donnée pour le moment',
    'friends.title': 'Mes Amis',
    'friends.subtitle': 'Gérez vos amis et consultez leur profil',
    'friends.list_title': 'Liste des amis',
    'friends.empty_title': "Vous n'avez pas encore d'amis",
    'friends.empty_subtitle': "Invitez d'autres joueurs pour commencer à construire votre réseau !",
    'friends.blocked_title': 'Utilisateurs bloqués',
    'friends.blocked_empty_title': 'Aucun utilisateur bloqué',
    'friends.blocked_empty_subtitle': 'Les utilisateurs bloqués apparaîtront ici',
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
    'tournaments.title': 'Tournois',
    'tournaments.create': '+ Créer un tournoi',
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
    'intro.tagline': 'Le Pong nouvelle génération',
  },
  en: {
    'app.title': 'ft_transcendance',
    'nav.play': 'Play',
    'nav.tournaments': 'Tournaments',
    'nav.chat': 'Chat',
    'nav.friends': 'Friends',
    'nav.stats': 'Stats',
    'nav.login': 'Log in',
    'nav.signup': 'Sign up',
    'nav.language': 'Language',
    'nav.contrast': 'High contrast',
    'footer.copy': '© 2025 ft_transcendence - Ecole 42',
    'footer.about': 'About',
    'footer.rules': 'Rules',
    'footer.contact': 'Contact',
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
    'home.game_title': 'Pong Arena',
    'home.status_online': 'Online',
    'home.players_online': '42 players online',
    'home.game_area_placeholder': 'Game area - Coming soon',
    'home.controls': '⌨️ W/S or ↑/↓ - Move',
    'home.first_to': '🎯 First to 11 points',
    'home.settings': '⚙️ Settings',
    'home.stat_games': 'Games played',
    'home.stat_wins': 'Wins',
    'home.stat_rank': 'Rank',
    'home.stat_tournaments': 'Tournaments won',
    'stats.title': 'My Stats',
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
    'stats.elo': 'ELO',
    'stats.recent_games': 'Recent games',
    'stats.table_opponent': 'Opponent',
    'stats.table_score': 'Score',
    'stats.table_result': 'Result',
    'stats.table_date': 'Date',
    'stats.no_data': 'No data yet',
    'friends.title': 'My Friends',
    'friends.subtitle': 'Manage your friends and view their profiles',
    'friends.list_title': 'Friends list',
    'friends.empty_title': "You don't have friends yet",
    'friends.empty_subtitle': 'Invite other players to start building your network!',
    'friends.blocked_title': 'Blocked users',
    'friends.blocked_empty_title': 'No blocked users',
    'friends.blocked_empty_subtitle': 'Blocked users will appear here',
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
    'tournaments.title': 'Tournaments',
    'tournaments.create': '+ Create a tournament',
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
    'intro.tagline': 'The next-gen Pong',
  }
};

let currentLang = DEFAULT_LANG;

function resolveLanguage(lang: string): (typeof SUPPORTED_LANGS)[number] {
  if (SUPPORTED_LANGS.includes(lang as (typeof SUPPORTED_LANGS)[number])) {
    return lang as (typeof SUPPORTED_LANGS)[number];
  }
  return DEFAULT_LANG;
}

function translate(key: string): string {
  return translations[currentLang]?.[key] ?? translations[DEFAULT_LANG]?.[key] ?? key;
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

function setLanguage(lang: string, persist = true): void {
  currentLang = resolveLanguage(lang);
  document.documentElement.lang = currentLang;
  if (persist) {
    localStorage.setItem(STORAGE_KEY, currentLang);
  }
  applyTranslations(document);
}

function getLanguage(): string {
  return currentLang;
}

function bindControls(): void {
  const select = document.getElementById('lang-select') as HTMLSelectElement | null;
  if (select) {
    select.value = currentLang;
    select.onchange = () => setLanguage(select.value);
  }
}

function init(): void {
  const stored = localStorage.getItem(STORAGE_KEY);
  const inferred = navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
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
};
