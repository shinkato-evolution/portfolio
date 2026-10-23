// La flamme de la torche : un feu dessiné par un shader (bruit qui monte, langues qui ondulent), découpé en bandes de couleur
// franches façon dessin animé / RPG : bord rouge, orange, jaune, cœur blanc-jaune. Un seul canevas WebGL minuscule.
const VS = `
attribute vec2 a;
varying vec2 uv;
void main() { uv = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }
`;

const FS = `
precision highp float;
varying vec2 uv;
uniform float t;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float bruit(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * bruit(p); p = p * 2.02 + vec2(3.1, 1.7); a *= 0.5; }
  return v;
}

// Une goutte de feu : forme propre, bord qui ondule doucement, pointe qui balance. Retourne une valeur « cœur → bord » (>0 = dans la flamme).
float goutte(vec2 p, float cx, float echelle, float phase, float amp) {
  float h = p.y / echelle;
  if (h > 1.0) return -1.0;
  float balance = sin(t * 2.4 + phase + h * 3.2) * amp * h * h + sin(t * 5.3 + phase * 1.7 + h * 5.0) * amp * 0.35 * h;
  float x = p.x - cx - balance;
  float ondule = (bruit(vec2(h * 3.0 - t * 1.7 + phase, phase)) - 0.5) * 0.22 * h;
  float larg = 1.0 * pow(1.0 - h, 0.5) * (0.86 + 0.14 * smoothstep(0.0, 0.3, h)) * (1.0 + ondule * 2.0); // bulbe arrondi qui s'effile en pointe douce
  float d = abs(x) / max(larg, 0.02);
  return 1.0 - d - h * 0.9; // les contours intérieurs se referment plus bas : des flammes emboîtées, pas des rayures
}

void main() {
  vec2 p = vec2(uv.x * 2.0 - 1.0, uv.y);
  float f = goutte(p, 0.0, 0.98 + 0.02 * sin(t * 9.0), 0.0, 0.09);
  f = max(f, goutte(p, -0.34, 0.56, 2.1, 0.12) - 0.05);   // deux petites langues de chaque côté
  f = max(f, goutte(p, 0.36, 0.5, 4.2, 0.12) - 0.05);
  float a = smoothstep(0.0, 0.035, f);
  vec3 col = vec3(0.62, 0.10, 0.03);
  col = mix(col, vec3(0.92, 0.28, 0.04), smoothstep(0.10, 0.125, f));
  col = mix(col, vec3(1.00, 0.52, 0.07), smoothstep(0.24, 0.265, f));
  col = mix(col, vec3(1.00, 0.72, 0.10), smoothstep(0.40, 0.425, f));
  col = mix(col, vec3(1.00, 0.90, 0.38), smoothstep(0.58, 0.605, f));
  col = mix(col, vec3(1.00, 0.98, 0.80), smoothstep(0.76, 0.785, f));
  // La flamme se pose sur la tête de la torche : le bas se fond, le cœur est un peu transparent pour laisser voir la torche.
  a *= smoothstep(0.0, 0.16, uv.y) * mix(1.0, 0.8, smoothstep(0.3, 0.7, f));
  gl_FragColor = vec4(col * a, a);
}
`;

export class Flamme {
  readonly canvas = document.createElement('canvas');
  private gl: WebGLRenderingContext | null;
  private tLoc: WebGLUniformLocation | null = null;

  constructor() {
    this.canvas.width = 256; this.canvas.height = 400;
    this.gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true });
    const gl = this.gl;
    if (!gl) return;
    const compiler = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compiler(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compiler(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.tLoc = gl.getUniformLocation(prog, 't');
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
  }

  /** Dessine une image de la flamme au temps t (secondes). */
  rendre(t: number) {
    const gl = this.gl;
    if (!gl) return;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(this.tLoc, t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
