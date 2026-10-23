// Génère, depuis src/content/projets.json (source unique) :
//  - la liste des projets et le JSON-LD dans index.html (entre les marqueurs)
//  - une page statique par projet : projets/<id>.html
//  - public/sitemap.xml
// Lancé par « npm run gen », et automatiquement par « npm run dev » et « npm run build ».
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const donnees = JSON.parse(readFileSync(resolve(racine, 'src/content/projets.json'), 'utf8'));
const URL_SITE = donnees.site.url.replace(/\/$/, '');
const projets = donnees.projets;
const MAJ = '2026-10-21';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const personne = {
  '@type': 'Person',
  '@id': `${URL_SITE}/#tristan`,
  name: 'Tristan Gonçalves',
  jobTitle: "Créateur d'expériences ludiques",
  description: "Conçoit des expériences de jeu et les produit en pilotant l'IA générative.",
  email: 'mailto:goncalves.tristan@yahoo.fr',
  url: `${URL_SITE}/`,
  sameAs: ['https://www.linkedin.com/in/tristan-goncalves-956854103/'],
  address: { '@type': 'PostalAddress', addressLocality: 'Castillon-Savès', addressRegion: 'Occitanie', addressCountry: 'FR' },
  knowsLanguage: ['fr', 'en'],
};

const oeuvre = (p) => ({
  '@type': 'CreativeWork',
  '@id': `${URL_SITE}/projets/${p.id}.html#oeuvre`,
  name: p.titre,
  genre: p.type,
  abstract: p.pitch.replace('[À VALIDER] ', ''),
  url: `${URL_SITE}/projets/${p.id}.html`,
  creator: { '@id': `${URL_SITE}/#tristan` },
  inLanguage: 'fr',
});

const jsonld = (obj) => `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;

// ---- index.html
const carte = (p, i) => `    <article class="projet" id="projet-${p.id}" aria-labelledby="titre-${p.id}">
      <p class="projet-numero">Portail ${i + 1}/${projets.length} · ${esc(p.type)} · <span class="statut">${esc(p.statut)}</span></p>
      <h3 id="titre-${p.id}"><a href="/projets/${p.id}.html">${esc(p.titre)}</a></h3>
      <p>${esc(p.pitch)}</p>
      <p class="projet-embleme"><strong>${esc(p.emblème.nom)}</strong> — ${esc(p.emblème.phrase)}</p>
      <p class="projet-lien"><a class="lien" href="/projets/${p.id}.html">Lire la fiche du projet</a></p>
    </article>`;

const indexChemin = resolve(racine, 'index.html');
let index = readFileSync(indexChemin, 'utf8');
const lireChemin = resolve(racine, 'lire.html');
let lire = readFileSync(lireChemin, 'utf8');
const remplacer = (texte, nom, contenu) => {
  const re = new RegExp(`(<!-- ${nom}:DEBUT -->)[\\s\\S]*?(<!-- ${nom}:FIN -->)`);
  if (!re.test(texte)) throw new Error(`Marqueur ${nom} introuvable`);
  return texte.replace(re, `$1\n${contenu}\n$2`);
};
lire = remplacer(lire, 'PROJETS', projets.map(carte).join('\n'));
writeFileSync(lireChemin, lire);
index = remplacer(index, 'JSONLD', jsonld({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', '@id': `${URL_SITE}/#site`, url: `${URL_SITE}/`, name: "Créateur d'expériences ludiques — Niveau 16", inLanguage: 'fr', dateModified: MAJ, author: { '@id': `${URL_SITE}/#tristan` } },
    personne,
    ...projets.map(oeuvre),
  ],
}));
index = index.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${URL_SITE}/">`);
writeFileSync(indexChemin, index);

// ---- pages projet
mkdirSync(resolve(racine, 'projets'), { recursive: true });
projets.forEach((p, i) => {
  const prec = projets[i - 1];
  const suiv = projets[i + 1];
  const outils = p.fiche.outils.map((o) => `<li>${esc(o)}</li>`).join('');
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.titre)} · Tristan Gonçalves</title>
<meta name="description" content="${esc(p.pitch.replace('[À VALIDER] ', ''))}">
<link rel="canonical" href="${URL_SITE}/projets/${p.id}.html">
<meta name="theme-color" content="#f6f3ec">
<link rel="stylesheet" href="/src/style.css">
${jsonld({ '@context': 'https://schema.org', ...oeuvre(p), creator: personne })}
</head>
<body>
<a class="evitement" href="#principal">Aller au contenu</a>
<header class="entete entete-page">
  <div class="entete-titre"><p class="entete-nom"><a href="/">Tristan Gonçalves</a></p></div>
  <nav class="entete-nav" aria-label="Navigation"><a href="/lire.html#projets">Tous les projets</a><a href="/lire.html#contact">Contact</a></nav>
</header>
<main id="principal" class="lire page-projet">
  <article class="bloc">
    <p class="projet-numero">Portail ${i + 1}/${projets.length} · ${esc(p.type)} · <span class="statut">${esc(p.statut)}</span></p>
    <h1>${esc(p.titre)}</h1>
    <p class="chapeau">${esc(p.pitch)}</p>
    <p class="projet-embleme"><strong>${esc(p.emblème.nom)}</strong> — ${esc(p.emblème.phrase)}</p>
    <h2>L'idée</h2>
    <p>${esc(p.fiche.idee)}</p>
    <h2>Ma part</h2>
    <p>${esc(p.fiche.ma_part)}</p>
    <h2>Outils</h2>
    <ul class="outils">${outils}</ul>
    <h2>Dans le portfolio jouable</h2>
    <p>Geste de la scène : ${esc(p.geste)}. Vidéo de présentation à venir.</p>
    <nav class="projet-voisins" aria-label="Autres projets">
      ${prec ? `<a class="lien" href="/projets/${prec.id}.html">‹ ${esc(prec.titre)}</a>` : '<span></span>'}
      ${suiv ? `<a class="lien" href="/projets/${suiv.id}.html">${esc(suiv.titre)} ›</a>` : '<a class="lien" href="/lire.html#qui">Qui je suis ›</a>'}
    </nav>
  </article>
</main>
<footer class="pied">
  <p>© 2026 Tristan Gonçalves · <a href="/mentions-legales.html">Mentions légales</a> · Mis à jour le <time datetime="${MAJ}">21 octobre 2026</time></p>
</footer>
</body>
</html>
`;
  writeFileSync(resolve(racine, 'projets', `${p.id}.html`), html);
});

// ---- sitemap
const urls = ['/', '/lire.html', ...projets.map((p) => `/projets/${p.id}.html`)];
writeFileSync(resolve(racine, 'public/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${URL_SITE}${u}</loc><lastmod>${MAJ}</lastmod></url>`).join('\n')}
</urlset>
`);
writeFileSync(resolve(racine, 'public/robots.txt'), `# Tout est ouvert, y compris aux robots des moteurs IA (GPTBot, ClaudeBot, Google-Extended…).
User-agent: *
Allow: /

Sitemap: ${URL_SITE}/sitemap.xml
`);

console.log(`Généré : index.html, ${projets.length} pages projet, sitemap.xml, robots.txt`);
