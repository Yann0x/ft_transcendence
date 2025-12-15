import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs-extra'

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../build',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/index.html')
      }
    },
    // Copie les assets statiques
    copyPublicDir: true,
    assetsInlineLimit: 0
  },
  plugins: [
    {
      name: 'copy-to-build',
      // Dev server serves from src; copy only after build.
      writeBundle() {
        // Après le build, copie les fichiers HTML statiques
        const srcPath = path.resolve(__dirname, 'src')
        const buildPath = path.resolve(__dirname, 'build')
        
        // Copie les dossiers components et pages
        const foldersToСopy = ['components', 'pages', 'css']
        foldersToСopy.forEach(folder => {
          const src = path.join(srcPath, folder)
          const dest = path.join(buildPath, folder)
          if (fs.existsSync(src)) {
            fs.copySync(src, dest)
            console.log(`Copied ${folder}/ to build`)
          }
        })
        
        console.log('Build completed, files written to:', buildPath)
      }
    }
  ],
  server: {
    host: true,
    allowedHosts: true,
    port: 3000,
    strictPort: true,
    hmr: {
      host: 'localhost',
      clientPort: 8080,
      protocol: 'ws',
    },
    watch: {
      usePolling: true,
      interval: 200,
      ignored: ['**/build/**','**/node_modules/**','**/.git/**'],
    },
  }

})