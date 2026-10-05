/* ============ Weapons: arsenal, aiming/firing, ammo, and simple police pursuit AI ============ */
/* Stylised combat: hits damage NPCs (headshots x2), NPCs bleed, die, and react (see npc.js). */
const ARSENAL={
 fists:{name:'Fists',type:'melee',dmg:12,range:2.2,rate:0.4},
 knife:{name:'Knife',type:'melee',dmg:16,range:2.2,rate:0.35},
 bat:{name:'Baseball Bat',type:'melee',dmg:20,range:2.6,rate:0.55},
 pistol:{name:'Pistol',type:'gun',dmg:22,range:30,maxAmmo:12,rate:0.25,reloadT:1.2},
 revolver:{name:'Revolver',type:'gun',dmg:30,range:35,maxAmmo:6,rate:0.6,reloadT:1.8},
 smg:{name:'SMG',type:'gun',dmg:14,range:28,maxAmmo:30,rate:0.1,reloadT:1.8},
 shotgun:{name:'Shotgun',type:'gun',dmg:45,range:15,maxAmmo:6,rate:0.9,reloadT:2.2},
 rifle:{name:'Rifle',type:'gun',dmg:35,range:60,maxAmmo:30,rate:0.15,reloadT:2.2},
 sniper:{name:'Sniper Rifle',type:'gun',dmg:80,range:120,maxAmmo:5,rate:1.2,reloadT:2.6}
};

/* gun shop stock (shared by the gun shop and the DarkNet app) */
const WEAPON_STOCK=[
 {id:'knife',price:120,ammoPrice:0},
 {id:'bat',price:150,ammoPrice:0},
 {id:'pistol',price:800,ammoPrice:5},
 {id:'revolver',price:1400,ammoPrice:8},
 {id:'smg',price:3800,ammoPrice:6},
 {id:'shotgun',price:3200,ammoPrice:12},
 {id:'rifle',price:2500,ammoPrice:8},
 {id:'sniper',price:9000,ammoPrice:25}
];
const DARKNET_NEEDS_LICENSE=false; /* set true to lock the DarkNet app behind the gun license too */
const DARKNET_MARKUP=1.5;

const Weapons={owned:['fists'],current:0,ammo:{},reserve:{},aiming:false,reloading:false,_last:0,_msgT:null};

Weapons.say=function(t){
 const el=$('whMsg');
 if(!el) return;
 el.textContent=t||'';
 clearTimeout(Weapons._msgT);
 if(t) Weapons._msgT=setTimeout(()=>{el.textContent='';},1500);
};

Weapons.id=function(){ return Weapons.owned[Weapons.current]||'fists'; };

Weapons.buy=function(id,ammoQty){
 if(!ARSENAL[id]) return false;
 if(!Weapons.owned.includes(id)) Weapons.owned.push(id);
 if(ammoQty) Weapons.reserve[id]=(Weapons.reserve[id]||0)+ammoQty;
 const w=ARSENAL[id];
 /* a new gun comes with a loaded magazine */
 if(w.type==='gun'&&!(Weapons.ammo[id]>0)){
  const take=Math.min(w.maxAmmo,Weapons.reserve[id]||0);
  Weapons.ammo[id]=take;
  Weapons.reserve[id]=(Weapons.reserve[id]||0)-take;
 }
 return true;
};

Weapons.switchTo=function(index){
 Weapons.reloading=false;
 Weapons.current=((index%Weapons.owned.length)+Weapons.owned.length)%Weapons.owned.length;
};
Weapons.cycle=function(){ Weapons.switchTo(Weapons.current+1); };

/* unequip: put the active weapon away (back to fists) */
Weapons.holster=function(){
 Weapons.reloading=false;
 Weapons.current=0;
 Weapons.say('Weapon holstered');
};

Weapons.reload=function(){
 const id=Weapons.id(), w=ARSENAL[id];
 if(!w||w.type!=='gun'||Weapons.reloading) return;
 const have=Weapons.ammo[id]||0, res=Weapons.reserve[id]||0;
 if(have>=w.maxAmmo){ Weapons.say('Magazine full'); return; }
 if(res<=0){ Weapons.say('No spare ammo'); return; }
 Weapons.reloading=true;
 Audio.reload();
 Weapons.say('Reloading...');
 Weapons.refreshHUD();
 setTimeout(()=>{
  /* cancelled by switching weapon / holstering */
  if(!Weapons.reloading||Weapons.id()!==id) return;
  const need=w.maxAmmo-(Weapons.ammo[id]||0);
  const take=Math.min(need,Weapons.reserve[id]||0);
  Weapons.ammo[id]=(Weapons.ammo[id]||0)+take;
  Weapons.reserve[id]=(Weapons.reserve[id]||0)-take;
  Weapons.reloading=false;
  Weapons.say('');
  Weapons.refreshHUD();
 },(w.reloadT||1.5)*1000);
};

Weapons.fire=function(camera){
 const id=Weapons.id(); const w=ARSENAL[id];
 if(!w) return;
 const now=performance.now();
 if(now-Weapons._last<(w.rate||0.2)*1000) return;
 if(Weapons.reloading) return;
 if(w.type==='gun'){
  if((Weapons.ammo[id]||0)<=0){
   Audio.empty();
   if((Weapons.reserve[id]||0)>0) Weapons.reload();
   else Weapons.say('Out of ammo');
   return;
  }
  Weapons.ammo[id]--;
 }
 Weapons._last=now;
 const dir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
 const isGun=w.type==='gun';
 if(isGun) Audio.gunshot(id);
 const ray=new THREE.Raycaster(camera.position,dir,0,w.range);
 const targets=NPCPool.pool.filter(n=>n.active&&n.mesh.visible&&!n.dead).map(n=>n.mesh);
 const hits=ray.intersectObjects(targets,true).filter(h=>h.object.visible);
 let npc=null,point=null;
 if(hits.length){
  let o=hits[0].object;
  while(o&&!npc){ const m=o; npc=NPCPool.pool.find(n=>n.mesh===m); o=o.parent; }
  point=hits[0].point;
 }
 if(!npc&&w.type==='melee'){
  /* swing: hit the nearest NPC that is roughly in front */
  const near=NPCPool.nearest(camera.position,w.range);
  if(near){
   const to=new THREE.Vector3().subVectors(near.mesh.position,camera.position); to.y=0; to.normalize();
   const fwd=dir.clone(); fwd.y=0; fwd.normalize();
   if(to.dot(fwd)>0.3){ npc=near; point=new THREE.Vector3(near.mesh.position.x,near.mesh.position.y+1.2,near.mesh.position.z); }
  }
 }
 if(npc){
  if(!isGun) Audio.melee(true);
  NPCPool.damage(npc,w.dmg,{point,dir,melee:!isGun,gun:isGun});
 } else {
  if(!isGun) Audio.melee(false);
  else NPCPool.alertNear(camera.position,22,null); /* gunfire still scares people around */
 }
 /* auto reload when the magazine just emptied */
 if(w.type==='gun'&&(Weapons.ammo[id]||0)<=0&&(Weapons.reserve[id]||0)>0) Weapons.reload();
};

Weapons.refreshHUD=function(){
 const id=Weapons.id(), w=ARSENAL[id];
 const armed=!(id==='fists'&&Weapons.owned.length===1);
 const hud=$('weaponHud'); hud.style.display= armed ? 'flex':'none';
 $('whName').textContent=w.name+(Weapons.reloading?' (reloading)':'');
 $('whAmmo').textContent= w.type==='gun' ? ' '+(Weapons.ammo[id]||0)+' / '+(Weapons.reserve[id]||0) : '';
 const showTouchCombat= armed && Player.mode==='walk';
 $('touchFire').classList.toggle('show',showTouchCombat);
 $('touchWeapon').classList.toggle('show',showTouchCombat && Weapons.owned.length>1);
 const tr=$('touchReload'),th=$('touchHolster');
 if(tr) tr.classList.toggle('show',showTouchCombat && w.type==='gun');
 if(th) th.classList.toggle('show',showTouchCombat && id!=='fists');
 document.querySelectorAll('.whBtn').forEach(b=>{b.style.display=IS_TOUCH?'none':'inline-block';});
 const aiming= armed && Player.mode==='walk';
 $('reticle').style.display= aiming?'block':'none';
 if(!IS_TOUCH && Player.mode==='walk') UI.dom.crosshair.style.display=aiming?'none':'block';
};

/* ---- Police pursuit AI ---- */
const PoliceAI={cars:[],active:false};
PoliceAI.init=function(){
 for(let i=0;i<4;i++){
  const car=World.makeCar(9999,9999,0x1a3a5c);
  car.userData.speed=0; car.visible=false; PoliceAI.cars.push(car);
 }
};
PoliceAI.trigger=function(playerPos,wantedLevel){
 PoliceAI.active=true;
 const activeCount=Math.min(PoliceAI.cars.length,1+(wantedLevel||1));
 PoliceAI.cars.forEach((car,i)=>{
  car.visible=i<activeCount;
  if(i<activeCount){ const ang=Math.random()*Math.PI*2; car.position.set(playerPos.x+Math.sin(ang)*30,0,playerPos.z+Math.cos(ang)*30); }
  else car.position.set(9999,9999,9999);
 });
};
PoliceAI.clear=function(){ PoliceAI.active=false; PoliceAI.cars.forEach(c=>{c.visible=false;c.position.set(9999,9999,9999);}); Police.addWanted(-5); };
PoliceAI.update=function(dt,playerPos){
 if(!PoliceAI.active) return;
 let caught=false;
 PoliceAI.cars.forEach(car=>{
  if(!car.visible) return;
  const toPlayer=new THREE.Vector3().subVectors(playerPos,car.position); toPlayer.y=0;
  const dist=toPlayer.length();
  if(dist<0.1) return;
  toPlayer.normalize();
  car.rotation.y=Math.atan2(toPlayer.x,toPlayer.z);
  const speed=Math.min(10,dist)*1.2;
  car.position.addScaledVector(toPlayer,speed*dt);
  if(dist<3.5) caught=true;
 });
 if(caught){
  PoliceAI.clear();
  Economy.cash=Math.max(0,Economy.cash-150);
  Prison.arrest(Player.camera,outsidePos);
  UI.refreshHUD();
 }
};

/* on-screen buttons in the weapon bar (mouse users); touch users have the round buttons */
setTimeout(function wireWh(){
 const f=$('whFire'),r=$('whReload'),h=$('whHolster');
 if(!f||!r||!h) return setTimeout(wireWh,500);
 f.onclick=()=>{ if(!World.activeInterior) Weapons.fire(Player.camera); Weapons.refreshHUD(); };
 r.onclick=()=>{ Weapons.reload(); Weapons.refreshHUD(); };
 h.onclick=()=>{ Weapons.holster(); Weapons.refreshHUD(); };
},500);
