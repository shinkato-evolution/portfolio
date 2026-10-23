import { defineConfig, type Plugin } from 'vite';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Site multi-pages : l'accueil, les pages utilitaires et une page statique par projet.
const projets = Object.fromEntries(
  readdirSync(resolve(import.meta.dirname, 'projets'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => [`projets/${f.replace('.html', '')}`, resolve(import.meta.dirname, 'projets', f)]),
);

// Le site est publié dans un sous-dossier (GitHub Pages : /portfolio/). SITE_BASE le donne au moment de la construction ; en local, la racine suffit.
const base = process.env.SITE_BASE ?? '/';

// Vite préfixe lui-même les images, vidéos et scripts, mais pas les liens <a href="/..."> : on les complète ici.
const liensAvecBase: Plugin = {
  name: 'liens-avec-base',
  transformIndexHtml: (html) => (base === '/' ? html : html.replace(/(<a[^>]*?\shref=")\/(?!\/)/g, `$1${base}`)),
};

export default defineConfig({
  base,
  plugins: [liensAvecBase],
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
