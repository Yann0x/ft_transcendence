# Pong Game - Roadmap

---

## Phase 0 : Setup [FRONT]

- [x] Créer le canvas avec support DPR
      *devicePixelRatio pour un rendu net, scale le context en conséquence*
- [x] Implémenter resizeCanvas qui met à jour le viewport
      *au resize de la fenêtre, met à jour la taille du canvas et state.viewport*
- [x] Créer la classe Clock avec dt clamp (max 50ms)
      *dt = delta time, temps écoulé depuis la dernière frame en ms*
      *empêche un dt énorme après changement d'onglet qui causerait une téléportation*
- [x] Ajouter un accumulator pour le fixed tick futur
      *accumulator = temps accumulé non consommé entre frames*
      *stocke le temps restant pour une physique consistante plus tard*
- [x] Définir FIXED_DT (16.666ms) et MAX_STEPS (5)
      *FIXED_DT = pas de temps fixe pour la physique (~60Hz)*
      *MAX_STEPS = limite de ticks physiques par frame, évite la spirale de la mort si le jeu lag*
- [x] Définir le state initial en world units
      *state = objet central contenant tout l'état du jeu (ball, paddles, score, etc.)*
      *world units = pixels logiques indépendants du DPR, pas pixels physiques*
- [x] Setup update(state, dt) qui appelle une liste de systems vide
- [x] Setup render(state) comme fonction pure
      *render lit le state, ne le modifie jamais*
- [x] Afficher un texte "ready" centré

**Test :**
- Texte "Ready" visible et centré
- Canvas responsive au resize de fenêtre (pas du message READY, pas de resize pour le moment)

---

## Phase 1 : Renderer [FRONT]

- [x] Implémenter le helper drawRect
- [x] Implémenter le helper drawCircle
- [x] Implémenter le helper drawNet
      *ligne verticale pointillée au centre*
- [x] Implémenter le helper drawText
      *avec options font, color, align*
- [x] Ajouter debug toggle : showFPS
- [x] Ajouter debug toggle : showHitboxes
- [x] Ajouter debug toggle : slowMo (0.25x)
      *multiplie dt par le facteur slowMo*

**Test :**
- Rectangle s'affiche correctement
- Filet affiché au centre
- Compteur FPS visible quand activé

---

## Phase 2 : Entities [FRONT + BACK shared types]

- [ ] Définir le type Ball (x, y, radius, vx, vy)
- [ ] Définir le type Paddle (x, y, width, height)
- [ ] Définir le type Net (x, dashHeight, dashGap)
- [ ] Ajouter ball au state
- [ ] Ajouter le tableau paddles au state
- [ ] Ajouter net au state
- [ ] Extraire les tailles dans des constantes config
      *PADDLE_WIDTH, BALL_RADIUS, PADDLE_SPEED, etc. au même endroit*

**Test :**
- Toutes les entités visibles aux bonnes positions
- Tailles correspondent aux proportions attendues

---

## Phase 3 : Loop [FRONT]

- [ ] Implémenter gameLoop avec requestAnimationFrame
- [ ] Intégrer Clock.tick qui retourne le dt clampé
- [ ] Appeler update(state, dt) à chaque frame
- [ ] Appeler render(state) après update
- [ ] Vérifier que l'accumulator est prêt pour le fixed tick
      *pas encore utilisé, juste s'assurer que la structure le permet*

**Test :**
- 60fps stable
- Pas de memory leaks (heap stable)
- FPS s'affiche correctement en debug

---

## Phase 4 : Mouvement de la balle [BACK authoritative, FRONT prediction]

- [ ] [BACK] Implémenter updateBall : position += velocity * dt
- [ ] [BACK] Implémenter bounceWalls : inverser vy sur top/bottom
      *vérifier ball.y contre 0 et la hauteur du canvas*
- [ ] [BACK] Ajouter EPS et clamp vitesses (VX_MIN, VX_MAX, VY_MAX)
      *EPS = epsilon, petite valeur pour éviter divisions par zéro (~0.0001)*
      *VX_MIN = vitesse horizontale minimale pour éviter balle quasi-verticale*
      *VX_MAX, VY_MAX = vitesses maximales pour garder le jeu jouable*
- [ ] [FRONT] Copie locale pour prédiction/interpolation

**Test :**
- La balle rebondit correctement sur les murs
- Vitesse constante quel que soit le framerate
- Pas de téléportation après changement d'onglet

---

## Phase 5 : Input [FRONT capture, BACK validation]

- [ ] [FRONT] Implémenter bindKeyboard qui remplit le Set keysDown
      *keysDown = Set des touches actuellement enfoncées*
      *keydown ajoute, keyup retire*
- [ ] [FRONT] Définir le type InputState
- [ ] [FRONT] Implémenter input.sample() qui produit un état up/down propre
      *état figé pour le tick courant, utile pour frameId et serveur*
- [ ] [FRONT] Contrôles Joueur 1 : touches W/S
- [ ] [FRONT] Contrôles Joueur 2 : touches Flèche Haut/Bas
      *les deux joueurs sur le même clavier pour le jeu local*
- [ ] [BACK] Valider et appliquer les inputs reçus
- [ ] [BACK] Clamp les positions des paddles dans les limites
- [ ] [FRONT] Ajouter debug : touche R reset le rally

**Test :**
- Les deux paddles bougent de façon fluide
- Pas de problèmes de key repeat
- Les paddles s'arrêtent aux limites
- 2 joueurs peuvent jouer sur le même clavier

---

## Phase 6 : Collision [BACK authoritative]

- [ ] [BACK] Implémenter circleRectCollision qui retourne un bool
      *AABB = Axis-Aligned Bounding Box, rectangle non-pivoté*
      *intersection cercle vs AABB*
- [ ] [BACK] Implémenter resolveCollision avec push-out
      *push-out = déplacer la balle hors du paddle pour éviter qu'elle reste coincée*
- [ ] [BACK] Ajouter une vérification de direction pour éviter le double rebond
      *rebondir seulement si la balle va vers le paddle*
- [ ] [BACK] Calculer l'angle de rebond basé sur le point d'impact
      *l'offset par rapport au centre du paddle affecte vy*
- [ ] [BACK] Garantir |vx| >= VX_MIN après rebond paddle
      *évite balle quasi-verticale qui rend le jeu bizarre*
- [ ] [FRONT] Afficher hitboxes en mode debug

**Test :**
- Rebonds consistants sur les paddles
- Pas de bugs balle-coincée-dans-paddle
- Hitboxes visibles en mode debug

---

## Phase 7 : Score [BACK authoritative]

- [ ] [BACK] Ajouter l'objet score au state (left, right)
- [ ] [BACK] Implémenter checkGoal qui détecte sortie gauche/droite
- [ ] [BACK] Implémenter resetRally qui repositionne la balle
      *balle au centre, direction aléatoire ou alternée*
- [ ] [FRONT] Implémenter renderScore dans le HUD
- [ ] [BACK] Alterner la direction du service
- [ ] [BACK] Définir les règles de fin : 11 points, pas de règle "2 pts d'écart"
      *choix assumé : premier à 11 gagne, simple et prévisible*
- [ ] [FRONT] Afficher le gagnant et l'écran de fin de partie

**Test :**
- Le score s'incrémente correctement
- La balle reset au centre
- La partie se termine à 11 points
- Le gagnant est affiché clairement

---

## Phase 8 : AI [BACK]

- [ ] [BACK] Implémenter perception (1Hz) : snapshot des positions/vélocités
      *l'IA ne "voit" l'état du jeu qu'une fois par seconde*
- [ ] [BACK] Implémenter decision (1Hz) : prédire la trajectoire avec rebonds muraux
      *calculer où sera la balle quand elle atteindra le paddle*
- [ ] [BACK] Implémenter action (par frame) : touches virtuelles up/down
      *l'IA produit des appuis de touches, pas une position directe*
- [ ] [BACK] Ajouter une limite de vitesse max au paddle IA
      *même vitesse que les joueurs humains - exigence du sujet*
- [ ] [BACK] Ajouter une erreur aléatoire pour rendre l'IA battable
      *léger offset sur la position cible*
- [ ] [BACK] Si la balle s'éloigne (vx de signe opposé), l'IA revient au centre
      *évite jitter inutile quand la balle va vers l'adversaire*

**Test :**
- IA battable mais peut gagner
- Pas de téléportation du paddle
- Mouvement humain

---

## Phase 9a : Protocole réseau [BACK + FRONT shared]

- [ ] [FRONT/BACK] Définir le message input : { matchId, playerId, frameId, up, down }
- [ ] [FRONT/BACK] Définir le message state : { matchId, serverTick, lastProcessedInputId, ball, paddles, score }
      *facilite debug et reconnexion*
- [ ] [FRONT/BACK] Implémenter la sérialisation des messages
- [ ] [FRONT] Implémenter la mesure ping/latence
- [ ] [BACK] Créer un fake local server pour les tests
      *tourne dans le même process, simule un délai réseau*

**Test :**
- Les messages se sérialisent/désérialisent correctement
- Latence mesurée avec précision
- Le fake server simule le gameplay

---

## Phase 9b : Sync client [FRONT]

- [ ] [FRONT] Créer un buffer de snapshots (2-3 frames)
      *snapshot = copie complète de l'état du jeu à un instant t*
      *stocker les états serveur récents pour l'interpolation*
- [ ] [FRONT] Implémenter l'interpolation entre snapshots
      *interpolation = calculer une position intermédiaire entre deux snapshots*
      *render entre deux états connus pour la fluidité*
- [ ] [FRONT] Interpoler positions (ball, paddles) mais pas score/events
      *score et événements sont "step", pas interpolés*
- [ ] [FRONT] Gérer la déconnexion proprement
- [ ] [FRONT] Implémenter la logique de reconnexion

**Test :**
- Rendu fluide malgré la latence
- Deux machines jouent la même partie
- Reconnexion fonctionne dans le timeout

---

## Phase 9c : Prédiction (optionnel) [FRONT]

- [ ] [FRONT] Prédire le paddle local depuis les inputs
      *appliquer les inputs localement avant confirmation serveur*
- [ ] [FRONT] Réconcilier avec les snapshots serveur
      *réconciliation = corriger l'état local quand le serveur diverge*
- [ ] [FRONT] Rollback en cas de divergence
      *rollback = revenir à un état passé puis rejouer les inputs*

**Test :**
- Le paddle local est réactif
- Pas de glitchs visuels à la réconciliation

---

## Phase 10a : Queue [BACK]

- [ ] [BACK] Implémenter joinQueue
- [ ] [BACK] Implémenter leaveQueue
- [ ] [BACK] Ajouter un timeout de 30s auto-remove
- [ ] [FRONT] UI pour rejoindre/quitter la queue

**Test :**
- Les joueurs peuvent rejoindre/quitter la queue
- Le timeout retire les joueurs inactifs

---

## Phase 10b : Pairing [BACK]

- [ ] [BACK] Créer une room quand 2 joueurs sont matchés
- [ ] [BACK] Assigner les rôles left/right
- [ ] [BACK] Notifier les deux clients
- [ ] [FRONT] Afficher le match trouvé

**Test :**
- Match créé avec 2 joueurs
- Rôles assignés correctement

---

## Phase 10c : Lifecycle [BACK + FRONT]

- [ ] [BACK] Gérer la fin de match avec les résultats
- [ ] [BACK] Implémenter l'option rematch
- [ ] [BACK] Gérer l'abandon sur déconnexion
- [ ] [BACK] Permettre la reconnexion dans les 10s
- [ ] [FRONT] UI fin de match (résultats, rematch, quitter)

**Test :**
- 3 clients : 1 match + 1 en attente
- Déconnexion gérée proprement

---

## Phase 11 : Tournois [BACK + FRONT + BLOCKCHAIN]

- [ ] [FRONT] Saisie d'alias au début du tournoi
      *chaque joueur entre son alias, reset pour un nouveau tournoi*
- [ ] [BACK] Implémenter le système de bracket (4/8 joueurs)
- [ ] [FRONT] Afficher le bracket : qui joue contre qui, ordre des matchs
- [ ] [BACK] Le matchmaking annonce le prochain match
- [ ] [BACK] Envoyer des notifications pour le prochain match
- [ ]  Écrire le smart contract Solidity pour le stockage des scores
      *stocker les scores de tournoi sur Avalanche testnet*
- [ ]  Déployer sur Avalanche testnet
- [ ] [BACK] Enregistrer les résultats finaux du tournoi on-chain
- [ ] [FRONT] Lire les scores depuis la blockchain dans le frontend

**Test :**
- Tournoi 4 joueurs complet
- Bracket s'affiche correctement
- Prochain match annoncé
- Scores enregistrés sur la blockchain
- Scores lisibles depuis le frontend

---

## Phase 12 : Customisation (optionnel) [BACK + FRONT]

- [ ] [BACK] Ajouter un système de power-ups
      *speed boost, changement de taille du paddle, etc.*
- [ ] [BACK] Ajouter des vitesses configurables
- [ ] [FRONT] Ajouter des skins paddle/ball
- [ ] [FRONT] Ajouter un toggle "simple mode"
      *désactive tous les extras pour une expérience classique*
- [ ] [BACK] Faire gérer les power-ups par l'IA
      *obligatoire si ce module est activé*

**Test :**
- Les power-ups fonctionnent de façon consistante
- Le simple mode désactive tous les extras
- L'IA s'adapte aux power-ups
