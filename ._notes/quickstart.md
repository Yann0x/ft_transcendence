## Structure

En gros chaque requete sur le localhost:8080 va arriver sur le containeur **proxy** en fonction du endpoint de la requette, il redirigera vers le service visé. 
Par exemple si tu fait http://localhost:8080/api/user/login le proxy redirige la requette vers le service **user** qui lui recevra la requete  sur le endpoint **/login**.
```bash
[bat] (~/42/ft_transcendance)$ tree -L3
.
├── Makefile
├── setup.sh
└── srcs
    ├── backend
    │   ├── authenticate
    │   ├── chat
    │   ├── game
    │   ├── proxy # << Cest lui le seul point d'acces au backend
    │   └── user
    ├── docker-compose.yaml
    └── frontend
        ├── data
        ├── Dockerfile
        └── entrypoint.sh
```
### Focus sur proxy

En gros c'est la meme structure pour chaque service. quand on lance le  container, le dossier ./data est monté à la racine, il fait `npm i`  pour installer les dependances `npm build` pour compiler le ficher.ts vers build/fichier.js et `npm start` pour lancer le service. 

-> **Pour tester en local t'as juste a aller dans le dossier data, et tu peux lancer le service comme si c'etait dans le containeur.**

 Il faut juste penser que les paths sont diférents. Par exemple pour acceder aux fichiers du frontend depuis le container, il faudra monter le dossier frontend/data/build dans le container et donc les chemins d'accès dependent de l'environnement d'execution.
 

```bash 
[bat] (~/42/ft_transcendance/srcs/backend/proxy)$ tree
.
├── data
│   ├── package.json
│   ├── package-lock.json
│   ├── src
│   │   └── proxy.ts
│   └── tsconfig.json
├── Dockerfile
└── entrypoint.sh

3 directories, 6 files
```

En gros, chaque service est un mini serveur. Ca C'est une partie du code du proxy pour montrer comment ca se presente quand il recoit une requette.


C'est comme ca quil va rediriger vers chaque service (la c user):
```typescript 
server.register(proxy, {
  upstream: 'http://user:3000',
  prefix: '/api/user',
  rewritePrefix: '/',
  http2: false
})
```

Et ca c'est le fallback par défault
```typescript 
server.setNotFoundHandler((request, reply) => {
  reply.sendFile('index.html')
})
```
la boucle d'écoute :

```typescript 
server.listen({ port: 8080, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})
```

### Focus Frontend

** -> Les modifs dans le front sont compilles immediatements et visible dans le navigateur.**

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

J'ai envoyé un fichier backend_api.md dans la conv discord pour quon se synchro sur le format des requêtes front/back. C'est gpt qui l'a fait donc c'est pour avoir une idée l'ai meme pas lu en entier encore. Mais si on le mets a jour et quon s'y tiens a peut pres on pourra merge nos taf sans galeres et bien se séparer les taches. 

Breef jespere vous voyez un peut plus clair hesitez pas a modif ou quoi.. cassez tout si il faut 