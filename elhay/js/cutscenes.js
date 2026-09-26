/* ============ Cutscenes: full intro sequence director ============ */
const Cutscenes={};
const csLayer=$('csLayer'), csSub=$('csSub'), csCard=$('csCard'), csSkipBtn=$('csSkip');
let csSkipped=false;
csSkipBtn.addEventListener('click',()=>csSkipped=true);
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);

/* Beats cover every story point from the brief: wake up/clock/keys/exit house, drive with radio,
   checkpoint stop (placeholder cause per earlier discussion — cousin pickup / contraband, not the
   original minor-involving scenario), 5-year skip, walk out of prison into player control. */
const BEATS=[
 {from:{p:V3(-75,1.6,-22),l:V3(-72,1.2,-22)},to:{p:V3(-70,1.6,-22),l:V3(-72,1,-22)},dur:3,sub:'cs1'},   // wake / clock 13:00
 {from:{p:V3(-70,1.6,-22),l:V3(-72,1,-22)},to:{p:V3(-66,1.7,-18),l:V3(-68,0.8,-18)},dur:3,sub:'cs2'},   // keys, exit house, to car
 {from:{p:V3(-60,2.2,-10),l:V3(-30,1,0)},to:{p:V3(-20,2.2,20),l:V3(-10,1,30)},dur:4.5,sub:'cs3'},       // drive, radio plays
 {from:{p:V3(-24,2,26),l:V3(-20,1,30)},to:{p:V3(-18,2,28),l:V3(-20,1,30)},dur:3,sub:'cs4'},             // pick up cousin
 {from:{p:V3(-16,1.6,29),l:V3(-19,1,30)},to:{p:V3(-19,1.4,30.5),l:V3(-20,1,30.5)},dur:3.5,sub:'cs5'},   // checkpoint stop
 {from:{p:V3(-19,1.4,30.5),l:V3(-20,1,30.5)},to:{p:V3(-21,1.3,31),l:V3(-22,1,31)},dur:3.5,sub:'cs6'},   // arrest
 {card:'cs7',dur:2.2},                                                                                   // 5 years later
 {from:{p:V3(30,1.7,66),l:V3(30,1.4,60)},to:{p:V3(30,1.7,58),l:V3(30,1.4,55)},dur:3.5,sub:'cs8'}         // exits prison gate
];
const lerpV=(a,b,x)=>a.clone().lerp(b,x);
function wait(ms){return new Promise(r=>setTimeout(r,ms));}
async function playBeat(camera,b){
 if(csSkipped) return;
 if(b.card){ csSub.textContent=''; csCard.textContent=t(b.card); csCard.classList.add('show'); await wait(b.dur*1000); csCard.classList.remove('show'); return; }
 csSub.textContent=t(b.sub);
 const start=performance.now(), dur=b.dur*1000;
 return new Promise(res=>{function step(){ if(csSkipped) return res();
  const x=Math.min((performance.now()-start)/dur,1);
  camera.position.copy(lerpV(b.from.p,b.to.p,x)); camera.lookAt(lerpV(b.from.l,b.to.l,x));
  if(x<1) requestAnimationFrame(step); else res(); } step(); });
}
Cutscenes.play=async function(camera,onDone){
 csSkipped=false; csLayer.style.display='block'; if(Player.controls) Player.controls.unlock();
 for(const b of BEATS){ if(csSkipped) break; await playBeat(camera,b); }
 csLayer.style.display='none'; csSub.textContent=''; csCard.classList.remove('show');
 camera.position.set(30,1.7,55); camera.lookAt(30,1.4,40);
 Player.mode='walk';
 onDone();
};
