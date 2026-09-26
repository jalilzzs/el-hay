/* ============ Main: bootstrap, render loop, module wiring ============ */
const canvas=$('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0xbfd4e6);
scene.fog=new THREE.Fog(0xbfd4e6,60,180);

const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,0.1,500);
camera.position.set(30,1.7,55);

const hemi=new THREE.HemisphereLight(0xdfe9f5,0x2a2015,0.7); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe6b8,1.3); sun.position.set(-40,60,-20); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024); scene.add(sun);

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

World.init(scene,renderer);
Player.init(camera,renderer.domElement);
World.applyQuality();
Vehicles.initDefault();
NPCPool.init();
PoliceAI.init();
Phone.initTabs();
UI.initExtras();
UI.refreshHUD();
Weapons.refreshHUD();

/* Offline vs. Multiplayer mode: only Offline has real gameplay in this build.
   Multiplayer stays behind the NetworkManager stub — architecture is separated, not implemented. */
let gameMode='offline';
$('selMode').onchange=e=>{ gameMode=e.target.value; };
function tryConnectMultiplayer(){
 if(gameMode!=='multi') return;
 NetworkManager.connect('wss://example-not-configured.invalid');
 console.info('[Multiplayer] stub only — staying in offline simulation.');
}

function startCutscene(){
 tryConnectMultiplayer();
 Cutscenes.play(camera,()=>{
  UI.dom.hud.style.display=S.showFps?'block':'none'; if(!IS_TOUCH) UI.dom.crosshair.style.display='block';
  MissionSystem.start();
 });
}
async function continueGame(){
 tryConnectMultiplayer();
 const ok=await Persistence.load();
 if(!ok) MissionSystem.start(); // no save found — start the story fresh anyway
 if(!IS_TOUCH) UI.dom.crosshair.style.display='block';
 UI.dom.hud.style.display=S.showFps?'block':'none';
}
UI.init(startCutscene,continueGame);

/* ---- Main loop ---- */
let last=performance.now(), fpsCount=0, fpsSample=performance.now(), hudTick=0;
function loop(now){
 requestAnimationFrame(loop);
 const targetMs=S.fpsLimit>0?1000/S.fpsLimit:0;
 const elapsed=now-last; if(elapsed<targetMs) return;
 const dt=Math.min(elapsed/1000,0.1); last=now;
 Player.update(dt); Player.updatePrompt();
 World.update(camera.position.x,camera.position.z,dt);
 NPCPool.update(camera.position,dt);
 PoliceAI.update(dt,camera.position);
 Vitals.update(dt);
 MissionSystem.checkProgress(camera.position,World.playerCar.position,Player.mode);
 renderer.render(scene,camera);
 hudTick+=dt; if(hudTick>0.3){ hudTick=0; UI.refreshHUD(); Minimap.draw(camera); }
 fpsCount++; if(now-fpsSample>=500){ if(S.showFps) UI.dom.hud.textContent='FPS: '+Math.round(fpsCount*1000/(now-fpsSample))+'\n'+(Player.mode==='drive'?t('drive'):t('walk')); fpsCount=0; fpsSample=now; }
}
requestAnimationFrame(loop);

/* Autosave every 20s once gameplay has started (menu closed) */
setInterval(()=>{ if(UI.dom.menu.style.display==='none') Persistence.save(); },20000);

/* ---- Boot sequence ---- */
let pct=0;
const bootId=setInterval(()=>{ pct+=10+Math.random()*10; UI.dom.lbFill.style.width=Math.min(pct,100)+'%';
 if(pct>=100){ clearInterval(bootId); setTimeout(()=>{ UI.dom.loading.style.display='none'; UI.dom.menu.style.display='flex'; },200); } },100);
