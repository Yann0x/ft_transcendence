# Pong Game - Roadmap

---

## Phase 0 : Setup

- [x] Créer le canvas avec support DPR
      *devicePixelRatio pour un rendu net, scale le context en conséquence*
- [x] Implémenter resizeCanvas qui met à jour le viewport
      *au resize de la fenêtre, met à jour la taille du canvas et state.viewport*
- [ ] Créer la classe Clock avec dt clamp (max 50ms)
      *dt = delta time, temps écoulé depuis la dernière frame en ms*
      *empêche un dt énorme après changement d'onglet qui causerait une téléportation*
- [ ] Ajouter un accumulator pour le fixed tick futur
      *accumulator = temps accumulé non consommé entre frames*
      *stocke le temps restant pour une physique consistante plus tard*
- [ ] Définir FIXED_DT (16.666ms) et MAX_STEPS (5)
      *FIXED_DT = pas de temps fixe pour la physique (~60Hz)*
      *MAX_STEPS = limite de ticks physiques par frame, évite la spirale de la mort si le jeu lag*
- [ ] Définir le state initial en world units
      *state = objet central contenant tout l'état du jeu (ball, paddles, score, etc.)*
      *world units = pixels logiques indépendants du DPR, pas pixels physiques*
- [ ] Setup update(state, dt) qui appelle une liste de systems vide
- [ ] Setup render(state) comme fonction pure
      *render lit le state, ne le modifie jamais*
- [ ] Afficher un texte "ready" centré

**Test :**
- Canvas responsive au resize de fenêtre
- Rendu net sur écrans retina
- Texte "Ready" visible et centré

---

## Phase 1 : Renderer

- [ ] Implémenter le helper drawRect
- [ ] Implémenter le helper drawCircle
- [ ] Implémenter le helper drawNet
      *ligne verticale pointillée au centre*
- [ ] Implémenter le helper drawText
      *avec options font, color, align*
- [ ] Ajouter debug toggle : showFPS
- [ ] Ajouter debug toggle : showHitboxes
- [ ] Ajouter debug toggle : slowMo (0.25x)
      *multiplie dt par le facteur slowMo*

**Test :**
- Rectangle s'affiche correctement
- Filet affiché au centre
- Compteur FPS visible quand activé

---

## Phase 2 : Entities

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

## Phase 3 : Loop

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

## Phase 4 : Mouvement de la balle

- [ ] Implémenter updateBall : position += velocity * dt
- [ ] Implémenter bounceWalls : inverser vy sur top/bottom
      *vérifier ball.y contre 0 et la hauteur du canvas*
- [ ] Ajouter EPS et clamp vitesses (VX_MIN, VX_MAX, VY_MAX)
      *EPS = epsilon, petite valeur pour éviter divisions par zéro (~0.0001)*
      *VX_MIN = vitesse horizontale minimale pour éviter balle quasi-verticale*
      *VX_MAX, VY_MAX = vitesses maximales pour garder le jeu jouable*

**Test :**
- La balle rebondit correctement sur les murs
- Vitesse constante quel que soit le framerate
- Pas de téléportation après changement d'onglet

---

## Phase 5 : Input (local 2 joueurs)

- [ ] Implémenter bindKeyboard qui remplit le Set keysDown
      *keysDown = Set des touches actuellement enfoncées*
      *keydown ajoute, keyup retire*
- [ ] Définir le type InputState
- [ ] Implémenter input.sample() qui produit un état up/down propre
      *état figé pour le tick courant, utile pour frameId et serveur*
- [ ] Contrôles Joueur 1 : touches W/S
- [ ] Contrôles Joueur 2 : touches Flèche Haut/Bas
      *les deux joueurs sur le même clavier pour le jeu local*
- [ ] Clamp les positions des paddles dans les limites
- [ ] Ajouter debug : touche R reset le rally

**Test :**
- Les deux paddles bougent de façon fluide
- Pas de problèmes de key repeat
- Les paddles s'arrêtent aux limites
- 2 joueurs peuvent jouer sur le même clavier

---

## Phase 6 : Collision

- [ ] Implémenter circleRectCollision qui retourne un bool
      *AABB = Axis-Aligned Bounding Box, rectangle non-pivoté*
      *intersection cercle vs AABB*
- [ ] Implémenter resolveCollision avec push-out
      *push-out = déplacer la balle hors du paddle pour éviter qu'elle reste coincée*
- [ ] Ajouter une vérification de direction pour éviter le double rebond
      *rebondir seulement si la balle va vers le paddle*
- [ ] Calculer l'angle de rebond basé sur le point d'impact
      *l'offset par rapport au centre du paddle affecte vy*
- [ ] Garantir |vx| >= VX_MIN après rebond paddle
      *évite balle quasi-verticale qui rend le jeu bizarre*

**Test :**
- Rebonds consistants sur les paddles
- Pas de bugs balle-coincée-dans-paddle
- Hitboxes visibles en mode debug

---

## Phase 7 : Score

- [ ] Ajouter l'objet score au state (left, right)
- [ ] Implémenter checkGoal qui détecte sortie gauche/droite
- [ ] Implémenter resetRally qui repositionne la balle
      *balle au centre, direction aléatoire ou alternée*
- [ ] Implémenter renderScore dans le HUD
- [ ] Alterner la direction du service
- [ ] Définir les règles de fin : 11 points, pas de règle "2 pts d'écart"
      *choix assumé : premier à 11 gagne, simple et prévisible*
- [ ] Afficher le gagnant et l'écran de fin de partie

**Test :**
- Le score s'incrémente correctement
- La balle reset au centre
- La partie se termine à 11 points
- Le gagnant est affiché clairement

---

## Phase 8 : AI

- [ ] Implémenter perception (1Hz) : snapshot des positions/vélocités
      *l'IA ne "voit" l'état du jeu qu'une fois par seconde*
- [ ] Implémenter decision (1Hz) : prédire la trajectoire avec rebonds muraux
      *calculer où sera la balle quand elle atteindra le paddle*
- [ ] Implémenter action (par frame) : touches virtuelles up/down
      *l'IA produit des appuis de touches, pas une position directe*
- [ ] Ajouter une limite de vitesse max au paddle IA
      *même vitesse que les joueurs humains - exigence du sujet*
- [ ] Ajouter une erreur aléatoire pour rendre l'IA battable
      *léger offset sur la position cible*
- [ ] Si la balle s'éloigne (vx de signe opposé), l'IA revient au centre
      *évite jitter inutile quand la balle va vers l'adversaire*

**Test :**
- IA battable mais peut gagner
- Pas de téléportation du paddle
- Mouvement humain

---

## Phase 9a : Protocole réseau

- [ ] Définir le message input : { matchId, playerId, frameId, up, down }
- [ ] Définir le message state : { matchId, serverTick, lastProcessedInputId, ball, paddles, score }
      *facilite debug et reconnexion*
- [ ] Implémenter la sérialisation des messages
- [ ] Implémenter la mesure ping/latence
- [ ] Créer un fake local server pour les tests
      *tourne dans le même process, simule un délai réseau*

**Test :**
- Les messages se sérialisent/désérialisent correctement
- Latence mesurée avec précision
- Le fake server simule le gameplay

---

## Phase 9b : Sync client

- [ ] Créer un buffer de snapshots (2-3 frames)
      *snapshot = copie complète de l'état du jeu à un instant t*
      *stocker les états serveur récents pour l'interpolation*
- [ ] Implémenter l'interpolation entre snapshots
      *interpolation = calculer une position intermédiaire entre deux snapshots*
      *render entre deux états connus pour la fluidité*
- [ ] Interpoler positions (ball, paddles) mais pas score/events
      *score et événements sont "step", pas interpolés*
- [ ] Gérer la déconnexion proprement
- [ ] Implémenter la logique de reconnexion

**Test :**
- Rendu fluide malgré la latence
- Deux machines jouent la même partie
- Reconnexion fonctionne dans le timeout

---

## Phase 9c : Prédiction (optionnel)

- [ ] Prédire le paddle local depuis les inputs
      *appliquer les inputs localement avant confirmation serveur*
- [ ] Réconcilier avec les snapshots serveur
      *réconciliation = corriger l'état local quand le serveur diverge*
- [ ] Rollback en cas de divergence
      *rollback = revenir à un état passé puis rejouer les inputs*

**Test :**
- Le paddle local est réactif
- Pas de glitchs visuels à la réconciliation

---

## Phase 10a : Queue

- [ ] Implémenter joinQueue
- [ ] Implémenter leaveQueue
- [ ] Ajouter un timeout de 30s auto-remove

**Test :**
- Les joueurs peuvent rejoindre/quitter la queue
- Le timeout retire les joueurs inactifs

---

## Phase 10b : Pairing

- [ ] Créer une room quand 2 joueurs sont matchés
- [ ] Assigner les rôles left/right
- [ ] Notifier les deux clients

**Test :**
- Match créé avec 2 joueurs
- Rôles assignés correctement

---

## Phase 10c : Lifecycle

- [ ] Gérer la fin de match avec les résultats
- [ ] Implémenter l'option rematch
- [ ] Gérer l'abandon sur déconnexion
- [ ] Permettre la reconnexion dans les 10s

**Test :**
- 3 clients : 1 match + 1 en attente
- Déconnexion gérée proprement

---

## Phase 11 : Tournois

- [ ] Saisie d'alias au début du tournoi
      *chaque joueur entre son alias, reset pour un nouveau tournoi*
- [ ] Implémenter le système de bracket (4/8 joueurs)
- [ ] Afficher le bracket : qui joue contre qui, ordre des matchs
- [ ] Le matchmaking annonce le prochain match
- [ ] Envoyer des notifications pour le prochain match
- [ ] Écrire le smart contract Solidity pour le stockage des scores
      *stocker les scores de tournoi sur Avalanche testnet*
- [ ] Déployer sur Avalanche testnet
- [ ] Enregistrer les résultats finaux du tournoi on-chain
- [ ] Lire les scores depuis la blockchain dans le frontend

**Test :**
- Tournoi 4 joueurs complet
- Bracket s'affiche correctement
- Prochain match annoncé
- Scores enregistrés sur la blockchain
- Scores lisibles depuis le frontend

---

## Phase 12 : Customisation (optionnel)

- [ ] Ajouter un système de power-ups
      *speed boost, changement de taille du paddle, etc.*
- [ ] Ajouter des vitesses configurables
- [ ] Ajouter des skins paddle/ball
- [ ] Ajouter un toggle "simple mode"
      *désactive tous les extras pour une expérience classique*
- [ ] Faire gérer les power-ups par l'IA
      *obligatoire si ce module est activé*

**Test :**
- Les power-ups fonctionnent de façon consistante
- Le simple mode désactive tous les extras
- L'IA s'adapte aux power-ups
