/* ============ Main: bootstrap, render loop, module wiring ============ */

/* top-level const globals are not window properties: expose the ones the UI code
   reads as window.X (shops, inventory, licenses...) */
(function(){
 const names=['World','Player','Economy','Vehicles','Vitals','Relationships','License','DEALERSHIP','Docs','ITEMS','NPC_DEFS','Weapons','ARSENAL','Prison','Police','DrivingTest','Jobs','IS_TOUCH'];
 names.forEach(function(n){
  try{
   const v=(0,eval)(n);
   if(v!==undefined&&!(n in window))window[n]=v;
  }catch(e){}
 });
})();

const canvas=$('c');

const renderer=new THREE.WebGLRenderer({
 canvas,
 antialias:!IS_TOUCH,
 preserveDrawingBuffer:false,
 powerPreference:'high-performance'
});

/* phones: lower pixel ratio avoids memory blow-ups / garbled frames on iOS Safari */
renderer.setPixelRatio(
 Math.min(devicePixelRatio,IS_TOUCH?1.5:2)
);

function viewW(){ return Math.round((window.visualViewport&&visualViewport.width)||innerWidth); }
function viewH(){ return Math.round((window.visualViewport&&visualViewport.height)||innerHeight); }

renderer.setSize(
 viewW(),
 viewH(),
 false
);

/* if iOS drops the WebGL context (memory), reload cleanly instead of showing a corrupted frame */
canvas.addEventListener('webglcontextlost',e=>{
 e.preventDefault();
 setTimeout(()=>location.reload(),600);
},false);

renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0xbfd4e6);
scene.fog=new THREE.Fog(0xbfd4e6,60,180);

const camera=new THREE.PerspectiveCamera(
 70,
 innerWidth/innerHeight,
 0.1,
 500
);

camera.position.set(
 30,
 1.7,
 55
);

const hemi=new THREE.HemisphereLight(
 0xdfe9f5,
 0x2a2015,
 0.7
);

scene.add(hemi);

const sun=new THREE.DirectionalLight(
 0xfff1d6,
 1.5
);

sun.position.set(
 -45,
 70,
 -25
);

sun.castShadow=true;

sun.shadow.mapSize.set(
 2048,
 2048
);

sun.shadow.camera.near=1;
sun.shadow.camera.far=220;
sun.shadow.camera.left=-90;
sun.shadow.camera.right=90;
sun.shadow.camera.top=90;
sun.shadow.camera.bottom=-90;
sun.shadow.bias=-0.0004;
sun.shadow.radius=2.2;

scene.add(sun);

World.setLights(
 hemi,
 sun
);


/* ============ Audio ============ */

Audio.init();

const resumeAudioOnce=()=>{

 Audio.resume();

 removeEventListener(
  'click',
  resumeAudioOnce
 );

 removeEventListener(
  'keydown',
  resumeAudioOnce
 );

 removeEventListener(
  'touchstart',
  resumeAudioOnce
);

};

addEventListener(
 'click',
 resumeAudioOnce
);

addEventListener(
 'keydown',
 resumeAudioOnce
);

addEventListener(
 'touchstart',
 resumeAudioOnce
);


/* ============ Resize ============ */

addEventListener(
 'resize',
 ()=>{

  camera.aspect=
   viewW()/
   viewH();

  camera.updateProjectionMatrix();

  renderer.setSize(
   viewW(),
   viewH(),
   false
  );
 }
);
addEventListener('orientationchange',()=>setTimeout(()=>dispatchEvent(new Event('resize')),300));
if(window.visualViewport) visualViewport.addEventListener('resize',()=>dispatchEvent(new Event('resize')));


/* ============ World / Player / Systems Init ============ */

World.init(
 scene,
 renderer
);

Player.init(
 camera,
 renderer.domElement
);

World.applyQuality();

Vehicles.initDefault();

NPCPool.init();

PoliceAI.init();

Phone.initTabs();

UI.initExtras();

UI.refreshHUD();

Weapons.refreshHUD();


/* ============ Relationships Runtime ============ */

if(
 typeof Relationships!=='undefined'&&
 typeof Relationships.update==='function'
){

 Relationships.update(0);
}


/* ============ Multiplayer ============ */

let gameMode='offline';

const modeSelect=$('selMode');

if(modeSelect){

 modeSelect.onchange=e=>{
  gameMode=
   e.target.value;
 };
}

function tryConnectMultiplayer(){

 if(gameMode!=='multi') return;

 if(
  typeof NetworkManager!=='undefined'&&
  typeof NetworkManager.connect==='function'
 ){

  NetworkManager.connect(
   'wss://example-not-configured.invalid'
  );
 }

 console.info(
  '[Multiplayer] stub only — staying in offline simulation.'
 );
}


/* ============ Respawn ============ */

let awaitingRespawn=false;

function respawnPlayer(){

 const poi=
  Player.spawnPoint&&
  World.pois&&
  World.pois.find(
   p=>
    p.id===
    Player.spawnPoint
  );

 const pos=
  poi
   ? poi.pos
   : new THREE.Vector3(
      -70,
      1.7,
      -14
     );

 camera.position.set(
  pos.x,
  1.7,
  pos.z
 );

 Vitals.health=50;

 Player.mode='walk';

 if(
  typeof PoliceAI!=='undefined'&&
  typeof PoliceAI.clear==='function'
 ){

  PoliceAI.clear();
 }

 UI.refreshHUD();
}


/* ============ Cutscene ============ */

function startCutscene(){

 tryConnectMultiplayer();

 if(
  typeof Cutscenes==='undefined'||
  typeof Cutscenes.play!=='function'
 ){

  console.error(
   '[El-Hay] Cutscenes.play is not available.'
  );

  MissionSystem.start();

  if(UI.dom.hud){

   UI.dom.hud.style.display=
    S.showFps
     ? 'block'
     : 'none';
  }

  if(
   !IS_TOUCH&&
   UI.dom.crosshair
  ){

   UI.dom.crosshair.style.display=
    'block';
  }

  return;
 }

 Cutscenes.play(
  camera,
  ()=>{

   if(UI.dom.hud){

    UI.dom.hud.style.display=
     S.showFps
      ? 'block'
      : 'none';
   }

   if(
    !IS_TOUCH&&
    UI.dom.crosshair
   ){

    UI.dom.crosshair.style.display=
     'block';
   }

   MissionSystem.start();
  }
 );
}


/* ============ Continue Game ============ */

async function continueGame(){

 tryConnectMultiplayer();

 const ok=
  await Persistence.load();

 if(!ok){

  MissionSystem.start();
 }

 if(
  !IS_TOUCH&&
  UI.dom.crosshair
 ){

  UI.dom.crosshair.style.display=
   'block';
 }

 if(UI.dom.hud){

  UI.dom.hud.style.display=
   S.showFps
    ? 'block'
    : 'none';
 }
}

UI.init(
 startCutscene,
 continueGame
);


/* ============ Main Loop ============ */

let last=performance.now();

let fpsCount=0;

let fpsSample=
 performance.now();

let hudTick=0;

function loop(now){

 requestAnimationFrame(loop);

 const targetMs=
  S.fpsLimit>0
   ? 1000/S.fpsLimit
   : 0;

 const elapsed=
  now-last;

 if(elapsed<targetMs){
  return;
 }

 const dt=
  Math.min(
   elapsed/1000,
   0.1
  );

 last=now;


 /* Player */

 Player.update(dt);

 Player.updatePrompt();


 /* World */

 World.update(
  camera.position.x,
  camera.position.z,
  dt
 );

 World.updateDayNight(dt);


 /* NPCs */

 NPCPool.update(
  camera.position,
  dt
 );


 /* Relationships */

 if(
  typeof Relationships!=='undefined'&&
  typeof Relationships.update==='function'
 ){

  Relationships.update(dt);
 }


 /* Gang */

 Gang.update(dt);


 /* Police */

 PoliceAI.update(
  dt,
  camera.position
 );


 /* Audio */

 Audio.siren(
  PoliceAI.active
 );

 Audio.updateSiren(dt);


 /* Vitals */

 Vitals.update(dt);


 /* Prison */

 Prison.tick(dt);


 /* Death / Respawn */

 if(
  Vitals.health<=0&&
  !awaitingRespawn
 ){

  awaitingRespawn=true;

  respawnPlayer();

 }else if(
  Vitals.health>20
 ){

  awaitingRespawn=false;
 }


 /* Heist */

 HeistSystem.tick(dt);


 /* Missions */

 MissionSystem.checkProgress(
  camera.position,
  World.playerCar.position,
  Player.mode
 );


 /* Render */

 renderer.render(
  scene,
  camera
 );


 /* HUD */

 hudTick+=dt;

 if(hudTick>0.3){

  hudTick=0;

  UI.refreshHUD();

  if(
   typeof Minimap!=='undefined'&&
   typeof Minimap.draw==='function'
  ){

   Minimap.draw(camera);
  }
 }


 /* FPS */

 fpsCount++;

 if(
  now-fpsSample>=500
 ){

  if(
   S.showFps&&
   UI.dom.hud
  ){

   UI.dom.hud.textContent=
    'FPS: '+
    Math.round(
     fpsCount*
     1000/
     (now-fpsSample)
    )+
    '\n'+
    (
     Player.mode==='drive'
      ? t('drive')
      : t('walk')
    );
  }

  fpsCount=0;

  fpsSample=now;
 }
}

requestAnimationFrame(loop);


/* ============ Autosave ============ */

setInterval(
 ()=>{

  if(
   UI.dom.menu&&
   UI.dom.menu.style.display==='none'
  ){

   Persistence.save();
  }

 },
 20000
);


/* ============ Boot ============ */

let pct=0;

const bootId=
 setInterval(
  ()=>{

   pct+=
    10+
    Math.random()*10;

   if(UI.dom.lbFill){

    UI.dom.lbFill.style.width=
     Math.min(
      pct,
      100
     )+
     '%';
   }

   if(pct>=100){

    clearInterval(bootId);

    setTimeout(
     ()=>{

      if(UI.dom.loading){

       UI.dom.loading.style.display=
        'none';
      }

      if(UI.dom.menu){

       UI.dom.menu.style.display=
        'flex';
      }

     },
     200
    );
   }

  },
 100
 );
