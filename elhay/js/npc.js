/* ============ NPCPool: fixed-size object pool, recycled by distance (safe on low-RAM devices) ============ */
const NPCPool={size:22,spawnRadius:55,despawnRadius:75,pool:[]};
const GREETINGS=['Salam.','Ça va?','Watch yourself around here.','Nice day, no?','Haven\'t seen you before.'];
const REACTIONS_HIT=['Hey!','What was that for?!','Careful!'];

NPCPool.init=function(){
 for(let i=0;i<NPCPool.size;i++){
  const entry=spawnNPC(9999,9999); // parked far away = "despawned" state
  entry.mesh.visible=false; entry.active=false; entry.health=100;
  NPCPool.pool.push(entry);
 }
};

/* Recycle: find inactive pool slots and place them near the player at random offsets;
   deactivate ones that drifted too far. This is the "infinite" spawn — bounded memory, unbounded encounters. */
NPCPool.update=function(playerPos,dt){
 let activeCount=0;
 for(const n of NPCPool.pool){
  if(!n.active) continue;
  activeCount++;
  const d=playerPos.distanceTo(n.mesh.position);
  if(d>NPCPool.despawnRadius){ n.active=false; n.mesh.visible=false; n.mesh.position.set(9999,9999,9999); continue; }
  n.timer-=dt; if(n.timer<=0){ n.dir=Math.random()*Math.PI*2; n.timer=2+Math.random()*3; }
  n.mesh.position.x+=Math.sin(n.dir)*dt*1.2; n.mesh.position.z+=Math.cos(n.dir)*dt*1.2; n.mesh.rotation.y=n.dir;
  World.resolveCollision(n.mesh.position,0.35);
 }
 const wanted=Math.min(NPCPool.size,10);
 if(activeCount<wanted){
  const slot=NPCPool.pool.find(n=>!n.active);
  if(slot){
   const ang=Math.random()*Math.PI*2, dist=20+Math.random()*(NPCPool.spawnRadius-20);
   slot.mesh.position.set(playerPos.x+Math.sin(ang)*dist,0,playerPos.z+Math.cos(ang)*dist);
   slot.mesh.visible=true; slot.active=true; slot.health=100; slot.timer=0;
  }
 }
};

NPCPool.nearest=function(pos,maxDist){
 let best=null,bestD=maxDist;
 for(const n of NPCPool.pool){ if(!n.active) continue; const d=pos.distanceTo(n.mesh.position); if(d<bestD){bestD=d;best=n;} }
 return best;
};

/* Basic interactivity: greet on E, react/flee when hit by a weapon (see weapons.js) */
NPCPool.greet=function(n){
 const line=GREETINGS[Math.floor(Math.random()*GREETINGS.length)];
 UI.dom.prompt.textContent='💬 '+line; UI.dom.prompt.style.display='block';
 clearTimeout(NPCPool._greetTimeout);
 NPCPool._greetTimeout=setTimeout(()=>{ UI.dom.prompt.style.display='none'; },1500);
};
NPCPool.react=function(n){
 n.health-=25;
 const line=REACTIONS_HIT[Math.floor(Math.random()*REACTIONS_HIT.length)];
 UI.dom.prompt.textContent='💬 '+line; UI.dom.prompt.style.display='block';
 n.dir=Math.random()*Math.PI*2; // flee direction, roughly
 if(n.health<=0){ n.active=false; n.mesh.visible=false; n.mesh.position.set(9999,9999,9999); Police.addWanted(1); }
};
