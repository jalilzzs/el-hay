/* ============ Cutscenes: full intro sequence director ============ */
const Cutscenes={};
const csLayer=$('csLayer'), csSub=$('csSub'), csCard=$('csCard'), csSkipBtn=$('csSkip');
let csSkipped=false;

function offset(target,dx,dy,dz){ return new THREE.Vector3(target.x+dx,dy,target.z+dz); }
function buildBeats(){
 const home=World.landmarks.home.position, car=World.playerCar.position,
       checkpoint=World.checkpointPos, officer=World.checkpointOfficer.mesh.position,
       prison=World.landmarks.prison.position;
 const midX=car.x+(checkpoint.x-car.x)*0.6, midZ=car.z+(checkpoint.z-car.z)*0.6;
 return [
  {from:{p:offset(home,-5,1.6,-3),l:offset(home,0,1,-6)},to:{p:offset(home,-2,1.6,-2),l:offset(home,0,1,-5)},dur:3,sub:'cs1'},
  {from:{p:offset(home,-2,1.7,-2),l:new THREE.Vector3(car.x,0.8,car.z)},to:{p:offset(car,-3,1.8,2),l:new THREE.Vector3(car.x,0.8,car.z)},dur:3,sub:'cs2'},
  {from:{p:offset(car,-3,2.2,2),l:new THREE.Vector3(midX,1,midZ)},to:{p:new THREE.Vector3(midX-3,2.2,midZ+2),l:new THREE.Vector3(checkpoint.x,1,checkpoint.z)},dur:4.5,sub:'cs3'},
  {from:{p:new THREE.Vector3(midX-2,1.8,midZ+3),l:new THREE.Vector3(midX,0.9,midZ)},to:{p:new THREE.Vector3(midX-1,1.7,midZ+1.5),l:new THREE.Vector3(midX,0.9,midZ)},dur:3,sub:'cs4'},
  {from:{p:offset(checkpoint,-4,1.6,3),l:officer},to:{p:offset(checkpoint,-2,1.4,1.5),l:officer},dur:3.5,sub:'cs5'},
  {from:{p:offset(checkpoint,-2,1.4,1.5),l:officer},to:{p:offset(checkpoint,-1,1.3,0.8),l:officer},dur:3.5,sub:'cs6'},
  {card:'cs7',dur:2.2},
  {from:{p:offset(prison,0,1.7,10),l:offset(prison,0,1.4,4)},to:{p:offset(prison,0,1.7,3),l:offset(prison,0,1.4,-3)},dur:3.5,sub:'cs8'}
 ];
}
const lerpV=(a,b,x)=>a.clone().lerp(b,x);
function wait(ms){
 return new Promise(r=>{
  const checkInterval = setInterval(()=>{
   if(csSkipped){ clearInterval(checkInterval); r(); }
  }, 50);
  setTimeout(()=>{ clearInterval(checkInterval); r(); }, ms);
 });
}

async function playBeat(camera,b){
 if(csSkipped) return;
 if(b.card){ 
  csSub.textContent=''; 
  csCard.textContent=t(b.card); 
  csCard.classList.add('show'); 
  await wait(b.dur*1000); 
  csCard.classList.remove('show'); 
  return; 
 }
 csSub.textContent=t(b.sub);
 const start=performance.now(), dur=b.dur*1000;
 return new Promise(res=>{
  function step(){ 
   if(csSkipped) return res();
   const x=Math.min((performance.now()-start)/dur,1);
   camera.position.copy(lerpV(b.from.p,b.to.p,x)); 
   camera.lookAt(lerpV(b.from.l,b.to.l,x));
   if(x<1) requestAnimationFrame(step); 
   else res(); 
  } 
  step(); 
 });
}

Cutscenes.play=async function(camera,onDone){
 csSkipped=false; 
 csLayer.style.display='block'; 
 if(Player.controls) Player.controls.unlock();
 
 const handleSkip = (e)=>{
  if(e) e.preventDefault();
  csSkipped=true;
 };
 
 csSkipBtn.onclick = handleSkip;
 csSkipBtn.ontouchstart = handleSkip;

 const beats=buildBeats();
 for(const b of beats){ 
  if(csSkipped) break; 
  await playBeat(camera,b); 
 }
 
 csLayer.style.display='none'; 
 csSub.textContent=''; 
 csCard.classList.remove('show');
 camera.position.set(30,1.7,55); 
 camera.lookAt(30,1.4,40);
 Player.mode='walk';
 if(typeof Player.inCutscene !== 'undefined') Player.inCutscene = false;
 if(onDone) onDone();
};
