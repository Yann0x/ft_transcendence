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
