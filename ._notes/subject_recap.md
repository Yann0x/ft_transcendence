# Proposition de sélection des modules

## Web (20 / 30 pts)

- ✅ **Major – Backend** : Fastify + Node.js (10 pts)
  - Utilisation obligatoire de **Fastify avec Node.js** comme framework backend.
  - Respect des contraintes générales de sécurité (HTTPS, validation des inputs, pas de credentials en clair).
  - Le backend par défaut en PHP devient obsolète si ce module est validé.

- ✅ **Minor – Base de données** : SQLite (5 pts)
  - **Toutes** les instances de base de données du projet doivent être en **SQLite**.
  - Schéma cohérent entre modules (users, matchs, tournois, chat, stats…).
  - Peut être prérequis pour d’autres modules (ex. backend framework, blockchain).

- ✅ **Minor – Frontend** : TypeScript + Tailwind CSS (et rien d’autre) (5 pts)
  - Front obligatoire en **TypeScript** + **Tailwind CSS**, aucun autre framework CSS global.
  - SPA respectant les contraintes de navigation (back/forward du navigateur).
  - Toute la mise en forme passe par Tailwind (classes utilitaires).

- ⭐ **Major – Blockchain** : Avalanche (enregistrement des scores de tournois sur la blockchain) (10 pts)
  - Stockage des **scores de tournois** sur une blockchain **Avalanche** en environnement de test.
  - Écriture de **smart contracts en Solidity** pour enregistrer / lire les scores.
  - Intégration backend (Fastify) pour appeler la blockchain et exposer les données au front.

---

## User management (20 / 20 pts)

- ✅ **Major – Gestion standard des utilisateurs** : comptes, profil, amis, historique, statistiques (10 pts)
  - Inscription / login sécurisés avec gestion cohérente des duplicates (email / username).
  - **Display name unique** pour les tournois, profil éditable + avatar (avec valeur par défaut).
  - Gestion des **amis** + statut en ligne, affichage des stats (wins / losses).
  - **Match history** détaillée (1v1, date, infos) accessible aux utilisateurs connectés.

- ✅ **Major – Authentification distante** : OAuth2 (Google, GitHub, etc.) (10 pts)
  - Intégration d’un provider OAuth2 (Google, GitHub, …) pour login externe.
  - Récupération des credentials auprès du provider + gestion sécurisée des tokens.
  - Flow login/consent clair côté UI et échanges sécurisés d’infos utilisateur.

---

## Gameplay & UX (30 / 45 pts)

- ✅ **Major – Joueurs distants** : jeu en ligne entre deux machines (10 pts)
  - Deux joueurs sur **deux machines différentes**, jouant la **même partie de Pong** via le site.
  - Gestion des **déconnexions, lag, resync** pour une UX correcte.
  - Synchronisation en temps réel (WebSocket ou équivalent) de la balle et des paddles.

- ✅ **Major – Deuxième jeu avec historique & matchmaking** (10 pts)
  - Nouveau jeu distinct de Pong (ex. Flappy Bird ou Flipper-like) pour diversifier la plateforme.
  - **Jeu solo** avec **leaderboard**.
  - **Historique par utilisateur** pour ce jeu (scores, parties, etc.).
  - Système de **matchmaking / recherche de partie** (même si solo → file / classement).

- ✅ **Major – Chat en direct** : messages privés, invitations depuis le chat, etc. (10 pts)
  - **DM** entre utilisateurs + possibilité de **bloquer** un user (plus de messages visibles).
  - Invitation à une partie de Pong directement depuis le chat.
  - Notifications de tournoi (prochain match) via le chat.
  - Accès aux **profils** d’autres joueurs via l’interface de chat.

- ❓ **Major – Multijoueur > 2 joueurs** : Pong à 4 côtés ou similaire (10 pts)
  - Permettre **plus de 2 joueurs** dans une même partie, tous en contrôle live.
  - Design libre : ex. plateau carré avec 4 côtés, un paddle par côté.
  - Forte dépendance au module “Remote players” pour la synchro temps réel.

- ❓ **Minor – Personnalisation du jeu** : power-ups, skins, vitesses, etc. (5 pts)
  - Options de **customisation** pour tous les jeux : power-ups, attaques, cartes, vitesses…
  - Possibilité pour l’utilisateur de choisir une **version “simple”** sans bonus.
  - UI de réglages pour ajuster facilement les paramètres de jeu.
  - Doit rester cohérent entre tous les jeux disponibles sur la plateforme.

---

## AI / Algo (15 / 15 pts)

- ✅ **Major – IA adversaire** : IA qui simule le clavier, rafraîchie 1 fois/s (10 pts)
  - IA qui **simule des touches clavier**, pas de cheat direct sur la position du paddle.
  - L’IA ne voit le jeu que **1 fois par seconde**, elle doit donc **anticiper** rebonds et trajectoires.
  - Interdiction d’utiliser **A\***, mais l’IA doit être **capable de gagner** parfois.
  - Si le module customisation est activé, l’IA doit aussi **gérer les power-ups**.

- ✅ **Minor – Dashboards de stats** : statistiques utilisateurs et parties (5 pts)
  - Dashboards pour stats **utilisateur** (winrate, séries, temps de jeu, etc.).
  - Dashboards pour stats **par partie** : résultats, durée, scores, historique.
  - Visualisations type **graphes / charts** pour rendre ça lisible.

---

## Accessibilité (10 / 15 pts)

- ✅ **Minor – Support multi-appareils** : responsive propre (5 pts)
  - Site responsive (desktop, laptop, tablette, mobile) avec layout adapté.
  - Navigation possible via souris, clavier, écran tactile selon le device.

- ✅ **Minor – Accessibilité pour déficients visuels** : texte alternatif, contraste, navigation clavier… (5 pts)
  - Support des **screen readers** et technologies d’assistance.
  - **Alt text** descriptifs pour les images, contrastes lisibles.
  - Navigation au **clavier** avec focus clair + options de taille de texte.

- ❓ **Minor – Compatibilité navigateur étendue** : support officiel Firefox + Chrome (5 pts)
  - Support stable d’un **navigateur additionnel** (ex. Chrome en plus de Firefox).
  - Campagne de tests + correction des soucis de rendu spécifiques.
  - Expérience utilisateur homogène sur tous les navigateurs supportés.

---

## Cyber / Sécurité (5 / 25 pts)

- ✅ **Minor – RGPD** : anonymisation, suppression de compte (5 pts)
  - Fonctionnalités pour **anonymiser** les données personnelles sur demande.
  - Gestion locale des données : voir / éditer / supprimer ses infos.
  - Procédure de **suppression de compte** avec effacement des données associées.

- ❓ **Major – Protection avancée** : WAF + ModSecurity + Vault ? (10 pts)
  - Mise en place d’un **WAF** + **ModSecurity** avec configuration durcie contre les attaques web.
  - Intégration de **HashiCorp Vault** pour gérer les secrets (API keys, creds, variables d’environnement) de façon chiffrée.
  - Isolation des secrets hors code / repo, intégration propre avec Docker.

- ❓ **Major – Authentification renforcée** : JWT + 2FA ? (10 pts)
  - Ajout d’une **2FA** (TOTP, email, SMS…) en plus du mot de passe.
  - Utilisation de **JWT** pour l’authentification / autorisation et gestion des sessions.
  - Gestion sécurisée du cycle de vie des tokens (émission, validation, expiry, révocation).

---

## Devops (0 / 25 pts)

- ❌ **Major – Infrastructure de logs ELK** : Elasticsearch + Logstash + Kibana (10 pts)
  - Déployer un stack complet ELK pour centraliser, indexer et visualiser tous les logs.
  - Demande plusieurs services Docker, de la config réseau, de la sécurité et de la gestion de volume.
  - Coût en temps très élevé pour un gain limité par rapport aux autres modules que vous avez choisis.

- ❓ **Minor – Monitoring system** : Prometheus + Grafana (5 pts)
  - Déployer Prometheus et Grafana pour collecter des métriques (HTTP, erreurs, temps de réponse, etc.).
  - Exposer quelques métriques depuis le backend (Fastify) et la base (SQLite via exporter ou metrics custom).
  - Créer 1–2 dashboards simples (uptime, nombre de parties, erreurs) + éventuellement quelques règles d’alerte.
  - Module raisonnable si une personne prend le sujet en main dès le début et reste disciplinée sur les métriques.

- ❌ **Major – Backend en microservices** : architecture microservices (10 pts)
  - Découper le backend en plusieurs services (auth, game, chat, matchmaking, etc.) avec APIs entre eux.
  - Complexifie fortement le Docker, la communication, la sécurité et le déploiement.
  - Très formateur mais change toute l’architecture et augmente beaucoup le risque de ne pas finir le reste.

---

## Récap global

- **Web** : 20 / 30 pts  
- **User management** : 20 / 20 pts  
- **Gameplay & UX** : 30 / 45 pts  
- **AI / Algo** : 15 / 15 pts  
- **Accessibilité** : 10 / 15 pts  
- **Cyber / Sécurité** : 5 / 25 pts  

**Total obtenu** : 100 / 150 pts  
- ✅ Modules prévus / validés : **100 pts**  
- ⭐ Bonus potentiels : **10 pts** (Blockchain)  
- ❓ Modules optionnels / à décider : **40 pts**

