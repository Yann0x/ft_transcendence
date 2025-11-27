import { defineConfig } from 'vite'
import path from 'path'
import { copyFileSync, mkdirSync } from 'fs'

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
    }
  },
  plugins: [
    {
      name: 'copy-html-files',
      closeBundle() {
        // Copy components
        mkdirSync(path.resolve(__dirname, 'build/components'), { recursive: true });
        copyFileSync(
          path.resolve(__dirname, 'src/components/navbar.html'),
          path.resolve(__dirname, 'build/components/navbar.html')
        );
        copyFileSync(
          path.resolve(__dirname, 'src/components/footer.html'),
          path.resolve(__dirname, 'build/components/footer.html')
        );
        
        // Copy pages
        mkdirSync(path.resolve(__dirname, 'build/pages'), { recursive: true });
        copyFileSync(
          path.resolve(__dirname, 'src/pages/home.html'),
          path.resolve(__dirname, 'build/pages/home.html')
        );
        
        // Copy CSS files
        mkdirSync(path.resolve(__dirname, 'build/css'), { recursive: true });
        copyFileSync(
          path.resolve(__dirname, 'src/css/animations.css'),
          path.resolve(__dirname, 'build/css/animations.css')
        );
        copyFileSync(
          path.resolve(__dirname, 'src/css/components.css'),
          path.resolve(__dirname, 'build/css/components.css')
        );
      }
    }
  ],
  server: {
    host: true,
    port: 3000,
    strictPort: true
  }
})
