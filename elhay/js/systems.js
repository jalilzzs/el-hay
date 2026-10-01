/* ============ Systems: Vitals, Economy, Relationships, Vehicles, Police/License ============ */

/* ---- Property tiers ---- */
const PROPERTY_TIERS={
 home:{name:'Home',sleepHealth:false,regen:0},
 studio:{name:'Studio Apartment',sleepHealth:false,regen:0},
 flat2:{name:'2-Room Flat',sleepHealth:true,regen:0},
 villa:{name:'Villa',sleepHealth:true,regen:3},
};

/* ---- Vitals ---- */
const Vitals={health:100,energy:100,hunger:100,thirst:100,hygiene:100};

Vitals.update=function(dt){
 Vitals.hunger=Math.max(0,Vitals.hunger-0.15*dt);
 Vitals.thirst=Math.max(0,Vitals.thirst-0.2*dt);
 Vitals.energy=Math.max(0,Vitals.energy-0.08*dt);
 Vitals.hygiene=Math.max(0,Vitals.hygiene-0.05*dt);

 if(Vitals.hunger<=0)
  Vitals.health=Math.max(0,Vitals.health-0.3*dt);

 if(Vitals.thirst<=0)
  Vitals.health=Math.max(0,Vitals.health-0.5*dt);

 if(Vitals.hunger>40&&Vitals.thirst>40&&Vitals.health<100)
  Vitals.health=Math.min(100,Vitals.health+0.05*dt);

 const tier=PROPERTY_TIERS[World.activeInterior];

 if(tier&&tier.regen)
  Vitals.health=Math.min(100,Vitals.health+tier.regen*dt);
};

Vitals.speedFactor=function(){
 return Vitals.energy<25?0.55:(Vitals.energy<50?0.8:1);
};

Vitals.sleep=function(){
 Vitals.energy=100;
 Vitals.hunger=Math.max(0,Vitals.hunger-15);
 Vitals.thirst=Math.max(0,Vitals.thirst-10);
 Vitals.hygiene=Math.max(0,Vitals.hygiene-10);

 const tier=PROPERTY_TIERS[World.activeInterior];

 if(tier&&tier.sleepHealth)
  Vitals.health=100;

 World.dayNight.time=(World.dayNight.time+8)%24;
};

Vitals.useToilet=function(){
 Vitals.hygiene=100;
};

Vitals.applyItem=function(effect){
 if(effect.hunger)
  Vitals.hunger=Math.min(100,Vitals.hunger+effect.hunger);

 if(effect.thirst)
  Vitals.thirst=Math.min(100,Vitals.thirst+effect.thirst);

 if(effect.hygiene)
  Vitals.hygiene=Math.min(100,Vitals.hygiene+effect.hygiene);
};

Vitals.refreshHUD=function(){
 $('vHealth').style.width=Vitals.health+'%';
 $('vEnergy').style.width=Vitals.energy+'%';
 $('vHunger').style.width=Vitals.hunger+'%';
 $('vThirst').style.width=Vitals.thirst+'%';
 $('vHygiene').style.width=Vitals.hygiene+'%';
};


/* ---- Economy / Inventory ---- */
const ITEMS={
 water:{
  id:'water',
  name:'Water Bottle',
  price:20,
  effect:{thirst:35}
 },

 sandwich:{
  id:'sandwich',
  name:'Sandwich (Kesra)',
  price:40,
  effect:{hunger:35}
 },

 coffee:{
  id:'coffee',
  name:'Coffee',
  price:30,
  effect:{thirst:15,energy:10}
 },

 soap:{
  id:'soap',
  name:'Soap',
  price:15,
  effect:{hygiene:40}
 },

 flowers:{
  id:'flowers',
  name:'Flowers (gift)',
  price:60,
  effect:{}
 },

 gift:{
  id:'gift',
  name:'Gift',
  price:120,
  effect:{}
 }
};

const Economy={
 cash:500,
 inventory:[]
};

Economy.buy=function(itemId){
 const item=ITEMS[itemId];

 if(!item||Economy.cash<item.price)
  return false;

 Economy.cash-=item.price;

 const line=Economy.inventory.find(i=>i.id===itemId);

 if(line)
  line.qty++;
 else
  Economy.inventory.push({
   id:itemId,
   qty:1
  });

 return true;
};

Economy.useItem=function(itemId){
 const line=Economy.inventory.find(i=>i.id===itemId);

 if(!line)
  return false;

 const item=ITEMS[itemId];

 if(!item)
  return false;

 Vitals.applyItem(item.effect||{});

 line.qty--;

 if(line.qty<=0){
  Economy.inventory=
   Economy.inventory.filter(i=>i.id!==itemId);
 }

 return true;
};

Economy.sellItem=function(itemId){
 const line=Economy.inventory.find(i=>i.id===itemId);

 if(!line)
  return false;

 const item=ITEMS[itemId];

 if(!item)
  return false;

 Economy.cash+=Math.round(item.price*0.5);

 line.qty--;

 if(line.qty<=0){
  Economy.inventory=
   Economy.inventory.filter(i=>i.id!==itemId);
 }

 return true;
};


/* ============================================================
   RELATIONSHIPS / DATING / MARRIAGE / FAMILY
   ============================================================ */

const NPC_DEFS=[
 {
  id:'yasmine',
  name:'Yasmine',
  gender:'female',
  role:'cafe',
  spawn:{x:2,z:-38}
 },

 {
  id:'sofia',
  name:'Sofia',
  gender:'female',
  role:'neighbor',
  spawn:{x:-68,z:-14}
 },

 {
  id:'amina',
  name:'Amina',
  gender:'female',
  role:'student',
  spawn:{x:-18,z:-34}
 },

 {
  id:'lina',
  name:'Lina',
  gender:'female',
  role:'shop',
  spawn:{x:18,z:-15}
 },

 {
  id:'sara',
  name:'Sara',
  gender:'female',
  role:'hospital',
  spawn:{x:-60,z:-53}
 },

 {
  id:'nour',
  name:'Nour',
  gender:'female',
  role:'city',
  spawn:{x:0,z:35}
 },

 {
  id:'karim',
  name:'Karim',
  gender:'male',
  role:'cafe',
  spawn:{x:22,z:-16}
 },

 {
  id:'amine',
  name:'Amine',
  gender:'male',
  role:'neighbor',
  spawn:{x:32,z:-28}
 },

 {
  id:'walid',
  name:'Walid',
  gender:'male',
  role:'shop',
  spawn:{x:20,z:-15}
 },

 {
  id:'samir',
  name:'Samir',
  gender:'male',
  role:'driver',
  spawn:{x:60,z:13}
 },

 {
  id:'younes',
  name:'Younes',
  gender:'male',
  role:'city',
  spawn:{x:30,z:50}
 }
];

const Relationships={
 state:{},

 dateCooldown:0,
 flowerCooldown:0,
 giftCooldown:0,

 dateCooldownMax:420,
 flowerCooldownMax:120,
 giftCooldownMax:180,

 pendingProposal:null,
 proposalCooldown:0,

 marriagePending:false,

 child:{
  exists:false,
  name:'Baby',
  age:0,
  growth:0,
  lastGrowth:0
 },

 notification:null,
 notificationTimer:0
};


NPC_DEFS.forEach(n=>{
 Relationships.state[n.id]={
  affinity:0,
  conversations:0,
  dates:0,
  flowers:0,
  gifts:0,
  following:false,
  followedByPlayer:false,
  lastConversation:0,
  lastDate:0,
  lastGift:0,
  lastFlower:0
 };
});


Relationships.get=function(id){
 if(!Relationships.state[id]){
  Relationships.state[id]={
   affinity:0,
   conversations:0,
   dates:0,
   flowers:0,
   gifts:0,
   following:false,
   followedByPlayer:false,
   lastConversation:0,
   lastDate:0,
   lastGift:0,
   lastFlower:0
  };
 }

 return Relationships.state[id];
};


Relationships.getDef=function(id){
 return NPC_DEFS.find(n=>n.id===id)||null;
};


Relationships.clamp=function(value){
 return Math.max(0,Math.min(100,value));
};


Relationships.addAffinity=function(id,amount){
 const s=Relationships.get(id);

 s.affinity=
  Relationships.clamp(
   s.affinity+amount
  );

 return s.affinity;
};


Relationships.getAffinity=function(id){
 return Relationships.get(id).affinity;
};


/* ---- Notifications ---- */

Relationships.notify=function(text,duration=2500){
 Relationships.notification=text;
 Relationships.notificationTimer=duration;

 const prompt=
  typeof UI!=='undefined'&&
  UI.dom&&
  UI.dom.prompt
   ?UI.dom.prompt
   :$('prompt');

 if(prompt){
  prompt.textContent='💬 '+text;
  prompt.style.display='block';

  clearTimeout(Relationships._notifyTimeout);

  Relationships._notifyTimeout=setTimeout(()=>{
   if(
    Relationships.notification===text&&
    prompt
   ){
    prompt.style.display='none';
   }
  },duration);
 }
};


Relationships.update=function(dt){
 Relationships.dateCooldown=
  Math.max(
   0,
   Relationships.dateCooldown-dt
  );

 Relationships.flowerCooldown=
  Math.max(
   0,
   Relationships.flowerCooldown-dt
  );

 Relationships.giftCooldown=
  Math.max(
   0,
   Relationships.giftCooldown-dt
  );

 Relationships.proposalCooldown=
  Math.max(
   0,
   Relationships.proposalCooldown-dt
  );

 if(Relationships.notificationTimer>0){
  Relationships.notificationTimer=
   Math.max(
    0,
    Relationships.notificationTimer-dt
   );
 }

 /*
  * Marriage proposal:
  * The NPC does not answer immediately.
  * A short in-game consideration period is used.
  */
 if(
  Relationships.pendingProposal&&
  Relationships.pendingProposal.timer>0
 ){
  Relationships.pendingProposal.timer-=dt;

  if(Relationships.pendingProposal.timer<=0){
   Relationships.resolveProposal();
  }
 }

 /*
  * Child growth.
  * Growth is intentionally slow so the child is part
  * of the long-term save rather than an instant reward.
  */
 if(
  Relationships.child.exists&&
  Player.married
 ){
  Relationships.child.growth+=dt;

  const GROWTH_INTERVAL=300;

  if(
   Relationships.child.growth-
   Relationships.child.lastGrowth>=GROWTH_INTERVAL
  ){
   Relationships.child.lastGrowth=
    Relationships.child.growth;

   Relationships.child.age+=1;

   if(Relationships.child.age===1){
    Relationships.notify('Your child is growing up ❤️');
   }else if(Relationships.child.age===5){
    Relationships.notify('Your child started school 🎒');
   }else if(Relationships.child.age===12){
    Relationships.notify('Your child is becoming a teenager.');
   }else if(Relationships.child.age===18){
    Relationships.notify('Your child became an adult.');
   }
  }
 }
};


/* ---- Conversation choices ---- */

Relationships.conversationChoices=function(id){
 const s=Relationships.get(id);

 const def=Relationships.getDef(id);

 if(!def)
  return [];

 if(def.gender==='female'){
  if(s.affinity>=70){
   return [
    {
     id:'romantic',
     text:'I really enjoy being with you.',
     effect:3
    },
    {
     id:'supportive',
     text:'I am always here if you need me.',
     effect:2
    },
    {
     id:'joke',
     text:'You owe me a coffee 😂',
     effect:1
    },
    {
     id:'rude',
     text:'Whatever, I am busy.',
     effect:-4
    }
   ];
  }

  return [
   {
    id:'nice',
    text:'I am happy to hear from you.',
    effect:3
   },
   {
    id:'ask',
    text:'How was your day?',
    effect:2
   },
   {
    id:'neutral',
    text:'Yeah, everything is fine.',
    effect:0
   },
   {
    id:'bad',
    text:'I do not really care.',
    effect:-4
   }
  ];
 }

 return [
  {
   id:'friendly',
   text:'Bro, good to hear from you.',
   effect:2
  },
  {
   id:'question',
   text:'What is going on around here?',
   effect:1
  },
  {
   id:'neutral',
   text:'Nothing much.',
   effect:0
  },
  {
   id:'bad',
   text:'Leave me alone.',
   effect:-3
  }
 ];
};


Relationships.talk=function(id,choiceId){
 const s=Relationships.get(id);

 const choices=
  Relationships.conversationChoices(id);

 const choice=
  choices.find(c=>c.id===choiceId);

 if(!choice)
  return {
   ok:false,
   affinity:s.affinity
  };

 s.conversations++;
 s.lastConversation=Date.now();

 Relationships.addAffinity(
  id,
  choice.effect
 );

 MissionSystem.notifyTalk(id);

 return {
  ok:true,
  affinity:Relationships.getAffinity(id),
  effect:choice.effect,
  text:choice.text
 };
};


/* Backward compatibility for old missions / old phone code. */
Relationships.talkSimple=function(id){
 return Relationships.talk(
  id,
  'nice'
 );
};


/* ---- Flowers ---- */

Relationships.canGiveFlowers=function(){
 return Relationships.flowerCooldown<=0;
};


Relationships.gift=function(id,itemId){
 const s=Relationships.get(id);

 if(!Relationships.getDef(id))
  return false;

 if(
  Relationships.flowerCooldown>0&&
  itemId==='flowers'
 )
  return false;

 if(
  Relationships.giftCooldown>0&&
  itemId!=='flowers'
 )
  return false;

 if(
  Player.married&&
  Player.spouse!==id
 ){
  return false;
 }

 if(!Economy.useItem(itemId))
  return false;

 let amount=4;

 if(itemId==='flowers'){
  amount=3;
  s.flowers++;
  s.lastFlower=Date.now();
  Relationships.flowerCooldown=
   Relationships.flowerCooldownMax;
 }else{
  amount=4;
  s.gifts++;
  s.lastGift=Date.now();
  Relationships.giftCooldown=
   Relationships.giftCooldownMax;
 }

 Relationships.addAffinity(id,amount);

 Relationships.notify(
  itemId==='flowers'
   ?'You gave '+Relationships.getDef(id).name+' flowers 🌹'
   :'You gave '+Relationships.getDef(id).name+' a gift 🎁'
 );

 return true;
};


/* ---- Date ---- */

Relationships.canDate=function(id){
 const s=Relationships.get(id);

 if(!Relationships.getDef(id))
  return false;

 if(Player.married)
  return Player.spouse===id;

 if(Relationships.dateCooldown>0)
  return false;

 if(Relationships.pendingProposal)
  return false;

 if(s.affinity<20)
  return false;

 return true;
};


Relationships.dateAtCafe=function(id){
 if(!Relationships.canDate(id))
  return false;

 if(Economy.cash<20)
  return false;

 Economy.cash-=20;

 const s=Relationships.get(id);

 s.dates++;
 s.lastDate=Date.now();

 Relationships.addAffinity(id,5);

 Relationships.dateCooldown=
  Relationships.dateCooldownMax;

 Relationships.notify(
  'You went on a date with '+
  Relationships.getDef(id).name+
  ' ❤️'
 );

 return true;
};


/* ---- Follow ---- */

Relationships.follow=function(id){
 const def=Relationships.getDef(id);

 if(!def)
  return false;

 const s=Relationships.get(id);

 if(Player.married&&Player.spouse!==id)
  return false;

 Object.keys(Relationships.state).forEach(otherId=>{
  if(otherId!==id){
   Relationships.state[otherId].followedByPlayer=false;
  }
 });

 s.followedByPlayer=true;

 Relationships.notify(
  def.name+' is following you.'
 );

 return true;
};


Relationships.stopFollow=function(id){
 const s=Relationships.get(id);

 s.followedByPlayer=false;

 Relationships.notify(
  Relationships.getDef(id)?.name+
  ' stopped following you.'
 );

 return true;
};


Relationships.isFollowing=function(id){
 return !!Relationships.get(id).followedByPlayer;
};


/* ---- Proposal ---- */

Relationships.canPropose=function(id){
 const s=Relationships.get(id);

 if(
  Player.married||
  Relationships.pendingProposal||
  Relationships.proposalCooldown>0
 )
  return false;

 if(s.affinity<80)
  return false;

 const def=Relationships.getDef(id);

 return !!(
  def&&
  def.gender==='female'
 );
};


Relationships.propose=function(id){
 if(!Relationships.canPropose(id))
  return false;

 Relationships.pendingProposal={
  npcId:id,
  timer:25,
  startedAt:Date.now()
 };

 Relationships.proposalCooldown=60;

 Relationships.notify(
  Relationships.getDef(id).name+
  ' is thinking about your proposal...'
 );

 return true;
};


Relationships.resolveProposal=function(){
 const pending=Relationships.pendingProposal;

 if(!pending)
  return false;

 Relationships.pendingProposal=null;

 const id=pending.npcId;
 const s=Relationships.get(id);
 const def=Relationships.getDef(id);

 if(!def)
  return false;

 /*
  * High affinity strongly improves acceptance,
  * but 80% is not an automatic yes.
  */
 let chance=0.35;

 if(s.affinity>=90)
  chance=0.9;
 else if(s.affinity>=85)
  chance=0.7;
 else if(s.affinity>=80)
  chance=0.5;

 if(Math.random()<chance){
  Player.married=true;
  Player.spouse=id;

  s.followedByPlayer=false;

  Relationships.notify(
   def.name+
   ' accepted your proposal! 💍❤️',
   4000
  );

  return true;
 }

 Relationships.notify(
  def.name+
  ' needs more time. She said no for now.',
  4000
 );

 return false;
};


/* ---- Divorce ---- */

Relationships.divorce=function(){
 if(!Player.married)
  return false;

 if(Economy.cash<100)
  return false;

 Economy.cash-=100;

 const oldSpouse=Player.spouse;

 Player.married=false;
 Player.spouse=null;

 Relationships.child.exists=false;
 Relationships.child.age=0;
 Relationships.child.growth=0;
 Relationships.child.lastGrowth=0;

 if(oldSpouse){
  Relationships.get(oldSpouse).followedByPlayer=false;
  Relationships.addAffinity(oldSpouse,-20);
 }

 Relationships.notify(
  'You are no longer married.'
 );

 return true;
};


/* ---- Marriage / spouse helpers ---- */

Relationships.getSpouse=function(){
 if(!Player.married||!Player.spouse)
  return null;

 return Relationships.getDef(Player.spouse);
};


Relationships.isSpouse=function(id){
 return !!(
  Player.married&&
  Player.spouse===id
 );
};


Relationships.canHaveChild=function(){
 return !!(
  Player.married&&
  Player.spouse&&
  Relationships.getAffinity(Player.spouse)>=100&&
  !Relationships.child.exists
 );
};


Relationships.haveChild=function(){
 if(!Relationships.canHaveChild())
  return false;

 Relationships.child={
  exists:true,
  name:'Baby',
  age:0,
  growth:0,
  lastGrowth:0
 };

 Relationships.notify(
  'Congratulations! You and '+
  Relationships.getDef(Player.spouse).name+
  ' are expecting a child 👶❤️',
  5000
 );

 return true;
};


/* Automatically check the 100% marriage condition. */
Relationships.checkFamily=function(){
 if(
  !Player.married||
  !Player.spouse||
  Relationships.child.exists
 )
  return false;

 if(
  Relationships.getAffinity(Player.spouse)>=100
 ){
  return Relationships.haveChild();
 }

 return false;
};


/* ---- Compatibility aliases for old code ---- */

Relationships.date=function(id){
 return Relationships.dateAtCafe(id);
};

Relationships.flower=function(id){
 return Relationships.gift(id,'flowers');
};


/* ---- Player relationship state ---- */

Player.married=!!Player.married;
Player.spouse=Player.spouse||null;


/* ============================================================
   VEHICLES
   ============================================================ */

const DEALERSHIP=[
 {
  id:'sedan_new',
  name:'Sedan (New)',
  price:12000,
  color:0x274b52
 },

 {
  id:'hatch_new',
  name:'Hatchback (New)',
  price:8000,
  color:0x9c7a3a
 },

 {
  id:'sedan_used',
  name:'Sedan (Used)',
  price:3500,
  color:0x6b4226
 },

 {
  id:'hatch_used',
  name:'Hatchback (Used)',
  price:2200,
  color:0x555555
 }
];

const Vehicles={owned:[]};

Vehicles.initDefault=function(){
 Vehicles.owned=[
  {
   mesh:World.playerCar,
   registered:true,
   name:'Starter Car'
  }
 ];

 World.playerCarRegistered=true;
};

Vehicles.buy=function(catalogId){
 const c=DEALERSHIP.find(v=>v.id===catalogId);

 if(!c||Economy.cash<c.price)
  return false;

 Economy.cash-=c.price;

 const mesh=World.makeCar(
  World.landmarks.dealership.position.x,
  World.landmarks.dealership.position.z+10,
  c.color
 );

 Vehicles.owned.push({
  mesh,
  registered:true,
  name:c.name,
  price:c.price
 });

 return true;
};

Vehicles.sell=function(index){
 const v=Vehicles.owned[index];

 if(!v||v.mesh===World.playerCar)
  return false;

 Economy.cash+=Math.round(
  (v.price||4000)*0.5
 );

 World.scene.remove(v.mesh);

 Vehicles.owned.splice(index,1);

 return true;
};

Vehicles.switchTo=function(mesh,registered){
 World.playerCar=mesh;
 World.playerCarRegistered=registered;
};

Vehicles.testCar=null;

Vehicles.testDrive=function(catalogId){
 const c=DEALERSHIP.find(v=>v.id===catalogId);

 if(!c)
  return false;

 if(Vehicles.testCar){
  World.scene.remove(Vehicles.testCar);
  Vehicles.testCar=null;
 }

 const p=Player.camera.position;

 const mesh=World.makeCar(
  p.x+3,
  p.z,
  c.color,
  c.id.indexOf('hatch')>=0
   ?'hatchback'
   :'sedan'
 );

 Vehicles.testCar=mesh;

 Vehicles.switchTo(
  mesh,
  true
 );

 Player.mode='drive';

 if(!IS_TOUCH){
  Player.controls.unlock();
  UI.dom.crosshair.style.display='none';
 }

 setDriveButtonsVisible(true);

 Weapons.refreshHUD();
 Phone.close();

 setTimeout(
  ()=>Vehicles.endTestDrive(mesh),
  60000
 );

 return true;
};

Vehicles.endTestDrive=function(mesh){
 if(Vehicles.testCar!==mesh)
  return;

 Vehicles.testCar=null;

 const wasActive=(
  World.playerCar===mesh&&
  Player.mode==='drive'
 );

 World.scene.remove(mesh);

 if(wasActive){
  Player.mode='walk';

  setDriveButtonsVisible(false);

  if(!IS_TOUCH)
   UI.dom.crosshair.style.display='block';

  Audio.stopEngine();

  Weapons.refreshHUD();
 }
};

Vehicles.nearbyDrivable=function(pos){
 for(const v of Vehicles.owned){
  if(pos.distanceTo(v.mesh.position)<3){
   return {
    mesh:v.mesh,
    registered:v.registered
   };
  }
 }

 for(const c of World.parkedCars){
  if(pos.distanceTo(c.position)<3){
   return {
    mesh:c,
    registered:false
   };
  }
 }

 return null;
};


/* ---- Driving School / License ---- */

const License={has:false};

const DrivingSchool={
 active:false,
 gate:0,
 total:4,

 gates:[
  [-44,1,28],
  [-36,1,28],
  [-36,1,20],
  [-44,1,20]
 ]
};

DrivingSchool.start=function(){
 DrivingSchool.active=true;
 DrivingSchool.gate=0;
};

DrivingSchool.checkProgress=function(carPos){
 if(!DrivingSchool.active)
  return;

 const g=
  DrivingSchool.gates[DrivingSchool.gate];

 if(!g)
  return;

 if(
  carPos.distanceTo(
   new THREE.Vector3(
    g[0],
    g[1],
    g[2]
   )
  )<4
 ){
  DrivingSchool.gate++;

  if(
   DrivingSchool.gate>=DrivingSchool.total
  ){
   DrivingSchool.active=false;
   License.has=true;
  }
 }
};


/* ---- Police checkpoint ---- */

const Police={
 cooldown:0,
 wanted:0,
 checkpointActive:false
};

Police.addWanted=function(n){
 Police.wanted=
  Math.max(
   0,
   Math.min(
    5,
    Police.wanted+n
   )
  );

 const box=$('wantedBox');

 if(Police.wanted<=0){
  box.style.display='none';
  return;
 }

 box.style.display='block';

 box.textContent=
  '🚨 '+
  '★'.repeat(Police.wanted)+
  '☆'.repeat(5-Police.wanted);

 PoliceAI.trigger(
  Player.camera.position,
  Police.wanted
 );
};

Police.maybeTrigger=function(carPos,dt){
 Police.cooldown=
  Math.max(
   0,
   Police.cooldown-dt
  );

 if(
  Police.cooldown>0||
  !World.checkpointPos||
  Police.checkpointActive
 )
  return;

 if(
  carPos.distanceTo(
   World.checkpointPos
  )<4
 ){
  Police.cooldown=40;
  Police.trigger();
 }
};

Police.trigger=function(){
 const registered=
  World.playerCarRegistered!==false;

 if(License.has&&registered){
  Police.showResult('ok');
  return;
 }

 Police.checkpointActive=true;
 carVel.speed=0;

 $('polTitle').textContent=
  'Police Checkpoint';

 $('polBody').textContent=
  (!License.has
   ?'No driver\'s license on file. '
   :'')+
  (!registered
   ?'Vehicle is unregistered.'
   :'');

 $('pPolice').classList.add('open');
};

Police.showResult=function(kind){
 $('polTitle').textContent=
  'Police Checkpoint';

 $('polBody').textContent=
  kind==='ok'
   ?'Papers in order. You may go.'
   :'';

 $('pPolice').classList.add('open');

 setTimeout(
  ()=>$('pPolice').classList.remove('open'),
  1200
 );
};

Police.comply=function(){
 let fine=0;

 let impound=
  !(World.playerCarRegistered!==false);

 let jail=false;

 if(!License.has)
  fine+=50;

 if(fine>0){
  if(Economy.cash>=fine)
   Economy.cash-=fine;
  else
   jail=true;
 }

 Police.checkpointActive=false;

 $('pPolice').classList.remove('open');

 if(impound)
  Player.mode='walk';

 if(jail){
  Police.addWanted(1);

  Prison.arrest(
   Player.camera,
   outsidePos
  );
 }

 UI.refreshHUD();
};

Police.payFine=function(){
 if(Economy.cash>=100){
  Economy.cash-=100;

  Police.checkpointActive=false;

  $('pPolice').classList.remove('open');

  UI.refreshHUD();
 }else{
  Police.comply();
 }
};

Police.flee=function(){
 Police.checkpointActive=false;

 carVel.speed=10;

 $('pPolice').classList.remove('open');

 Police.addWanted(2);
};


/* ---- Prison ---- */

const Prison={
 sentenced:false,
 timer:0,
 bailCost:300
};

Prison.arrest=function(
 camera,
 outsidePos
){
 World.enterInterior(
  'prison',
  camera,
  outsidePos
 );

 Prison.sentenced=true;
 Prison.timer=30;
};

Prison.bail=function(){
 if(Economy.cash>=Prison.bailCost){
  Economy.cash-=Prison.bailCost;

  Prison.release();

  UI.refreshHUD();
 }
};

Prison.release=function(){
 Prison.sentenced=false;

 World.exitInterior(
  Player.camera,
  outsidePos
 );
};

Prison.tick=function(dt){
 if(!Prison.sentenced)
  return;

 Prison.timer=
  Math.max(
   0,
   Prison.timer-dt
  );

 if(Prison.timer<=0)
  Prison.release();
};


/* ---- Bank / Loans ---- */

Economy.loan=0;

Economy.takeLoan=function(amount){
 if(Economy.loan>0)
  return false;

 Economy.cash+=amount;

 Economy.loan=
  Math.round(amount*1.25);

 return true;
};

Economy.repayLoan=function(){
 const pay=
  Math.min(
   Economy.cash,
   Economy.loan
  );

 Economy.cash-=pay;
 Economy.loan-=pay;
};


/* ---- Multiplayer architecture stub ---- */

const NetworkManager={
 ws:null,

 connect(url){
  try{
   this.ws=new WebSocket(url);

   this.ws.onmessage=e=>
    this.onMessage(
     JSON.parse(e.data)
    );

   this.ws.onerror=()=>
    console.warn(
     'NetworkManager: no server at',
     url
    );

  }catch(e){
   console.warn(
    'NetworkManager: connect failed',
    e
   );
  }
 },

 send(type,payload){
  if(
   this.ws&&
   this.ws.readyState===1
  ){
   this.ws.send(
    JSON.stringify({
     type,
     payload
    })
   );
  }
 },

 onMessage(msg){
  /* Multiplayer routing stub. */
 }
};


/* ---- Gang ---- */

const Gang={
 members:[],
 max:4,
 suppressCooldown:0
};

Gang.recruit=function(npcEntry){
 if(
  Gang.members.length>=Gang.max||
  Gang.members.includes(npcEntry)
 )
  return false;

 npcEntry.recruited=true;

 Gang.members.push(npcEntry);

 return true;
};

Gang.dismiss=function(npcEntry){
 const i=
  Gang.members.indexOf(npcEntry);

 if(i<0)
  return false;

 npcEntry.recruited=false;

 Gang.members.splice(i,1);

 return true;
};

Gang.update=function(dt){
 if(Gang.members.length===0)
  return;

 const mode=Player.mode;

 const playerPos=
  Player.camera.position;

 const yaw=
  Player.camera.rotation.y;

 Gang.members.forEach((m,i)=>{
  let target;

  if(mode==='drive'){
   const ang=
    (i+1)*
    (Math.PI*2/(Gang.max+1));

   target=new THREE.Vector3(
    World.playerCar.position.x+
     Math.sin(ang)*2,
    0,
    World.playerCar.position.z+
     Math.cos(ang)*2
   );

  }else{
   const back=(i+1)*1.6;

   const side=
    (i%2===0?1:-1)*1.2;

   target=new THREE.Vector3(
    playerPos.x-
     Math.sin(yaw)*back+
     side*Math.cos(yaw),

    0,

    playerPos.z-
     Math.cos(yaw)*back-
     side*Math.sin(yaw)
   );
  }

  const toTarget=
   new THREE.Vector3()
    .subVectors(
     target,
     m.mesh.position
    );

  toTarget.y=0;

  const dist=toTarget.length();

  if(dist>0.3){
   toTarget.normalize();

   m.mesh.position.addScaledVector(
    toTarget,
    Math.min(
     dist,
     6*dt
    )
   );

   m.mesh.rotation.y=
    Math.atan2(
     toTarget.x,
     toTarget.z
    );
  }

  World.resolveCollision(
   m.mesh.position,
   0.35
  );
 });

 Gang.suppressCooldown=
  Math.max(
   0,
   Gang.suppressCooldown-dt
  );

 if(
  PoliceAI.active&&
  Gang.suppressCooldown<=0
 ){
  Gang.suppressCooldown=
   3+Math.random()*2;

  const activeCars=
   PoliceAI.cars.filter(
    c=>c.visible
   );

  if(
   activeCars.length>0&&
   Math.random()<
    Math.min(
     0.8,
     0.2*Gang.members.length
    )
  ){
   const car=
    activeCars[
     Math.floor(
      Math.random()*
      activeCars.length
     )
    ];

   car.visible=false;

   car.position.set(
    9999,
    9999,
    9999
   );
  }
 }
};

Gang.distributePayout=function(totalLoot){
 const crewCut=
  15000*
  Gang.members.length;

 const playerCut=
  Math.max(
   0,
   totalLoot-crewCut
  );

 Economy.cash+=playerCut;

 return{
  playerCut,
  crewCut,
  totalLoot
 };
};


/* ---- Bank Heist ---- */

const HeistSystem={
 active:false,
 collected:0
};

HeistSystem.start=function(){
 if(HeistSystem.active)
  return false;

 HeistSystem.active=true;
 HeistSystem.collected=0;

 World.cashBags.forEach(b=>{
  b.collected=false;
  b.mesh.visible=true;
 });

 return true;
};

HeistSystem.tick=function(dt){
 if(World.activeInterior!=='bank')
  return;

 const p=
  Player.camera.position;

 if(!HeistSystem.active){

  if(
   World.bankVaultLocal&&
   p.distanceTo(
    World.bankVaultLocal
   )<2.2
  ){
   HeistSystem.start();
  }

  return;
 }

 for(const bag of World.cashBags){

  if(bag.collected)
   continue;

  if(
   p.distanceTo(
    bag.localPos
   )<1.6
  ){
   bag.collected=true;
   bag.mesh.visible=false;
   HeistSystem.collected++;

   if(
    HeistSystem.collected>=
    World.cashBags.length
   ){
    HeistSystem.complete();
   }
  }
 }
};

HeistSystem.complete=function(){
 HeistSystem.active=false;

 const totalLoot=
  25000+
  Math.floor(
   Math.random()*15000
  );

 const result=
  Gang.distributePayout(
   totalLoot
  );

 Police.wanted=0;

 Police.addWanted(5);

 World.exitInterior(
  Player.camera,
  outsidePos
 );

 $('polTitle').textContent=
  'Heist Complete';

 $('polBody').textContent=
  'Grabbed $'+
  result.totalLoot+
  '. Crew cut: $'+
  result.crewCut+
  '. Your cut: $'+
  result.playerCut+
  '. Cops are already moving.';

 $('pPolice').classList.add('open');

 setTimeout(
  ()=>$('pPolice').classList.remove('open'),
  2500
 );

 UI.refreshHUD();

 MissionSystem.notifyHeist();
};


/* ---- Real estate / Garage ---- */

Player.properties=
 Player.properties||[];

Player.spawnPoint=
 Player.spawnPoint||null;

const RealEstate={};

RealEstate.setSpawn=function(propertyId){
 if(
  !Player.properties.includes(
   propertyId
  )
 )
  return false;

 Player.spawnPoint=propertyId;

 return true;
};

const Garage={};

Garage.summon=function(ownedIndex){
 const v=
  Vehicles.owned[ownedIndex];

 if(!v)
  return false;

 const p=
  Player.camera.position;

 const ang=
  Math.random()*Math.PI*2;

 v.mesh.position.set(
  p.x+
   Math.sin(ang)*4,
  0,
  p.z+
   Math.cos(ang)*4
 );

 return true;
};
