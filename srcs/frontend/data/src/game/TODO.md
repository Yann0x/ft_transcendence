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
- [x] Ajouter debug toggle : showFPS (touche F)
- [x] Ajouter debug toggle : showHitboxes (touche H)

**Test :**
- Rectangle s'affiche correctement
- Filet affiché au centre
- Compteur FPS visible quand activé

---

## Phase 2 : Entities [FRONT + BACK shared types]

- [x] Définir le type Ball (x, y, radius, vx, vy)
- [x] Définir le type Paddle (x, y, width, height)
- [x] Définir le type Net (x, dashHeight, dashGap)
- [x] Ajouter ball au state
- [x] Ajouter le tableau paddles au state
- [x] Ajouter net au state
- [x] Extraire les tailles dans des constantes config
      *PADDLE_WIDTH, BALL_RADIUS, PADDLE_SPEED, etc. au même endroit*

**Test :**
- Toutes les entités visibles aux bonnes positions
- Tailles correspondent aux proportions attendues

---

## Phase 3 : Loop [FRONT]

- [x] Implémenter gameLoop avec requestAnimationFrame
- [x] Intégrer Clock.tick qui retourne le dt clampé
- [x] Appeler update(state, dt) à chaque frame
- [x] Appeler render(state) après update
- [x] Vérifier que l'accumulator est prêt pour le fixed tick
      *pas encore utilisé, juste s'assurer que la structure le permet*

**Test :**
- 60fps stable
- Pas de memory leaks (heap stable)
- FPS s'affiche correctement en debug

---

## Phase 4 : Mouvement de la balle [FRONT local, BACK later]

- [x] Implémenter updateBall : position += velocity * dt
- [x] Implémenter bounceWalls : inverser vy sur top/bottom
- [x] Ajouter check de direction pour éviter double rebond
- [x] Implémenter velocityFromAngle et randomStartAngle

**Test :**
- La balle rebondit correctement sur les murs
- Vitesse constante quel que soit le framerate
- Pas de téléportation après changement d'onglet

---

## Phase 5 : Input [FRONT local]

- [x] Implémenter bindKeyboard qui remplit le Set keysDown
- [x] Implémenter input.sample() qui produit un état p1/p2 up/down
- [x] Contrôles Joueur 1 : touches W/S
- [x] Contrôles Joueur 2 : touches Flèche Haut/Bas
- [x] Implémenter updatePaddles system
- [x] Clamp les positions des paddles dans les limites
- [x] Ajouter debug : touche R reset la balle

**Test :**
- Les deux paddles bougent de façon fluide
- Pas de problèmes de key repeat
- Les paddles s'arrêtent aux limites
- 2 joueurs peuvent jouer sur le même clavier

---

## Phase 6 : Collision [FRONT local]

- [x] Implémenter circleRectCollision (cercle vs AABB)
- [x] Implémenter bouncePaddles system avec push-out
- [x] Ajouter check de direction pour éviter double rebond
- [x] Calculer l'angle de rebond basé sur le point d'impact
      *l'offset par rapport au centre du paddle affecte vy*
- [x] Ajouter touche H pour afficher hitboxes en debug

**Test :**
- Rebonds consistants sur les paddles
- Pas de bugs balle-coincée-dans-paddle
- Hitboxes visibles en mode debug

---

## Phase 7 : Score [FRONT local]

- [x] Ajouter score au state (left, right)
- [x] Implémenter checkGoal qui détecte sortie gauche/droite
- [x] Reset la balle après un goal (réutiliser resetBall)
- [x] Afficher le score dans le HUD
- [x] Alterner la direction du service après chaque goal
- [x] Fin de partie à 11 points (premier arrivé gagne)
- [x] Afficher le gagnant et permettre de relancer

**Test :**
- Le score s'incrémente correctement
- La balle reset au centre
- La partie se termine à 11 points
- Le gagnant est affiché clairement

---

## Phase 8 : AI [FRONT local]

- [x] Implémenter perception (~1Hz) : l'IA ne voit qu'une fois par seconde
- [x] Implémenter decision : prédire où la balle arrivera (avec rebonds muraux)
- [x] Implémenter action : produire des inputs virtuels up/down
      *l'IA simule des touches clavier, pas une position directe*
- [x] Même vitesse max que les joueurs humains
- [x] Ajouter une erreur aléatoire pour rendre l'IA battable
- [x] Si la balle s'éloigne, l'IA revient au centre
- [x] Toggle AI/2P avec touche A

**Test :**
- IA battable mais peut gagner
- Pas de téléportation du paddle
- Mouvement "humain"

---

## Phase 9 : Game Server [BACK]

*Migrer la physique côté serveur - le serveur fait autorité*

- [ ] [BACK] Setup WebSocket (wss) sur Fastify
- [ ] [BACK] Créer la game loop serveur avec tick rate fixe (~60Hz)
- [ ] [BACK] Migrer la physique : updateBall, bounceWalls, bouncePaddles, checkGoal
- [ ] [BACK] Gérer les rooms (une room = une partie)
- [ ] [BACK] Recevoir les inputs des clients (up/down)
- [ ] [BACK] Broadcaster l'état du jeu aux clients

**Test :**
- Le serveur calcule la physique correctement
- Les clients reçoivent l'état du jeu en temps réel

---

## Phase 10 : Client Network [FRONT]

*Le client devient rendu + inputs seulement*

- [ ] [FRONT] Connexion WebSocket au serveur
- [ ] [FRONT] Envoyer les inputs (up/down) au serveur
- [ ] [FRONT] Recevoir et appliquer l'état du jeu (ball, paddles, score)
- [ ] [FRONT] Créer un buffer de snapshots pour interpolation
- [ ] [FRONT] Implémenter l'interpolation entre snapshots pour fluidité
- [ ] [FRONT] Gérer la déconnexion proprement
- [ ] [FRONT] Mode local vs mode réseau (toggle ou auto-detect)

**Test :**
- Rendu fluide malgré la latence
- Deux machines jouent la même partie
- Reconnexion fonctionne

---

## Phase 11 : Matchmaking [BACK + FRONT]

- [ ] [BACK] Implémenter joinQueue / leaveQueue
- [ ] [BACK] Créer une room quand 2 joueurs sont matchés
- [ ] [BACK] Assigner les rôles left/right
- [ ] [BACK] Notifier les clients du match
- [ ] [BACK] Gérer la fin de match et les résultats
- [ ] [BACK] Gérer l'abandon sur déconnexion (timeout 10s)
- [ ] [FRONT] UI pour rejoindre/quitter la queue
- [ ] [FRONT] Afficher le match trouvé
- [ ] [FRONT] UI fin de match (résultats, rematch, quitter)

**Test :**
- Match créé avec 2 joueurs
- Rôles assignés correctement
- Déconnexion gérée proprement

---

## Phase 12 : Tournois [BACK + FRONT]

- [ ] [FRONT] Saisie d'alias au début du tournoi
      *chaque joueur entre son alias, reset pour un nouveau tournoi*
- [ ] [BACK] Implémenter le système de bracket (4/8 joueurs)
- [ ] [FRONT] Afficher le bracket : qui joue contre qui, ordre des matchs
- [ ] [BACK] Le matchmaking annonce le prochain match
- [ ] [BACK] Envoyer des notifications pour le prochain match

**Test :**
- Tournoi 4 joueurs complet
- Bracket s'affiche correctement
- Prochain match annoncé

---

## Phase 13 : Blockchain [BACK + FRONT]

- [ ] Écrire le smart contract Solidity pour le stockage des scores
      *stocker les scores de tournoi sur Avalanche testnet*
- [ ] Déployer sur Avalanche testnet
- [ ] [BACK] Enregistrer les résultats finaux du tournoi on-chain
- [ ] [FRONT] Lire les scores depuis la blockchain dans le frontend

**Test :**
- Scores enregistrés sur la blockchain
- Scores lisibles depuis le frontend

---

## Phase 14 : Customisation (optionnel) [BACK + FRONT]

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
