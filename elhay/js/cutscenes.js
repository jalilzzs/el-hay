/* ============ Cutscenes: Full Intro Sequence Director ============ */
const Cutscenes = {};

const getEl = id => document.getElementById(id);

let csSkipped = false;

// دالة إخفاء وإظهار الواجهة
function setUIHidden(hide) {
  const touchUI = getEl('touchUI');
  const minimap = getEl('minimap');
  const invBtn = getEl('invBtn');
  const phoneBtn = getEl('phoneBtn');
  const vitalsBox = getEl('vitalsBox');
  const cashBox = getEl('cashBox');
  const hud = getEl('hud');
  const crosshair = getEl('crosshair');

  if (hide) {
    // إخفاء كل العناصر أثناء الكاتسين
    if (touchUI) touchUI.style.display = 'none';
    if (minimap) minimap.style.display = 'none';
    if (invBtn) invBtn.style.display = 'none';
    if (phoneBtn) phoneBtn.style.display = 'none';
    if (vitalsBox) vitalsBox.style.display = 'none';
    if (cashBox) cashBox.style.display = 'none';
    if (hud) hud.style.display = 'none';
    if (crosshair) crosshair.style.display = 'none';
  } else {
    // إظهار العناصر بوضوح عند نهاية الكاتسين
    if (touchUI) {
      touchUI.style.display = 'block';
      touchUI.classList.add('active'); // تفعيل أزرار التفاعل والمشي لللمس
    }
    if (minimap) minimap.style.display = 'block';
    if (invBtn) invBtn.style.display = 'block';
    if (phoneBtn) phoneBtn.style.display = 'block';
    if (vitalsBox) vitalsBox.style.display = 'block';
    if (cashBox) cashBox.style.display = 'block';
  }
}

function safeText(key) {
  if (typeof t === 'function') {
    try { return t(key); } catch (e) {}
  }
  return key;
}

function offset(target, dx, dy, dz) {
  const t = target || new THREE.Vector3(0, 0, 0);
  return new THREE.Vector3(t.x + dx, dy, t.z + dz);
}

function buildBeats() {
  const home = window.World?.landmarks?.home?.position || new THREE.Vector3(0, 0, 0);
  const car = window.World?.playerCar?.position || new THREE.Vector3(10, 0, 10);
  const checkpoint = window.World?.checkpointPos || new THREE.Vector3(50, 0, 50);
  const officer = window.World?.checkpointOfficer?.mesh?.position || new THREE.Vector3(checkpoint.x + 2, 0, checkpoint.z + 2);
  const prison = window.World?.landmarks?.prison?.position || new THREE.Vector3(100, 0, 100);

  const midX = car.x + (checkpoint.x - car.x) * 0.6;
  const midZ = car.z + (checkpoint.z - car.z) * 0.6;

  return [
    { from: { p: offset(home, -5, 1.6, -3), l: offset(home, 0, 1, -6) }, to: { p: offset(home, -2, 1.6, -2), l: offset(home, 0, 1, -5) }, dur: 3, sub: 'cs1' },
    { from: { p: offset(home, -2, 1.7, -2), l: new THREE.Vector3(car.x, 0.8, car.z) }, to: { p: offset(car, -3, 1.8, 2), l: new THREE.Vector3(car.x, 0.8, car.z) }, dur: 3, sub: 'cs2' },
    { from: { p: offset(car, -3, 2.2, 2), l: new THREE.Vector3(midX, 1, midZ) }, to: { p: new THREE.Vector3(midX - 3, 2.2, midZ + 2), l: new THREE.Vector3(checkpoint.x, 1, checkpoint.z) }, dur: 4.5, sub: 'cs3' },
    { from: { p: new THREE.Vector3(midX - 2, 1.8, midZ + 3), l: new THREE.Vector3(midX, 0.9, midZ) }, to: { p: new THREE.Vector3(midX - 1, 1.7, midZ + 1.5), l: new THREE.Vector3(midX, 0.9, midZ) }, dur: 3, sub: 'cs4' },
    { from: { p: offset(checkpoint, -4, 1.6, 3), l: officer }, to: { p: offset(checkpoint, -2, 1.4, 1.5), l: officer }, dur: 3.5, sub: 'cs5' },
    { from: { p: offset(checkpoint, -2, 1.4, 1.5), l: officer }, to: { p: offset(checkpoint, -1, 1.3, 0.8), l: officer }, dur: 3.5, sub: 'cs6' },
    { card: 'cs7', dur: 2.2 },
    { from: { p: offset(prison, 0, 1.7, 10), l: offset(prison, 0, 1.4, 4) }, to: { p: offset(prison, 0, 1.7, 3), l: offset(prison, 0, 1.4, -3) }, dur: 3.5, sub: 'cs8' }
  ];
}

const lerpV = (a, b, x) => a.clone().lerp(b, x);
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function playBeat(camera, b) {
  if (csSkipped) return;
  
  const csSub = getEl('csSub');
  const csCard = getEl('csCard');

  if (b.card) {
    if (csSub) csSub.textContent = '';
    if (csCard) {
      csCard.textContent = safeText(b.card);
      csCard.classList.add('show');
    }
    await wait(b.dur * 1000);
    if (csCard) csCard.classList.remove('show');
    return;
  }

  if (csSub) csSub.textContent = safeText(b.sub);
  const start = performance.now(), dur = b.dur * 1000;

  return new Promise(res => {
    function step() {
      if (csSkipped) return res();
      const x = Math.min((performance.now() - start) / dur, 1);
      if (camera && b.from && b.to) {
        camera.position.copy(lerpV(b.from.p, b.to.p, x));
        camera.lookAt(lerpV(b.from.l, b.to.l, x));
      }
      if (x < 1) requestAnimationFrame(step); else res();
    }
    step();
  });
}

let finishFn = null;

const csSkipBtn = getEl('csSkip');
if (csSkipBtn) {
  csSkipBtn.addEventListener('click', () => {
    csSkipped = true;
    if (finishFn) finishFn();
  });
}

Cutscenes.play = async function(camera, onDone) {
  csSkipped = false;
  
  const csLayer = getEl('csLayer');
  if (csLayer) csLayer.style.display = 'block';

  // إخفاء العناصر أثناء العرض
  setUIHidden(true);

  if (window.Player) {
    if (Player.controls && typeof Player.controls.unlock === 'function') Player.controls.unlock();
    Player.suspended = true;
  }

  let done = false;
  finishFn = () => { if (done) return; done = true; finish(); };

  function finish() {
    if (csLayer) csLayer.style.display = 'none';
    const csSub = getEl('csSub');
    const csCard = getEl('csCard');
    if (csSub) csSub.textContent = '';
    if (csCard) csCard.classList.remove('show');

    // إظهار العناصر وتفعيل الواجهة فوراً عند الضغط على تخطي أو النهاية
    setUIHidden(false);

    if (camera) {
      camera.position.set(30, 1.7, 55);
      camera.lookAt(30, 1.4, 40);
    }

    if (window.Player) {
      Player.mode = 'walk';
      Player.suspended = false;
    }
    finishFn = null;
    if (typeof onDone === 'function') onDone();
  }

  try {
    const beats = buildBeats();
    for (const b of beats) {
      if (csSkipped) break;
      await playBeat(camera, b);
    }
  } catch (err) {
    console.error("Cutscene error:", err);
  }

  finishFn && finishFn();
};
