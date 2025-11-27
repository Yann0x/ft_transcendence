#!/bin/bash
# Script de setup automatique pour ft_transcendance
# Usage: ./setup.sh ou bash setup.sh

set -e

echo "🚀 Initialisation de ft_transcendance..."

# Creation .env si necessaire
if [ ! -f srcs/.env ]; then 
    cat << eof > srcs/.env
DISP_ORANGE="\e[38;2;200;30;30m"
DISP_BOLD="\e[1m"
DISP_DFLT="\e[0m"
eof
fi

# Installation de nvm si nécessaire
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    echo "📦 Installation de nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi

# Charger nvm
. "$NVM_DIR/nvm.sh"

# Installation de Node.js 24 si nécessaire
if ! nvm use 24 2>/dev/null; then
    echo "📦 Installation de Node.js 24..."
    nvm install 24
fi
nvm use 24

echo "✅ Initialisation terminé !"
