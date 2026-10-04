/* ============ Audio: Advanced Procedural Web Audio Sound System ============ */
const Audio = {
  ctx: null,
  masterGain: null,
  ambientNode: null,
  engineNode: null,
  sirenNode: null,
  lastFootstep: 0,
  ready: false
};

Audio.init = function() {
  try {
    Audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
    Audio.masterGain = Audio.ctx.createGain();
    // خفض مستوى الصوت العام ليصلح مريحاً وخافتاً (Master Volume)
    Audio.masterGain.gain.value = 0.6; 
    Audio.masterGain.connect(Audio.ctx.destination);
    Audio.ready = true;
  } catch (e) {
    console.warn('Audio: Web Audio unavailable', e);
    Audio.ctx = null;
  }
};

Audio.resume = function() {
  if (!Audio.ctx) return;
  if (Audio.ctx.state === 'suspended') Audio.ctx.resume();
  if (!Audio.ambientNode) Audio.startAmbient();
};

/* --- صوت خطوات واقعي (حذاء على أرضية) --- */
Audio.footstep = function(running) {
  if (!Audio.ctx) return;
  const now = Audio.ctx.currentTime;
  const gap = running ? 0.22 : 0.38;
  if (now - Audio.lastFootstep < gap) return;
  Audio.lastFootstep = now;

  // 1. صوت احتكاك القدم بالأرض (Thud)
  const osc = Audio.ctx.createOscillator();
  const oscGain = Audio.ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(110 + Math.random() * 20, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

  oscGain.gain.setValueAtTime(running ? 0.12 : 0.06, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(oscGain);
  oscGain.connect(Audio.masterGain);
  osc.start(now);
  osc.stop(now + 0.08);

  // 2. صوت طقطقة احتكاك حافة الحذاء (Crunch Noise)
  const bufferSize = Audio.ctx.sampleRate * 0.05; // 50ms
  const buffer = Audio.ctx.createBuffer(1, bufferSize, Audio.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
  }

  const noise = Audio.ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = Audio.ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800 + Math.random() * 300;
  filter.Q.value = 1.5;

  const noiseGain = Audio.ctx.createGain();
  noiseGain.gain.setValueAtTime(running ? 0.08 : 0.04, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(Audio.masterGain);
  noise.start(now);
};

/* --- صوت محرك سيارة واقعي ومريح --- */
Audio.engine = function(speed) {
  if (!Audio.ctx) return;
  if (!Audio.engineNode) {
    // مذبذب الصوت الأساسي للمحرك (Bass Engine Sound)
    const osc = Audio.ctx.createOscillator();
    const gain = Audio.ctx.createGain();
    const filter = Audio.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.value = 40;

    filter.type = 'lowpass';
    filter.frequency.value = 180; // تصفية النغمات الحادة لجعل المحرك خافتاً وواقعياً

    gain.gain.value = 0;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(Audio.masterGain);
    osc.start();

    Audio.engineNode = { osc, gain, filter };
  }

  const abs = Math.abs(speed);
  const now = Audio.ctx.currentTime;

  // تغيير تردد المحرك مع زيادة السرعة (RPM)
  const rpmFreq = 35 + abs * 8;
  const filterFreq = 150 + abs * 25;
  const volume = abs > 0.1 ? 0.04 : 0.012; // مستوى صوت خفيض وغير مزعج

  Audio.engineNode.osc.frequency.setTargetAtTime(rpmFreq, now, 0.1);
  Audio.engineNode.filter.frequency.setTargetAtTime(filterFreq, now, 0.1);
  Audio.engineNode.gain.gain.setTargetAtTime(volume, now, 0.15);
};

Audio.stopEngine = function() {
  if (!Audio.ctx || !Audio.engineNode) return;
  Audio.engineNode.gain.gain.setTargetAtTime(0, Audio.ctx.currentTime, 0.2);
};

/* --- خلفية صوتية هادئة (Ambient Wind/City Noise) --- */
Audio.startAmbient = function() {
  if (!Audio.ctx) return;
  const bufferSize = Audio.ctx.sampleRate * 2;
  const buffer = Audio.ctx.createBuffer(1, bufferSize, Audio.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.1;

  const noise = Audio.ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const filter = Audio.ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 250; // صوت هواء خفيف جداً في الخلفية

  const gain = Audio.ctx.createGain();
  gain.gain.value = 0.015; // صوت خفيف للغاية

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(Audio.masterGain);
  noise.start();

  Audio.ambientNode = { noise, gain };
};

/* --- صوت صفارة الشرطة (Police Siren - Wail/Yelp) --- */
Audio.siren = function(active) {
  if (!Audio.ctx) return;
  if (active && !Audio.sirenNode) {
    const osc = Audio.ctx.createOscillator();
    const gain = Audio.ctx.createGain();

    osc.type = 'sine';
    gain.gain.value = 0.035; // صوت متوازن وخافض

    osc.connect(gain);
    gain.connect(Audio.masterGain);
    osc.start();

    Audio.sirenNode = { osc, gain, t: 0 };
  } else if (!active && Audio.sirenNode) {
    const node = Audio.sirenNode;
    Audio.sirenNode = null;
    node.gain.gain.setTargetAtTime(0, Audio.ctx.currentTime, 0.3);
    setTimeout(() => {
      try { node.osc.stop(); } catch (e) {}
    }, 350);
  }
};

Audio.updateSiren = function(dt) {
  if (!Audio.sirenNode || !Audio.ctx) return;
  Audio.sirenNode.t += dt;
  // تردد الشرطة الواقعي المتردد بين النغمات الحادة والخفيضة
  const freq = 550 + Math.sin(Audio.sirenNode.t * 5) * 280;
  Audio.sirenNode.osc.frequency.setTargetAtTime(freq, Audio.ctx.currentTime, 0.03);
};

/* --- صوت التفاعل والنقر (UI Click / Interact SFX) --- */
Audio.playClick = function() {
  if (!Audio.ctx) return;
  const now = Audio.ctx.currentTime;
  const osc = Audio.ctx.createOscillator();
  const gain = Audio.ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.04);

  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

  osc.connect(gain);
  gain.connect(Audio.masterGain);
  osc.start(now);
  osc.stop(now + 0.04);
};


/* ============ Unlock audio on the first user gesture ============
 * Browsers (especially iOS Safari) keep the AudioContext suspended until the
 * player taps / clicks / presses a key. Nothing called Audio.init() before,
 * so the game was silent. */
Audio.unlock = function() {
  if (!Audio.ctx) Audio.init();
  if (!Audio.ctx) return;

  const ctx = Audio.ctx;

  const go = function() {
    /* silent one-sample buffer: required by iOS to really start audio */
    try {
      const b = ctx.createBuffer(1, 1, 22050);
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.connect(ctx.destination);
      s.start(0);
    } catch (e) {}

    if (!Audio.ambientNode) Audio.startAmbient();

    if (ctx.state === 'running') {
      ['pointerdown', 'touchstart', 'touchend', 'mousedown', 'click', 'keydown']
        .forEach(function(ev) { removeEventListener(ev, Audio.unlock, true); });
    }
  };

  if (ctx.state === 'suspended') {
    ctx.resume().then(go).catch(go);
  } else {
    go();
  }
};

['pointerdown', 'touchstart', 'touchend', 'mousedown', 'click', 'keydown']
  .forEach(function(ev) { addEventListener(ev, Audio.unlock, true); });

/* resume after the tab/app comes back (iOS suspends the context) */
document.addEventListener('visibilitychange', function() {
  if (!document.hidden && Audio.ctx && Audio.ctx.state !== 'running') {
    Audio.ctx.resume();
  }
});
