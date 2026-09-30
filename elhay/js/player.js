/* ============ Player: unified PC (keyboard+mouse) & Mobile (touch) input, walk/drive ============ */
const Player={mode:'walk'};
const outsidePos=new THREE.Vector3();
const move={f:false,b:false,l:false,r:false,sprint:false};
const carVel={speed:0,steer:0};
const IS_TOUCH=('ontouchstart' in window)||navigator.maxTouchPoints>0;

Player.init=function(camera,domElement){
 Player.camera=camera;
 Player.controls=new THREE.PointerLockControls(camera,document.body);
 bindKeyboard();
 domElement.addEventListener('click',()=>{
  if(IS_TOUCH) return;
  if(UI.dom.menu.style.display==='none' && !document.querySelector('.panel.open') && $('csLayer').style.display!=='block' && Player.mode==='walk') Player.controls.lock();
 });
 domElement.addEventListener('mousedown',e=>{
  if(IS_TOUCH||e.button!==0) return;
  if(document.pointerLockElement && Player.mode==='walk'){ Weapons.fire(Player.camera); Weapons.refreshHUD(); }
 });
 if(IS_TOUCH) initTouchUI(); 
};

function bindKeyboard(){
 const map=()=>S.ctrl==='arrows'?{ArrowUp:'f',ArrowDown:'b',ArrowLeft:'l',ArrowRight:'r'}:{KeyW:'f',KeyS:'b',KeyA:'l',KeyD:'r'};
 addEventListener('keydown',e=>{const m=map(); if(m[e.code]) move[m[e.code]]=true; if(e.code==='KeyE') Player.interact();
  if(e.code==='ShiftLeft'||e.code==='ShiftRight') move.sprint=true;
  if(e.code==='Digit1') Weapons.switchTo(0); if(e.code==='Digit2') Weapons.switchTo(1); if(e.code==='Digit3') Weapons.switchTo(2);
  if(e.code==='KeyV') Weapons.cycle(); if(e.code==='KeyR') Weapons.reload();
  if(e.code==='KeyP') Phone.toggle(); if(e.code==='KeyM') Minimap.toggleFullscreen();
  Weapons.refreshHUD();
 });
 addEventListener('keyup',e=>{const m=map(); if(m[e.code]) move[m[e.code]]=false; if(e.code==='ShiftLeft'||e.code==='ShiftRight') move.sprint=false;});
}

/* ---- Touch UI: joystick, look-drag, interact + drive buttons ---- */
const touch={joyActive:false,joyId:null,joyVec:{x:0,y:0},lookId:null,lookLast:{x:0,y:0},yaw:0,pitch:0,gas:false,brake:false,steerL:false,steerR:false,sprint:false};
function initTouchUI(){
 const touchUI=$('touchUI'); touchUI.classList.add('active');
 UI.dom.crosshair.style.display='none';
 const joyBase=$('joyBase'), joyStick=$('joyStick'), lookArea=$('lookArea');
 const baseRect=()=>joyBase.getBoundingClientRect();
 joyBase.addEventListener('touchstart',e=>{touch.joyActive=true;touch.joyId=e.changedTouches[0].identifier;},{passive:true});
 joyBase.addEventListener('touchmove',e=>{
  for(const tch of e.changedTouches){ if(tch.identifier!==touch.joyId) continue;
   const r=baseRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
   let dx=tch.clientX-cx, dy=tch.clientY-cy; const max=r.width/2;
   const len=Math.hypot(dx,dy); if(len>max){dx=dx/len*max;dy=dy/len*max;}
   touch.joyVec.x=dx/max; touch.joyVec.y=dy/max;
   joyStick.style.transform=`translate(${dx}px,${dy}px)`;
  }
 },{passive:true});
 function joyEnd(e){for(const tch of e.changedTouches){ if(tch.identifier!==touch.joyId) continue;
  touch.joyActive=false; touch.joyId=null; touch.joyVec.x=0; touch.joyVec.y=0; joyStick.style.transform='translate(0,0)';}}
 joyBase.addEventListener('touchend',joyEnd); joyBase.addEventListener('touchcancel',joyEnd);

 lookArea.addEventListener('touchstart',e=>{const tch=e.changedTouches[0]; touch.lookId=tch.identifier; touch.lookLast.x=tch.clientX; touch.lookLast.y=tch.clientY;},{passive:true});
 lookArea.addEventListener('touchmove',e=>{
  for(const tch of e.changedTouches){ if(tch.identifier!==touch.lookId) continue;
   const dx=tch.clientX-touch.lookLast.x, dy=tch.clientY-touch.lookLast.y;
   touch.lookLast.x=tch.clientX; touch.lookLast.y=tch.clientY;
   touch.yaw-=dx*0.0032; touch.pitch=Math.max(-1.2,Math.min(1.2,touch.pitch-dy*0.0032));
  }
 },{passive:true});
 lookArea.addEventListener('touchend',e=>{if(e.changedTouches[0].identifier===touch.lookId) touch.lookId=null;});

 $('touchInteract').addEventListener('touchstart',e=>{e.preventDefault();Player.interact();},{passive:false});
 $('touchSprint').addEventListener('touchstart',e=>{e.preventDefault();touch.sprint=true;},{passive:false});
 $('touchSprint').addEventListener('touchend',()=>touch.sprint=false);
 $('touchSprint').addEventListener('touchcancel',()=>touch.sprint=false);
 $('touchFire').addEventListener('touchstart',e=>{e.preventDefault();Weapons.fire(Player.camera);Weapons.refreshHUD();},{passive:false});
 $('touchWeapon').addEventListener('touchstart',e=>{e.preventDefault();Weapons.cycle();Weapons.refreshHUD();},{passive:false});
 const gas=$('btnGas'),brake=$('btnBrake'),left=$('btnLeft'),right=$('btnRight');
 const bind=(el,key)=>{el.addEventListener('touchstart',e=>{e.preventDefault();touch[key]=true;},{passive:false});
  el.addEventListener('touchend',()=>touch[key]=false); el.addEventListener('touchcancel',()=>touch[key]=false);};
 bind(gas,'gas'); bind(brake,'brake'); bind(left,'steerL'); bind(right,'steerR');
}
function setDriveButtonsVisible(v){ if(!IS_TOUCH) return; $('driveControls').classList.toggle('show',v); $('touchUI').classList.toggle('driving',v); }

/* ---- Interact ----
   Root cause of "E key unreliable": walk-mode interact checked car > door > shop > NPC in a
   fixed priority order, so a car within 3 units always won even if a door or NPC was actually
   closer. Also, once inside ANY interior other than 'home', pressing E just exited immediately —
   'gunshop' and the safehouses had no counter/bed handling, only 'home' did. Both are real bugs,
   not cosmetic. findInteractable() is now the single source of truth for both the prompt and the
   actual action, so they can't disagree. */
function findInteractable(p){
 if(Player.mode==='drive') return {type:'exitCar',dist:0};
 let best=null, bestD=3.2;
 const car=Vehicles.nearbyDrivable(p);
 if(car){ const d=p.distanceTo(car.mesh.position); if(d<bestD){bestD=d;best={type:'car',ref:car};} }
 for(const e of World.entrances){ const d=p.distanceTo(e.pos); if(d<bestD){bestD=d;best={type:'door',ref:e};} }
 for(const s of World.shops){ const d=p.distanceTo(s.pos); if(d<bestD){bestD=d;best={type:'shop',ref:s};} }
 for(const n of NPC_DEFS){ const npc=World.keyNpcs[n.id]; if(npc){ const d=p.distanceTo(npc.mesh.position); if(d<bestD){bestD=d;best={type:'keyNpc',ref:n,npc};} } }
 const pooled=NPCPool.nearest(p,bestD);
 if(pooled) best={type:'pooledNpc',ref:pooled};
 return best;
}
function interiorInteractable(p){
 const a=World.activeInterior;
 if((a==='home'||a==='studio'||a==='flat2'||a==='villa')){
  const bedPos=a==='home'?World.homeBedLocal:World.safehouseBedLocal[a];
  if(bedPos && p.distanceTo(bedPos)<2.2) return {type:'sleep'};
 }
 if(a==='home' && World.homeToiletLocal && p.distanceTo(World.homeToiletLocal)<2.2) return {type:'toilet'};
 if(a==='gunshop' && World.gunShopCounterLocal && p.distanceTo(World.gunShopCounterLocal)<2.2) return {type:'counter'};
 if(a==='bank' && World.bankTellerLocal && p.distanceTo(World.bankTellerLocal)<2.2) return {type:'teller'};
 if(a==='prison' && Prison.sentenced) return {type:'jailed'};
 return {type:'exit'};
}

Player.interact=function(){
 if(document.querySelector('.panel.open')||UI.dom.menu.style.display!=='none'||$('pPhone').classList.contains('open')) return; // never interact through an open menu
 if(World.activeInterior){
  const hit=interiorInteractable(Player.camera.position);
  if(hit.type==='sleep'){ Vitals.sleep(); return; }
  if(hit.type==='toilet'){ Vitals.useToilet(); return; }
  if(hit.type==='counter'){ UI.openShop('gunshop'); return; }
  if(hit.type==='teller'){ UI.openShop('bank'); return; }
  if(hit.type==='jailed'){ Prison.bail(); return; }
  World.exitInterior(Player.camera,outsidePos); setDriveButtonsVisible(false); return;
 }
 const hit=findInteractable(Player.camera.position);
 if(!hit) return;
 if(hit.type==='exitCar'){
  Player.mode='walk'; Player.camera.position.set(World.playerCar.position.x+2,1.7,World.playerCar.position.z); setDriveButtonsVisible(false);
  if(!IS_TOUCH) UI.dom.crosshair.style.display='block';
  Audio.stopEngine();
  Weapons.refreshHUD(); return;
 }
 if(hit.type==='car'){
  Vehicles.switchTo(hit.ref.mesh,hit.ref.registered); Player.mode='drive'; if(!IS_TOUCH) Player.controls.unlock();
  UI.dom.crosshair.style.display='none'; setDriveButtonsVisible(true); Weapons.refreshHUD(); return;
 }
 if(hit.type==='door'){ World.enterInterior(hit.ref.id,Player.camera,outsidePos); return; }
 if(hit.type==='shop'){ UI.openShop(hit.ref.id); return; }
 if(hit.type==='keyNpc'){ UI.openRelationship(hit.ref.id); return; }
 if(hit.type==='pooledNpc'){ NPCPool.greet(hit.ref); return; }
};

/* ---- Update ----
   Bug found: Player.update had "if(World.activeInterior) return;" at the very top — this disabled
   ALL movement (not just world-collision) the instant you stepped into ANY interior, which is
   exactly the reported "player cannot move inside interiors" bug. Interiors now get their own
   bounded walking (clamped to the room's floor instead of the outdoor World.resolveCollision,
   which only knows about outdoor building AABBs and doesn't apply here). */
Player.update=function(dt){
 if(Player.suspended) return; // cutscenes own the camera fully while this is set — see Cutscenes.play
 if(World.activeInterior){ updateInteriorWalk(dt); return; }
 if(Player.mode==='walk'){
  let fx=0,fz=0;
  if(IS_TOUCH){ fx=touch.joyVec.x; fz=touch.joyVec.y;
   Player.camera.rotation.order='YXZ'; Player.camera.rotation.y=touch.yaw; Player.camera.rotation.x=touch.pitch;
  } else {
   if(move.f)fz-=1; if(move.b)fz+=1; if(move.l)fx-=1; if(move.r)fx+=1;
  }
  const len=Math.hypot(fx,fz);
  if(len>0.05){
   const sprint=(IS_TOUCH?touch.sprint:move.sprint)?1.7:1;
   const speed=6*Vitals.speedFactor()*sprint;
   const v=new THREE.Vector3(fx/len,0,fz/len).multiplyScalar(speed*dt);
   if(IS_TOUCH){
    const yaw=Player.camera.rotation.y;
    const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)).multiplyScalar(-v.z);
    const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)).multiplyScalar(v.x);
    Player.camera.position.add(forward).add(right);
   } else { Player.controls.moveRight(v.x); Player.controls.moveForward(-v.z); }
   Audio.footstep(sprint>1);
  }
  Player.camera.position.y=1.7;
  World.resolveCollision(Player.camera.position,0.4);
 } else {
  const wantGas=IS_TOUCH?touch.gas:move.f, wantBrake=IS_TOUCH?touch.brake:move.b, wantL=IS_TOUCH?touch.steerL:move.l, wantR=IS_TOUCH?touch.steerR:move.r;
  if(Police.checkpointActive){ carVel.speed*=0.85; }
  else if(wantGas) carVel.speed=Math.min(carVel.speed+dt*8,14);
  else if(wantBrake) carVel.speed=Math.max(carVel.speed-dt*8,-8);
  else carVel.speed*=0.94;
  if(wantR) carVel.steer=Math.min(carVel.steer+dt*2,1); else if(wantL) carVel.steer=Math.max(carVel.steer-dt*2,-1); else carVel.steer*=0.85;
  World.playerCar.rotation.y+=carVel.steer*dt*(carVel.speed/14);
  World.playerCar.position.x+=Math.sin(World.playerCar.rotation.y)*carVel.speed*dt;
  World.playerCar.position.z+=Math.cos(World.playerCar.rotation.y)*carVel.speed*dt;
  World.resolveCollision(World.playerCar.position,1.0);
  const camOff=new THREE.Vector3(0,2.4,6).applyAxisAngle(new THREE.Vector3(0,1,0),World.playerCar.rotation.y);
  Player.camera.position.copy(World.playerCar.position).add(camOff);
  Player.camera.lookAt(World.playerCar.position.x,World.playerCar.position.y+1,World.playerCar.position.z);
  Police.maybeTrigger(World.playerCar.position,dt);
  DrivingSchool.checkProgress(World.playerCar.position);
  Audio.engine(carVel.speed);
 }
};

/* Bounded interior walking: every interior room is a 10x10 box (see World.makeInterior) centered
   at local (0,0) with walls at ±5 — clamp movement to just inside that instead of resolveCollision. */
function updateInteriorWalk(dt){
 let fx=0,fz=0;
 if(IS_TOUCH){ fx=touch.joyVec.x; fz=touch.joyVec.y; Player.camera.rotation.order='YXZ'; Player.camera.rotation.y=touch.yaw; Player.camera.rotation.x=touch.pitch; }
 else { if(move.f)fz-=1; if(move.b)fz+=1; if(move.l)fx-=1; if(move.r)fx+=1; }
 const len=Math.hypot(fx,fz);
 if(len>0.05){
  const speed=5, v=new THREE.Vector3(fx/len,0,fz/len).multiplyScalar(speed*dt);
  if(IS_TOUCH){
   const yaw=Player.camera.rotation.y;
   const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)).multiplyScalar(-v.z);
   const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)).multiplyScalar(v.x);
   Player.camera.position.add(forward).add(right);
  } else { Player.controls.moveRight(v.x); Player.controls.moveForward(-v.z); }
  Audio.footstep(false);
 }
 const bound=4.4; // stay just inside the room's walls (each interior room is 10x10, centered at world x=0,z=0)
 Player.camera.position.x=Math.max(-bound,Math.min(bound,Player.camera.position.x));
 Player.camera.position.z=Math.max(-bound,Math.min(bound,Player.camera.position.z));
 Player.camera.position.y=49.6; // comfortable eye-height above the floor at world y=48
}

Player.updatePrompt=function(){
 const d=UI.dom;
 if(World.activeInterior){
  const hit=interiorInteractable(Player.camera.position);
  const labels={sleep:'E: Sleep',toilet:'E: Use Bathroom',counter:'E: Browse Weapons',teller:'E: Banking',
   jailed:'E: Pay Bail $'+Prison.bailCost+' ('+Math.ceil(Prison.timer)+'s left)',exit:t('exitBld')};
  d.prompt.textContent=labels[hit.type]; d.prompt.style.display='block'; return;
 }
 const hit=findInteractable(Player.camera.position);
 if(!hit){ d.prompt.style.display='none'; return; }
 const labelFor={
  exitCar:()=>t('exitCar'),
  car:()=>t('enterCar'),
  door:()=>{ const locked=hit.ref.ownable && !(Player.properties&&Player.properties.includes(hit.ref.id));
   return locked?('🔒 '+hit.ref.name+' (not owned — buy via Phone)'):(t('enterBld')+' — '+hit.ref.name); },
  shop:()=>'E: '+hit.ref.name,
  keyNpc:()=>'E: Talk to '+hit.ref.name,
  pooledNpc:()=>'E: Greet',
 };
 d.prompt.textContent=labelFor[hit.type](); d.prompt.style.display='block';
};
