import { defineConfig } from 'vite';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Site multi-pages : l'accueil, les pages utilitaires et une page statique par projet.
const projets = Object.fromEntries(
  readdirSync(resolve(import.meta.dirname, 'projets'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => [`projets/${f.replace('.html', '')}`, resolve(import.meta.dirname, 'projets', f)]),
);

export default defineConfig({
  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        lire: resolve(import.meta.dirname, 'lire.html'),
        '404': resolve(import.meta.dirname, '404.html'),
        'mentions-legales': resolve(import.meta.dirname, 'mentions-legales.html'),
        ...projets,
      },
    },
  },
});
