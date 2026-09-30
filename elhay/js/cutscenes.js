/* ============ Cutscenes: Full Intro Sequence Director ============ */
const Cutscenes = {};

// جلب العناصر مع التأكد من وجودها
const csLayer = document.getElementById('csLayer');
const csSub = document.getElementById('csSub');
const csCard = document.getElementById('csCard');
const csSkipBtn = document.getElementById('csSkip');

let csSkipped = false;

// دالة التنعيم السينمائي لسلاسة حركة الكاميرا
const easeInOutCubic = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

function offset(target, dx, dy, dz) { 
  return new THREE.Vector3(target.x + dx, dy, target.z + dz); 
}

// نصوص الكاتسين باللغة العربية المباشرة لتفادي خطأ دالة الترجمة t()
const csTexts = {
  cs1: "استيقظت اليوم بشعور غريب... حان وقت الخروج من البيت.",
  cs2: "سيارتي ركنتها في المكان المعتاد، نتجه إليها.",
  cs3: "الطريق هادئة... لكن هناك شيء غير عادي في الحي.",
  cs4: "حاجز أمني للأمن الوطني أمامنا...",
  cs5: "طلب الشرطي التوقف وتفتيش وثائق السيارة.",
  cs6: "تم توقيفي واقتيادي للتحقيق...",
  cs7: "بعد مرور 5 سنوات كاملة...",
  cs8: "أخيراً... الخروج من السجن والعودة إلى أزقة الحي."
};

function getText(key) {
  if (typeof t === 'function') {
    try { return t(key) || csTexts[key] || ''; } catch(e){}
  }
  return csTexts[key] || '';
}

function buildBeats() {
  const home = (window.World && World.landmarks && World.landmarks.home) ? World.landmarks.home.position : new THREE.Vector3(0, 0, 0);
  const car = (window.World && World.playerCar) ? World.playerCar.position : new THREE.Vector3(10, 0, 10);
  const checkpoint = (window.World && World.checkpointPos) ? World.checkpointPos : new THREE.Vector3(50, 0, 50);
  const officer = (window.World && World.checkpointOfficer && World.checkpointOfficer.mesh) ? World.checkpointOfficer.mesh.position : new THREE.Vector3(52, 0, 52);
  const prison = (window.World && World.landmarks && World.landmarks.prison) ? World.landmarks.prison.position : new THREE.Vector3(100, 0, 100);

  const midX = car.x + (checkpoint.x - car.x) * 0.5;
  const midZ = car.z + (checkpoint.z - car.z) * 0.5;

  return [
    { from: { p: offset(home, -6, 3.2, 8), l: offset(home, 0, 1.2, 0) }, to: { p: offset(home, -2, 2.0, 4), l: offset(home, 0, 1.0, 0) }, dur: 3.5, sub: 'cs1' },
    { from: { p: offset(car, -5, 2.5, -5), l: new THREE.Vector3(car.x, 1.2, car.z) }, to: { p: offset(car, -1.8, 1.7, 1.8), l: new THREE.Vector3(car.x, 1.0, car.z) }, dur: 3.5, sub: 'cs2' },
    { from: { p: new THREE.Vector3(midX - 8, 3.5, midZ + 8), l: new THREE.Vector3(midX, 1.2, midZ) }, to: { p: new THREE.Vector3(midX - 3, 2.2, midZ + 3), l: new THREE.Vector3(checkpoint.x, 1.2, checkpoint.z) }, dur: 4.5, sub: 'cs3' },
    { from: { p: new THREE.Vector3(midX - 3, 2.0, midZ + 3), l: new THREE.Vector3(midX, 1.1, midZ) }, to: { p: new THREE.Vector3(midX - 1, 1.7, midZ + 1.5), l: new THREE.Vector3(midX, 1.0, midZ) }, dur: 3.0, sub: 'cs4' },
    { from: { p: offset(checkpoint, -4, 2.2, 4), l: officer }, to: { p: offset(checkpoint, -2, 1.7, 2), l: officer }, dur: 3.5, sub: 'cs5' },
    { from: { p: offset(checkpoint, -2, 1.7, 2), l: officer }, to: { p: offset(checkpoint, -1.2, 1.6, 1.0), l: officer }, dur: 3.5, sub: 'cs6' },
    { card: 'cs7', dur: 3.0 },
    { from: { p: offset(prison, 0, 2.5, 12), l: offset(prison, 0, 1.2, 0) }, to: { p: offset(prison, 0, 1.8, 4), l: offset(prison, 0, 1.2, -2) }, dur: 4.0, sub: 'cs8' }
  ];
}

const lerpV = (a, b, x) => a.clone().lerp(b, x);
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function playBeat(camera, b) {
  if (csSkipped) return;

  if (b.card) { 
    if (csSub) csSub.textContent = ''; 
    if (csCard) {
      csCard.textContent = getText(b.card); 
      csCard.classList.add('show'); 
    }
    await wait(b.dur * 1000); 
    if (csCard) csCard.classList.remove('show'); 
    return; 
  }

  if (csSub) csSub.textContent = getText(b.sub);
  const start = performance.now();
  const dur = b.dur * 1000;

  return new Promise(res => {
    function step() {
      if (csSkipped) return res();
      const rawProgress = Math.min((performance.now() - start) / dur, 1);
      const easedProgress = easeInOutCubic(rawProgress);

      if (camera && b.from && b.to) {
        camera.position.copy(lerpV(b.from.p, b.to.p, easedProgress));
        camera.lookAt(lerpV(b.from.l, b.to.l, easedProgress));
      }

      if (rawProgress < 1) {
        requestAnimationFrame(step);
      } else {
        res();
      }
    }
    step();
  });
}

let finishFn = null;

if (csSkipBtn) {
  csSkipBtn.addEventListener('click', () => { 
    csSkipped = true; 
    if (finishFn) finishFn(); 
  });
}

Cutscenes.play = async function(camera, onDone) {
  csSkipped = false; 
  if (csLayer) csLayer.style.display = 'block'; 
  
  if (window.Player) {
    if (Player.controls && typeof Player.controls.unlock === 'function') {
      Player.controls.unlock();
    }
    Player.suspended = true; 
  }

  let done = false;
  finishFn = () => { 
    if (done) return; 
    done = true; 
    finish(); 
  };

  function finish() {
    if (csLayer) csLayer.style.display = 'none'; 
    if (csSub) csSub.textContent = ''; 
    if (csCard) csCard.classList.remove('show');
    
    const prison = (window.World && World.landmarks && World.landmarks.prison) ? World.landmarks.prison.position : new THREE.Vector3(100, 0, 100);
    if (camera) {
      camera.position.set(prison.x, 1.7, prison.z + 5); 
      camera.lookAt(prison.x, 1.4, prison.z);
    }
    
    if (window.Player) {
      Player.mode = 'walk'; 
      Player.suspended = false; 
    }
    finishFn = null;
    
    if (typeof onDone === 'function') onDone();
  }

  const beats = buildBeats();
  for (const b of beats) { 
    if (csSkipped) break; 
    await playBeat(camera, b); 
  }
  
  finishFn && finishFn();
};
