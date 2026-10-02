import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    publicDir: false, // We serve static files from root
    
    // Build output to dist folder
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: 'index.html'
            }
        },
        // Copy additional assets
        copyPublicDir: true
    },
    
    // Dev server
    server: {
        port: 5173,
        open: true,
        cors: true
    },
    
    // Environment variables (VITE_* prefix exposed to client)
    envPrefix: 'VITE_',
    
    // Resolve aliases
    resolve: {
        alias: {
            '@': '/'
        }
    },
    
    // Optimize deps
    optimizeDeps: {
        include: ['@supabase/supabase-js']
    },
    
    // CSS handling
    css: {
        postcss: {}
    }
});