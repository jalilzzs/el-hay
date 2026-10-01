/* ============ Player: unified PC (keyboard+mouse) & Mobile (touch), walk/drive/interior interaction ============ */

const Player={mode:'walk'};
const outsidePos=new THREE.Vector3();

const move={
 f:false,
 b:false,
 l:false,
 r:false,
 sprint:false
};

const carVel={
 speed:0,
 steer:0
};

const IS_TOUCH=
 ('ontouchstart' in window)||
 navigator.maxTouchPoints>0;


/* =========================================================
   INTERIOR ACTION STATE
   ========================================================= */

Player.interiorAction=null;

Player.isUsingInteriorObject=function(){
 return !!Player.interiorAction;
};

Player.stopInteriorAction=function(){
 if(!Player.interiorAction) return;

 const action=Player.interiorAction;

 if(action.object&&action.object.userData){
  action.object.userData.inUse=false;
 }

 Player.interiorAction=null;

 if(World.activeInterior){
  const room=World.interiors?.[World.activeInterior];

  if(room&&room.userData){
   room.userData.playerAction=null;
  }
 }
};


/* =========================================================
   INIT
   ========================================================= */

Player.init=function(camera,domElement){

 Player.camera=camera;

 Player.controls=
  new THREE.PointerLockControls(
   camera,
   document.body
  );

 bindKeyboard();

 domElement.addEventListener(
  'click',
  ()=>{
   if(IS_TOUCH) return;

   if(
    UI.dom.menu.style.display==='none'&&
    !document.querySelector('.panel.open')&&
    $('csLayer').style.display!=='block'&&
    Player.mode==='walk'&&
    !World.activeInterior&&
    !Player.interiorAction
   ){
    Player.controls.lock();
   }
  }
 );

 domElement.addEventListener(
  'mousedown',
  e=>{
   if(
    IS_TOUCH||
    e.button!==0
   ) return;

   if(
    document.pointerLockElement&&
    Player.mode==='walk'&&
    !World.activeInterior
   ){
    Weapons.fire(
     Player.camera
    );

    Weapons.refreshHUD();
   }
  }
 );

 if(IS_TOUCH){
  initTouchUI();
 }
};


/* =========================================================
   KEYBOARD
   ========================================================= */

function bindKeyboard(){

 const map=()=>(
  S.ctrl==='arrows'
   ? {
      ArrowUp:'f',
      ArrowDown:'b',
      ArrowLeft:'l',
      ArrowRight:'r'
     }
   : {
      KeyW:'f',
      KeyS:'b',
      KeyA:'l',
      KeyD:'r'
     }
 );

 addEventListener(
  'keydown',
  e=>{

   const m=map();

   if(m[e.code]){
    move[m[e.code]]=true;
   }

   if(e.code==='KeyE'){
    Player.interact();
   }

   if(
    e.code==='ShiftLeft'||
    e.code==='ShiftRight'
   ){
    move.sprint=true;
   }

   if(e.code==='Digit1'){
    Weapons.switchTo(0);
   }

   if(e.code==='Digit2'){
    Weapons.switchTo(1);
   }

   if(e.code==='Digit3'){
    Weapons.switchTo(2);
   }

   if(e.code==='KeyV'){
    Weapons.cycle();
   }

   if(e.code==='KeyR'){
    Weapons.reload();
   }

   if(e.code==='KeyP'){
    Phone.toggle();
   }

   if(e.code==='KeyM'){
    Minimap.toggleFullscreen();
   }

   Weapons.refreshHUD();
  }
 );

 addEventListener(
  'keyup',
  e=>{

   const m=map();

   if(m[e.code]){
    move[m[e.code]]=false;
   }

   if(
    e.code==='ShiftLeft'||
    e.code==='ShiftRight'
   ){
    move.sprint=false;
   }
  }
);


/* =========================================================
   TOUCH UI
   ========================================================= */

const touch={
 joyActive:false,
 joyId:null,
 joyVec:{x:0,y:0},

 lookId:null,
 lookLast:{x:0,y:0},

 yaw:0,
 pitch:0,

 gas:false,
 brake:false,
 steerL:false,
 steerR:false,
 sprint:false
};


function initTouchUI(){

 const touchUI=$('touchUI');

 touchUI.classList.add('active');

 UI.dom.crosshair.style.display='none';

 const joyBase=$('joyBase');
 const joyStick=$('joyStick');
 const lookArea=$('lookArea');

 const baseRect=
  ()=>joyBase.getBoundingClientRect();


 joyBase.addEventListener(
  'touchstart',
  e=>{
   touch.joyActive=true;
   touch.joyId=
    e.changedTouches[0].identifier;
  },
  {passive:true}
 );


 joyBase.addEventListener(
  'touchmove',
  e=>{

   for(
    const tch of e.changedTouches
   ){

    if(
     tch.identifier!==touch.joyId
    ){
     continue;
    }

    const r=baseRect();

    const cx=
     r.left+r.width/2;

    const cy=
     r.top+r.height/2;

    let dx=
     tch.clientX-cx;

    let dy=
     tch.clientY-cy;

    const max=
     r.width/2;

    const len=
     Math.hypot(dx,dy);

    if(len>max){

     dx=
      dx/len*max;

     dy=
      dy/len*max;
    }

    touch.joyVec.x=
     dx/max;

    touch.joyVec.y=
     dy/max;

    joyStick.style.transform=
     `translate(${dx}px,${dy}px)`;
   }
  },
  {passive:true}
 );


 function joyEnd(e){

  for(
   const tch of e.changedTouches
  ){

   if(
    tch.identifier!==touch.joyId
   ){
    continue;
   }

   touch.joyActive=false;
   touch.joyId=null;

   touch.joyVec.x=0;
   touch.joyVec.y=0;

   joyStick.style.transform=
    'translate(0,0)';
  }
 }


 joyBase.addEventListener(
  'touchend',
  joyEnd
 );

 joyBase.addEventListener(
  'touchcancel',
  joyEnd
 );


 lookArea.addEventListener(
  'touchstart',
  e=>{

   const tch=
    e.changedTouches[0];

   touch.lookId=
    tch.identifier;

   touch.lookLast.x=
    tch.clientX;

   touch.lookLast.y=
    tch.clientY;
  },
  {passive:true}
 );


 lookArea.addEventListener(
  'touchmove',
  e=>{

   for(
    const tch of e.changedTouches
   ){

    if(
     tch.identifier!==touch.lookId
    ){
     continue;
    }

    const dx=
     tch.clientX-touch.lookLast.x;

    const dy=
     tch.clientY-touch.lookLast.y;

    touch.lookLast.x=
     tch.clientX;

    touch.lookLast.y=
     tch.clientY;

    touch.yaw-=
     dx*0.0032;

    touch.pitch=
     Math.max(
      -1.2,
      Math.min(
       1.2,
       touch.pitch-dy*0.0032
      )
     );
   }
  },
  {passive:true}
 );


 lookArea.addEventListener(
  'touchend',
  e=>{
   if(
    e.changedTouches[0].identifier===
    touch.lookId
   ){
    touch.lookId=null;
   }
  }
 );


 $('touchInteract').addEventListener(
  'touchstart',
  e=>{
   e.preventDefault();
   Player.interact();
  },
  {passive:false}
 );


 $('touchSprint').addEventListener(
  'touchstart',
  e=>{
   e.preventDefault();
   touch.sprint=true;
  },
  {passive:false}
 );

 $('touchSprint').addEventListener(
  'touchend',
  ()=>touch.sprint=false
 );

 $('touchSprint').addEventListener(
  'touchcancel',
  ()=>touch.sprint=false
 );


 $('touchFire').addEventListener(
  'touchstart',
  e=>{
   e.preventDefault();

   if(
    !World.activeInterior&&
    !Player.interiorAction
   ){
    Weapons.fire(Player.camera);
    Weapons.refreshHUD();
   }
  },
  {passive:false}
 );


 $('touchWeapon').addEventListener(
  'touchstart',
  e=>{
   e.preventDefault();

   Weapons.cycle();
   Weapons.refreshHUD();
  },
  {passive:false}
 );


 const gas=$('btnGas');
 const brake=$('btnBrake');
 const left=$('btnLeft');
 const right=$('btnRight');


 const bind=(el,key)=>{

  el.addEventListener(
   'touchstart',
   e=>{
    e.preventDefault();
    touch[key]=true;
   },
   {passive:false}
  );

  el.addEventListener(
   'touchend',
   ()=>touch[key]=false
  );

  el.addEventListener(
   'touchcancel',
   ()=>touch[key]=false
  );
 };


 bind(gas,'gas');
 bind(brake,'brake');
 bind(left,'steerL');
 bind(right,'steerR');
}


function setDriveButtonsVisible(v){

 if(!IS_TOUCH) return;

 $('driveControls')
  .classList
  .toggle('show',v);

 $('touchUI')
  .classList
  .toggle('driving',v);
}


/* =========================================================
   OUTSIDE INTERACTION SEARCH
   ========================================================= */

function findInteractable(p){

 if(Player.mode==='drive'){
  return {
   type:'exitCar',
   dist:0
  };
 }

 let best=null;
 let bestD=3.2;


 const car=
  Vehicles.nearbyDrivable(p);

 if(car){

  const d=
   p.distanceTo(
    car.mesh.position
   );

  if(d<bestD){

   bestD=d;

   best={
    type:'car',
    ref:car
   };
  }
 }


 for(
  const e of World.entrances
 ){

  const d=
   p.distanceTo(e.pos);

  if(d<bestD){

   bestD=d;

   best={
    type:'door',
    ref:e
   };
  }
 }


 for(
  const s of World.shops
 ){

  const d=
   p.distanceTo(s.pos);

  if(d<bestD){

   bestD=d;

   best={
    type:'shop',
    ref:s
   };
  }
 }


 for(
  const n of NPC_DEFS
 ){

  const npc=
   World.keyNpcs[n.id];

  if(npc){

   const d=
    p.distanceTo(
     npc.mesh.position
    );

   if(d<bestD){

    bestD=d;

    best={
     type:'keyNpc',
     ref:n,
     npc
    };
   }
  }
 }


 const pooled=
  NPCPool.nearest(
   p,
   bestD
  );


 if(pooled){

  best={
   type:'pooledNpc',
   ref:pooled
  };
 }


 return best;
}


/* =========================================================
   INTERIOR INTERACTION
   ========================================================= */

function getInteriorInteractable(p){

 const roomId=
  World.activeInterior;

 if(!roomId){
  return null;
 }


 /*
  * New world.js interaction system.
  *
  * Expected:
  *
  * World.interiorInteractables[roomId]
  *
  * [
  *   {
  *     type:'chair',
  *     position:Vector3,
  *     sitPosition:Vector3,
  *     rotation:Number
  *   },
  *
  *   {
  *     type:'tv',
  *     position:Vector3,
  *     object:Object3D
  *   }
  * ]
  */


 const list=
  World.interiorInteractables?.[roomId];


 if(
  Array.isArray(list)
 ){

  let best=null;
  let bestD=2.25;

  for(
   const item of list
  ){

   if(!item||!item.position){
    continue;
   }

   /*
    * Do not allow another action
    * while already using something.
    */
   if(
    Player.interiorAction&&
    Player.interiorAction.item!==item
   ){
    continue;
   }

   const d=
    p.distanceTo(
     item.position
    );

   if(
    d<bestD
   ){

    /*
     * Disabled objects can be
     * temporarily unavailable.
     */
    if(item.enabled===false){
     continue;
    }

    bestD=d;

    best={
     type:item.type||'object',
     item,
     dist:d
    };
   }
  }

  if(best){
   return best;
  }
 }


 /*
  * Backward compatibility with the
  * previous systems.
  */

 if(
  (
   roomId==='home'||
   roomId==='studio'||
   roomId==='flat2'||
   roomId==='villa'
  )
 ){

  const bedPos=
   roomId==='home'
    ? World.homeBedLocal
    : World.safehouseBedLocal?.[roomId];

  if(
   bedPos&&
   p.distanceTo(bedPos)<2.2
  ){
   return {
    type:'sleep',
    legacy:true
   };
  }
 }


 if(
  roomId==='home'&&
  World.homeToiletLocal&&
  p.distanceTo(
   World.homeToiletLocal
  )<2.2
 ){
  return {
   type:'toilet',
   legacy:true
  };
 }


 if(
  roomId==='gunshop'&&
  World.gunShopCounterLocal&&
  p.distanceTo(
   World.gunShopCounterLocal
  )<2.2
 ){
  return {
   type:'counter',
   legacy:true
  };
 }


 if(
  roomId==='bank'&&
  World.bankTellerLocal&&
  p.distanceTo(
   World.bankTellerLocal
  )<2.2
 ){
  return {
   type:'teller',
   legacy:true
  };
 }


 if(
  roomId==='prison'&&
  Prison.sentenced
 ){
  return {
   type:'jailed',
   legacy:true
  };
 }


 return {
  type:'exit'
 };
}


/* =========================================================
   INTERIOR ACTIONS
   ========================================================= */

function faceDirection(rotation){

 if(
  typeof rotation!=='number'
 ){
  return;
 }

 Player.camera.rotation.order='YXZ';

 Player.camera.rotation.y=
  rotation;

 Player.camera.rotation.x=0;
}


function beginSeatAction(item){

 if(!item){
  return;
 }

 Player.interiorAction={
  item,
  type:'seat',
  previousPosition:
   Player.camera.position.clone(),
  previousRotation:{
   y:Player.camera.rotation.y,
   x:Player.camera.rotation.x
  }
 };


 if(item.object){
  item.object.userData.inUse=true;
 }


 if(item.sitPosition){

  Player.camera.position.copy(
   item.sitPosition
  );

 }else if(item.position){

  Player.camera.position.copy(
   item.position
  );
 }


 if(
  typeof item.rotation==='number'
 ){
  faceDirection(
   item.rotation
  );
 }


 if(
  World.activeInterior&&
  World.interiors?.[World.activeInterior]
 ){

  World.interiors[
   World.activeInterior
  ].userData.playerAction=
   'seat';
 }
}


function endSeatAction(){

 if(
  !Player.interiorAction
 ){
  return;
 }

 const old=
  Player.interiorAction;

 Player.stopInteriorAction();

 /*
  * Move slightly away from the
  * furniture instead of spawning
  * inside it.
  */

 const yaw=
  Player.camera.rotation.y;

 Player.camera.position.x+=
  Math.sin(yaw)*0.65;

 Player.camera.position.z+=
  Math.cos(yaw)*0.65;

 Player.camera.position.y=49.6;

 if(old.previousRotation){

  Player.camera.rotation.order='YXZ';

  Player.camera.rotation.y=
   old.previousRotation.y;

  Player.camera.rotation.x=
   old.previousRotation.x;
 }
}


function useTV(item){

 if(!item){
  return;
 }

 item.on=
  item.on===true
   ? false
   : true;


 if(
  item.screen
 ){

  item.screen.material=
   item.on
    ? (
       item.screenOnMaterial||
       item.screen.material
      )
    : (
       item.screenOffMaterial||
       item.screen.material
      );
 }


 if(
  item.screenLight
 ){

  item.screenLight.visible=
   item.on;
 }


 if(
  typeof item.onChange==='function'
 ){

  item.onChange(
   item.on
  );
 }
}


function useObjectAction(item){

 if(!item){
  return;
 }


 if(
  item.type==='chair'||
  item.type==='sofa'||
  item.type==='restaurantChair'||
  item.type==='seat'
 ){

  if(
   Player.interiorAction
  ){
   endSeatAction();
  }else{
   beginSeatAction(item);
  }

  return;
 }


 if(
  item.type==='tv'
 ){

  useTV(item);
  return;
 }


 if(
  item.type==='toilet'
 ){

  if(
   typeof Vitals?.useToilet==='function'
  ){
   Vitals.useToilet();
  }

  return;
 }


 if(
  item.type==='bed'
 ){

  if(
   typeof Vitals?.sleep==='function'
  ){
   Vitals.sleep();
  }

  return;
 }


 if(
  item.type==='kitchen'||
  item.type==='stove'||
  item.type==='sink'||
  item.type==='counter'
 ){

  /*
   * If world.js provides its own
   * action, use it.
   */
  if(
   typeof item.onUse==='function'
  ){
   item.onUse();
  }

  /*
   * Optional cooking system.
   */
  else if(
   window.Economy&&
   typeof Economy.useItem==='function'&&
   item.itemId
  ){
   Economy.useItem(
    item.itemId
   );
  }

  return;
 }


 if(
  item.type==='table'||
  item.type==='restaurantTable'
 ){

  if(
   item.chair
  ){
   beginSeatAction(
    item.chair
   );
  }

  else if(
   typeof item.onUse==='function'
  ){
   item.onUse();
  }

  return;
 }


 if(
  typeof item.onUse==='function'
 ){
  item.onUse();
 }
}


/* =========================================================
   INTERIOR INTERACTION
   ========================================================= */

Player.interact=function(){

 /*
  * Never interact through UI.
  */
 if(
  document.querySelector(
   '.panel.open'
  )||
  UI.dom.menu.style.display!=='none'||
  $('pPhone').classList.contains('open')
 ){
  return;
 }


 /* -----------------------------------------
    Already using furniture
    ----------------------------------------- */

 if(
  World.activeInterior&&
  Player.interiorAction
 ){

  /*
   * E while seated = stand up.
   */
  if(
   Player.interiorAction.type==='seat'
  ){

   endSeatAction();
   return;
  }

  return;
 }


 /* -----------------------------------------
    Interior
    ----------------------------------------- */

 if(World.activeInterior){

  const hit=
   getInteriorInteractable(
    Player.camera.position
   );


  if(!hit){
   return;
  }


  if(
   hit.type==='exit'
  ){

   World.exitInterior(
    Player.camera,
    outsidePos
   );

   setDriveButtonsVisible(false);

   return;
  }


  if(hit.legacy){

   if(
    hit.type==='sleep'
   ){
    Vitals.sleep();
    return;
   }


   if(
    hit.type==='toilet'
   ){
    Vitals.useToilet();
    return;
   }


   if(
    hit.type==='counter'
   ){
    UI.openShop(
     'gunshop'
    );
    return;
   }


   if(
    hit.type==='teller'
   ){
    UI.openShop(
     'bank'
    );
    return;
   }


   if(
    hit.type==='jailed'
   ){
    Prison.bail();
    return;
   }

  }


  if(hit.item){

   useObjectAction(
    hit.item
   );

   return;
  }


  return;
 }


 /* -----------------------------------------
    Outside
    ----------------------------------------- */

 const hit=
  findInteractable(
   Player.camera.position
  );


 if(!hit){
  return;
 }


 if(
  hit.type==='exitCar'
 ){

  Player.mode='walk';

  Player.camera.position.set(
   World.playerCar.position.x+2,
   1.7,
   World.playerCar.position.z
  );

  setDriveButtonsVisible(false);

  if(!IS_TOUCH){
   UI.dom.crosshair.style.display='block';
  }

  Audio.stopEngine();

  Weapons.refreshHUD();

  return;
 }


 if(
  hit.type==='car'
 ){

  Vehicles.switchTo(
   hit.ref.mesh,
   hit.ref.registered
  );

  Player.mode='drive';

  if(!IS_TOUCH){
   Player.controls.unlock();
  }

  UI.dom.crosshair.style.display=
   'none';

  setDriveButtonsVisible(true);

  Weapons.refreshHUD();

  return;
 }


 if(
  hit.type==='door'
 ){

  World.enterInterior(
   hit.ref.id,
   Player.camera,
   outsidePos
  );

  return;
 }


 if(
  hit.type==='shop'
 ){

  UI.openShop(
   hit.ref.id
  );

  return;
 }


 if(
  hit.type==='keyNpc'
 ){

  UI.openRelationship(
   hit.ref.id
  );

  return;
 }


 if(
  hit.type==='pooledNpc'
 ){

  NPCPool.greet(
   hit.ref
  );

  return;
 }
};


/* =========================================================
   OUTDOOR UPDATE
   ========================================================= */

Player.update=function(dt){

 if(Player.suspended){
  return;
 }


 /*
  * Interior gets its own movement.
  */
 if(World.activeInterior){

  updateInteriorWalk(dt);

  return;
 }


 if(Player.mode==='walk'){

  let fx=0;
  let fz=0;


  if(IS_TOUCH){

   fx=touch.joyVec.x;
   fz=touch.joyVec.y;

   Player.camera.rotation.order='YXZ';

   Player.camera.rotation.y=
    touch.yaw;

   Player.camera.rotation.x=
    touch.pitch;

  }else{

   if(move.f) fz-=1;
   if(move.b) fz+=1;
   if(move.l) fx-=1;
   if(move.r) fx+=1;
  }


  const len=
   Math.hypot(fx,fz);


  if(len>0.05){

   const sprint=
    (
     IS_TOUCH
      ? touch.sprint
      : move.sprint
    )
     ? 1.7
     : 1;


   const speed=
    6*
    Vitals.speedFactor()*
    sprint;


   const v=
    new THREE.Vector3(
     fx/len,
     0,
     fz/len
    ).multiplyScalar(
     speed*dt
    );


   if(IS_TOUCH){

    const yaw=
     Player.camera.rotation.y;


    const forward=
     new THREE.Vector3(
      -Math.sin(yaw),
      0,
      -Math.cos(yaw)
     ).multiplyScalar(
      -v.z
     );


    const right=
     new THREE.Vector3(
      Math.cos(yaw),
      0,
      -Math.sin(yaw)
     ).multiplyScalar(
      v.x
     );


    Player.camera.position
     .add(forward)
     .add(right);

   }else{

    Player.controls.moveRight(
     v.x
    );

    Player.controls.moveForward(
     -v.z
    );
   }


   Audio.footstep(
    sprint>1
   );
  }


  Player.camera.position.y=
   1.7;


  World.resolveCollision(
   Player.camera.position,
   0.4
  );


 }else{


  const wantGas=
   IS_TOUCH
    ? touch.gas
    : move.f;


  const wantBrake=
   IS_TOUCH
    ? touch.brake
    : move.b;


  const wantL=
   IS_TOUCH
    ? touch.steerL
    : move.l;


  const wantR=
   IS_TOUCH
    ? touch.steerR
    : move.r;


  if(
   Police.checkpointActive
  ){

   carVel.speed*=0.85;

  }else if(wantGas){

   carVel.speed=
    Math.min(
     carVel.speed+dt*8,
     14
    );

  }else if(wantBrake){

   carVel.speed=
    Math.max(
     carVel.speed-dt*8,
     -8
    );

  }else{

   carVel.speed*=0.94;
  }


  if(wantR){

   carVel.steer=
    Math.min(
     carVel.steer+dt*2,
     1
    );

  }else if(wantL){

   carVel.steer=
    Math.max(
     carVel.steer-dt*2,
     -1
    );

  }else{

   carVel.steer*=0.85;
  }


  World.playerCar.rotation.y+=
   carVel.steer*
   dt*
   (carVel.speed/14);


  World.playerCar.position.x+=
   Math.sin(
    World.playerCar.rotation.y
   )*
   carVel.speed*
   dt;


  World.playerCar.position.z+=
   Math.cos(
    World.playerCar.rotation.y
   )*
   carVel.speed*
   dt;


  World.resolveCollision(
   World.playerCar.position,
   1.0
  );


  const camOff=
   new THREE.Vector3(
    0,
    2.4,
    6
   ).applyAxisAngle(
    new THREE.Vector3(0,1,0),
    World.playerCar.rotation.y
   );


  Player.camera.position.copy(
   World.playerCar.position
  ).add(camOff);


  Player.camera.lookAt(
   World.playerCar.position.x,
   World.playerCar.position.y+1,
   World.playerCar.position.z
  );


  Police.maybeTrigger(
   World.playerCar.position,
   dt
  );


  DrivingSchool.checkProgress(
   World.playerCar.position
  );


  Audio.engine(
   carVel.speed
  );
 }
};


/* =========================================================
   INTERIOR WALKING
   ========================================================= */

function updateInteriorWalk(dt){

 /*
  * When seated/using an object,
  * movement is disabled.
  */
 if(Player.interiorAction){

  Player.camera.position.y=
   49.6;

  return;
 }


 let fx=0;
 let fz=0;


 if(IS_TOUCH){

  fx=touch.joyVec.x;
  fz=touch.joyVec.y;

  Player.camera.rotation.order='YXZ';

  Player.camera.rotation.y=
   touch.yaw;

  Player.camera.rotation.x=
   touch.pitch;

 }else{

  if(move.f) fz-=1;
  if(move.b) fz+=1;
  if(move.l) fx-=1;
  if(move.r) fx+=1;
 }


 const len=
  Math.hypot(fx,fz);


 if(len>0.05){

  const speed=5;


  const v=
   new THREE.Vector3(
    fx/len,
    0,
    fz/len
   ).multiplyScalar(
    speed*dt
   );


  if(IS_TOUCH){

   const yaw=
    Player.camera.rotation.y;


   const forward=
    new THREE.Vector3(
     -Math.sin(yaw),
     0,
     -Math.cos(yaw)
    ).multiplyScalar(
     -v.z
    );


   const right=
    new THREE.Vector3(
     Math.cos(yaw),
     0,
     -Math.sin(yaw)
    ).multiplyScalar(
     v.x
    );


   Player.camera.position
    .add(forward)
    .add(right);

  }else{

   Player.controls.moveRight(
    v.x
   );

   Player.controls.moveForward(
    -v.z
   );
  }


  Audio.footstep(false);
 }


 /*
  * NEW:
  * Interior dimensions can be provided by world.js.
  *
  * Example:
  *
  * room.userData.width=12;
  * room.userData.depth=10;
  */

 const room=
  World.interiors?.[
   World.activeInterior
  ];


 let roomW=
  room?.userData?.width||
  10;


 let roomD=
  room?.userData?.depth||
  10;


 const margin=0.65;


 const boundX=
  Math.max(
   1,
   roomW/2-margin
  );


 const boundZ=
  Math.max(
   1,
   roomD/2-margin
  );


 Player.camera.position.x=
  Math.max(
   -boundX,
   Math.min(
    boundX,
    Player.camera.position.x
   )
  );


 Player.camera.position.z=
  Math.max(
   -boundZ,
   Math.min(
    boundZ,
    Player.camera.position.z
   )
  );


 Player.camera.position.y=
  room?.userData?.eyeY||
  49.6;
}


/* =========================================================
   PROMPT
   ========================================================= */

Player.updatePrompt=function(){

 const d=UI.dom;


 if(World.activeInterior){

  const hit=
   getInteriorInteractable(
    Player.camera.position
   );


  if(!hit){

   d.prompt.style.display=
    'none';

   return;
  }


  if(Player.interiorAction){

   if(
    Player.interiorAction.type==='seat'
   ){

    d.prompt.textContent=
     'E: Stand Up';

    d.prompt.style.display=
     'block';

    return;
   }
  }


  const labels={

   chair:
    'E: Sit',

   sofa:
    'E: Sit',

   seat:
    'E: Sit',

   restaurantChair:
    'E: Sit',

   tv:
    hit.item?.on
     ? 'E: Turn TV Off'
     : 'E: Watch TV',

   toilet:
    'E: Use Toilet',

   bed:
    'E: Sleep',

   kitchen:
    'E: Use Kitchen',

   stove:
    'E: Cook',

   sink:
    'E: Use Sink',

   counter:
    'E: Use Counter',

   table:
    'E: Use Table',

   restaurantTable:
    'E: Sit at Table',

   sleep:
    'E: Sleep',

   teller:
    'E: Banking',

   jailed:
    'E: Pay Bail $'+
     Prison.bailCost+
     ' ('+
     Math.ceil(
      Prison.timer
     )+
     's left)',

   exit:
    t('exitBld')
  };


  d.prompt.textContent=
   labels[hit.type]||
   (
    hit.item?.label||
    'E: Interact'
   );


  d.prompt.style.display=
   'block';

  return;
 }


 const hit=
  findInteractable(
   Player.camera.position
  );


 if(!hit){

  d.prompt.style.display=
   'none';

  return;
 }


 const labelFor={

  exitCar:
   ()=>t('exitCar'),

  car:
   ()=>t('enterCar'),

  door:
   ()=>{
    const locked=
     hit.ref.ownable&&
     !(
      Player.properties&&
      Player.properties.includes(
       hit.ref.id
      )
     );

    return locked
     ? (
       '🔒 '+
       hit.ref.name+
       ' (not owned — buy via Phone)'
      )
     : (
       t('enterBld')+
       ' — '+
       hit.ref.name
      );
   },

  shop:
   ()=>'E: '+hit.ref.name,

  keyNpc:
   ()=>'E: Talk to '+hit.ref.name,

  pooledNpc:
   ()=>'E: Greet'
 };


 d.prompt.textContent=
  labelFor[hit.type]();


 d.prompt.style.display=
  'block';
};
