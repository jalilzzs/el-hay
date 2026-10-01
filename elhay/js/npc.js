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

NPCPool.update=function(playerPos,dt){
 let activeCount=0;

 for(const n of NPCPool.pool){

  if(!n.active) continue;

  activeCount++;

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

   slot.mesh.visible=true;
   slot.active=true;
   slot.health=100;
   slot.timer=0;
  }
 }
};

NPCPool.updateRelationshipNPC=function(n,playerPos,dt){

 if(!n.active) return;

 /*
  * Married spouse follows the player.
  */
 if(
  typeof Relationships!=='undefined' &&
  n.relationshipId &&
  Relationships.isSpouse &&
  Relationships.isSpouse(n.relationshipId)
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

  if(!n.active) continue;

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

NPCPool.react=function(n){

 if(!n) return;

 n.health-=25;

 const line=
  REACTIONS_HIT[
   Math.floor(
    Math.random()*
    REACTIONS_HIT.length
   )
  ];

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
   },1500);
 }

 n.dir=
  Math.random()*
  Math.PI*
  2;

 /*
  * Hitting a relationship NPC decreases affinity.
  */
 if(
  n.relationshipId &&
  typeof Relationships!=='undefined' &&
  Relationships.addAffinity
 ){

  Relationships.addAffinity(
   n.relationshipId,
   -3,
   'hit'
  );
 }

 if(n.health<=0){

  /*
   * Relationship NPCs should not permanently die.
   * Move them back to their normal spawn.
   */
  if(n.relationshipId){

   const def=n.relationshipDef;

   if(def&&def.spawn){

    n.mesh.position.set(
     def.spawn.x,
     0,
     def.spawn.z
    );
   }

   n.health=100;
   n.timer=0;

   return;
  }

  n.active=false;
  n.mesh.visible=false;
  n.mesh.position.set(
   9999,
   9999,
   9999
  );

  Police.addWanted(1);
 }
};

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
