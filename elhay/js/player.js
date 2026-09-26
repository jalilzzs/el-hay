/* ============ Player: unified PC (keyboard+mouse) & Mobile (touch) input, walk/drive ============ */
const Player={mode:'walk'};
const outsidePos=new THREE.Vector3();
const move={f:false,b:false,l:false,r:false};
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
  if(e.code==='Digit1') Weapons.switchTo(0); if(e.code==='Digit2') Weapons.switchTo(1); if(e.code==='Digit3') Weapons.switchTo(2);
  if(e.code==='KeyV') Weapons.cycle(); if(e.code==='KeyR') Weapons.reload();
  if(e.code==='KeyP') Phone.toggle();
  Weapons.refreshHUD();
 });
 addEventListener('keyup',e=>{const m=map(); if(m[e.code]) move[m[e.code]]=false;});
}

/* ---- Touch UI: joystick, look-drag, interact + drive buttons ---- */
const touch={joyActive:false,joyId:null,joyVec:{x:0,y:0},lookId:null,lookLast:{x:0,y:0},yaw:0,pitch:0,gas:false,brake:false,steerL:false,steerR:false};
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
 $('touchFire').addEventListener('touchstart',e=>{e.preventDefault();Weapons.fire(Player.camera);Weapons.refreshHUD();},{passive:false});
 $('touchWeapon').addEventListener('touchstart',e=>{e.preventDefault();Weapons.cycle();Weapons.refreshHUD();},{passive:false});
 const gas=$('btnGas'),brake=$('btnBrake'),left=$('btnLeft'),right=$('btnRight');
 const bind=(el,key)=>{el.addEventListener('touchstart',e=>{e.preventDefault();touch[key]=true;},{passive:false});
  el.addEventListener('touchend',()=>touch[key]=false); el.addEventListener('touchcancel',()=>touch[key]=false);};
 bind(gas,'gas'); bind(brake,'brake'); bind(left,'steerL'); bind(right,'steerR');
}
function setDriveButtonsVisible(v){ if(!IS_TOUCH) return; $('driveControls').classList.toggle('show',v); }

/* ---- Interact ---- */
Player.interact=function(){
 if(World.activeInterior){
  if(World.activeInterior==='home'){
   const p=Player.camera.position;
   if(World.homeBedLocal && p.distanceTo(World.homeBedLocal)<2.2){ Vitals.sleep(); return; }
   if(World.homeToiletLocal && p.distanceTo(World.homeToiletLocal)<2.2){ Vitals.useToilet(); return; }
  }
  World.exitInterior(Player.camera,outsidePos); setDriveButtonsVisible(false); return;
 }
 const p=Player.camera.position;
 if(Player.mode==='walk'){
  const car=Vehicles.nearbyDrivable(p);
  if(car){ Vehicles.switchTo(car.mesh,car.registered); Player.mode='drive'; if(!IS_TOUCH) Player.controls.unlock(); UI.dom.crosshair.style.display='none'; setDriveButtonsVisible(true); Weapons.refreshHUD(); return; }
  for(const e of World.entrances) if(p.distanceTo(e.pos)<3){ World.enterInterior(e.id,Player.camera,outsidePos); return; }
  for(const s of World.shops) if(p.distanceTo(s.pos)<3){ UI.openShop(s.id); return; }
  for(const n of NPC_DEFS){ const npc=World.keyNpcs[n.id]; if(npc && p.distanceTo(npc.mesh.position)<3){ UI.openRelationship(n.id); return; } }
  const pooled=NPCPool.nearest(p,3); if(pooled){ NPCPool.greet(pooled); return; }
 } else {
  Player.mode='walk'; Player.camera.position.set(World.playerCar.position.x+2,1.7,World.playerCar.position.z); setDriveButtonsVisible(false);
  if(!IS_TOUCH) UI.dom.crosshair.style.display='block';
  Weapons.refreshHUD();
 }
};

/* ---- Update ---- */
Player.update=function(dt){
 if(World.activeInterior) return;
 if(Player.mode==='walk'){
  let fx=0,fz=0;
  if(IS_TOUCH){ fx=touch.joyVec.x; fz=touch.joyVec.y;
   Player.camera.rotation.order='YXZ'; Player.camera.rotation.y=touch.yaw; Player.camera.rotation.x=touch.pitch;
  } else {
   if(move.f)fz-=1; if(move.b)fz+=1; if(move.l)fx-=1; if(move.r)fx+=1;
  }
  const len=Math.hypot(fx,fz);
  if(len>0.05){
   const speed=6*Vitals.speedFactor();
   const v=new THREE.Vector3(fx/len,0,fz/len).multiplyScalar(speed*dt);
   if(IS_TOUCH){
    const yaw=Player.camera.rotation.y;
    const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)).multiplyScalar(-v.z);
    const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)).multiplyScalar(v.x);
    Player.camera.position.add(forward).add(right);
   } else { Player.controls.moveRight(v.x); Player.controls.moveForward(-v.z); }
  }
  Player.camera.position.y=1.7;
  World.resolveCollision(Player.camera.position,0.4);
 } else {
  const wantGas=IS_TOUCH?touch.gas:move.f, wantBrake=IS_TOUCH?touch.brake:move.b, wantL=IS_TOUCH?touch.steerL:move.l, wantR=IS_TOUCH?touch.steerR:move.r;
  if(wantGas) carVel.speed=Math.min(carVel.speed+dt*8,14);
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
 }
};

Player.updatePrompt=function(){
 const d=UI.dom;
 if(World.activeInterior){
  if(World.activeInterior==='home'){
   const p=Player.camera.position;
   if(World.homeBedLocal && p.distanceTo(World.homeBedLocal)<2.2){ d.prompt.textContent='E: Sleep'; d.prompt.style.display='block'; return; }
   if(World.homeToiletLocal && p.distanceTo(World.homeToiletLocal)<2.2){ d.prompt.textContent='E: Use Bathroom'; d.prompt.style.display='block'; return; }
  }
  d.prompt.textContent=t('exitBld'); d.prompt.style.display='block'; return;
 }
 const p=Player.camera.position; let shown=false;
 if(Player.mode==='walk'){
  const car=Vehicles.nearbyDrivable(p);
  if(car){d.prompt.textContent=t('enterCar');shown=true;}
  else{
   for(const e of World.entrances) if(p.distanceTo(e.pos)<3){d.prompt.textContent=t('enterBld')+' — '+e.name;shown=true;break;}
   if(!shown) for(const s of World.shops) if(p.distanceTo(s.pos)<3){d.prompt.textContent='E: '+s.name;shown=true;break;}
   if(!shown) for(const n of NPC_DEFS){ const npc=World.keyNpcs[n.id]; if(npc && p.distanceTo(npc.mesh.position)<3){d.prompt.textContent='E: Talk to '+n.name;shown=true;break;} }
   if(!shown){ const pooled=NPCPool.nearest(p,3); if(pooled){ d.prompt.textContent='E: Greet'; shown=true; } }
  }
 } else { d.prompt.textContent=t('exitCar'); shown=true; }
 d.prompt.style.display=shown?'block':'none';
};
