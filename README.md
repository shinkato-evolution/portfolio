# Portfolio jeu — « Créateur d'expériences ludiques — Niveau 16 »

Plan complet : `C:\Users\gonca\.claude\plans\top-on-a-woolly-mist.md`. État : **J0 (squelette) et J1 (acte 1 en formes grises)**.

## Commandes

```powershell
cd C:\Users\gonca\Desktop\portfolio-jeu
npm install          # une seule fois
npm run dev          # développement : http://localhost:5173 (rechargement automatique)
npm run build        # génère les pages, vérifie le TypeScript, construit dist/
npm run preview      # aperçu local du site construit : http://localhost:4173
```

## Où modifier quoi

| Quoi | Où |
|---|---|
| Textes des 7 projets (titre, pitch, emblème, geste, fiche) | `src/content/projets.json` puis `npm run gen` (ou `build`) |
| Qui je suis, parcours, outils, méthode, contact | `index.html` (section `<main id="lire">`) |
| Pages projet `/projets/<id>.html`, sitemap, robots.txt | **générés** par `scripts/generer.mjs` : ne pas les éditer à la main |
| Adresse du site (canonical, sitemap, JSON-LD) | `src/content/projets.json` → `site.url`, puis `npm run build` |
| Acte 1 : défilement, aimant, commandes | `src/act1/chemin.ts` |
| Acte 1 : dessin PixiJS (formes grises → sprites en J2) | `src/act1/monde.ts` |
| Scène de portail (provisoire → vraie en J3) | `src/scene/provisoire.ts` |
| Brisure / acte 2 (J5) | `src/break/`, `src/act2/` |

Tout texte marqué **[À VALIDER]** attend Tristan (textes définitifs : `prod/textes-portails.md`).

## Mettre en ligne (à faire par Tristan — rien n'est publié)

### Netlify (recommandé : `netlify.toml` est prêt)
1. Créer un compte gratuit sur https://app.netlify.com (connexion avec GitHub ou e-mail).
2. Dans PowerShell :
   ```powershell
   cd C:\Users\gonca\Desktop\portfolio-jeu
   npx netlify-cli login            # ouvre le navigateur : autoriser l'accès
   npx netlify-cli init             # « Create & configure a new project », choisir un nom (ex. tristan-portfolio-jeu)
   npx netlify-cli deploy --build   # brouillon : donne une adresse d'essai à vérifier
   npx netlify-cli deploy --build --prod   # mise en ligne réelle
   ```
   Variante sans terminal : `npm run build`, puis glisser le dossier `dist` sur https://app.netlify.com/drop.
3. Noter l'adresse obtenue (ex. `https://tristan-portfolio-jeu.netlify.app`), la mettre dans `src/content/projets.json` → `site.url`, puis refaire `npx netlify-cli deploy --build --prod`.
4. Compléter l'adresse de l'hébergeur dans `mentions-legales.html` (marquée [À VALIDER]).
5. Soumettre `https://<adresse>/sitemap.xml` dans Google Search Console et Bing Webmaster Tools.

### Vercel (alternative : `vercel.json` est prêt)
```powershell
npx vercel login
npx vercel          # aperçu
npx vercel --prod   # mise en ligne
```
Puis mêmes étapes 3 à 5 (adresse en `.vercel.app`, hébergeur Vercel Inc. dans les mentions légales).

## Budgets mesurés (J1, `npm run build`)
- JS initial (bloquant, `index-*.js` : GSAP + ScrollTrigger + Lenis + logique) : ~53 Ko gzip.
- PixiJS chargé en différé juste après (`import()`) : ~157 Ko gzip ; total JS du premier écran ~210 Ko gzip.
- Three.js : absent.
