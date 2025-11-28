# Cluster installation

## Installing nvm to run the latest node version in cluster
``` bash 
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

nvm install 24
```

## Installing needed dependencies
```bash 
npm i fastify
npm i -D typescript @types/node

```

# Running server
```bash
# install dependencies (first time launch)
npm i 

# compile typescript file.ts to build/file.js
npm run build

launch server
npm start
```