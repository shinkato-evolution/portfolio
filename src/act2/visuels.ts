// Les visuels gravés sur les pierres : la rune s'efface et laisse place à l'image (photo, icônes…) quand on s'approche.
// Tout est dessiné sur un canevas qui sert de texture lumineuse à la pierre (fond noir = pierre sombre).
import { siBlender, siClaude, siGodotengine, siGooglesheets, siN8n, siObsidian, siSupabase } from 'simple-icons';

export const LARG = 512, HAUT = 1024;
const OR = '#ffd25a', CY = '#9be7ff', BL = '#eaf9ff';
const POLICE = 'Georgia, "Times New Roman", serif';

const ICONES: Record<string, { path: string }> = {
  claude: siClaude, obsidian: siObsidian, n8n: siN8n, supabase: siSupabase, googlesheets: siGooglesheets, godotengine: siGodotengine, blender: siBlender,
};

// Glyphes des runes (traits normalisés 0..1) : un par pierre.
const GLYPHES: [number, number][][][] = [
  [[[0.5, 0.12], [0.5, 0.88]], [[0.5, 0.28], [0.78, 0.44], [0.5, 0.6]]],
  [[[0.34, 0.12], [0.34, 0.88]], [[0.34, 0.16], [0.72, 0.32], [0.34, 0.5]], [[0.34, 0.5], [0.76, 0.72]]],
  [[[0.28, 0.12], [0.5, 0.52], [0.72, 0.12]], [[0.5, 0.52], [0.5, 0.88]]],
  [[[0.5, 0.1], [0.5, 0.9]], [[0.28, 0.28], [0.5, 0.44], [0.72, 0.28]], [[0.28, 0.54], [0.5, 0.7], [0.72, 0.54]]],
  [[[0.5, 0.12], [0.78, 0.5], [0.5, 0.88], [0.22, 0.5], [0.5, 0.12]], [[0.5, 0.3], [0.5, 0.7]]],
];

type G = CanvasRenderingContext2D;
export interface Outil { nom: string; icone?: string; mono?: string; logo?: string; }
export interface DefStone { id: string; outils?: Outil[]; }

function cadre(g: G) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.shadowColor = '#7fe3ff'; g.shadowBlur = 18;
  g.strokeStyle = CY; g.lineWidth = 5; g.strokeRect(22, 22, 468, 980);
  g.lineWidth = 2; g.strokeRect(34, 34, 444, 956);
  g.shadowBlur = 0;
}

function glyphe(g: G, i: number) {
  g.shadowColor = '#7fe3ff'; g.shadowBlur = 18;
  g.lineWidth = 11; g.strokeStyle = '#d6f6ff'; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const trait of GLYPHES[i % GLYPHES.length]) {
    g.beginPath();
    trait.forEach(([x, y], k) => { const px = 100 + x * 312, py = 190 + y * 640; if (k) g.lineTo(px, py); else g.moveTo(px, py); });
    g.stroke();
  }
  g.shadowBlur = 0;
}

function tuile(g: G, x: number, y: number, w: number, h: number) {
  g.fillStyle = 'rgba(155, 231, 255, 0.08)'; g.strokeStyle = 'rgba(155, 231, 255, 0.7)'; g.lineWidth = 3;
  g.beginPath(); g.roundRect(x, y, w, h, 14); g.fill(); g.stroke();
}

function texte(g: G, s: string, x: number, y: number, taille: number, couleur: string, align: CanvasTextAlign = 'center') {
  g.font = `700 ${taille}px ${POLICE}`; g.fillStyle = couleur; g.textAlign = align; g.textBaseline = 'middle';
  g.shadowColor = couleur; g.shadowBlur = 10; g.fillText(s, x, y); g.shadowBlur = 0;
}

function iconeSvg(g: G, nom: string, cx: number, cy: number, s: number, couleur: string) {
  const ic = ICONES[nom]; if (!ic) return;
  g.save(); g.translate(cx - s / 2, cy - s / 2); g.scale(s / 24, s / 24); g.fillStyle = couleur; g.shadowColor = couleur; g.shadowBlur = 12; g.fill(new Path2D(ic.path)); g.restore();
}

// Petites icônes dessinées à la main (traits).
function trait(g: G, couleur = OR, epaisseur = 7) { g.strokeStyle = couleur; g.lineWidth = epaisseur; g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = couleur; g.shadowBlur = 12; }
const icCle = (g: G, x: number, y: number, s: number) => { trait(g); g.beginPath(); g.arc(x - s * 0.28, y, s * 0.2, 0, 7); g.moveTo(x - s * 0.08, y); g.lineTo(x + s * 0.42, y); g.moveTo(x + s * 0.26, y); g.lineTo(x + s * 0.26, y + s * 0.16); g.moveTo(x + s * 0.42, y); g.lineTo(x + s * 0.42, y + s * 0.12); g.stroke(); };
const icTelephone = (g: G, x: number, y: number, s: number) => { trait(g); g.beginPath(); g.roundRect(x - s * 0.2, y - s * 0.42, s * 0.4, s * 0.84, 10); g.moveTo(x - s * 0.06, y + s * 0.32); g.lineTo(x + s * 0.06, y + s * 0.32); g.stroke(); };
const icMarteau = (g: G, x: number, y: number, s: number) => { trait(g); g.beginPath(); g.moveTo(x - s * 0.3, y + s * 0.4); g.lineTo(x + s * 0.12, y - s * 0.1); g.stroke(); g.fillStyle = OR; g.beginPath(); g.roundRect(x - s * 0.02, y - s * 0.42, s * 0.44, s * 0.24, 6); g.fill(); };
const icCertificat = (g: G, x: number, y: number, s: number) => { trait(g); g.beginPath(); g.roundRect(x - s * 0.44, y - s * 0.36, s * 0.88, s * 0.58, 8); g.moveTo(x - s * 0.28, y - s * 0.16); g.lineTo(x + s * 0.28, y - s * 0.16); g.moveTo(x - s * 0.28, y); g.lineTo(x + s * 0.06, y); g.stroke(); g.beginPath(); g.arc(x + s * 0.24, y + s * 0.08, s * 0.12, 0, 7); g.stroke(); g.beginPath(); g.moveTo(x + s * 0.17, y + s * 0.18); g.lineTo(x + s * 0.13, y + s * 0.42); g.lineTo(x + s * 0.24, y + s * 0.34); g.lineTo(x + s * 0.35, y + s * 0.42); g.lineTo(x + s * 0.31, y + s * 0.18); g.stroke(); };
const icEnveloppe = (g: G, x: number, y: number, s: number) => { trait(g); g.beginPath(); g.roundRect(x - s * 0.45, y - s * 0.3, s * 0.9, s * 0.6, 12); g.moveTo(x - s * 0.45, y - s * 0.26); g.lineTo(x, y + s * 0.06); g.lineTo(x + s * 0.45, y - s * 0.26); g.stroke(); };
const icBoussole = (g: G, x: number, y: number, s: number) => { trait(g); g.beginPath(); g.arc(x, y, s * 0.38, 0, 7); g.stroke(); g.fillStyle = OR; g.beginPath(); g.moveTo(x, y - s * 0.3); g.lineTo(x + s * 0.1, y); g.lineTo(x, y + s * 0.3); g.lineTo(x - s * 0.1, y); g.closePath(); g.fill(); };
const icBlocs = (g: G, x: number, y: number, s: number) => { trait(g); for (const [dx, dy] of [[-0.22, 0.14], [0.22, 0.14], [0, -0.26]]) { g.strokeRect(x + dx * s - s * 0.18, y + dy * s - s * 0.18, s * 0.36, s * 0.36); } };
const icEtincelle = (g: G, x: number, y: number, s: number) => { g.fillStyle = OR; g.shadowColor = OR; g.shadowBlur = 14; g.beginPath(); g.moveTo(x, y - s * 0.42); g.quadraticCurveTo(x + s * 0.06, y - s * 0.06, x + s * 0.42, y); g.quadraticCurveTo(x + s * 0.06, y + s * 0.06, x, y + s * 0.42); g.quadraticCurveTo(x - s * 0.06, y + s * 0.06, x - s * 0.42, y); g.quadraticCurveTo(x - s * 0.06, y - s * 0.06, x, y - s * 0.42); g.fill(); };
const icEngrenage = (g: G, x: number, y: number, s: number) => { trait(g); g.beginPath(); g.arc(x, y, s * 0.24, 0, 7); g.stroke(); for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; g.beginPath(); g.moveTo(x + Math.cos(a) * s * 0.28, y + Math.sin(a) * s * 0.28); g.lineTo(x + Math.cos(a) * s * 0.42, y + Math.sin(a) * s * 0.42); g.stroke(); } };

/** Le logo passé au jaune des autres icônes, mis en cache. Les logos pleins (Poppy, Canva) gardent leurs détails : les zones sombres deviennent jaunes, les claires restent foncées ; les autres sont réduits à leur silhouette. */
const DETAILLES = new Set(['poppy', 'canva']);
const silhouettes = new Map<HTMLImageElement, HTMLCanvasElement>();
function silhouetteOr(im: HTMLImageElement, w: number, h: number, nom: string): HTMLCanvasElement {
  let c = silhouettes.get(im); if (c) return c;
  c = document.createElement('canvas'); c.width = Math.ceil(w * 2); c.height = Math.ceil(h * 2);
  const k = c.getContext('2d')!; k.drawImage(im, 0, 0, c.width, c.height);
  if (DETAILLES.has(nom)) {
    const d = k.getImageData(0, 0, c.width, c.height), a = d.data;
    for (let i = 0; i < a.length; i += 4) { const lum = (0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2]) / 255, f = Math.min(1, 1.08 - 0.85 * lum); a[i] = 255 * f; a[i + 1] = 210 * f; a[i + 2] = 90 * f; }
    k.putImageData(d, 0, 0);
  } else { k.globalCompositeOperation = 'source-in'; k.fillStyle = OR; k.fillRect(0, 0, c.width, c.height); }
  silhouettes.set(im, c); return c;
}

function visuel(g: G, id: string, def: DefStone, photo: HTMLImageElement | null, logos: Record<string, HTMLImageElement>) {
  g.shadowBlur = 0;
  if (id === 'qui') {
    const x = 60, y = 120, w = 392, h = 500;
    if (photo && photo.complete && photo.naturalWidth) {
      g.save(); g.beginPath(); g.roundRect(x, y, w, h, 16); g.clip();
      const r = Math.max(w / photo.naturalWidth, h / photo.naturalHeight), iw = photo.naturalWidth * r, ih = photo.naturalHeight * r;
      g.drawImage(photo, x + (w - iw) / 2, y + (h - ih) * 0.3, iw, ih);
      g.fillStyle = 'rgba(0, 20, 40, 0.18)'; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(155, 231, 255, 0.07)'; for (let k = y; k < y + h; k += 6) g.fillRect(x, k, w, 2); // trame d'hologramme
      g.restore();
    }
    g.strokeStyle = CY; g.lineWidth = 4; g.shadowColor = CY; g.shadowBlur = 14; g.beginPath(); g.roundRect(x, y, w, h, 16); g.stroke(); g.shadowBlur = 0;
    texte(g, 'TRISTAN', 256, 700, 66, OR);
    texte(g, 'GONÇALVES', 256, 758, 36, CY);
    texte(g, "CRÉATEUR D'EXPÉRIENCES", 256, 830, 24, BL);
    texte(g, 'LUDIQUES', 256, 862, 24, BL);
  } else if (id === 'parcours') {
    const lignes: [(g: G, x: number, y: number, s: number) => void, string][] = [[icCle, 'ESCAPE GAME'], [icTelephone, 'SHINKATÔ'], [icCertificat, 'CERTIFICATION']];
    lignes.forEach(([ic, nom], i) => { const y = 130 + i * 265; tuile(g, 60, y, 392, 240); ic(g, 256, y + 100, 120); texte(g, nom, 256, y + 205, 34, OR); });
  } else if (id === 'outils') {
    const outils = def.outils ?? [];
    outils.forEach((o, i) => {
      const col = i % 3, lig = Math.floor(i / 3), x = 60 + col * 138, y = 150 + lig * 150;
      tuile(g, x, y, 116, 130);
      const logo = o.logo ? logos[o.logo] : null;
      if (logo && logo.complete && logo.naturalWidth) {
        const k = Math.min(74 / logo.naturalWidth, 74 / logo.naturalHeight), w2 = logo.naturalWidth * k, h2 = logo.naturalHeight * k;
        g.drawImage(silhouetteOr(logo, w2, h2, o.logo!), x + 58 - w2 / 2, y + 56 - h2 / 2, w2, h2); // le logo en jaune, comme les autres icônes
      } else if (o.icone) iconeSvg(g, o.icone, x + 58, y + 58, 66, OR);
      else texte(g, o.mono ?? o.nom.slice(0, 2), x + 58, y + 58, o.mono && o.mono.length > 2 ? 34 : 44, OR);
      texte(g, o.nom.length > 10 ? o.nom.slice(0, 9) + '…' : o.nom, x + 58, y + 110, 14, BL);
    });
  } else if (id === 'methode') {
    const lignes: [(g: G, x: number, y: number, s: number) => void, string][] = [[icBoussole, 'PILOTER'], [icBlocs, 'STRUCTURER'], [icEtincelle, 'CRÉER'], [icEngrenage, 'AUTOMATISER']];
    lignes.forEach(([ic, nom], i) => { const y = 130 + i * 205; tuile(g, 60, y, 392, 185); ic(g, 140, y + 92, 100); texte(g, nom, 205, y + 92, 28, OR, 'left'); });
  } else if (id === 'contact') {
    icEnveloppe(g, 256, 330, 300);
    texte(g, 'ÉCRIS-MOI', 256, 560, 54, OR);
    tuile(g, 156, 640, 200, 170);
    texte(g, 'in', 256, 725, 100, CY);
    texte(g, 'LINKEDIN', 256, 785, 22, BL);
  }
}

/** Dessine la pierre : la rune (qui s'efface) et le visuel (qui apparaît) selon `reveal` (0..1). */
export function dessinerPierre(g: G, index: number, def: DefStone, reveal: number, photo: HTMLImageElement | null, logos: Record<string, HTMLImageElement> = {}) {
  g.globalAlpha = 1; g.shadowBlur = 0;
  g.fillStyle = '#000'; g.fillRect(0, 0, LARG, HAUT);
  cadre(g);
  const rune = Math.pow(1 - reveal, 1.5);
  if (rune > 0.01) { g.globalAlpha = rune; glyphe(g, index); g.globalAlpha = 1; }
  if (reveal > 0.01) { g.globalAlpha = Math.min(1, reveal * 1.15); visuel(g, def.id, def, photo, logos); g.globalAlpha = 1; }
}
