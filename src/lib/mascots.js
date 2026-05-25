/**
 * Mascot behaviour and celebratory effects.
 *
 * Importing this module wires up the ambient interactions (pupil eye-tracking,
 * input focus hiding) as side effects — exactly as the original inline script
 * did at load time. The exported helpers are invoked by the proof flow.
 */

/* ── Sorry toast ────────────────────────────────────────────────── */
let _sorryToastTimer = null;

export function showSorryToast() {
  // Remove any existing toast
  const existing = document.getElementById('sorryToast');
  if (existing) existing.remove();
  if (_sorryToastTimer) { clearTimeout(_sorryToastTimer); _sorryToastTimer = null; }

  const toast = document.createElement('div');
  toast.id = 'sorryToast';
  toast.className = 'sorry-toast';
  toast.textContent = 'Sorry, Sunny, my friend, to doubt you.';
  document.body.appendChild(toast);

  // Trigger slide-up
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  // Fade out after 2.6s
  _sorryToastTimer = setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 400);
  }, 2600);
}

/* Mascot pupils */
const mascotPupils = [
  { el: document.getElementById('mpp1'), eye: document.getElementById('mpe1') },
  { el: document.getElementById('mpp2'), eye: document.getElementById('mpe2') },
  { el: document.getElementById('mbp1'), eye: document.getElementById('mbe1') },
  { el: document.getElementById('mbp2'), eye: document.getElementById('mbe2') },
  { el: document.getElementById('mop1'), eye: document.getElementById('moe1') },
  { el: document.getElementById('mop2'), eye: document.getElementById('moe2') },
];

function moveMascotPupils(tx, ty) {
  mascotPupils.forEach(({ el, eye }) => {
    if (!el || !eye) return;
    const rect = eye.getBoundingClientRect();
    const ex = rect.left + rect.width / 2, ey = rect.top + rect.height / 2;
    const angle = Math.atan2(ty - ey, tx - ex);
    const dist = Math.min(2, Math.hypot(tx - ex, ty - ey) * 0.06);
    el.style.transform = 'translate(' + Math.cos(angle) * dist + 'px,' + Math.sin(angle) * dist + 'px)';
  });
  const ye = document.getElementById('mcYellowEye');
  if (ye) {
    const yr = ye.getBoundingClientRect();
    const yx = yr.left + yr.width / 2, yy = yr.top + yr.height / 2;
    const a2 = Math.atan2(ty - yy, tx - yx);
    const d2 = Math.min(1.5, Math.hypot(tx - yx, ty - yy) * 0.05);
    ye.style.transform = 'translate(' + Math.cos(a2) * d2 + 'px,' + Math.sin(a2) * d2 + 'px)';
  }
}
document.addEventListener('mousemove', e => moveMascotPupils(e.clientX, e.clientY));
document.addEventListener('touchmove', e => { const t = e.touches[0]; moveMascotPupils(t.clientX, t.clientY); }, { passive: true });

const charsStage = document.getElementById('charsStage');

export function mascotCelebrate() {
  charsStage.classList.add('celebrate');
  const orange = document.getElementById('mcOrange');
  if (orange) orange.classList.add('celebrate');
  launchConfetti();
  setTimeout(() => { charsStage.classList.remove('celebrate'); if (orange) orange.classList.remove('celebrate'); }, 2200);
}

export function mascotSad() {
  const orange = document.getElementById('mcOrange');
  if (orange) { orange.classList.add('sad'); setTimeout(() => orange.classList.remove('sad'), 2000); }
}

document.querySelectorAll('input[type="text"]').forEach(f => {
  f.addEventListener('focus', () => charsStage.classList.add('hiding'));
  f.addEventListener('blur',  () => charsStage.classList.remove('hiding'));
});

const confettiColors = ['#93cb52', '#1c9770', '#bef3e2', '#464646', '#f2eeee', '#7aaa3f'];

export function launchConfetti() {
  const wrap = document.getElementById('confettiWrap');
  for (let i = 0; i < 80; i++) {
    const dot = document.createElement('div');
    dot.className = 'confetti-dot';
    const size = 5 + Math.random() * 9;
    dot.style.cssText = 'left:' + (Math.random() * 100) + '%;width:' + size + 'px;height:' + (size * (Math.random() > 0.5 ? 1 : 0.35)) + 'px;background:' + confettiColors[Math.floor(Math.random() * confettiColors.length)] + ';animation-duration:' + (1.2 + Math.random() * 1.8) + 's;animation-delay:' + (Math.random() * 0.8) + 's;border-radius:' + (Math.random() > 0.5 ? '50%' : '2px') + ';opacity:1;';
    wrap.appendChild(dot);
    setTimeout(() => dot.remove(), 4000);
  }
}
