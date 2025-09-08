// prettier-ignore
import './src/env'; // Ensure dotenv loads before other imports
import { fileURLToPath, URL } from 'node:url';

import { PrimeVueResolver } from '@primevue/auto-import-resolver';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';
import vueDevTools from 'vite-plugin-vue-devtools';

console.log('API SERVER: ' + process.env.API_SERVER);

export default defineConfig({
    build: {
        minify: false,
        sourcemap: true
    },
    define: {
        __API_SERVER__: JSON.stringify(process.env.API_SERVER)
    },
    optimizeDeps: {
        //noDiscovery: true
    },
    plugins: [
        vue(),
        vueDevTools(),
        Components({
            resolvers: [PrimeVueResolver()]
        })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    server: {
        proxy: {
            '/apixxxx/signIn': {
                target: 'http://localhhhhoxst:3002',
                changeOrigin: true, // Ensures the Host header matches the target
                rewrite: (path) => path.replace(/^\/api/, '') // Optional, adjusts the request path
            },
            '/api': {
                target: process.env.API_SERVER || 'http://localhost:3002',
                changeOrigin: true,
                secure: false
            },
            '/api/signIn': 'http://locaffffflhost:3002'
        }
    },
    esbuild: {
        tsconfigRaw: {
            compilerOptions: {
                experimentalDecorators: true
            }
        }
    }
});
