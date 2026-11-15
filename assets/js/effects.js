(() => {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const glow = document.getElementById('cursorGlow');
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BG = '#090d0b';                       // matches --bg
  const GREEN = '#54d68a';
  const WHITE = '#f2f7f3';
  const RGB = { [GREEN]: '84,214,138', [WHITE]: '242,247,243' };
  const COUNT = 360;
  const ORBIT_PAD = 60;                       // orbits reach past the screen edges
  const TRAIL_NORMAL = 150;                    // frames of trail per star
  const TRAIL_BOOST = 170;
  const TRAIL_MAX = TRAIL_BOOST;              // ring buffer size
  const SPIN_NORMAL = .0022;                  // angle advanced per frame
  const SPIN_BOOST = .014;
  const MAX_DPR = 1.5;                        // cap canvas resolution for speed

  let w = 0, h = 0, dpr = 1, stars = [], tick = 0, boost = false;
  let level = 0;                              // eased boost amount, 0..1
  const EASE = .045;                          // how quickly the boost ramps up/down
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => Math.random() * (b - a) + a;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, MAX_DPR);
    w = innerWidth; h = innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const maxR = Math.hypot(w, h) / 2 + ORBIT_PAD;
    stars = Array.from({ length: COUNT }, () => {
      const radius = Math.sqrt(Math.random()) * maxR;
      const theta = rand(0, Math.PI * 2);
      return {
        radius, theta,
        r: rand(.55, 1.8),
        a: rand(.55, 1),
        phase: rand(0, Math.PI * 2),
        color: Math.random() < .2 ? GREEN : WHITE,
        // Ring buffer of recent positions: no allocations per frame.
        tx: new Float32Array(TRAIL_MAX),
        ty: new Float32Array(TRAIL_MAX),
        head: -1,                 // index of newest point
        filled: 0,                // how many points are stored
        len: 0                    // trail length currently drawn (eases toward target)
      };
    });
  }

  function setBoost(value) {
    boost = value && !reduced;
    document.documentElement.classList.toggle('star-boost', boost);
  }
  window.addEventListener('pointerdown', e => { if (e.button === 0 || e.pointerType !== 'mouse') setBoost(true); }, { passive: true });
  window.addEventListener('pointerup', () => setBoost(false), { passive: true });
  window.addEventListener('pointercancel', () => setBoost(false), { passive: true });
  window.addEventListener('blur', () => setBoost(false));
  if (glow && matchMedia('(pointer:fine)').matches) {
    window.addEventListener('pointermove', e => {
      glow.style.setProperty('--cursor-x', e.clientX + 'px');
      glow.style.setProperty('--cursor-y', e.clientY + 'px');
    }, { passive: true });
  }
  // A long press would otherwise open the context menu / text selection, which
  // cancels the press and switches the boost off mid-hold.
  window.addEventListener('contextmenu', e => { if (boost) e.preventDefault(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setBoost(false); });

  function pushPoint(star, x, y) {
    star.head = (star.head + 1) % TRAIL_MAX;
    star.tx[star.head] = x;
    star.ty[star.head] = y;
    if (star.filled < TRAIL_MAX) star.filled++;
  }

  // One stroke per star: transparent at the tail, full colour at the head.
  function drawTrail(star, len, alpha) {
    if (len < 2) return;
    const oldest = (star.head - (len - 1) + TRAIL_MAX) % TRAIL_MAX;
    const tailX = star.tx[oldest], tailY = star.ty[oldest];
    const headX = star.tx[star.head], headY = star.ty[star.head];
    const rgb = RGB[star.color];
    const g = ctx.createLinearGradient(tailX, tailY, headX, headY);
    g.addColorStop(0, `rgba(${rgb},0)`);
    g.addColorStop(1, `rgba(${rgb},${alpha})`);
    ctx.strokeStyle = g;
    ctx.lineWidth = star.lw;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    for (let i = 1; i < len; i++) {
      const idx = (oldest + i) % TRAIL_MAX;
      ctx.lineTo(star.tx[idx], star.ty[idx]);
    }
    ctx.stroke();
  }

  let lastTime = 0;
  // Frame-time scale: 1 at 60fps. Clamped so a paused tab doesn't jump.
  function frameScale(now) {
    const dt = lastTime ? Math.min((now - lastTime) / 16.667, 3) : 1;
    lastTime = now;
    return dt;
  }

  function draw(now = 0) {
    const dt = frameScale(now);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);   // background gradient is drawn by #bgFade

    const cx = w / 2, cy = h / 2;
    // Ease the boost toward on/off so the speed-up and slow-down are gradual.
    level += ((boost ? 1 : 0) - level) * (1 - Math.pow(1 - EASE, dt));
    if (reduced) level = 0;
    const spin = reduced ? 0 : lerp(SPIN_NORMAL, SPIN_BOOST, level) * dt;
    const target = Math.round(lerp(TRAIL_NORMAL, TRAIL_BOOST, level));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const star of stars) {
      star.theta += spin;
      const x = cx + star.radius * Math.cos(star.theta);
      const y = cy + star.radius * Math.sin(star.theta);
      pushPoint(star, x, y);

      // Ease the trail length toward the target one step per frame,
      // so it grows during a press and shrinks back smoothly afterwards.
      if (star.len < target) star.len++;
      else if (star.len > target) star.len--;
      if (star.len > star.filled) star.len = star.filled;

      const twinkle = .86 + Math.sin(tick * .022 + star.phase) * .14;
      star.lw = star.r * lerp(.7, 1.3, level);    // thin streaks, thicker on boost
      drawTrail(star, star.len, lerp(.45, .8, level) * twinkle);

      // Soft halo behind a small bright head, as in the reference look.
      ctx.fillStyle = star.color;
      ctx.globalAlpha = star.a * twinkle * lerp(.14, .42, level);
      ctx.beginPath();
      ctx.arc(x, y, star.r * lerp(3.2, 6, level), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = star.a * twinkle;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, star.r * lerp(.95, 1.2, level), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    tick += dt;
    if (!reduced) requestAnimationFrame(draw);
  }

  addEventListener('resize', resize, { passive: true });
  resize();
  draw();
  // Tilt game cards toward the cursor (mouse/trackpad only).
  if (matchMedia('(pointer:fine)').matches) {
    const grid = document.getElementById('gameGrid');
    const MAX_TILT = 9;                       // degrees
    if (grid) {
      grid.addEventListener('pointermove', e => {
        const card = e.target.closest('.game-card');
        if (!card) return;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - .5;    // -0.5 .. 0.5
        const py = (e.clientY - r.top) / r.height - .5;
        card.style.transform =
          `perspective(900px) rotateX(${(-py * MAX_TILT).toFixed(2)}deg) rotateY(${(px * MAX_TILT).toFixed(2)}deg) translateY(-4px)`;
      }, { passive: true });
      grid.addEventListener('pointerout', e => {
        const card = e.target.closest('.game-card');
        if (card && !card.contains(e.relatedTarget)) card.style.transform = '';
      }, { passive: true });
    }
  }
})();
