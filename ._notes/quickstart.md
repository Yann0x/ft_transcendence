## Structure

Le  backend est divisé en microservices. Ca facilite le développement en séparant bien chaque fonctions. en plus c un module majeur cado.

Le seul point d'entré du backend se fait via le service **proxy**. C'est le seul à avoir un port ouvert sur l'exterieur (8080). 
Tous les autres services sont reliés par un réseau docker.  

```bash
[bat] (~/42/ft_transcendance)$ tree -L3
├── Makefile
├── setup.sh
└── srcs
    ├── backend
    │   ├── authenticate # gestion de l'authentification
    │   ├── chat  
    │   ├── database 
    │   ├── game    # << Gestion du jeu 
    │   ├── proxy   # << Point d'entrée du serveur
    │   ├── shared  # << Contient les fichiers partagés <-- Ce dossier est un cas spécial
    │   └── user    # << gestion du jeu 
    ├── docker-compose.yaml
    └── frontend
        ├── data
        ├── Dockerfile
        └── entrypoint.sh

12 directories, 5 files
```

Chaque service est un mini serveur. Ils ont tous la meme structure donc c'est facile d'en rajouter ou d'en enlever un :
```bash 
[bat] (~/42/ft_transcendance/srcs/backend/proxy)$ tree
.
├── data
│   ├── package.json
│   ├── package-lock.json
│   ├── src
|   |   └── shared/
│   │   └── proxy.ts
│   └── tsconfig.json
├── Dockerfile
└── entrypoint.sh

3 directories, 6 files
```
-> Le dossier **./data/** présent dans chaque service est monté à la racine du container. quand on lance le container il va dans data, install les dépendances spécifiées dans package.json et il lance le service avec npm start ou npm run dev. C'est pratique parce que je peux lancer le service comme si il etait dans le container juste en me placant dand **./data** et en installant les dépendances de la meme maniere.  

-> Le dossier shared est un cas spécial. Parce que chaque service est isolé des autres du fait de l'architecture du  backend et qu'on a quand meme besoin d'avoir une base commune pour leurs permettre d'interagir, tous les fichiers communs aux différents services (comme les définitions des types/classes) sont placés dans le dossier **/backend/shared/** qui sera monté à l'éxecution dans le dossier **data/src/shared** de chaque service. 
Attention ducoup à bien modifier ces fichiers dans le dossier source **backend/shared**. Si les container sont lancés peut importe si on modifie dans le dossier source on son alias dans un service spécifique, la modification se fera partout mais je crois que si on modifie dans un service alors que le service est stoppé, quand on le lancera la copy du dossier source /backend/shared dans /*service/data/src/shared va surremtn ecraser les modifs. (A Verifier en vrais jsp)
### Focus sur proxy

Chaque requete sur le localhost:8080 va arriver sur le containeur **proxy** en fonction du endpoint de la requette, il redirigera vers le service visé. 
Par exemple si tu fait http://localhost:8080/api/user/login le proxy redirige la requette vers le service **user** qui lui recevra la requete  sur le endpoint **/login**.


-> **Pour tester en local t'as juste a aller dans le dossier data, et tu peux lancer le service comme si c'etait dans le containeur.**

 Il faut juste penser que les paths sont diférents. Par exemple pour acceder aux fichiers du frontend depuis le container, il faudra monter le dossier frontend/data/build dans le container et donc les chemins d'accès dependent de l'environnement d'execution.
 


C'est comme ca quil va rediriger vers chaque service (la c user):
```typescript 
server.register(proxy, {
  upstream: 'http://user:3000',
  prefix: '/api/user',
  rewritePrefix: '/',
  http2: false
})
```

### Focus Frontend

***-> Les modifs dans le front sont compilles immediatements et visible dans le navigateur.***

```bash 
[bat] (~/42/ft_transcendance/srcs/frontend)$ tree
├── data
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── src
│   │   ├── app.ts
│   │   ├── components
│   │   │   ├── footer.html
│   │   │   └── navbar.html
│   │   ├── css
│   │   │   ├── animations.css
│   │   │   └── components.css
│   │   ├── index.html
│   │   ├── intro.ts
│   │   ├── pages
│   │   │   └── home.html
│   │   └── styles
│   │       └── input.css
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── Dockerfile
└── entrypoint.sh
```

--- 