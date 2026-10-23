// L'effet de portail : un tourbillon d'énergie dessiné par un shader dans l'ouverture de l'arche (forme ogivale).
// Nuages d'énergie tordus en spirale, anneaux qui filent vers le fond, cœur lumineux, bord brillant.
import { Filter, GlProgram, Graphics } from 'pixi.js';

const VERT = `
in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
vec4 filterVertexPosition(void) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}
vec2 filterTextureCoord(void) { return aPosition * (uOutputFrame.zw * uInputSize.zw); }
void main(void) { gl_Position = filterVertexPosition(); vTextureCoord = filterTextureCoord(); }
`;

const FRAG = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform float uTime;
uniform float uIntensite;
uniform float uAspect;
uniform vec3 uCol1;
uniform vec3 uCol2;
uniform vec3 uCol3;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float bruit(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * bruit(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

void main(void) {
  vec4 forme = texture(uTexture, vTextureCoord);       // l'alpha de la forme blanche = l'ouverture de l'arche
  vec2 c = (vTextureCoord - vec2(0.5, 0.56)) * 2.0;
  c.x *= uAspect;
  float r = length(c);
  float ang = atan(c.y, c.x);
  float tors = 5.0 * (1.0 - smoothstep(0.0, 1.25, r));            // plus on s'approche du centre, plus la spirale se tord
  float a2 = ang + tors + uTime * 0.85;
  vec2 q = vec2(cos(a2), sin(a2)) * pow(r, 0.75) * 2.2;
  float n = fbm(q * 1.6 + vec2(uTime * 0.3, -uTime * 0.45));
  float anneaux = 0.5 + 0.5 * sin(r * 16.0 - uTime * 3.2 + n * 4.5);   // des ondes filent vers le fond
  float coeur = exp(-r * r * 5.0);
  float bord = pow(smoothstep(0.62, 1.05, r), 2.0);
  vec3 col = mix(uCol1, uCol2, smoothstep(0.2, 0.9, n + 0.15 * anneaux));
  col = mix(col, uCol3, clamp(coeur * 0.95 + 0.32 * anneaux * (1.0 - r), 0.0, 1.0));
  col += bord * uCol3 * 0.55;
  float alpha = forme.a * uIntensite * (0.8 + 0.2 * n);
  finalColor = vec4(col * alpha, alpha);
}
`;

export type Couleur = [number, number, number];
export interface PaletteFx { c1: Couleur; c2: Couleur; c3: Couleur; }

export const PALETTE_PORTAIL: PaletteFx = { c1: [0.38, 0.34, 0.86], c2: [0.96, 0.6, 0.9], c3: [1.0, 0.96, 0.82] }; // onirique : bleu-lilas, rose, or pâle
export const PALETTE_MYSTERE: PaletteFx = { c1: [0.06, 0.02, 0.14], c2: [0.42, 0.18, 0.82], c3: [0.86, 0.68, 1.0] };

export class PortailFx {
  readonly g = new Graphics();
  private u: Record<string, unknown>;

  /** rx : demi-largeur de l'ouverture, haut : hauteur de l'ouverture (px, depuis le bas de l'arche). */
  constructor(rx: number, haut: number, palette: PaletteFx, forme: 'ogive' | 'rect' = 'ogive') {
    const bas = 0;
    if (forme === 'rect') this.g.rect(-rx, -haut, rx * 2, haut).fill(0xffffff);
    else this.g.moveTo(-rx, bas).lineTo(-rx, -haut * 0.52)
      .quadraticCurveTo(-rx, -haut * 0.93, 0, -haut)
      .quadraticCurveTo(rx, -haut * 0.93, rx, -haut * 0.52)
      .lineTo(rx, bas).closePath().fill(0xffffff);
    const filtre = new Filter({
      glProgram: GlProgram.from({ vertex: VERT, fragment: FRAG, name: 'portail-fx' }),
      resources: {
        portailUniforms: {
          uTime: { value: 0, type: 'f32' },
          uIntensite: { value: 0, type: 'f32' },
          uAspect: { value: (2 * rx) / haut, type: 'f32' },
          uCol1: { value: new Float32Array(palette.c1), type: 'vec3<f32>' },
          uCol2: { value: new Float32Array(palette.c2), type: 'vec3<f32>' },
          uCol3: { value: new Float32Array(palette.c3), type: 'vec3<f32>' },
        },
      },
    });
    this.g.filters = [filtre];
    this.u = (filtre.resources.portailUniforms as unknown as { uniforms: Record<string, unknown> }).uniforms;
  }

  maj(t: number, intensite: number) {
    this.g.visible = intensite > 0.02;
    if (!this.g.visible) return;
    this.u.uTime = t;
    this.u.uIntensite = intensite;
  }
}
