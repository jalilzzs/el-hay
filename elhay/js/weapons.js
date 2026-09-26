/* ============ Weapons: arsenal, aiming/firing, ammo, and simple police pursuit AI ============ */
/* Fictional, stylized gameplay only — no gore, no real-world weapon build info. Hits are numeric
   health reductions with a brief reaction line; nothing graphic is rendered. */
const ARSENAL={
 fists:{name:'Fists',type:'melee',dmg:12,range:2.2},
 pistol:{name:'Pistol',type:'gun',dmg:22,range:30,maxAmmo:12},
 rifle:{name:'Rifle',type:'gun',dmg:35,range:60,maxAmmo:30},
};
const Weapons={owned:['fists'],current:0,ammo:{pistol:0,rifle:0},reserve:{pistol:0,rifle:0},aiming:false};
Weapons.buy=function(id,ammoQty){
 if(!ARSENAL[id]) return false;
 if(!Weapons.owned.includes(id)) Weapons.owned.push(id);
 if(ammoQty) Weapons.reserve[id]=(Weapons.reserve[id]||0)+ammoQty;
 return true;
};
Weapons.switchTo=function(index){ Weapons.current=((index%Weapons.owned.length)+Weapons.owned.length)%Weapons.owned.length; };
Weapons.cycle=function(){ Weapons.switchTo(Weapons.current+1); };
Weapons.reload=function(){
 const id=Weapons.owned[Weapons.current]; const w=ARSENAL[id]; if(w.type!=='gun') return;
 const need=w.maxAmmo-(Weapons.ammo[id]||0), take=Math.min(need,Weapons.reserve[id]||0);
 Weapons.ammo[id]=(Weapons.ammo[id]||0)+take; Weapons.reserve[id]-=take;
};
Weapons.fire=function(camera){
 const id=Weapons.owned[Weapons.current]; const w=ARSENAL[id];
 if(w.type==='gun'){ if((Weapons.ammo[id]||0)<=0) return; Weapons.ammo[id]--; }
 const dir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
 const ray=new THREE.Raycaster(camera.position,dir,0,w.range);
 const targets=NPCPool.pool.filter(n=>n.active).map(n=>n.mesh.children[0]); // body mesh
 const hits=ray.intersectObjects(targets);
 if(hits.length){
  const hitMesh=hits[0].object;
  const npc=NPCPool.pool.find(n=>n.mesh.children[0]===hitMesh);
  if(npc) NPCPool.react(npc);
 } else if(w.type==='melee'){
  const near=NPCPool.nearest(camera.position,w.range); if(near) NPCPool.react(near);
 }
};
Weapons.refreshHUD=function(){
 const id=Weapons.owned[Weapons.current], w=ARSENAL[id];
 const armed=!(id==='fists'&&Weapons.owned.length===1);
 const hud=$('weaponHud'); hud.style.display= armed ? 'flex':'none';
 $('whName').textContent=w.name;
 $('whAmmo').textContent= w.type==='gun' ? (Weapons.ammo[id]||0)+' / '+(Weapons.reserve[id]||0) : '';
 const showTouchCombat= armed && Player.mode==='walk';
 $('touchFire').classList.toggle('show',showTouchCombat);
 $('touchWeapon').classList.toggle('show',showTouchCombat && Weapons.owned.length>1);
 const aiming= armed && Player.mode==='walk';
 $('reticle').style.display= aiming?'block':'none';
 if(!IS_TOUCH && Player.mode==='walk') UI.dom.crosshair.style.display=aiming?'none':'block';
};

/* ---- Police pursuit AI ---- */
const PoliceAI={cars:[],active:false};
PoliceAI.init=function(){
 for(let i=0;i<2;i++){
  const car=World.makeCar(9999,9999,0x1a3a5c);
  car.userData.speed=0; PoliceAI.cars.push(car);
 }
};
PoliceAI.trigger=function(playerPos){
 if(PoliceAI.active) return;
 PoliceAI.active=true;
 PoliceAI.cars.forEach((car,i)=>{
  const ang=Math.random()*Math.PI*2;
  car.position.set(playerPos.x+Math.sin(ang)*30,0,playerPos.z+Math.cos(ang)*30);
 });
 $('wantedBox').style.display='block';
};
PoliceAI.clear=function(){ PoliceAI.active=false; Police.wanted=0; $('wantedBox').style.display='none';
 PoliceAI.cars.forEach(c=>c.position.set(9999,9999,9999)); };
PoliceAI.update=function(dt,playerPos){
 if(!PoliceAI.active) return;
 let caught=false;
 PoliceAI.cars.forEach(car=>{
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
  World.enterInterior('prison',Player.camera,outsidePos);
  UI.refreshHUD();
 }
};
