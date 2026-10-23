// Poussière en suspension sur l'écran d'accueil : de petits points lumineux, très peu opaques, qui dérivent lentement dans le noir.
export function poussiereAccueil(hote: HTMLElement): () => void {
  const c = document.createElement('canvas'); c.className = 'intro-poussiere'; c.setAttribute('aria-hidden', 'true');
  hote.prepend(c);
  const g = c.getContext('2d')!; let W = 0, H = 0, dpr = 1, raf = 0, actif = true;
  const taille = () => { dpr = Math.min(window.devicePixelRatio || 1, 2); W = hote.clientWidth; H = hote.clientHeight; c.width = W * dpr; c.height = H * dpr; c.style.width = `${W}px`; c.style.height = `${H}px`; };
  taille(); window.addEventListener('resize', taille);
  const N = 90, p = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 2.2, v: 0.004 + Math.random() * 0.012, d: (Math.random() - 0.5) * 0.01, ph: Math.random() * 6.28, o: 0.12 + Math.random() * 0.4 }));
  let t0 = performance.now();
  const tic = (t: number) => {
    if (!actif) return;
    const dt = Math.min(0.05, (t - t0) / 1000); t0 = t;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    for (const q of p) {
      q.y -= q.v * dt; q.x += (q.d + Math.sin(t / 2200 + q.ph) * 0.006) * dt;
      if (q.y < -0.02) { q.y = 1.02; q.x = Math.random(); } if (q.x < -0.02) q.x = 1.02; if (q.x > 1.02) q.x = -0.02;
      const o = q.o * (0.55 + 0.45 * Math.sin(t / 1300 + q.ph)), px = q.x * W, py = q.y * H;
      const grad = g.createRadialGradient(px, py, 0, px, py, q.r * 3);
      grad.addColorStop(0, `rgba(255, 214, 120, ${o})`); grad.addColorStop(1, 'rgba(255, 214, 120, 0)');
      g.fillStyle = grad; g.beginPath(); g.arc(px, py, q.r * 3, 0, 6.2832); g.fill();
    }
    raf = requestAnimationFrame(tic);
  };
  raf = requestAnimationFrame(tic);
  return () => { actif = false; cancelAnimationFrame(raf); window.removeEventListener('resize', taille); c.remove(); };
}
