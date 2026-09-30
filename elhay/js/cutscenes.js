/* ============ Cutscenes: Full Intro Sequence Director (Enhanced Edition) ============ */
const Cutscenes = {};
const csLayer = $('csLayer'), csSub = $('csSub'), csCard = $('csCard'), csSkipBtn = $('csSkip');
let csSkipped = false;

// إقحام دالة التنعيم السينمائي (Smooth Easing Function) لجعل حركة الكاميرا احترافية بدلاً من الحركة الخطيّة
const easeInOutCubic = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

function offset(target, dx, dy, dz) { 
  return new THREE.Vector3(target.x + dx, dy, target.z + dz); 
}

/* 
  تعديل زوايا وارتفاعات الكاميرا لجعل اللقطات سينمائية وموجهة بدقة نحو المنزل، السيارة، الحاجز الأمن، والسجن
  مع تجنب نزول الكاميرا لمستوى الأرض (الذي كان يسبب ظهور الحشيش والأرض فقط).
*/
function buildBeats() {
  const home = World.landmarks.home ? World.landmarks.home.position : new THREE.Vector3(0, 0, 0);
  const car = World.playerCar ? World.playerCar.position : new THREE.Vector3(10, 0, 10);
  const checkpoint = World.checkpointPos || new THREE.Vector3(50, 0, 50);
  const officer = (World.checkpointOfficer && World.checkpointOfficer.mesh) ? World.checkpointOfficer.mesh.position : new THREE.Vector3(52, 0, 52);
  const prison = World.landmarks.prison ? World.landmarks.prison.position : new THREE.Vector3(100, 0, 100);

  const midX = car.x + (checkpoint.x - car.x) * 0.5;
  const midZ = car.z + (checkpoint.z - car.z) * 0.5;

  return [
    // L1: الاستيقاظ والخروج من المنزل (تصوير سينمائي للواجهة من زاوية علوية مرتفعة)
    {
      from: { p: offset(home, -6, 3.2, 8), l: offset(home, 0, 1.2, 0) },
      to:   { p: offset(home, -2, 2.0, 4), l: offset(home, 0, 1.0, 0) },
      dur: 3.5,
      sub: 'cs1'
    },
    // L2: التوجه نحو السيارة والرؤية العامة للحي
    {
      from: { p: offset(car, -5, 2.5, -5), l: new THREE.Vector3(car.x, 1.2, car.z) },
      to:   { p: offset(car, -1.8, 1.7, 1.8), l: new THREE.Vector3(car.x, 1.0, car.z) },
      dur: 3.5,
      sub: 'cs2'
    },
    // L3: قيادة السيارة في الطريق والشيء المريب
    {
      from: { p: new THREE.Vector3(midX - 8, 3.5, midZ + 8), l: new THREE.Vector3(midX, 1.2, midZ) },
      to:   { p: new THREE.Vector3(midX - 3, 2.2, midZ + 3), l: new THREE.Vector3(checkpoint.x, 1.2, checkpoint.z) },
      dur: 4.5,
      sub: 'cs3'
    },
    // L4: الاقتراب من النقطة المشبوهة
    {
      from: { p: new THREE.Vector3(midX - 3, 2.0, midZ + 3), l: new THREE.Vector3(midX, 1.1, midZ) },
      to:   { p: new THREE.Vector3(midX - 1, 1.7, midZ + 1.5), l: new THREE.Vector3(midX, 1.0, midZ) },
      dur: 3.0,
      sub: 'cs4'
    },
    // L5: حاجز التفتيش والوقوف عند الشرطي
    {
      from: { p: offset(checkpoint, -4, 2.2, 4), l: officer },
      to:   { p: offset(checkpoint, -2, 1.7, 2), l: officer },
      dur: 3.5,
      sub: 'cs5'
    },
    // L6: المواجهة والتوقيف
    {
      from: { p: offset(checkpoint, -2, 1.7, 2), l: officer },
      to:   { p: offset(checkpoint, -1.2, 1.6, 1.0), l: officer },
      dur: 3.5,
      sub: 'cs6'
    },
    // L7: كارت الانتقال الزمني (بعد مرور 5 سنوات)
    { card: 'cs7', dur: 3.0 },
    // L8: الخروج من باب السجن والعودة إلى شوارع الحي
    {
      from: { p: offset(prison, 0, 2.5, 12), l: offset(prison, 0, 1.2, 0) },
      to:   { p: offset(prison, 0, 1.8, 4),  l: offset(prison, 0, 1.2, -2) },
      dur: 4.0,
      sub: 'cs8'
    }
  ];
}

const lerpV = (a, b, x) => a.clone().lerp(b, x);
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function playBeat(camera, b) {
  if (csSkipped) return;

  if (b.card) { 
    csSub.textContent = ''; 
    csCard.textContent = typeof t === 'function' ? t(b.card) : 'بعد مرور 5 سنوات...'; 
    csCard.classList.add('show'); 
    await wait(b.dur * 1000); 
    csCard.classList.remove('show'); 
    return; 
  }

  csSub.textContent = typeof t === 'function' ? t(b.sub) : '';
  const start = performance.now();
  const dur = b.dur * 1000;

  return new Promise(res => {
    function step() {
      if (csSkipped) return res();
      const rawProgress = Math.min((performance.now() - start) / dur, 1);
      const easedProgress = easeInOutCubic(rawProgress); // الحركة الناعمة السينمائية

      camera.position.copy(lerpV(b.from.p, b.to.p, easedProgress));
      camera.lookAt(lerpV(b.from.l, b.to.l, easedProgress));

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

csSkipBtn.addEventListener('click', () => { 
  csSkipped = true; 
  if (finishFn) finishFn(); 
});

Cutscenes.play = async function(camera, onDone) {
  csSkipped = false; 
  csLayer.style.display = 'block'; 
  
  if (Player.controls && typeof Player.controls.unlock === 'function') {
    Player.controls.unlock();
  }
  
  Player.suspended = true; // إيقاف تحرك اللاعب وتأثير الكاميرا من الملفات الأخرى أثناء العرض

  let done = false;
  finishFn = () => { 
    if (done) return; 
    done = true; 
    finish(); 
  };

  function finish() {
    csLayer.style.display = 'none'; 
    csSub.textContent = ''; 
    csCard.classList.remove('show');
    
    // موقع الكاميرا النهائي بعد نهاية العرض لبدء اللعب
    const prison = World.landmarks.prison ? World.landmarks.prison.position : new THREE.Vector3(100, 0, 100);
    camera.position.set(prison.x, 1.7, prison.z + 5); 
    camera.lookAt(prison.x, 1.4, prison.z);
    
    Player.mode = 'walk'; 
    Player.suspended = false; 
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
