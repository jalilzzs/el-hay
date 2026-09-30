/* ============ Audio: procedural Web Audio sound system ============
   public/audio/ has no actual sound files in this project, so everything here is synthesized
   (oscillators + filtered noise) rather than sample playback. This is a deliberate, stated
   choice — swapping in real recorded SFX later just means replacing these functions with
   AudioBufferSourceNode playback of loaded files; the call sites (footstep/engine/siren) stay
   the same either way. */
const Audio={ctx:null,masterGain:null,ambientNode:null,engineNode:null,sirenNode:null,lastFootstep:0,ready:false};

Audio.init=function(){
 try{
  Audio.ctx=new (window.AudioContext||window.webkitAudioContext)();
  Audio.masterGain=Audio.ctx.createGain(); Audio.masterGain.gain.value=0.5; Audio.masterGain.connect(Audio.ctx.destination);
  Audio.ready=true;
 }catch(e){ console.warn('Audio: Web Audio unavailable',e); Audio.ctx=null; }
};
/* Browsers block audio until a user gesture — call this from the first click/keydown anywhere. */
Audio.resume=function(){
 if(!Audio.ctx) return;
 if(Audio.ctx.state==='suspended') Audio.ctx.resume();
 if(!Audio.ambientNode) Audio.startAmbient();
};

Audio.footstep=function(running){
 if(!Audio.ctx) return;
 const now=Audio.ctx.currentTime;
 const gap=running?0.22:0.38;
 if(now-Audio.lastFootstep<gap) return;
 Audio.lastFootstep=now;
 const osc=Audio.ctx.createOscillator(), gain=Audio.ctx.createGain();
 osc.type='triangle'; osc.frequency.value=85+Math.random()*25;
 gain.gain.value=0.09; gain.gain.exponentialRampToValueAtTime(0.001,now+0.09);
 osc.connect(gain); gain.connect(Audio.masterGain);
 osc.start(now); osc.stop(now+0.1);
};

Audio.engine=function(speed){
 if(!Audio.ctx) return;
 if(!Audio.engineNode){
  const osc=Audio.ctx.createOscillator(), gain=Audio.ctx.createGain();
  osc.type='sawtooth'; osc.frequency.value=55; gain.gain.value=0;
  osc.connect(gain); gain.connect(Audio.masterGain); osc.start();
  Audio.engineNode={osc,gain};
 }
 const abs=Math.abs(speed), now=Audio.ctx.currentTime;
 Audio.engineNode.osc.frequency.setTargetAtTime(48+abs*9,now,0.1);
 Audio.engineNode.gain.gain.setTargetAtTime(abs>0.2?0.05:0.015,now,0.15);
};
Audio.stopEngine=function(){
 if(!Audio.ctx||!Audio.engineNode) return;
 Audio.engineNode.gain.gain.setTargetAtTime(0,Audio.ctx.currentTime,0.2);
};

Audio.startAmbient=function(){
 if(!Audio.ctx) return;
 const bufferSize=Audio.ctx.sampleRate*2;
 const buffer=Audio.ctx.createBuffer(1,bufferSize,Audio.ctx.sampleRate);
 const data=buffer.getChannelData(0);
 for(let i=0;i<bufferSize;i++) data[i]=(Math.random()*2-1)*0.2;
 const noise=Audio.ctx.createBufferSource(); noise.buffer=buffer; noise.loop=true;
 const filter=Audio.ctx.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value=380;
 const gain=Audio.ctx.createGain(); gain.gain.value=0.035;
 noise.connect(filter); filter.connect(gain); gain.connect(Audio.masterGain);
 noise.start();
 Audio.ambientNode={noise,gain};
};

Audio.siren=function(active){
 if(!Audio.ctx) return;
 if(active && !Audio.sirenNode){
  const osc=Audio.ctx.createOscillator(), gain=Audio.ctx.createGain();
  osc.type='sine'; gain.gain.value=0.07;
  osc.connect(gain); gain.connect(Audio.masterGain); osc.start();
  Audio.sirenNode={osc,gain,t:0};
 } else if(!active && Audio.sirenNode){
  const node=Audio.sirenNode; Audio.sirenNode=null;
  node.gain.gain.setTargetAtTime(0,Audio.ctx.currentTime,0.3);
  setTimeout(()=>{ try{node.osc.stop();}catch(e){} },400);
 }
};
Audio.updateSiren=function(dt){
 if(!Audio.sirenNode) return;
 Audio.sirenNode.t+=dt;
 const freq=650+Math.sin(Audio.sirenNode.t*6)*250;
 Audio.sirenNode.osc.frequency.setTargetAtTime(freq,Audio.ctx.currentTime,0.02);
};
