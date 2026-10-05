/* ============ NPCPool: dynamic NPCs + relationship behavior ============ */

const NPCPool={
 size:22,
 spawnRadius:55,
 despawnRadius:75,
 pool:[]
};

const GREETINGS=[
 'Salam.',
 'Ça va?',
 'Watch yourself around here.',
 'Nice day, no?',
 'Haven\'t seen you before.'
];

const REACTIONS_HIT=[
 'Hey!',
 'What was that for?!',
 'Careful!'
];

NPCPool.init=function(){
 for(let i=0;i<NPCPool.size;i++){
  const entry=spawnNPC(9999,9999);

  entry.mesh.visible=false;
  entry.active=false;
  entry.health=100;
  entry.recruited=false;
  entry.relationshipId=null;
  entry.followingPlayer=false;
  entry.relationshipTimer=0;

  NPCPool.pool.push(entry);
 }

 NPCPool.assignRelationshipNPCs();
};

NPCPool.assignRelationshipNPCs=function(){
 if(typeof NPC_DEFS==='undefined') return;

 const defs=NPC_DEFS.filter(n=>n.id);

 for(let i=0;i<defs.length;i++){
  const def=defs[i];

  let entry=NPCPool.pool[i];

  if(!entry) break;

  entry.relationshipId=def.id;
  entry.relationshipDef=def;

  entry.active=true;
  entry.mesh.visible=true;
  entry.health=100;
  entry.recruited=false;
  entry.followingPlayer=false;

  const spawn=def.spawn||{x:0,z:0};

  entry.mesh.position.set(
   spawn.x,
   0,
   spawn.z
  );

  entry.dir=Math.random()*Math.PI*2;
  entry.timer=1+Math.random()*2;

  if(typeof World!=='undefined'){
   if(!World.relationshipNpcs) World.relationshipNpcs={};
   World.relationshipNpcs[def.id]=entry;
  }
 }
};

NPCPool.getRelationshipNPC=function(id){
 if(!id) return null;

 if(
  typeof World!=='undefined' &&
  World.relationshipNpcs &&
  World.relationshipNpcs[id]
 ){
  return World.relationshipNpcs[id];
 }

 return NPCPool.pool.find(
  n=>n.relationshipId===id
 )||null;
};

NPCPool.outPos=new THREE.Vector3(30,0,55);

NPCPool.update=function(rawPos,dt){
 /* inside a building the camera sits at y=50: keep NPCs working from the last outdoor position */
 const inside=!!World.activeInterior;
 if(!inside) NPCPool.outPos.copy(rawPos);
 const playerPos=inside?NPCPool.outPos:rawPos;
 NPCPool._inside=inside;
 let activeCount=0;
 Blood.update(dt);

 for(const n of NPCPool.pool){

  if(!n.active) continue;

  if(n.dead){ NPCPool.deadTick(n,dt); continue; }

  activeCount++;

  if(n.state&&n.state!=='idle'){ NPCPool.aiTick(n,playerPos,dt); continue; }

  /*
   * Relationship NPCs have permanent world positions
   * and are handled separately.
   */
  if(n.relationshipId){

   NPCPool.updateRelationshipNPC(n,playerPos,dt);

   continue;
  }

  if(n.recruited){
   NPCPool.updateFollower(n,playerPos,dt);
   continue;
  }

  const d=playerPos.distanceTo(n.mesh.position);

  if(d>NPCPool.despawnRadius){
   n.active=false;
   n.mesh.visible=false;
   n.mesh.position.set(9999,9999,9999);
   continue;
  }

  n.timer-=dt;

  if(n.timer<=0){
   n.dir=Math.random()*Math.PI*2;
   n.timer=2+Math.random()*3;
  }

  n.mesh.position.x+=Math.sin(n.dir)*dt*1.2;
  n.mesh.position.z+=Math.cos(n.dir)*dt*1.2;
  n.mesh.rotation.y=n.dir;

  World.resolveCollision(
   n.mesh.position,
   0.35
  );
 }

 const wanted=Math.min(
  NPCPool.size,
  10
 );

 if(activeCount<wanted){

  const slot=NPCPool.pool.find(
   n=>!n.active&&!n.relationshipId
  );

  if(slot){

   const ang=Math.random()*Math.PI*2;
   const dist=20+Math.random()*(NPCPool.spawnRadius-20);

   slot.mesh.position.set(
    playerPos.x+Math.sin(ang)*dist,
    0,
    playerPos.z+Math.cos(ang)*dist
   );

   NPCPool.resetCombat(slot);
   slot.mesh.visible=true;
   slot.active=true;
   slot.health=100;
   slot.timer=0;
  }
 }
};

NPCPool.updateRelationshipNPC=function(n,playerPos,dt){

 if(!n.active) return;

 /* Married spouse: follows, rides along, lives at home */
 if(
  typeof Relationships!=='undefined' &&
  n.relationshipId &&
  Relationships.isSpouse &&
  Relationships.isSpouse(n.relationshipId)
 ){
  NPCPool.updateSpouse(n,playerPos,dt);
  return;
 }

 /*
  * Player manually follows this NPC.
  */
 if(
  typeof Relationships!=='undefined' &&
  Relationships.isFollowing &&
  Relationships.isFollowing(n.relationshipId)
 ){

  NPCPool.followPlayer(
   n,
   playerPos,
   dt,
   2.8
  );

  return;
 }

 /*
  * Normal relationship NPC wandering.
  */
 const d=playerPos.distanceTo(
  n.mesh.position
 );

 if(d>NPCPool.despawnRadius){

  const def=n.relationshipDef;

  if(def&&def.spawn){
   n.mesh.position.set(
    def.spawn.x,
    0,
    def.spawn.z
   );
  }

  return;
 }

 n.timer-=dt;

 if(n.timer<=0){

  n.dir=Math.random()*Math.PI*2;

  n.timer=
   3+
   Math.random()*4;
 }

 n.mesh.position.x+=
  Math.sin(n.dir)*
  dt*
  0.65;

 n.mesh.position.z+=
  Math.cos(n.dir)*
  dt*
  0.65;

 n.mesh.rotation.y=n.dir;

 World.resolveCollision(
  n.mesh.position,
  0.35
 );
};

NPCPool.followPlayer=function(
 n,
 playerPos,
 dt,
 distance
){

 const dx=playerPos.x-n.mesh.position.x;
 const dz=playerPos.z-n.mesh.position.z;

 const d=Math.sqrt(
  dx*dx+
  dz*dz
 );

 if(d<distance){
  return;
 }

 const speed=
  d>12
   ?3.0
   :2.2;

 n.mesh.position.x+=
  (dx/d)*
  speed*
  dt;

 n.mesh.position.z+=
  (dz/d)*
  speed*
  dt;

 n.mesh.rotation.y=
  Math.atan2(dx,dz);

 World.resolveCollision(
  n.mesh.position,
  0.35
 );
};

NPCPool.nearest=function(pos,maxDist){

 let best=null;
 let bestD=maxDist;

 for(const n of NPCPool.pool){

  if(!n.active||!n.mesh.visible||n.dead) continue;

  const d=
   pos.distanceTo(
    n.mesh.position
   );

  if(d<bestD){
   bestD=d;
   best=n;
  }
 }

 return best;
};

NPCPool.nearestRelationship=function(
 pos,
 maxDist
){

 let best=null;
 let bestD=maxDist;

 for(const n of NPCPool.pool){

  if(!n.active||!n.relationshipId){
   continue;
  }

  const d=
   pos.distanceTo(
    n.mesh.position
   );

  if(d<bestD){
   bestD=d;
   best=n;
  }
 }

 return best;
};

NPCPool.greet=function(n){

 if(!n) return;

 let line;

 if(n.relationshipId){

  const def=
   typeof Relationships!=='undefined' &&
   Relationships.getDef
    ? Relationships.getDef(n.relationshipId)
    : null;

  if(def){

   const state=
    typeof Relationships!=='undefined' &&
    Relationships.get
     ? Relationships.get(n.relationshipId)
     : null;

   const affinity=
    state
     ? state.affinity
     : 0;

   if(
    typeof Relationships!=='undefined' &&
    Relationships.isSpouse &&
    Relationships.isSpouse(n.relationshipId)
   ){

    line=
     '❤️ '+def.name+
     ': I\'m glad you\'re here.';

   }else if(affinity>=80){

    line=
     '❤️ '+def.name+
     ': Hey, I missed you.';

   }else if(affinity>=40){

    line=
     def.name+
     ': Hey! Nice to see you.';

   }else{

    line=
     def.name+
     ': Salam.';
   }
  }else{

   line=
    GREETINGS[
     Math.floor(
      Math.random()*GREETINGS.length
     )
    ];
  }

 }else if(n.recruited){

  line="Ready when you are.";

 }else if(Gang.members.length<Gang.max){

  Gang.recruit(n);
  line="Alright, I'm with you.";

 }else{

  line=
   GREETINGS[
    Math.floor(
     Math.random()*GREETINGS.length
    )
   ]+
   ' (crew is full)';
 }

 if(
  UI &&
  UI.dom &&
  UI.dom.prompt
 ){

  UI.dom.prompt.textContent=
   '💬 '+line;

  UI.dom.prompt.style.display=
   'block';

  clearTimeout(
   NPCPool._greetTimeout
  );

  NPCPool._greetTimeout=
   setTimeout(()=>{
    UI.dom.prompt.style.display=
     'none';
   },1800);
 }
};

NPCPool.talkRelationship=function(n){

 if(
  !n||
  !n.relationshipId||
  typeof Relationships==='undefined'
 ){
  return false;
 }

 if(
  typeof Phone!=='undefined' &&
  Phone.open
 ){

  Phone.openApp(
   'contacts'
  );

  return true;
 }

 const def=
  Relationships.getDef
   ? Relationships.getDef(
      n.relationshipId
     )
   : null;

 if(!def) return false;

 const state=
  Relationships.get
   ? Relationships.get(
      n.relationshipId
     )
   : null;

 const affinity=
  state
   ? state.affinity
   : 0;

 let line;

 if(
  Relationships.isSpouse &&
  Relationships.isSpouse(
   n.relationshipId
  )
 ){

  line=
   '❤️ '+def.name+
   ' is your wife.';

 }else if(affinity>=80){

  line=
   def.name+
   ' seems very interested in you.';

 }else if(affinity>=40){

  line=
   def.name+
   ' likes talking with you.';

 }else{

  line=
   def.name+
   ' is getting to know you.';
 }

 if(
  UI &&
  UI.dom &&
  UI.dom.prompt
 ){

  UI.dom.prompt.textContent=
   '💬 '+line;

  UI.dom.prompt.style.display=
   'block';

  clearTimeout(
   NPCPool._greetTimeout
  );

  NPCPool._greetTimeout=
   setTimeout(()=>{
    UI.dom.prompt.style.display=
     'none';
   },1800);
 }

 return true;
};

/* ============ Blood: spray particles + ground pools (stylised, small pooled meshes) ============ */
const Blood={parts:[],pools:[],_pi:0,ready:false};
Blood.init=function(){
 if(Blood.ready||!World.scene) return;
 Blood.ready=true;
 const pg=new THREE.BoxGeometry(0.07,0.07,0.07);
 const pm=new THREE.MeshBasicMaterial({color:0xb00000});
 for(let i=0;i<70;i++){
  const m=new THREE.Mesh(pg,pm); m.visible=false; World.scene.add(m);
  Blood.parts.push({m,v:new THREE.Vector3(),life:0});
 }
 const cg=new THREE.CircleGeometry(1,14);
 for(let i=0;i<14;i++){
  const m=new THREE.Mesh(cg,new THREE.MeshBasicMaterial({color:0x6e0000,transparent:true,opacity:0.9,depthWrite:false}));
  m.rotation.x=-Math.PI/2; m.visible=false; m.renderOrder=2; World.scene.add(m);
  Blood.pools.push({m,age:0,max:0,size:0});
 }
};
Blood.spray=function(pos,dir,count){
 Blood.init();
 let k=0;
 for(const p of Blood.parts){
  if(p.life>0) continue;
  p.life=0.5+Math.random()*0.5;
  p.m.visible=true;
  p.m.position.copy(pos);
  p.v.set((Math.random()-.5)*3+(dir?dir.x*2:0),Math.random()*3+0.5,(Math.random()-.5)*3+(dir?dir.z*2:0));
  if(++k>=count) break;
 }
};
Blood.pool=function(x,z,size){
 Blood.init();
 const p=Blood.pools[Blood._pi++%Blood.pools.length];
 p.age=0; p.max=45; p.size=size||0.9;
 p.m.position.set(x,0.04+(Blood._pi%5)*0.002,z);
 p.m.scale.set(0.1,0.1,0.1); p.m.material.opacity=0.9; p.m.visible=true;
};
Blood.update=function(dt){
 if(!Blood.ready) return;
 for(const p of Blood.parts){
  if(p.life<=0) continue;
  p.life-=dt; p.v.y-=9*dt;
  p.m.position.addScaledVector(p.v,dt);
  if(p.m.position.y<0.03||p.life<=0){
   if(p.life>0&&Math.random()<0.25&&Blood.small) Blood.small(p.m.position);
   p.life=0; p.m.visible=false;
  }
 }
 for(const q of Blood.pools){
  if(!q.m.visible) continue;
  q.age+=dt;
  const s=q.size*Math.min(1,q.age/2.5);
  q.m.scale.set(s,s,s);
  if(q.age>q.max-5) q.m.material.opacity=Math.max(0,0.9*(q.max-q.age)/5);
  if(q.age>=q.max) q.m.visible=false;
 }
};

/* ============ NPC combat: damage, death, reactions ============ */
NPCPool.say=function(t,ms){
 if(!(UI&&UI.dom&&UI.dom.prompt)) return;
 UI.dom.prompt.textContent='💬 '+t; UI.dom.prompt.style.display='block';
 clearTimeout(NPCPool._greetTimeout);
 NPCPool._greetTimeout=setTimeout(()=>{UI.dom.prompt.style.display='none';},ms||1500);
};

NPCPool.resetCombat=function(n){
 n.dead=false; n.state='idle'; n.stateT=0; n.pers=null; n.shootT=0; n.hitT=0;
 n.mesh.rotation.x=0; n.mesh.rotation.z=0; n.mesh.scale.y=1;
 if(n.gunMesh) n.gunMesh.visible=false;
};

NPCPool.rollPers=function(n){
 const r=Math.random();
 if(n.relationshipId) return r<0.6?'flee':'hide';
 return r<0.30?'flee':r<0.55?'hide':r<0.80?'fight':'shoot';
};

NPCPool.hurtFlash=function(){
 let f=document.getElementById('hitFlash');
 if(!f){
  f=document.createElement('div'); f.id='hitFlash';
  f.style.cssText='position:fixed;inset:0;background:radial-gradient(transparent 40%,rgba(200,0,0,.55));pointer-events:none;z-index:450;opacity:0;transition:opacity .35s';
  document.body.appendChild(f);
 }
 f.style.transition='none'; f.style.opacity='1';
 requestAnimationFrame(()=>requestAnimationFrame(()=>{f.style.transition='opacity .45s'; f.style.opacity='0';}));
};

/* find a spot behind the nearest building, away from the threat */
NPCPool.coverSpot=function(n,from){
 const p=n.mesh.position; let best=null,bd=35;
 for(const b of World.collidables){
  const sx=b.max.x-b.min.x, sz=b.max.z-b.min.z;
  if(sx>45||sz>45||b.max.y<1.5) continue;
  const cx=(b.min.x+b.max.x)/2, cz=(b.min.z+b.max.z)/2;
  const d=Math.hypot(cx-p.x,cz-p.z);
  if(d<bd){ bd=d; best={cx,cz,hx:sx/2,hz:sz/2}; }
 }
 if(!best) return null;
 let dx=best.cx-from.x, dz=best.cz-from.z; const l=Math.hypot(dx,dz)||1; dx/=l; dz/=l;
 const ext=Math.max(best.hx,best.hz)+1.4;
 return new THREE.Vector3(best.cx+dx*ext,0,best.cz+dz*ext);
};

NPCPool.setState=function(n,st,t){
 n.state=st; n.stateT=t||0;
 if(st==='shoot'){
  if(!n.gunMesh){
   n.gunMesh=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.12,0.3),new THREE.MeshBasicMaterial({color:0x111111}));
   n.gunMesh.position.set(0.3,1.1,0.28); n.mesh.add(n.gunMesh);
  }
  n.gunMesh.visible=true;
 } else if(n.gunMesh) n.gunMesh.visible=false;
 if(st!=='hiding') n.mesh.scale.y=1;
};

/* damage from the player. opts:{point:Vector3, dir:Vector3, melee:bool} */
NPCPool.damage=function(n,dmg,opts){
 if(!n||n.dead) return;
 opts=opts||{};
 const pp=n.mesh.position;
 const headshot=opts.point&&opts.point.y>pp.y+1.36&&!opts.melee;
 if(headshot) dmg*=2;
 n.health-=dmg;
 const pt=opts.point?opts.point.clone():new THREE.Vector3(pp.x,pp.y+1.2,pp.z);
 Blood.spray(pt,opts.dir,opts.melee?6:12);
 Audio.hurt();
 if(!n.pers) n.pers=NPCPool.rollPers(n);

 if(n.relationshipId&&typeof Relationships!=='undefined'&&Relationships.addAffinity)
  Relationships.addAffinity(n.relationshipId,-3,'hit');

 if(n.health<=0){ NPCPool.kill(n,headshot); return; }

 const ppos=Player.camera.position;
 const isSpouse=n.relationshipId&&typeof Relationships!=='undefined'&&Relationships.isSpouse&&Relationships.isSpouse(n.relationshipId);
 if(!isSpouse){
  switch(n.pers){
   case 'fight': NPCPool.setState(n,'attack',20); NPCPool.say('You\'re dead!'); break;
   case 'shoot': NPCPool.setState(n,'shoot',25); NPCPool.say('You picked the wrong guy!'); break;
   case 'hide':
    n.cover=NPCPool.coverSpot(n,ppos);
    NPCPool.setState(n,n.cover?'tocover':'hiding',n.cover?6:10);
    NPCPool.say('Help! Someone call the police!'); break;
   default: NPCPool.setState(n,'flee',9); NPCPool.say('Help!');
  }
 } else NPCPool.say('Ow! Why?!');
 if(opts.gun) NPCPool.alertNear(pp,opts.alertR||24,n);
};

NPCPool.kill=function(n,headshot){
 n.dead=true; n.health=0; n.state='dead'; n.deadT=0; n.fallT=0;
 if(n.gunMesh) n.gunMesh.visible=false;
 n.mesh.scale.y=1;
 Audio.thud();
 const p=n.mesh.position;
 Blood.spray(new THREE.Vector3(p.x,p.y+1.1,p.z),null,headshot?20:14);
 Blood.pool(p.x,p.z,0.9+Math.random()*0.5);
 if(typeof Police!=='undefined'&&Police.addWanted) Police.addWanted(n.relationshipId?2:1);
 if(n.relationshipId&&typeof Relationships!=='undefined'&&Relationships.addAffinity)
  Relationships.addAffinity(n.relationshipId,-40,'killed');
 NPCPool.alertNear(p,26,n,true);
};

/* witnesses: gunfire or a killing scares nearby NPCs */
NPCPool.alertNear=function(pos,r,except,killed){
 const ppos=Player.camera.position;
 for(const m of NPCPool.pool){
  if(m===except||!m.active||m.dead||(m.state&&m.state!=='idle')) continue;
  if(m.recruited) continue;
  if(m.relationshipId&&typeof Relationships!=='undefined'&&Relationships.isSpouse&&Relationships.isSpouse(m.relationshipId)) continue;
  if(m.mesh.position.distanceTo(pos)>r) continue;
  if(!m.pers) m.pers=NPCPool.rollPers(m);
  if(m.pers==='hide'){
   m.cover=NPCPool.coverSpot(m,ppos);
   NPCPool.setState(m,m.cover?'tocover':'hiding',m.cover?6:10);
  } else if(m.pers==='shoot'&&killed){
   NPCPool.setState(m,'shoot',25);
  } else if(m.pers==='fight'&&!killed){
   NPCPool.setState(m,'flee',6);
  } else NPCPool.setState(m,'flee',8);
 }
};

NPCPool.deadTick=function(n,dt){
 n.deadT+=dt;
 if(n.fallT<0.45){
  n.fallT+=dt;
  const k=Math.min(1,n.fallT/0.45);
  n.mesh.rotation.x=-Math.PI/2*k;
  n.mesh.position.y=0.18*k;
 }
 const lifetime=n.relationshipId?25:30;
 if(n.deadT>lifetime){
  n.mesh.position.y=0;
  NPCPool.resetCombat(n);
  n.health=100;
  if(n.relationshipId){
   const def=n.relationshipDef;
   if(def&&def.spawn) n.mesh.position.set(def.spawn.x,0,def.spawn.z);
  } else {
   n.active=false; n.mesh.visible=false; n.mesh.position.set(9999,9999,9999);
  }
 }
};

NPCPool._moveTo=function(n,tx,tz,speed,dt){
 const p=n.mesh.position, dx=tx-p.x, dz=tz-p.z, d=Math.hypot(dx,dz);
 if(d<0.01) return 0;
 p.x+=dx/d*speed*dt; p.z+=dz/d*speed*dt;
 n.mesh.rotation.y=Math.atan2(dx,dz);
 World.resolveCollision(p,0.35);
 return d;
};

NPCPool.npcShoot=function(n,ppos){
 const p=n.mesh.position, d=Math.hypot(ppos.x-p.x,ppos.z-p.z);
 if(d<45) Audio.gunshot('pistol');
 /* tracer */
 if(!NPCPool._tracer){
  const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,1)]);
  NPCPool._tracer=new THREE.Line(g,new THREE.LineBasicMaterial({color:0xffd070}));
  NPCPool._tracer.visible=false; World.scene.add(NPCPool._tracer);
 }
 const tr=NPCPool._tracer, from=new THREE.Vector3(p.x,1.2,p.z);
 const to=new THREE.Vector3(ppos.x+(Math.random()-.5)*1.4,Math.max(0.3,ppos.y-0.5),ppos.z+(Math.random()-.5)*1.4);
 const pos=tr.geometry.attributes.position;
 pos.setXYZ(0,from.x,from.y,from.z); pos.setXYZ(1,to.x,to.y,to.z); pos.needsUpdate=true;
 tr.visible=true; clearTimeout(NPCPool._trT); NPCPool._trT=setTimeout(()=>{tr.visible=false;},70);
 const chance=(Player.mode==='drive'?0.2:0.4)*(d>14?0.6:1);
 if(Math.random()<chance&&!World.activeInterior&&typeof Vitals!=='undefined'){
  Vitals.health=Math.max(0,Vitals.health-(6+Math.random()*5));
  NPCPool.hurtFlash();
 }
};

NPCPool.aiTick=function(n,ppos,dt){
 const p=n.mesh.position;
 const dx=ppos.x-p.x, dz=ppos.z-p.z, d=Math.hypot(dx,dz)||0.001;
 n.stateT-=dt;
 if(d>NPCPool.despawnRadius*1.2&&!n.relationshipId){
  NPCPool.resetCombat(n); n.active=false; n.mesh.visible=false; n.mesh.position.set(9999,9999,9999); return;
 }
 switch(n.state){
  case 'flee': {
   const l=d; NPCPool._moveTo(n,p.x-dx/l*10,p.z-dz/l*10,4.6,dt);
   if(n.stateT<=0||d>45) NPCPool.setState(n,'idle'); break;
  }
  case 'tocover': {
   if(!n.cover){ NPCPool.setState(n,'hiding',10); break; }
   const rem=NPCPool._moveTo(n,n.cover.x,n.cover.z,4.8,dt);
   if(rem<1.2||n.stateT<=0) NPCPool.setState(n,'hiding',8+Math.random()*6);
   break;
  }
  case 'hiding': {
   n.mesh.scale.y=0.62; /* crouch */
   if(d<4&&n.pers!=='shoot'){ NPCPool.setState(n,'flee',6); break; } /* player walked up on them */
   if(n.stateT<=0){ n.mesh.scale.y=1; NPCPool.setState(n,'idle'); }
   break;
  }
  case 'attack': {
   if(d>1.3) NPCPool._moveTo(n,ppos.x,ppos.z,3.6,dt);
   else {
    n.mesh.rotation.y=Math.atan2(dx,dz);
    n.hitT-=dt;
    if(n.hitT<=0&&Player.mode==='walk'&&!World.activeInterior){
     n.hitT=1.0; Audio.melee(true);
     Vitals.health=Math.max(0,Vitals.health-(5+Math.random()*4)); NPCPool.hurtFlash();
    }
   }
   if(n.stateT<=0||d>40) NPCPool.setState(n,'idle');
   break;
  }
  case 'shoot': {
   n.mesh.rotation.y=Math.atan2(dx,dz);
   if(d>14) NPCPool._moveTo(n,ppos.x,ppos.z,3.0,dt);
   else if(d<6) NPCPool._moveTo(n,p.x-dx/d*5,p.z-dz/d*5,3.0,dt);
   n.shootT-=dt;
   if(n.shootT<=0&&d<38&&!World.activeInterior){
    n.shootT=1.1+Math.random()*1.0; NPCPool.npcShoot(n,ppos);
   }
   if(n.stateT<=0||d>50) NPCPool.setState(n,'idle');
   break;
  }
  default: NPCPool.setState(n,'idle');
 }
};

/* legacy entry point (kept for other callers): a light hit */
NPCPool.react=function(n,dmg,opts){ NPCPool.damage(n,dmg||25,opts); };

NPCPool.setFollow=function(
 npcId,
 enabled
){

 const n=
  NPCPool.getRelationshipNPC(
   npcId
  );

 if(!n) return false;

 if(
  typeof Relationships==='undefined'
 ){
  return false;
 }

 if(enabled){

  if(
   typeof Relationships.follow===
   'function'
  ){

   const ok=
    Relationships.follow(
     npcId
    );

   if(ok!==false){

    n.followingPlayer=true;

    return true;
   }
  }

 }else{

  if(
   typeof Relationships.stopFollow===
   'function'
  ){

   Relationships.stopFollow(
    npcId
   );

   n.followingPlayer=false;

   return true;
  }
 }

 return false;
};

/*
 * Used by the interaction system.
 */
NPCPool.interact=function(n){

 if(!n) return false;

 if(n.relationshipId){

  return NPCPool.talkRelationship(
   n
  );
 }

 NPCPool.greet(n);

 return true;
};


/* ---- Spouse behaviour ---- */
NPCPool.spouseFigure=null;

NPCPool.updateSpouse=function(n,pp,dt){
 const id=n.relationshipId;
 const def=n.relationshipDef||Relationships.getDef(id);
 const follow=Relationships.isFollowing(id);
 const inside=NPCPool._inside;
 const driving=(typeof Player!=='undefined'&&Player.mode==='drive');
 const res=Relationships.residence();
 const hour=World.dayNight?World.dayNight.time:12;
 const night=hour>=22||hour<6;

 /* interior figure: she lives in the player's house */
 if(!NPCPool.spouseFigure&&typeof DrivingTest!=='undefined'){
  NPCPool.spouseFigure=DrivingTest.ped(0xc0568a);
  NPCPool.spouseFigure.visible=false;
 }
 const fig=NPCPool.spouseFigure;
 const inHome=inside&&World.activeInterior===res;
 if(fig){
  const room=World.interiors[res];
  if(room&&fig.parent!==room){room.add(fig);fig.position.set(3.4,-2.5,-0.8);}
  const show=inHome&&!(night&&false);
  if(show&&!fig.visible&&def)
   Jobs.msg('❤️ '+def.name+': Welcome home!');
  fig.visible=show;
 }

 const wasHidden=n.spouseHidden;

 if(follow){
  if(inside||driving){
   n.mesh.visible=false;
   n.spouseHidden=true;
   n.mesh.position.set(pp.x,0,pp.z);
   return;
  }
  if(wasHidden){
   n.mesh.visible=true;
   n.spouseHidden=false;
   n.mesh.position.set(pp.x+1.5,0,pp.z+1.5);
  }
  n.mesh.visible=true;
  NPCPool.followPlayer(n,pp,dt,2.8);
  if(pp.distanceTo(n.mesh.position)>40)
   n.mesh.position.set(pp.x+2,0,pp.z+2);
  return;
 }

 /* stays at home: walks to the door and spends the day around it, sleeps at night */
 const poi=World.pois.find(p=>p.id===res&&!p.dyn);
 if(!poi)return;
 if(night||inside){
  n.mesh.visible=false;
  n.spouseHidden=true;
  n.mesh.position.set(poi.pos.x,0,poi.pos.z);
  return;
 }
 if(wasHidden){
  n.mesh.visible=true;
  n.spouseHidden=false;
 }
 n.mesh.visible=true;
 const d=Math.hypot(poi.pos.x-n.mesh.position.x,poi.pos.z-n.mesh.position.z);
 if(d>60){
  n.mesh.position.set(poi.pos.x+1.5,0,poi.pos.z+1.5);
 }else if(d>4){
  n.mesh.position.x+=(poi.pos.x-n.mesh.position.x)/d*2.2*dt;
  n.mesh.position.z+=(poi.pos.z-n.mesh.position.z)/d*2.2*dt;
  n.mesh.rotation.y=Math.atan2(poi.pos.x-n.mesh.position.x,poi.pos.z-n.mesh.position.z);
 }else{
  n.timer-=dt;
  if(n.timer<=0){n.dir=Math.random()*Math.PI*2;n.timer=3+Math.random()*3;}
  n.mesh.position.x+=Math.sin(n.dir)*dt*0.5;
  n.mesh.position.z+=Math.cos(n.dir)*dt*0.5;
  n.mesh.rotation.y=n.dir;
 }
};
