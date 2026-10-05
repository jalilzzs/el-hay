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
 if(isGun){ Audio.gunshot(id); if(typeof Crime!=='undefined') Crime.gunfire(id); }
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
  Prison.arrest(Player.camera,outsidePos); /* fine/sentence scale with the crime (see Prison hooks) */
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


/* =====================================================================
 * Justice system: Crime (witnesses -> wanted stars), Police response,
 * Expulsion (thrown out of buildings / fired from jobs), Prison (sentence,
 * bail, confiscation). Hooks into NPCPool damage/kill, Weapons.fire,
 * World.enterInterior, Police.addWanted and Prison.arrest.
 * ===================================================================== */
const Crime={
 record:{kills:0,assaults:0,illegalShots:0},
 peak:0,coolT:0,
 _assaultAt:new WeakMap(),_shotAt:0,_cars:new Map(),_wantedInside:0,_stormT:0
};

Crime.say=function(t,ms){
 let el=document.getElementById('crimeToast');
 if(!el){
  el=document.createElement('div'); el.id='crimeToast';
  el.style.cssText='position:fixed;top:max(96px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:460;max-width:88vw;text-align:center;padding:9px 16px;border-radius:14px;border:1.5px solid var(--border,rgba(255,107,0,.35));background:var(--glass-bg,rgba(15,20,28,.8));backdrop-filter:blur(10px);color:#fff;font:700 13px/1.4 Cairo,system-ui,sans-serif;pointer-events:none;display:none;box-shadow:0 6px 16px rgba(0,0,0,.6)';
  document.body.appendChild(el);
 }
 el.textContent=t; el.style.display='block';
 clearTimeout(Crime._toastT); Crime._toastT=setTimeout(()=>{el.style.display='none';},ms||3200);
};

Crime.hasLicense=function(){ return typeof Docs!=='undefined'&&Docs.has&&Docs.has('gunLicense'); };

/* anyone who could report the crime: other living NPCs nearby, or a police car close by */
Crime.witnesses=function(pos,ignore,r){
 r=r||28; let c=0;
 for(const m of NPCPool.pool){
  if(m===ignore||!m.active||m.dead||!m.mesh.visible) continue;
  if(m.mesh.position.distanceTo(pos)<r) c++;
 }
 if(PoliceAI.active) for(const car of PoliceAI.cars) if(car.visible&&car.position.distanceTo(pos)<r*1.6) c+=2;
 return c;
};

Crime.assault=function(n){
 const now=performance.now();
 if(Crime._assaultAt.get(n)&&now-Crime._assaultAt.get(n)<20000) return;
 Crime._assaultAt.set(n,now);
 Crime.record.assaults++;
 if(Crime.witnesses(n.mesh.position,n)>0&&Police.wanted<1){
  Police.addWanted(1); Crime.say('🚨 Witnesses reported the assault');
 }
};

Crime.kill=function(n){
 Crime.record.kills++;
 const w=Crime.witnesses(n.mesh.position,n);
 if(w>0){
  Police.addWanted(n.relationshipId?3:2);
  Crime.say('🚨 Murder reported — police are coming');
 } else if(Math.random()<0.4){
  Police.addWanted(1); Crime.say('🚨 Someone found the body');
 }
};

Crime.gunfire=function(id){
 if(World.activeInterior){
  if(Expulsion.isPublic(World.activeInterior)) Expulsion.expel('firing',World.activeInterior);
  return;
 }
 if(Crime.hasLicense()) return;
 Crime.record.illegalShots++;
 const now=performance.now();
 if(now-Crime._shotAt>15000&&Crime.witnesses(Player.camera.position,null,34)>0){
  Crime._shotAt=now;
  Police.addWanted(1); Crime.say('🚨 Unlicensed gunfire — someone called the police');
 }
};

/* wanted level bookkeeping */
(function(){
 const orig=Police.addWanted;
 Police.addWanted=function(n){
  orig(n);
  if(n>0){ Crime.coolT=0; Crime.peak=Math.max(Crime.peak,Police.wanted); }
 };
})();

Crime.update=function(dt){
 if(Prison.sentenced){ Crime.coolT=0; return; }
 Expulsion.update(dt);
 if(Police.wanted<=0) return;
 const ppos=Player.camera.position;
 const inside=!!World.activeInterior;

 /* police cars: gunfire at 3+ stars */
 let nearest=1e9;
 if(PoliceAI.active){
  for(const car of PoliceAI.cars){
   if(!car.visible) continue;
   const d=Math.hypot(car.position.x-(inside?NPCPool.outPos.x:ppos.x),car.position.z-(inside?NPCPool.outPos.z:ppos.z));
   nearest=Math.min(nearest,d);
   if(Police.wanted>=3&&!inside&&d<26){
    let t=(Crime._cars.get(car)||1.2)-dt;
    if(t<=0){
     t=1.4+Math.random()*0.8;
     Audio.gunshot('pistol');
     if(Math.random()<0.3){ Vitals.health=Math.max(0,Vitals.health-(5+Math.random()*5)); NPCPool.hurtFlash(); }
    }
    Crime._cars.set(car,t);
   }
  }
 }

 /* cooling off: stay away from police (hiding inside helps) */
 if(nearest>45||inside) Crime.coolT+=dt*(inside?2:1);
 else Crime.coolT=Math.max(0,Crime.coolT-dt);
 if(Crime.coolT>=40){
  Crime.coolT=0;
  Police.addWanted(-1);
  if(Police.wanted<=0){
   Crime.peak=0; PoliceAI.clear();
   Crime.say('✅ The police lost track of you');
  } else Crime.say('Wanted level dropped to '+Police.wanted+'★');
 }

 /* hiding indoors at 3+ stars: officers eventually storm the building */
 if(inside&&Police.wanted>=3&&World.activeInterior!=='prison'){
  Crime._stormT+=dt;
  if(Crime._stormT>25){
   Crime._stormT=0;
   Crime.say('👮 Police stormed the building!');
   World.exitInterior(Player.camera,outsidePos);
   Prison.arrest(Player.camera,outsidePos);
  }
 } else Crime._stormT=0;
};

/* ---------------- Expulsion ---------------- */
const Expulsion={bans:{},_inT:0};

Expulsion.isOwn=function(name){ return !!(Player.properties&&Player.properties.includes(name)); };
Expulsion.isPublic=function(name){
 return !(name==='prison'||/^police|cell/i.test(name||'')||Expulsion.isOwn(name)||name==='home');
};
Expulsion.armed=function(){
 const id=Weapons.id(), w=ARSENAL[id];
 return !!(w&&w.type==='gun');
};
Expulsion.remaining=function(name){
 const u=Expulsion.bans[name]; if(!u) return 0;
 const r=(u-performance.now())/1000; if(r<=0){ delete Expulsion.bans[name]; return 0; }
 return r;
};
Expulsion.expel=function(reason,name){
 if(!World.activeInterior||!Expulsion.isPublic(name||World.activeInterior)) return;
 const place=name||World.activeInterior;
 World.exitInterior(Player.camera,outsidePos);
 const secs=reason==='firing'?180:90;
 Expulsion.bans[place]=performance.now()+secs*1000;
 const why={firing:'Gunfire inside!',wanted:'Wanted criminals are not welcome.',armed:'Weapons are not allowed.'}[reason]||'You are not welcome.';
 Crime.say('🚫 Security threw you out. '+why+' Banned '+secs+'s');
 if(reason==='firing') Police.addWanted(1);
 if(typeof Jobs!=='undefined'&&Jobs.employed&&reason!=='armed'){
  Jobs.quit(); Crime.say('🚫 Thrown out and fired from your job.',3800);
 }
};
/* entering: block if banned / armed / wanted */
Expulsion.blocks=function(name){
 if(!Expulsion.isPublic(name)) return false;
 const r=Expulsion.remaining(name);
 if(r>0){ Crime.say('🚫 Banned from here for '+Math.ceil(r)+'s more'); return true; }
 if(Expulsion.armed()){ Crime.say('🚫 Security: no weapons inside — holster it first (H)'); return true; }
 if(Police.wanted>=2){ Crime.say('🚫 Doors locked — the police are looking for you'); return true; }
 return false;
};
Expulsion.update=function(dt){
 const n=World.activeInterior;
 if(n&&Expulsion.isPublic(n)){
  if(Police.wanted>=2) Expulsion._inT+=dt; else Expulsion._inT=0;
  if(Expulsion._inT>6){ Expulsion._inT=0; Expulsion.expel('wanted',n); }
 } else Expulsion._inT=0;
};

/* wrap interior entry */
(function(){
 const enter=World.enterInterior;
 World.enterInterior=function(name,camera,out){
  if(!World.activeInterior&&Expulsion.blocks(name)) return;
  return enter.call(World,name,camera,out);
 };
})();

/* ---------------- Prison hooks ---------------- */
(function(){
 const arrest=Prison.arrest, release=Prison.release;
 Prison.arrest=function(camera,out){
  const stars=Math.max(Police.wanted,Crime.peak,1);
  const rec=Crime.record;
  /* sentence, fine, bail scale with the crimes */
  const sentence=Math.min(150,25+stars*15+rec.kills*25+rec.assaults*3);
  const bail=300+stars*200+rec.kills*250;
  const fine=Math.min(Economy.cash,stars*100);
  Economy.cash-=fine;
  arrest(camera,out);
  Prison.timer=sentence; Prison.bailCost=bail;
  Prison._sentenceInfo={stars,sentence,bail,fine};
  /* confiscate illegal weapons */
  const lic=Crime.hasLicense();
  const all=rec.kills>0;
  const lost=[];
  Weapons.owned=Weapons.owned.filter(id=>{
   const w=ARSENAL[id];
   if(!w||id==='fists') return true;
   const take= all || (w.type==='gun'&&(!lic||stars>=4));
   if(take){ lost.push(w.name); delete Weapons.ammo[id]; delete Weapons.reserve[id]; }
   return !take;
  });
  Weapons.current=0; Weapons.reloading=false;
  /* lose the job */
  let msg='🚔 Arrested ('+stars+'★): '+sentence+'s in prison, fine $'+fine+', bail $'+bail+'.';
  if(typeof Jobs!=='undefined'&&Jobs.employed){ Jobs.quit(); msg+=' You were fired.'; }
  if(lost.length) msg+=' Confiscated: '+lost.join(', ')+'.';
  /* clean slate for the new sentence */
  Police.wanted=0; const box=document.getElementById('wantedBox'); if(box) box.style.display='none';
  PoliceAI.active=false; PoliceAI.cars.forEach(c=>{c.visible=false;c.position.set(9999,9999,9999);});
  Crime.peak=0; Crime.coolT=0; Crime._stormT=0;
  Expulsion.bans={};
  setTimeout(()=>{ Crime.say(msg,6500); },300);
  try{ Weapons.refreshHUD(); UI.refreshHUD(); }catch(_){}
 };
 Prison.release=function(){
  release();
  Crime.record={kills:0,assaults:0,illegalShots:0};
  Crime.say('🔓 You are free. Stay out of trouble.',3500);
 };
})();
