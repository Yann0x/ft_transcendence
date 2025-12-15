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
      configureServer(server) {
        // Copie initiale du dossier src vers build
        const srcPath = path.resolve(__dirname, 'src')
        const buildPath = path.resolve(__dirname, 'build')
        
        // Watch et copie des changements
        server.watcher.on('all', (event, file) => {
          if (file.startsWith(srcPath)) {
            const relativePath = path.relative(srcPath, file)
            const destPath = path.join(buildPath, relativePath)
            
            // Handle file/directory creation and changes
            if (event === 'add' || event === 'change') {
              fs.copySync(file, destPath)
              console.log(`Copied: ${relativePath}`)
            }
            // Handle directory creation
            else if (event === 'addDir') {
              fs.ensureDirSync(destPath)
              console.log(`Directory created: ${relativePath}`)
            }
            // Handle file deletion
            else if (event === 'unlink') {
              if (fs.existsSync(destPath)) {
                fs.removeSync(destPath)
                console.log(`Deleted file: ${relativePath}`)
              }
            }
            // Handle directory deletion
            else if (event === 'unlinkDir') {
              if (fs.existsSync(destPath)) {
                fs.removeSync(destPath)
                console.log(`Deleted directory: ${relativePath}`)
              }
            }
          }
        })
      },
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
    allowedHosts: 'all',
    port: 3000,
    strictPort: true,
    hmr: {
      host: process.env.VITE_HMR_HOST || 'localhost', // service name in docker-compose
      port: 3000,
      protocol: 'wss'
    },
    watch: {
      usePolling: true,   // reliable in Docker
      interval: 200
    },

  }

})