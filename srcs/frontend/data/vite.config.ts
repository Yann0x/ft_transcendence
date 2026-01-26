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
    // copies static assets
    copyPublicDir: true,
    assetsInlineLimit: 0
  },
  plugins: [
    {
      name: 'copy-to-build',
      // dev server serves from src; copy only after build
      writeBundle() {
        // after build, copy static HTML files
        const srcPath = path.resolve(__dirname, 'src')
        const buildPath = path.resolve(__dirname, 'build')
        
        // copy components and pages folders
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
      protocol: 'wss',
      host: 'localhost',
      clientPort: 8080,
    },
    watch: {
      usePolling: true,
      interval: 200,
      ignored: ['**/build/**','**/node_modules/**','**/.git/**'],
    },
  }

})