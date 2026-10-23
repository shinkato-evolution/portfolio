# Textes des 7 portails et de l'acte 2 — validés par Tristan

Version 2 (2026-10-21) : validée par Tristan, modifiable à tout moment (voix, textes, noms de jeux). Version 1 (2026-10-20). Faits tirés de `cv-spec.json`, du Brand Book Shinkatô, du README du site, du README Toupies et des
fiches mémoire des jeux. Tout ce qui n'y figure pas est marqué.

**Règles tenues** : aucun chiffre de performance, jamais « maîtriser » ni « expert », vocabulaire « utiliser, piloter,
mettre en place ». Tristan se présente comme celui qui **conçoit et pilote l'IA**, pas comme développeur.

**Lecture à voix haute** : durée estimée à ~2,4 mots par seconde (rythme de trailer, avec des silences entre les phrases).
Une ligne vide dans la voix = une respiration. Les mots en **gras** sont à appuyer.

**Format commun de chaque scène** : la 1re phrase est l'accroche (le sujet tout de suite) ; visuel + voix + sous-titre
disent la même chose à chaque phrase ; la dernière phrase ferme la boucle, puis le geste, puis la fiche.

---

## 1. Shinkatô — l'application

### Emblème
- **Objet** : le tantô (lame acier bleuté, garde et manche dorés — `tanto_01.png` existe déjà)
- **Nom** : Le Tantô
- **Phrase gravée** : « Installer de bonnes habitudes et affronter nos propres obstacles qui les gênent »

### Voix off (≈ 89 mots, ≈ 37 s)
> On **repousse** les choses. Toujours à demain.
>
> Avec Shinkatô, l'ère d'instaurer de bonnes habitudes et d'affronter les obstacles qui nous bloquent **commence**.
>
> Chaque habitude tenue te **renforce**. Chaque pas te fait avancer, case par case.
>
> Et ce qui te freine prend enfin un **visage** : un Écho, une créature d'ombre.
>
> Pour le vaincre, pas de bouton à marteler. Il faut trouver la **bonne phrase**.
>
> J'ai conçu cette application de bout en bout, en pilotant des agents IA. Elle est aujourd'hui sur **Google Play**.
>
> Deviens le héros de ton évolution.

Variante plus facile à dire pour la 2e phrase (le verbe arrive plus tôt) : « Avec Shinkatô, commence l'ère des bonnes
habitudes. Et des obstacles qu'on affronte enfin. »

### Sous-titres
```
On repousse les choses.
Toujours à demain.
Avec Shinkatô, l'ère d'instaurer
de bonnes habitudes
et d'affronter les obstacles
qui nous bloquent commence.
Chaque habitude tenue te renforce.
Chaque pas te fait avancer,
case par case.
Et ce qui te freine
prend enfin un visage :
un Écho, une créature d'ombre.
Pour le vaincre,
pas de bouton à marteler.
Il faut trouver la bonne phrase.
J'ai conçu cette application
de bout en bout,
en pilotant des agents IA.
Elle est aujourd'hui sur Google Play.
Deviens le héros de ton évolution.
```

### Éléments à faire apparaître
| Phrase | Visuel |
|---|---|
| « On repousse les choses… » | un agenda ou une liste de tâches qui glisse hors champ ; image ralentie, couleurs éteintes |
| « Avec Shinkatô… commence » | logo hexagonal blanc cassé, éclat jaune `#f2cd0f` ; le trailer `trailer-shinkato.mp4` démarre |
| « Chaque habitude tenue… » | écran des habitudes, une validation qui s'allume |
| « case par case » | le territoire hexagonal, une case qui se découvre |
| « un Écho, une créature d'ombre » | apparition d'un Écho, halo rouge `#ad1919` |
| « la bonne phrase » | combat de phrases : une réplique choisie, l'Écho recule |
| « sur Google Play » | badge Google Play + capture de la fiche du store |
| « Deviens le héros… » | tagline en Trajan Pro/Cinzel, le tantô brille → geste |

### Geste
- **Trancher l'obstacle au tantô** : un Écho bloque le passage, on glisse le doigt ou la souris en travers, il se fend.
- **Consigne affichée** : « Tranche l'obstacle d'un geste » (5 mots)

### Fiche
- **Idée** : une application mobile qui transforme les habitudes en aventure : on se renforce, on explore, on affronte ses obstacles.
- **Ma part** :
  - Conception du produit : systèmes de jeu, progression, narration, direction artistique.
  - Production pilotée par agents IA, de la spécification au build Android.
  - Communication automatisée : visuels, publications, programmation multi-réseaux.
- **Outils** : Claude Code, React Native, Supabase, Obsidian, MuAPI, RobinReach, n8n
- **Statut** : publié (Google Play)

---

## 2. Shinkatô — le site

### Emblème
- **Objet** : un parchemin d'histoire scellé
- **Nom** : Le Parchemin
- **Phrase gravée** : « On ne lit pas Shinkatô, on y joue »

### Voix off (≈ 82 mots, ≈ 34 s)
> Une vitrine qui se contente de **décrire**, on l'oublie.
>
> Alors sur le site de Shinkatô, on ne lit pas l'application. On y **joue**.
>
> Tu fais défiler, et la vidéo **avance avec toi**.
>
> Tu explores le territoire, hexagone par hexagone. Tu affrontes un Écho dans une **bataille de phrases**. Tu déroules un parchemin d'histoire.
>
> Une seule page. Légère. Sans aucun traceur.
>
> Je l'ai pensée comme un **niveau d'introduction** : on comprend le jeu en le jouant.

### Sous-titres
```
Une vitrine qui se contente de décrire,
on l'oublie.
Alors sur le site de Shinkatô,
on ne lit pas l'application.
On y joue.
Tu fais défiler,
et la vidéo avance avec toi.
Tu explores le territoire,
hexagone par hexagone.
Tu affrontes un Écho
dans une bataille de phrases.
Tu déroules un parchemin d'histoire.
Une seule page. Légère.
Sans aucun traceur.
Je l'ai pensée comme
un niveau d'introduction :
on comprend le jeu en le jouant.
```
(« Une vitrine qui se contente de décrire, » = 7 mots, limite tenue.)

### Éléments à faire apparaître
| Phrase | Visuel |
|---|---|
| « Une vitrine… on l'oublie » | une page générique floue qui s'efface |
| « On y joue » | la page d'accueil du site nette, `shinkato_scroll.mp4` |
| « la vidéo avance avec toi » | défilement réel enregistré : la vidéo de fond suit le scroll |
| « hexagone par hexagone » | démo du territoire, clics sur des cases |
| « bataille de phrases » | démo du combat contre un Écho |
| « parchemin d'histoire » | démo de lecture du parchemin |
| « Sans aucun traceur » | trois mots seuls à l'écran, fond noir |
| « niveau d'introduction » | le parchemin se roule → geste |

### Geste
- **Dérouler le parchemin** : on tire le bas du parchemin vers le bas, la fiche se lit dessus.
- **Consigne affichée** : « Tire pour dérouler le parchemin » (5 mots)

### Fiche
- **Idée** : un site vitrine d'une seule page où l'on essaie l'application au lieu de lire sa description.
- **Ma part** :
  - Conception de la page et des démos jouables (territoire, combat de phrases, parchemin).
  - Textes et direction artistique, dans la charte Shinkatô.
  - Fabrication pilotée par agents IA, sans dépendance à installer ni traceur.
- **Outils** : Claude Code, HTML, CSS, JavaScript
- **Statut** : publié

---

## 3. Sphère Ball

### Emblème
- **Objet** : l'orbe magique
- **Nom** : L'Orbe
- **Phrase gravée** : « Elle revient toujours plus vite »

### Voix off (≈ 88 mots, ≈ 37 s)
> Deux épéistes. Une **orbe magique**. Et derrière chacun, un portail à défendre.
>
> Dans Sphère Ball, tu frappes l'orbe pour l'envoyer chez l'adversaire. À chaque renvoi, elle va **plus vite**.
>
> Chaque but encaissé éteint un **cristal** du portail.
>
> Chaque combattant a son pouvoir. La foudre. Un clone d'ombre. Un mur de glace. Un portail qui **renvoie** l'orbe.
>
> J'ai imaginé les règles, les combattants et leurs pouvoirs. Puis j'ai piloté l'IA pour donner vie au **duel**.

### Sous-titres
```
Deux épéistes. Une orbe magique.
Et derrière chacun,
un portail à défendre.
Dans Sphère Ball, tu frappes l'orbe
pour l'envoyer chez l'adversaire.
À chaque renvoi,
elle va plus vite.
Chaque but encaissé
éteint un cristal du portail.
Chaque combattant a son pouvoir.
La foudre. Un clone d'ombre.
Un mur de glace.
Un portail qui renvoie l'orbe.
J'ai imaginé les règles,
les combattants et leurs pouvoirs.
Puis j'ai piloté l'IA
pour donner vie au duel.
```

### Éléments à faire apparaître
| Phrase | Visuel |
|---|---|
| « Deux épéistes… à défendre » | plan large du château de nuit, les deux portails allumés (`trailer_sphere_ball.mp4`, coupé à 30 s) |
| « plus vite » | échange accéléré, l'affichage « ÉCHANGE xN » monte |
| « éteint un cristal » | gros plan sur un cristal qui s'éteint |
| « La foudre » | Kaelen lance la foudre |
| « Un clone d'ombre » | Vesper et sa copie |
| « Un mur de glace » | Ilyana |
| « renvoie l'orbe » | Valeth, portail d'ombre |
| « donner vie au duel » | écran de sélection des combattants → l'orbe vient au premier plan → geste |

### Geste
- **Tirer-relâcher l'orbe** : on tire l'orbe en arrière comme une fronde, on relâche, elle traverse vers le portail adverse.
- **Consigne affichée** : « Tire, vise, relâche » (3 mots)

### Fiche
- **Idée** : un duel en un contre un, entre Pong et sport fantastique : renvoyer une orbe magique dans le portail adverse.
- **Ma part** :
  - Game design : règles du duel, coup d'envoi, combattants et pouvoirs.
  - Direction artistique et prompts des planches de personnages et d'interface.
  - Pilotage de l'IA pour le code Godot, le trailer et une cinématique sous Blender.
- **Outils** : Godot, Claude Code, Blender, Hyperframes, MuAPI
- **Statut** : prototype jouable (contre l'ordinateur, clavier et manette)

---

## 4. Licorne dans les nuages

### Emblème
- **Objet** : un œuf de créature posé sur un nuage
- **Nom** : L'Œuf des nuages
- **Phrase gravée** : « Chaque mission réussie fait naître un ami »

### Voix off (≈ 80 mots, ≈ 33 s)
> Ce jeu, je l'ai fait pour **ma fille**.
>
> Dans Licorne dans les nuages, on **vole**. Sur une licorne, ou sur un dragon.
>
> Et en chemin, des missions : attraper la bonne **couleur**, la bonne **forme**, la bonne **lettre**.
>
> Les missions réussies font éclore des **œufs**. Et de chaque œuf sort une créature.
>
> Rassemble toute une famille, et un **nouveau ciel** s'ouvre.
>
> J'ai voulu un jeu où l'on apprend sans s'en rendre compte. Elle n'y voit qu'une chose : **encore une partie**.

### Sous-titres
```
Ce jeu, je l'ai fait
pour ma fille.
Dans Licorne dans les nuages,
on vole.
Sur une licorne, ou sur un dragon.
Et en chemin, des missions :
attraper la bonne couleur,
la bonne forme, la bonne lettre.
Les missions réussies
font éclore des œufs.
Et de chaque œuf
sort une créature.
Rassemble toute une famille,
et un nouveau ciel s'ouvre.
J'ai voulu un jeu
où l'on apprend
sans s'en rendre compte.
Elle n'y voit qu'une chose :
encore une partie.
```

### Éléments à faire apparaître
| Phrase | Visuel |
|---|---|
| « pour ma fille » | ciel pastel vide, un nuage qui passe (aucune photo, aucun prénom) |
| « on vole » | la licorne traverse l'écran (`trailer_licorne_20s.mp4`) |
| « ou sur un dragon » | écran de choix du compagnon |
| « couleur… forme… lettre » | trois missions en coupe rapide, une par mot |
| « font éclore des œufs » | l'œuf qui éclot (garder l'animation entière) |
| « un nouveau ciel s'ouvre » | passage au décor « Montagnes du soir » ou à la forêt |
| « encore une partie » | écran Quêtes → les nuages se referment → geste |

### Geste
- **Souffler les nuages** : maintenir appuyé, les nuages s'écartent et dévoilent la fiche.
- **Consigne affichée** : « Maintiens pour souffler les nuages » (5 mots)

### Fiche
- **Idée** : un jeu de vol pour les enfants de 4 à 6 ans, où chaque mission fait travailler couleurs, formes, lettres et mots.
- **Ma part** :
  - Conception pour un enfant : missions, œufs et créatures, familles qui ouvrent de nouveaux décors.
  - Prompts des planches d'images et préparation automatique des images pour le jeu.
  - Pilotage de l'IA pour le code Godot et les tests.
- **Outils** : Godot, Claude Code, Python (scripts de détourage), Hyperframes, MuAPI
- **Statut** : prototype jouable

---

## 5. Mon Jardin Fleuri

### Emblème
- **Objet** : l'arrosoir
- **Nom** : L'Arrosoir
- **Phrase gravée** : « Ici, rien ne fane : tout attend ton retour »

### Voix off (≈ 88 mots, ≈ 37 s)
> Dans ce jardin, **rien ne meurt**. Une fleur oubliée attend simplement ton retour.
>
> Mon Jardin Fleuri, c'est un jeu pour les enfants.
>
> On part en **balade** : la prairie, la forêt, l'étang. On cueille des fleurs, on garde leurs **graines**, on remplit son **herbier**.
>
> Puis on plante. On arrose. Et la fleur pousse **pour de vrai**, même jeu fermé.
>
> J'ai conçu les règles pour qu'un enfant n'ait jamais rien à **perdre**. Seulement des choses à **découvrir**.

### Sous-titres
```
Dans ce jardin, rien ne meurt.
Une fleur oubliée
attend simplement ton retour.
Mon Jardin Fleuri,
c'est un jeu pour les enfants.
On part en balade :
la prairie, la forêt, l'étang.
On cueille des fleurs,
on garde leurs graines,
on remplit son herbier.
Puis on plante. On arrose.
Et la fleur pousse pour de vrai,
même jeu fermé.
J'ai conçu les règles
pour qu'un enfant
n'ait jamais rien à perdre.
Seulement des choses à découvrir.
```

### Éléments à faire apparaître
| Phrase | Visuel |
|---|---|
| « rien ne meurt » | gros plan sur une fleur prête, immobile, qui ne fane pas (`Trailer Mon Jardin Fleuri.mp4`) |
| « la prairie, la forêt, l'étang » | les trois décors en coupe, un par mot |
| « on remplit son herbier » | page de l'herbier, une découverte qui s'ajoute |
| « On plante. On arrose. » | parcelle : terre sèche → humide |
| « même jeu fermé » | le chronomètre de pousse qui se remplit, accéléré |
| « rien à perdre… à découvrir » | la fleur éclot → graines au premier plan → geste |

### Geste
- **Arroser les graines** : on incline l'arrosoir au-dessus des graines, elles germent sous la fiche.
- **Consigne affichée** : « Arrose pour faire pousser » (4 mots)

### Fiche
- **Idée** : un jeu de jardinage pour les 7-12 ans, sans punition, où les fleurs poussent en temps réel.
- **Ma part** :
  - Game design bienveillant : rien ne meurt, une soif par étape, balades et herbier.
  - Prompts des images (style gouache de livre jeunesse) et intégration automatique dans le jeu.
  - Pilotage de l'IA pour le code Godot et les tests.
- **Outils** : Godot, Claude Code, Python, Hyperframes, MuAPI
- **Statut** : prototype jouable 

---

## 6. Vortex Arena

### Emblème
- **Objet** : la poignée du lanceur (`lanceur_poignee.glb`)
- **Nom** : Le Lanceur
- **Phrase gravée** : « Le combat commence au lancer »

### Voix off (≈ 86 mots, ≈ 36 s)
> Une toupie. Une arène en cuvette. Et tout autour, **le vide**.
>
> Dans Vortex Arena, tu ne gagnes pas en frappant le plus fort. Tu gagnes en poussant l'autre **dehors**.
>
> D'abord, tu assembles ta toupie, pièce par pièce. Plus lourde, elle **tient**. Plus pointue, elle **attaque**.
>
> Puis tu lances. Au bon moment.
>
> Les pentes te donnent de la **vitesse**. Chaque choc remplit tes cristaux, et tes **cartes** se réveillent.
>
> Une ligue après l'autre. Jusqu'au **champion**.

### Sous-titres
```
Une toupie. Une arène en cuvette.
Et tout autour, le vide.
Dans Vortex Arena,
tu ne gagnes pas
en frappant le plus fort.
Tu gagnes en poussant l'autre dehors.
D'abord, tu assembles ta toupie,
pièce par pièce.
Plus lourde, elle tient.
Plus pointue, elle attaque.
Puis tu lances. Au bon moment.
Les pentes te donnent de la vitesse.
Chaque choc remplit tes cristaux,
et tes cartes se réveillent.
Une ligue après l'autre.
Jusqu'au champion.
```

### Éléments à faire apparaître
| Phrase | Visuel |
|---|---|
| « Et tout autour, le vide » | arène vue de haut, vide violet lumineux (`Trailer Toupies.mp4`) |
| « poussant l'autre dehors » | une toupie éjectée par une ouverture |
| « pièce par pièce » | l'atelier : toupie en vue éclatée, un étage qui change |
| « elle tient… elle attaque » | barres de statistiques, gain vert, perte rouge |
| « Au bon moment » | jauge de lancement au timing, arrêt net |
| « de la vitesse » | descente d'une rampe, barre de boost qui monte |
| « tes cartes se réveillent » | les cristaux s'allument, une carte passe de grise à active |
| « Jusqu'au champion » | tableau du tournoi → le lanceur en 3D au premier plan → geste |

### Geste
- **Tirer la ficelle du lanceur** : on tire la ficelle du vrai `lanceur_poignee.glb` et on lâche, la toupie part dans l'arène.
- **Consigne affichée** : « Tire la ficelle, puis lâche » (5 mots)

### Fiche
- **Idée** : un jeu de combat de toupies en 3D : on assemble sa toupie, on la lance au bon moment, on pousse l'adversaire dans le vide.
- **Ma part** :
  - Game design : arène en cuvette, pièces qui changent l'équilibre, cartes payées en cristaux, tournoi.
  - Direction artistique cel shading façon anime, univers original.
  - Pilotage de l'IA pour le code Godot et les modèles 3D sous Blender, par scripts.
- **Outils** : Godot, Blender, Claude Code, Hyperframes
- **Statut** : prototype jouable (tranche jouable en cours)

---

## 7. Mecha

### Emblème
- **Objet** : l'interrupteur d'allumage du cockpit
- **Nom** : Le Contact
- **Phrase gravée** : « Le méca vu de la place du pilote »

### Voix off (≈ 74 mots, ≈ 31 s)
> Les mécas, on les regarde toujours **de l'extérieur**. Ici, tu es **dedans**.
>
> Tu t'assois. Tu appuies. Les écrans s'allument, **un par un**.
>
> Tu marches. Tu pivotes. Tu pousses les **réacteurs**.
>
> Puis tu passes en **visée** : ta main prend le manche, les canons suivent ta cible.
>
> Le cockpit, le ciel, le décor : tout est rendu comme un **anime**.
>
> Un seul objectif : être enfin à la place du **pilote**.

### Sous-titres
```
Les mécas, on les regarde
toujours de l'extérieur.
Ici, tu es dedans.
Tu t'assois. Tu appuies.
Les écrans s'allument, un par un.
Tu marches. Tu pivotes.
Tu pousses les réacteurs.
Puis tu passes en visée :
ta main prend le manche,
les canons suivent ta cible.
Le cockpit, le ciel, le décor :
tout est rendu comme un anime.
Un seul objectif :
être enfin à la place du pilote.
```

### Éléments à faire apparaître
| Phrase | Visuel |
|---|---|
| « de l'extérieur » | silhouette du méca ennemi vue de loin (`Trailer Mecha.mp4`) |
| « tu es dedans » | coupe nette vers la vue cockpit, noir complet |
| « un par un » | les écrans de la console s'allument en cascade (synchro mot à mot) |
| « Tu marches. Tu pivotes. » | le décor défile par les vitres |
| « réacteurs » | jauge de puissance qui monte, légère secousse |
| « en visée » | passage en mode VISÉE, réticule, bras droit sur le manche |
| « comme un anime » | plan sur le contour net du décor en toon |
| « à la place du pilote » | cockpit éteint, deux voyants clignotent → geste |

### Geste
- **Allumer le cockpit** : maintenir deux touches (ou deux doigts) en même temps, le cockpit s'allume et la fiche apparaît sur l'écran central.
- **Consigne affichée** : « Maintiens deux touches pour démarrer » (5 mots)

### Fiche
- **Idée** : piloter un méca depuis son cockpit, en vue à la première personne, avec un mode marche et un mode visée.
- **Ma part** :
  - Conception des commandes et des deux modes, réglages entre simulation et arcade.
  - Direction artistique du cockpit (anime cel shading) et prompts des images.
  - Pilotage de l'IA pour le code Godot et le décor 3D construit par script sous Blender.
- **Outils** : Godot, Blender, Claude Code, Python, Hyperframes
- **Statut** : en cours (prototype jouable)

---

## Acte 2 — les pierres runiques

### Pierre 1 — « Qui je suis ? » (≈ 58 mots)
> Je m'appelle Tristan. J'ai d'abord fait jouer les gens en vrai : je créais les salles de mon escape game, les énigmes,
> le rythme d'une partie. J'ai étudié la psychologie. Aujourd'hui je conçois des jeux et des applications, et je pilote
> l'IA de l'idée au livrable qui tourne. Ce qui m'intéresse : ce qu'un jeu change chez celui qui y joue.

### Pierre 2 — « Parcours »
- **Shinkatô — fondateur, produit et IA** (2025 → aujourd'hui) : une application de développement personnel gamifiée,
  conçue et produite seul en pilotant des agents IA, publiée sur Google Play.
- **Gérant d'un escape game** (2018 – 2024) : la création des salles (scénarios, énigmes, décors, rythme de partie),
  et toute l'entreprise autour : gestion, fournisseurs, accueil, animation.
- **Ouvrier second œuvre** (2023 → aujourd'hui) : rénovation, climatisation, plomberie, placo, carrelage.

Phrase de liaison sous la pierre : « L'escape game m'a appris à faire jouer. La psychologie, à comprendre pourquoi on
continue. Shinkatô réunit les deux. »

### Pierre 3 — « Outils »
> Ceux que j'aime faire travailler ensemble : **Claude Code**, **Obsidian**, **RobinReach**.
> Et aussi : n8n, ChatGPT, Supabase, MuAPI, Canva, Vocallab, Google Sheets.
> Pour les jeux : Godot, Blender, Hyperframes.

### Pierre 4 — « Méthode »
Quatre runes, une phrase chacune (lignes reprises du CV) :
- **Piloter** — Des agents IA, de la demande au livrable qui tourne.
- **Structurer** — Une base de connaissances qui sert de contexte aux agents.
- **Créer** — Textes, visuels et vidéos générés, dans une identité tenue.
- **Automatiser** — Workflows, données, publications programmées.

### Pierre 5 — « Contact » (autel-terminal)
> Tu as un jeu, une appli ou une idée qui doit donner envie de jouer ? Grave ton message ici. Je te réponds.

Sous le champ : bouton « Envoyer » (ouvre l'e-mail) · lien LinkedIn · goncalves.tristan@yahoo.fr

### Test anti « AI slop » (un concurrent pourrait-il signer ces phrases ?)
- Les accroches tiennent sur des faits propres à chaque projet (l'Écho, l'orbe qui accélère, la fleur qui ne meurt pas,
  la toupie poussée dans le vide, le cockpit vu de l'intérieur) : non signables par un autre.
- Phrases écartées pendant l'écriture parce que génériques : « passionné par le jeu vidéo », « créer des expériences
  inoubliables », « allier créativité et technologie ».
- Reste un peu générique : la dernière phrase de « Qui je suis ? ». À garder seulement si elle sonne juste pour Tristan.

---

## Points à valider par Tristan — tous validés le 2026-10-21

Décisions : phrase d'origine de Shinkatô gardée ; âges et dates gardés ; Godot, Blender et Hyperframes ajoutés aux outils ; ligne « je conçois et je pilote l'IA » confirmée. Restent ouverts : l'adresse du site Shinkatô et l'outil de sa vidéo de fond (non cités en attendant).

Liste d'origine :

1. **Shinkatô app** : ta phrase d'origine (« l'ère … commence ») ou la variante plus facile à dire ?
2. **Site** : est-il en ligne, et à quelle adresse ? Avec quel outil la vidéo de fond a-t-elle été faite ? La phrase gravée
   « On ne lit pas Shinkatô, on y joue » te va-t-elle ?
3. **Générateur d'images** des jeux (Sphère Ball, Licorne, Jardin, Mecha) : lequel nommer dans les fiches ?
4. **Licorne dans les nuages** : « Elle n'y voit qu'une chose : encore une partie » est une supposition — vrai ou à
   remplacer ? Le jeu est-il jouable du début à la fin ? Confirmer qu'on ne montre ni prénom ni photo de ta fille.
5. **Licorne** : la fiche dit « 4 à 6 ans » et le Jardin « 7-12 ans » (chiffres d'âge, pas de performance) : on les
   garde ou on écrit « pour les petits » / « pour les enfants » ?
6. **Mon Jardin Fleuri** : le titre reste-t-il celui-là (il était provisoire) ?
7. **Mecha** : la phrase gravée et la dernière phrase (« être enfin à la place du pilote ») parlent d'une envie : vraie
   pour toi ? Le statut « en cours » ou « prototype jouable » ?
8. **Parcours** : afficher les dates (2018, 2025…) ou non, vu la règle « aucun chiffre » ?
9. **Outils** : ajouter Godot, Blender et Hyperframes, absents du CV ?
10. **Qui je suis ?** : la dernière phrase te ressemble-t-elle ?
11. **Ma part** : partout, le code est présenté comme « piloté par l'IA » et non écrit par toi — c'est bien la ligne voulue ?
