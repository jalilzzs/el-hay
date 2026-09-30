/* ============ Cutscenes: Full Intro Sequence Director (Fixed Targets & Clean UI) ============ */
const Cutscenes = {};

const csLayer = document.getElementById('csLayer');
const csSub = document.getElementById('csSub');
const csCard = document.getElementById('csCard');
const csSkipBtn = document.getElementById('csSkip');

let csSkipped = false;

// دالة التحكم بإخفاء وإظهار واجهة اللعب أثناء الكاتسين
function toggleCutsceneUI(hide) {
  const elements = [
    'touchUI', 'hud', 'vitalsBox', 'cashBox', 
    'minimap', 'weaponHud', 'wantedBox', 'reticle', 'crosshair', 'invBtn', 'phoneBtn'
  ];
  elements.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = hide ? 'none' : '';
  });
}

// دالة التنعيم السينمائي لسلاسة حركة الكاميرا
const easeInOutCubic = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

function offset(target, dx, dy, dz) { 
  return new THREE.Vector3(target.x + dx, target.y + dy, target.z + dz); 
}

// نصوص مطابقة تماماً للمشاهد
const csTexts = {
  cs1: "صباح جديد في الحي... حان وقت الخروج والانطلاق.",
  cs2: "المركبة مركونة أمام المنزل، نتجه نحوها.",
  cs3: "الانطلاق بالسيارة عبر شوارع الحي...",
  cs4: "التوقف في الطريق لاصطحاب ابن العم مع أمتعته.",
  cs5: "حاجز أمني للأمن الوطني أمامنا على الطريق...",
  cs6: "طلب التفتيش والتثبت من هوية الركاب والمركبة.",
  cs7: "بعد مرور 5 سنوات كاملة في السجن...",
  cs8: "لحظة الخروج والعودة مجدداً إلى شوارع الحي."
};

function getText(key) {
  if (typeof t === 'function') {
    try { return t(key) || csTexts[key] || ''; } catch(e){}
  }
  return csTexts[key] || '';
}

function buildBeats() {
  // جلب المواقع الحقيقية للمجسمات من الـ World
  const home = (window.World && World.landmarks && World.landmarks.home) ? World.landmarks.home.position : new THREE.Vector3(0, 0, 0);
  const car = (window.World && World.playerCar) ? World.playerCar.position : new THREE.Vector3(10, 0, 10);
  const checkpoint = (window.World && World.checkpointPos) ? World.checkpointPos : new THREE.Vector3(50, 0, 50);
  const officer = (window.World && World.checkpointOfficer && World.checkpointOfficer.mesh) ? World.checkpointOfficer.mesh.position : new THREE.Vector3(checkpoint.x + 2, 0, checkpoint.z + 2);
  const prison = (window.World && World.landmarks && World.landmarks.prison) ? World.landmarks.prison.position : new THREE.Vector3(100, 0, 100);

  // نقطة الوقوف لاصطحاب ابن العم
  const cousinStop = new THREE.Vector3(
    car.x + (checkpoint.x - car.x) * 0.4,
    car.y,
    car.z + (checkpoint.z - car.z) * 0.4
  );

  return [
    // 1. الخروج من المنزل (تركيز مباشر على المنزل)
    { 
      from: { p: offset(home, -8, 4.0, 10), l: offset(home, 0, 1.5, 0) }, 
      to:   { p: offset(home, -3, 2.0, 5),  l: offset(home, 0, 1.2, 0) }, 
      dur: 3.5, sub: 'cs1' 
    },
    // 2. التوجه للسيارة (التركيز على هيكل السيارة)
    { 
      from: { p: offset(car, -6, 3.0, -4), l: offset(car, 0, 0.8, 0) }, 
      to:   { p: offset(car, -2.5, 1.6, 2), l: offset(car, 0, 0.8, 0) }, 
      dur: 3.5, sub: 'cs2' 
    },
    // 3. السياقة في الطريق
    { 
      from: { p: offset(car, -4, 2.5, 8), l: offset(cousinStop, 0, 1.0, 0) }, 
      to:   { p: offset(cousinStop, -6, 2.0, 6), l: offset(cousinStop, 0, 1.0, 0) }, 
      dur: 4.0, sub: 'cs3' 
    },
    // 4. الاصطحاب والتوقف لالتقاط ابن العم
    { 
      from: { p: offset(cousinStop, -5, 1.8, 4), l: offset(cousinStop, 0, 1.0, 0) }, 
      to:   { p: offset(cousinStop, -2, 1.6, 2), l: offset(cousinStop, 0, 1.0, 0) }, 
      dur: 3.5, sub: 'cs4' 
    },
    // 5. رؤية الحاجز الأمني
    { 
      from: { p: offset(checkpoint, -10, 3.5, 10), l: offset(officer, 0, 1.2, 0) }, 
      to:   { p: offset(checkpoint, -4, 2.0, 4),  l: offset(officer, 0, 1.2, 0) }, 
      dur: 3.5, sub: 'cs5' 
    },
    // 6. التفتيش والتوقيف عند الشرطي
    { 
      from: { p: offset(officer, -3, 1.8, 3), l: offset(officer, 0, 1.4, 0) }, 
      to:   { p: offset(officer, -1.5, 1.6, 1.5), l: offset(officer, 0, 1.4, 0) }, 
      dur: 3.5, sub: 'cs6' 
    },
    // 7. مرور 5 سنوات
    { card: 'cs7', dur: 3.0 },
    // 8. الخروج من باب السجن
    { 
      from: { p: offset(prison, 0, 3.0, 12), l: offset(prison, 0, 1.5, 0) }, 
      to:   { p: offset(prison, 0, 1.8, 5),  l: offset(prison, 0, 1.2, -2) }, 
      dur: 4.0, sub: 'cs8' 
    }
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
  
  // إخفاء الواجهة بالكامل
  toggleCutsceneUI(true);

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
    
    // إعادة إظهار عناصر اللعب والواجهة
    toggleCutsceneUI(false);

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
