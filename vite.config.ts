import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        target: 'es2022', // 支持 top-level await
        rollupOptions: {
          output: {
            manualChunks: undefined,
          },
        },
        // 確保靜態文件被複製
        copyPublicDir: true,
      },
      // 將 .md 文件視為靜態資源
      publicDir: 'public',
      assetsInclude: ['**/*.md'],
      esbuild: {
        target: 'es2022', // 確保 esbuild 也使用正確的目標
      },
    };
});
