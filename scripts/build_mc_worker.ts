import { build } from 'vite';
await build({ configFile: false, build: {
  ssr: 'src/lib/server/monte-carlo/worker-entry.ts',
  outDir: '.mc-worker', emptyOutDir: true, target: 'node22',
  rollupOptions: { output: { entryFileNames: 'worker-entry.js' } },
} });
