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
 if(effect.health)
  Vitals.health=Math.min(100,Vitals.health+effect.health);

 if(effect.energy)
  Vitals.energy=Math.min(100,Vitals.energy+effect.energy);

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
 idCard:{id:'idCard',name:'ID Card / بطاقة هوية',price:0,doc:true},
 carPapers:{id:'carPapers',name:'Vehicle Papers / أوراق السيارة',price:0,doc:true},
 driveLicense:{id:'driveLicense',name:'Driving License / رخصة السياقة',price:0,doc:true},
 gunLicense:{id:'gunLicense',name:'Gun License / رخصة السلاح',price:0,doc:true},
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

 bandage:{id:'bandage',name:'Bandage',price:30,effect:{health:25}},
 painkillers:{id:'painkillers',name:'Painkillers',price:25,effect:{health:15}},
 vitamins:{id:'vitamins',name:'Vitamins',price:40,effect:{energy:25}},
 firstaid:{id:'firstaid',name:'First Aid Kit',price:120,effect:{health:60}},
 juice:{id:'juice',name:'Orange Juice',price:25,effect:{thirst:30,energy:5}},
 gift:{
  id:'gift',
  name:'Gift',
  price:120,
  effect:{}
 }
};

const Economy={
 cash:5000,
 inventory:[{id:'idCard',qty:1},{id:'carPapers',qty:1}]
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

 if(item.doc){
  Docs.show(itemId);
  return true;
 }

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

 if(!item||item.doc)
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
 if(id==='sofia')
  return false;

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
 if(id==='sofia')
  return false;

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
  timer:8,
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

 /* affinity >= 80 is required to propose, so the answer is always yes */
 if(s.affinity>=80){
  Relationships.marry(id);
  return true;
 }

 Relationships.notify(
  def.name+
  ' needs more time.',
  4000
 );

 return false;
};

/* single place where a marriage is created (used by the phone and the shop UI) */
Relationships.marry=function(id){
 const def=Relationships.getDef(id);
 if(!def||Player.married)
  return false;

 const s=Relationships.get(id);

 Player.married=true;
 Player.spouse=id;

 s.married=true;
 s.relationship='married';
 s.following=true;
 s.followedByPlayer=true;

 /* hide the static duplicate of this NPC */
 if(World.keyNpcs&&World.keyNpcs[id])
  World.keyNpcs[id].mesh.visible=false;

 Relationships.notify(
  def.name+
  ' accepted your proposal! 💍❤️ She will live in your home.',
  4000
 );

 return true;
};

/* the house the spouse lives in: best owned property, otherwise the home */
Relationships.residence=function(){
 const props=Player.properties||[];
 for(const id of ['villa','flat2','studio'])
  if(props.includes(id))
   return id;
 return 'home';
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

 Docs.give('carPapers');

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
  try{Player.controls.unlock();}catch(e){}
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


/* ---- Practical driving test (isolated track) ---- */

const DrivingTest={
 active:false,
 B:{x:3000,z:3000},
 price:300,
 expressPrice:1500,
 built:null,
 faults:0,
 gate:0,
 prev:null,
 msgT:0,
 overT:0,
 cooldown:0
};

DrivingTest.tex=function(text,bg,fg){
 const c=document.createElement('canvas');
 c.width=256;
 c.height=128;
 const g=c.getContext('2d');
 g.fillStyle=bg;
 g.fillRect(0,0,256,128);
 g.strokeStyle=fg;
 g.lineWidth=8;
 g.strokeRect(6,6,244,116);
 g.fillStyle=fg;
 g.font='bold 56px sans-serif';
 g.textAlign='center';
 g.textBaseline='middle';
 g.fillText(text,128,66);
 const t=new THREE.CanvasTexture(c);
 return t;
};

DrivingTest.ped=function(color){
 const g=new THREE.Group();
 const body=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.26,1.0,8),new THREE.MeshStandardMaterial({color}));
 body.position.y=0.95;
 const head=new THREE.Mesh(new THREE.SphereGeometry(0.17,8,8),new THREE.MeshStandardMaterial({color:0xd9a77a}));
 head.position.y=1.65;
 const legs=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.16,0.5,8),new THREE.MeshStandardMaterial({color:0x2b2f38}));
 legs.position.y=0.25;
 g.add(body,head,legs);
 return g;
};

DrivingTest.build=function(){
 if(DrivingTest.built)
  return DrivingTest.built;

 const B=DrivingTest.B;
 const root=new THREE.Group();
 root.position.set(B.x,0,B.z);

 const grass=new THREE.Mesh(
  new THREE.PlaneGeometry(500,500),
  new THREE.MeshStandardMaterial({color:0x3d6b35})
 );
 grass.rotation.x=-Math.PI/2;
 grass.position.set(0,-0.02,130);
 root.add(grass);

 const road=new THREE.Mesh(
  new THREE.PlaneGeometry(18,290),
  new THREE.MeshStandardMaterial({color:0x3a3d42})
 );
 road.rotation.x=-Math.PI/2;
 road.position.set(0,0,125);
 root.add(road);

 /* dashed centre line */
 const dashMat=new THREE.MeshBasicMaterial({color:0xf2e6a0});
 for(let z=0;z<=270;z+=6){
  const d=new THREE.Mesh(new THREE.PlaneGeometry(0.25,2.5),dashMat);
  d.rotation.x=-Math.PI/2;
  d.position.set(0,0.02,z);
  root.add(d);
 }

 const coneMat=new THREE.MeshStandardMaterial({color:0xff6a00});
 const coneGeo=new THREE.ConeGeometry(0.35,0.9,10);
 const cones=[];
 const addCone=(x,z)=>{
  const m=new THREE.Mesh(coneGeo,coneMat);
  m.position.set(x,0.45,z);
  root.add(m);
  cones.push({mesh:m,x:B.x+x,z:B.z+z,hit:false});
 };

 /* section 1: slalom */
 [28,38,48,58].forEach((z,i)=>addCone(i%2?3:-3,z));
 /* section 3: narrow corridor */
 for(let z=150;z<=190;z+=8){
  addCone(-2.4,z);
  addCone(2.4,z);
 }
 /* section 5: final slalom */
 [212,222,232].forEach((z,i)=>addCone(i%2?-3:3,z));

 /* speed limit signs */
 const sign=(z,text,bg,fg)=>{
  const m=new THREE.Mesh(
   new THREE.PlaneGeometry(2.4,1.2),
   new THREE.MeshBasicMaterial({map:DrivingTest.tex(text,bg,fg),side:THREE.DoubleSide})
  );
  m.position.set(-8,2.2,z);
  m.rotation.y=Math.PI;
  root.add(m);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,2.2,6),new THREE.MeshStandardMaterial({color:0x888888}));
  pole.position.set(-8,1.1,z);
  root.add(pole);
 };
 sign(66,'LIMIT 30','#ffffff','#c0392b');
 sign(138,'LIMIT 40','#ffffff','#c0392b');
 sign(196,'LIMIT 25','#ffffff','#c0392b');

 /* crossing stripes */
 const stripeMat=new THREE.MeshBasicMaterial({color:0xffffff});
 [96,244].forEach(z=>{
  for(let x=-7;x<=7;x+=1.6){
   const s=new THREE.Mesh(new THREE.PlaneGeometry(0.8,4),stripeMat);
   s.rotation.x=-Math.PI/2;
   s.position.set(x,0.025,z);
   root.add(s);
  }
 });

 /* pedestrians that cross the road */
 const peds=[];
 [[96,0],[96,0.5],[96,1],[244,0.25],[244,0.75]].forEach((p,i)=>{
  const m=DrivingTest.ped([0xb5473a,0x3a6ea5,0x6b8e3a,0xd4a017,0x7a4a9a][i%5]);
  root.add(m);
  peds.push({mesh:m,z:p[0],phase:p[1]*2,hit:false});
 });

 /* gates (driven through, in order) */
 const gateGeo=new THREE.TorusGeometry(2.6,0.18,8,24);
 const gates=[];
 [[0,14],[0,72],[0,128],[0,200],[0,262]].forEach((g,i)=>{
  const m=new THREE.Mesh(gateGeo,new THREE.MeshBasicMaterial({color:0xffd23a}));
  m.position.set(g[0],2.6,g[1]);
  root.add(m);
  gates.push({mesh:m,x:B.x+g[0],z:B.z+g[1]});
 });

 /* finish banner */
 const fin=new THREE.Mesh(
  new THREE.PlaneGeometry(8,2),
  new THREE.MeshBasicMaterial({map:DrivingTest.tex('FINISH','#1f7a3a','#ffffff'),side:THREE.DoubleSide})
 );
 fin.position.set(0,6.2,262);
 root.add(fin);

 DrivingTest.built={root,cones,peds,gates,
  zones:[
   {z0:66,z1:122,limit:30},
   {z0:138,z1:195,limit:40},
   {z0:196,z1:262,limit:25}
  ]};

 World.scene.add(root);
 return DrivingTest.built;
};

DrivingTest.say=function(t,sec){
 const el=$('testMsg');
 if(el)
  el.textContent=t;
 DrivingTest.msgT=sec||3;
};

DrivingTest.begin=function(){
 if(DrivingTest.active)
  return;

 const T=DrivingTest.build();
 const B=DrivingTest.B;

 DrivingTest.prev={
  car:World.playerCar,
  reg:World.playerCarRegistered,
  mode:Player.mode
 };

 World.testMode=true;
 Traffic.cars.forEach(c=>{c.mesh.visible=false;});

 T.root.visible=true;
 T.cones.forEach(c=>{
  c.hit=false;
  c.mesh.rotation.z=0;
  c.mesh.position.y=0.45;
 });
 T.peds.forEach(p=>{p.hit=false;});
 T.gates.forEach((g,i)=>{
  g.mesh.material.color.set(i===0?0x3aff6a:0xffd23a);
 });

 DrivingTest.faults=0;
 DrivingTest.gate=0;
 DrivingTest.overT=0;
 DrivingTest.cooldown=0;

 const car=World.makeCar(B.x,B.z+2,0xf2f2f2,'sedan');
 car.rotation.y=0;
 DrivingTest.car=car;

 Vehicles.switchTo(car,true);

 Player.mode='drive';
 carVel.speed=0;
 carVel.steer=0;

 if(!IS_TOUCH){
  try{Player.controls.unlock();}catch(e){}
  UI.dom.crosshair.style.display='none';
 }

 setDriveButtonsVisible(true);

 if(typeof Phone!=='undefined'&&Phone.close)
  Phone.close();

 const shop=$('pShop');
 if(shop)
  shop.classList.remove('open');

 DrivingTest.active=true;

 const hud=$('testHUD');
 if(hud)
  hud.style.display='block';

 DrivingTest.say('Drive through the gates. Avoid cones and pedestrians. Obey the speed limits.',5);
 DrivingTest.updateHUD();
};

DrivingTest.updateHUD=function(){
 const el=$('testInfo');
 if(el)
  el.textContent='Driving Test — gate '+Math.min(DrivingTest.gate+1,5)+'/5 — faults '+DrivingTest.faults+'/3';
};

DrivingTest.finish=function(success,msg){
 if(!DrivingTest.active)
  return;

 DrivingTest.active=false;
 World.testMode=false;

 const hud=$('testHUD');
 if(hud)
  hud.style.display='none';

 if(DrivingTest.built)
  DrivingTest.built.root.visible=false;

 Traffic.cars.forEach(c=>{c.mesh.visible=true;});

 if(DrivingTest.car){
  World.scene.remove(DrivingTest.car);
  DrivingTest.car=null;
 }

 const pv=DrivingTest.prev||{};
 if(pv.car)
  Vehicles.switchTo(pv.car,pv.reg);

 Player.mode='walk';
 carVel.speed=0;
 carVel.steer=0;

 const poi=World.pois.find(p=>p.id==='drivingSchool'&&!p.dyn);
 if(poi)
  Player.camera.position.set(poi.pos.x,1.7,poi.pos.z+2);
 else
  Player.camera.position.set(-40,1.7,37);

 setDriveButtonsVisible(false);

 if(!IS_TOUCH)
  UI.dom.crosshair.style.display='block';

 Audio.stopEngine();
 Weapons.refreshHUD();

 if(success){
  License.has=true;
  Docs.give('driveLicense');
 }

 if(typeof Jobs!=='undefined')
  Jobs.msg(msg);
 else if(UI.dom&&UI.dom.prompt){
  UI.dom.prompt.textContent=msg;
  UI.dom.prompt.style.display='block';
  setTimeout(()=>{UI.dom.prompt.style.display='none';},3000);
 }

 UI.refreshHUD();
};

DrivingTest.fault=function(why){
 if(DrivingTest.cooldown>0)
  return;
 DrivingTest.cooldown=1.2;
 DrivingTest.faults++;
 DrivingTest.say('⚠ Fault: '+why+' ('+DrivingTest.faults+'/3)',2.5);
 DrivingTest.updateHUD();
 if(DrivingTest.faults>=3)
  DrivingTest.finish(false,'❌ Test failed: too many faults.');
};

DrivingTest.update=function(dt){
 if(!DrivingTest.active)
  return;

 const T=DrivingTest.built;
 const B=DrivingTest.B;
 const car=DrivingTest.car;

 if(Player.mode!=='drive'||World.playerCar!==car){
  DrivingTest.finish(false,'Test ended: you left the car.');
  return;
 }

 DrivingTest.cooldown=Math.max(0,DrivingTest.cooldown-dt);

 if(DrivingTest.msgT>0){
  DrivingTest.msgT-=dt;
  if(DrivingTest.msgT<=0){
   const el=$('testMsg');
   if(el)
    el.textContent='';
  }
 }

 /* keep the car on the track */
 const lx=car.position.x-B.x;
 const lz=car.position.z-B.z;
 if(Math.abs(lx)>9){
  car.position.x=B.x+Math.sign(lx)*9;
  carVel.speed*=0.6;
 }
 if(lz<-6){
  car.position.z=B.z-6;
  carVel.speed=0;
 }

 /* pedestrians walk across the road */
 const t=performance.now()/1000;
 T.peds.forEach(p=>{
  const ph=(t*0.35+p.phase)%2;
  const x=ph<1?-8+ph*16:8-(ph-1)*16;
  p.mesh.position.set(x,0,p.z+(p.hit?0:0));
  p.mesh.rotation.y=ph<1?Math.PI/2:-Math.PI/2;
  if(p.hit)
   return;
  const wx=B.x+x,wz=B.z+p.z;
  if(Math.hypot(car.position.x-wx,car.position.z-wz)<1.6){
   p.hit=true;
   DrivingTest.finish(false,'❌ Test failed: you hit a pedestrian!');
  }
 });

 if(!DrivingTest.active)
  return;

 /* cones */
 T.cones.forEach(c=>{
  if(c.hit)
   return;
  if(Math.hypot(car.position.x-c.x,car.position.z-c.z)<1.4){
   c.hit=true;
   c.mesh.rotation.z=1.4;
   c.mesh.position.y=0.2;
   DrivingTest.cooldown=0;
   DrivingTest.fault('hit a cone');
  }
 });

 if(!DrivingTest.active)
  return;

 /* speed limits */
 const kmh=Math.abs(carVel.speed)*3.6*1.6;
 let limit=null;
 T.zones.forEach(z=>{
  if(lz>=z.z0&&lz<=z.z1)
   limit=z.limit;
 });
 if(limit!==null){
  if(DrivingTest.msgT<=0)
   DrivingTest.say('Speed limit '+limit+' km/h',0.6);
  if(kmh>limit+6){
   DrivingTest.overT+=dt;
   if(DrivingTest.overT>1.5){
    DrivingTest.overT=0;
    DrivingTest.fault('speeding');
   }
  }else
   DrivingTest.overT=Math.max(0,DrivingTest.overT-dt);
 }

 if(!DrivingTest.active)
  return;

 /* gates in order */
 const g=T.gates[DrivingTest.gate];
 if(g&&Math.hypot(car.position.x-g.x,car.position.z-g.z)<5){
  g.mesh.material.color.set(0x888888);
  DrivingTest.gate++;
  const n=T.gates[DrivingTest.gate];
  if(n)
   n.mesh.material.color.set(0x3aff6a);
  DrivingTest.updateHUD();
  if(DrivingTest.gate>=T.gates.length){
   DrivingTest.finish(true,'✅ Test passed! You got your driving license.');
  }
 }
};

DrivingTest.expressBuy=function(){
 if(License.has||Economy.cash<DrivingTest.expressPrice)
  return false;
 Economy.cash-=DrivingTest.expressPrice;
 License.has=true;
 Docs.give('driveLicense');
 return true;
};


/* ---- Documents: ID card, vehicle papers, licenses ---- */

const Docs={idLost:false};

Docs.has=function(id){
 return !!Economy.inventory.find(i=>i.id===id);
};

Docs.give=function(id){
 if(!Docs.has(id))
  Economy.inventory.push({id:id,qty:1});
};

Docs.take=function(id){
 Economy.inventory=Economy.inventory.filter(i=>i.id!==id);
};

Docs.sync=function(){
 if(!Docs.idLost)
  Docs.give('idCard');

 if(License.has)
  Docs.give('driveLicense');

 if(Vehicles.owned.some(v=>v.registered))
  Docs.give('carPapers');
};

Docs.show=function(id){
 let old=document.getElementById('docView');
 if(old)
  old.remove();

 const car=(World.playerCar&&World.playerCar.userData&&World.playerCar.userData.modelId)||'-';
 const lines={
  idCard:['ID CARD','Name: Player','No: EH-'+(100000+Math.floor((typeof hash==='function'?0.37:0.37)*899999)),'City: El-Hay'],
  carPapers:['VEHICLE PAPERS','Owner: Player','Vehicle: '+car,'Status: registered'],
  driveLicense:['DRIVING LICENSE','Holder: Player','Class: B','Status: valid'],
  gunLicense:['GUN LICENSE','Holder: Player','Issued by: El-Hay Police','Status: valid']
 }[id]||[id];

 const d=document.createElement('div');
 d.id='docView';
 d.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:90;background:#f4efe0;color:#222;padding:18px 24px;border-radius:12px;border:3px solid #1f3b57;font:14px monospace;min-width:230px;box-shadow:0 8px 30px rgba(0,0,0,.6)';
 d.innerHTML='<b style="font-size:16px;color:#1f3b57">'+lines[0]+'</b><br><br>'+lines.slice(1).join('<br>')+'<br><br><button style="padding:6px 14px;border:0;border-radius:6px;background:#1f3b57;color:#fff;cursor:pointer">OK</button>';
 d.querySelector('button').onclick=function(){d.remove();};
 document.body.appendChild(d);
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
  )<7
 ){
  Police.cooldown=40;
  Police.trigger();
 }
};

Police.setButtons=function(opts){
 const c=$('polComply'),p=$('polPay'),f=$('polFlee');
 [[c,opts.jail,Police.comply],[p,opts.pay,Police.payFine],[f,opts.flee,Police.flee]].forEach(a=>{
  const el=a[0];
  if(!el)
   return;
  el.style.display=a[1]?'inline-block':'none';
  if(a[1])
   el.textContent=a[1];
  el.onclick=a[2];
 });
};

Police.trigger=function(){
 Docs.sync();

 const registered=
  World.playerCarRegistered!==false;

 const hasID=Docs.has('idCard');
 const hasPapers=registered&&Docs.has('carPapers');
 const hasLic=License.has;

 if(hasID&&hasPapers&&hasLic){
  Police.showResult('ok');
  return;
 }

 Police.checkpointActive=true;
 carVel.speed=0;
 Police.missing=(!hasID||!hasPapers);

 $('polTitle').textContent=
  'Police Checkpoint — Documents please';

 const mark=ok=>ok?'✅':'❌';

 $('polBody').innerHTML=
  mark(hasID)+' ID Card (بطاقة هوية)<br>'+
  mark(hasPapers)+' Vehicle Papers<br>'+
  mark(hasLic)+' Driving License<br><br>'+
  (Police.missing
   ?'Missing documents. What do you do?'
   :'No driving license: traffic ticket $'+Police.ticket+'.');

 if(Police.missing){
  Police.setButtons({
   jail:'Go to Jail (سجن)',
   pay:'Pay Bribe $'+Police.bribe+' (رشوة)',
   flee:'Flee (تهرب)'
  });
 }else{
  Police.setButtons({
   jail:null,
   pay:'Pay Ticket $'+Police.ticket+' (بروسي)',
   flee:'Flee (تهرب)'
  });
 }

 $('pPolice').classList.add('open');
};

Police.bribe=300;
Police.ticket=150;

Police.showResult=function(kind){
 $('polTitle').textContent=
  'Police Checkpoint';

 $('polBody').textContent=
  kind==='ok'
   ?'Papers in order. You may go.'
   :'';

 Police.setButtons({jail:null,pay:null,flee:null});

 $('pPolice').classList.add('open');

 setTimeout(
  ()=>$('pPolice').classList.remove('open'),
  1200
 );
};

/* jail */
Police.comply=function(){
 Police.checkpointActive=false;

 $('pPolice').classList.remove('open');

 Police.addWanted(1);

 Prison.arrest(
  Player.camera,
  outsidePos
 );

 UI.refreshHUD();
};

/* bribe (documents missing) or ticket (license only) */
Police.payFine=function(){
 const cost=Police.missing?Police.bribe:Police.ticket;

 if(Economy.cash>=cost){
  Economy.cash-=cost;

  Police.checkpointActive=false;

  $('pPolice').classList.remove('open');

  UI.refreshHUD();
 }else{
  /* cannot pay -> jail */
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

 /* ID card is confiscated; re-issued on release */
 Docs.idLost=true;
 Docs.take('idCard');
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

 Docs.idLost=false;
 Docs.give('idCard');

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
