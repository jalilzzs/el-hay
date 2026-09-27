/* ============ Systems: Vitals, Economy, Relationships, Vehicles, Police/License ============ */

/* ---- Vitals ---- */
const Vitals={health:100,energy:100,hunger:100,thirst:100,hygiene:100};
Vitals.update=function(dt){
 Vitals.hunger=Math.max(0,Vitals.hunger-0.15*dt);
 Vitals.thirst=Math.max(0,Vitals.thirst-0.2*dt);
 Vitals.energy=Math.max(0,Vitals.energy-0.08*dt);
 Vitals.hygiene=Math.max(0,Vitals.hygiene-0.05*dt);
 if(Vitals.hunger<=0) Vitals.health=Math.max(0,Vitals.health-0.3*dt);
 if(Vitals.thirst<=0) Vitals.health=Math.max(0,Vitals.health-0.5*dt);
 if(Vitals.hunger>40&&Vitals.thirst>40&&Vitals.health<100) Vitals.health=Math.min(100,Vitals.health+0.05*dt);
};
Vitals.speedFactor=function(){ return Vitals.energy<25?0.55:(Vitals.energy<50?0.8:1); };
Vitals.sleep=function(){ Vitals.energy=100; Vitals.hunger=Math.max(0,Vitals.hunger-15); Vitals.thirst=Math.max(0,Vitals.thirst-10); Vitals.hygiene=Math.max(0,Vitals.hygiene-10); };
Vitals.useToilet=function(){ Vitals.hygiene=100; };
Vitals.applyItem=function(effect){ if(effect.hunger) Vitals.hunger=Math.min(100,Vitals.hunger+effect.hunger); if(effect.thirst) Vitals.thirst=Math.min(100,Vitals.thirst+effect.thirst); if(effect.hygiene) Vitals.hygiene=Math.min(100,Vitals.hygiene+effect.hygiene); };
Vitals.refreshHUD=function(){
 $('vHealth').style.width=Vitals.health+'%'; $('vEnergy').style.width=Vitals.energy+'%';
 $('vHunger').style.width=Vitals.hunger+'%'; $('vThirst').style.width=Vitals.thirst+'%'; $('vHygiene').style.width=Vitals.hygiene+'%';
};

/* ---- Economy / Inventory ---- */
const ITEMS={
 water:{id:'water',name:'Water Bottle',price:20,effect:{thirst:35}},
 sandwich:{id:'sandwich',name:'Sandwich (Kesra)',price:40,effect:{hunger:35}},
 coffee:{id:'coffee',name:'Coffee',price:30,effect:{thirst:15,energy:10}},
 soap:{id:'soap',name:'Soap',price:15,effect:{hygiene:40}},
 flowers:{id:'flowers',name:'Flowers (gift)',price:60,effect:{}},
};
const Economy={cash:500,inventory:[]};
Economy.buy=function(itemId){
 const item=ITEMS[itemId]; if(!item||Economy.cash<item.price) return false;
 Economy.cash-=item.price;
 const line=Economy.inventory.find(i=>i.id===itemId);
 if(line) line.qty++; else Economy.inventory.push({id:itemId,qty:1});
 return true;
};
Economy.useItem=function(itemId){
 const line=Economy.inventory.find(i=>i.id===itemId); if(!line) return false;
 const item=ITEMS[itemId]; Vitals.applyItem(item.effect||{});
 line.qty--; if(line.qty<=0) Economy.inventory=Economy.inventory.filter(i=>i.id!==itemId);
 return true;
};
Economy.sellItem=function(itemId){
 const line=Economy.inventory.find(i=>i.id===itemId); if(!line) return false;
 Economy.cash+=Math.round(ITEMS[itemId].price*0.5);
 line.qty--; if(line.qty<=0) Economy.inventory=Economy.inventory.filter(i=>i.id!==itemId);
 return true;
};

/* ---- Relationships ---- */
const NPC_DEFS=[{id:'yasmine',name:'Yasmine'},{id:'karim',name:'Karim'},{id:'sofia',name:'Sofia'}];
const Relationships={state:{}};
NPC_DEFS.forEach(n=>Relationships.state[n.id]={affinity:0});
Relationships.talk=function(id){ Relationships.state[id].affinity=Math.min(100,Relationships.state[id].affinity+5); };
Relationships.gift=function(id,itemId){ if(!Economy.useItem(itemId)) return false; Relationships.state[id].affinity=Math.min(100,Relationships.state[id].affinity+15); return true; };
Relationships.dateAtCafe=function(id){ if(Economy.cash<20) return false; Economy.cash-=20; Relationships.state[id].affinity=Math.min(100,Relationships.state[id].affinity+20); return true; };
Relationships.propose=function(id){ if(Player.married || Relationships.state[id].affinity<80) return false; Player.married=true; Player.spouse=id; return true; };
Relationships.divorce=function(){ if(!Player.married) return false; if(Economy.cash<100) return false; Economy.cash-=100; Player.married=false; Player.spouse=null; return true; };
Player.married=false; Player.spouse=null;

/* ---- Vehicles ---- */
const DEALERSHIP=[
 {id:'sedan_new',name:'Sedan (New)',price:12000,color:0x274b52},
 {id:'hatch_new',name:'Hatchback (New)',price:8000,color:0x9c7a3a},
 {id:'sedan_used',name:'Sedan (Used)',price:3500,color:0x6b4226},
 {id:'hatch_used',name:'Hatchback (Used)',price:2200,color:0x555555},
];
const Vehicles={owned:[]};
Vehicles.initDefault=function(){ Vehicles.owned=[{mesh:World.playerCar,registered:true,name:'Starter Car'}]; World.playerCarRegistered=true; };
Vehicles.buy=function(catalogId){
 const c=DEALERSHIP.find(v=>v.id===catalogId); if(!c||Economy.cash<c.price) return false;
 Economy.cash-=c.price;
 const mesh=World.makeCar(World.landmarks.dealership.position.x,World.landmarks.dealership.position.z+10,c.color);
 Vehicles.owned.push({mesh,registered:true,name:c.name,price:c.price});
 return true;
};
Vehicles.sell=function(index){
 const v=Vehicles.owned[index]; if(!v||v.mesh===World.playerCar) return false;
 Economy.cash+=Math.round((v.price||4000)*0.5);
 World.scene.remove(v.mesh); Vehicles.owned.splice(index,1);
 return true;
};
/* Switch the actively-driven vehicle. registered=false marks an unregistered/stolen pickup. */
Vehicles.switchTo=function(mesh,registered){ World.playerCar=mesh; World.playerCarRegistered=registered; };
Vehicles.nearbyDrivable=function(pos){
 for(const v of Vehicles.owned) if(pos.distanceTo(v.mesh.position)<3) return {mesh:v.mesh,registered:v.registered};
 for(const c of World.parkedCars) if(pos.distanceTo(c.position)<3) return {mesh:c,registered:false};
 return null;
};

/* ---- Driving School / License ---- */
const License={has:false};
const DrivingSchool={active:false,gate:0,total:4,gates:[[-44,1,28],[-36,1,28],[-36,1,20],[-44,1,20]]};
DrivingSchool.start=function(){ DrivingSchool.active=true; DrivingSchool.gate=0; };
DrivingSchool.checkProgress=function(carPos){
 if(!DrivingSchool.active) return;
 const g=DrivingSchool.gates[DrivingSchool.gate]; if(!g) return;
 if(carPos.distanceTo(new THREE.Vector3(g[0],g[1],g[2]))<4){
  DrivingSchool.gate++;
  if(DrivingSchool.gate>=DrivingSchool.total){ DrivingSchool.active=false; License.has=true; }
 }
};

/* ---- Police checkpoint ---- */
const Police={cooldown:0,wanted:0};
Police.addWanted=function(n){
 Police.wanted=Math.max(0,Math.min(5,Police.wanted+n));
 const box=$('wantedBox');
 if(Police.wanted<=0){ box.style.display='none'; return; }
 box.style.display='block'; box.textContent='🚨 '+'★'.repeat(Police.wanted)+'☆'.repeat(5-Police.wanted);
 PoliceAI.trigger(Player.camera.position,Police.wanted);
};
Police.maybeTrigger=function(carPos,dt){
 Police.cooldown=Math.max(0,Police.cooldown-dt);
 if(Police.cooldown>0||!World.checkpointPos) return;
 if(carPos.distanceTo(World.checkpointPos)<4){ Police.cooldown=40; Police.trigger(); }
};
Police.trigger=function(){
 const registered=World.playerCarRegistered!==false;
 if(License.has && registered){ Police.showResult('ok'); return; }
 $('polTitle').textContent='Police Checkpoint';
 $('polBody').textContent=(!License.has?"No driver's license on file. ":'')+(!registered?'Vehicle is unregistered.':'');
 $('pPolice').classList.add('open');
};
Police.showResult=function(kind){
 $('polTitle').textContent='Police Checkpoint';
 $('polBody').textContent=kind==='ok'?'Papers in order. You may go.':'';
 $('pPolice').classList.add('open');
 setTimeout(()=>$('pPolice').classList.remove('open'),1200);
};
Police.comply=function(){
 let fine=0, impound=!(World.playerCarRegistered!==false), jail=false;
 if(!License.has) fine+=50;
 if(fine>0){ if(Economy.cash>=fine) Economy.cash-=fine; else jail=true; }
 $('pPolice').classList.remove('open');
 if(impound){ Player.mode='walk'; }
 if(jail){ Police.addWanted(1); World.enterInterior('prison',Player.camera,outsidePos); }
};
Police.payFine=function(){
 if(Economy.cash>=100){ Economy.cash-=100; $('pPolice').classList.remove('open'); }
 else Police.comply();
};
Police.flee=function(){ $('pPolice').classList.remove('open'); Police.addWanted(2); };

/* ---- Multiplayer architecture stub (offline mode is the only implemented mode) ---- */
const NetworkManager={ws:null,
 connect(url){ try{ this.ws=new WebSocket(url); this.ws.onmessage=e=>this.onMessage(JSON.parse(e.data)); this.ws.onerror=()=>console.warn('NetworkManager: no server at',url); }catch(e){ console.warn('NetworkManager: connect failed',e); } },
 send(type,payload){ if(this.ws&&this.ws.readyState===1) this.ws.send(JSON.stringify({type,payload})); },
 onMessage(msg){ /* route: 'pvp','respawn','heist','role' — wired once a real server exists */ }
};

/* ---- Gang: recruit nearby friendly NPCs as following companions ----
   Recruiting itself happens from js/npc.js's NPCPool.greet (pressing E on a pooled NPC), so this
   file owns the state/behavior: following formation, riding along when driving, and simple cover
   fire during a pursuit (a chance per interval to knock an active chase car out of the pursuit). */
const Gang={members:[],max:4,suppressCooldown:0};
Gang.recruit=function(npcEntry){
 if(Gang.members.length>=Gang.max||Gang.members.includes(npcEntry)) return false;
 npcEntry.recruited=true; Gang.members.push(npcEntry); return true;
};
Gang.dismiss=function(npcEntry){
 const i=Gang.members.indexOf(npcEntry); if(i<0) return false;
 npcEntry.recruited=false; Gang.members.splice(i,1); return true;
};
Gang.update=function(dt){
 if(Gang.members.length===0) return;
 const mode=Player.mode, playerPos=Player.camera.position, yaw=Player.camera.rotation.y;
 Gang.members.forEach((m,i)=>{
  let target;
  if(mode==='drive'){
   const ang=(i+1)*(Math.PI*2/(Gang.max+1));
   target=new THREE.Vector3(World.playerCar.position.x+Math.sin(ang)*2,0,World.playerCar.position.z+Math.cos(ang)*2);
  } else {
   const back=(i+1)*1.6, side=(i%2===0?1:-1)*1.2;
   target=new THREE.Vector3(playerPos.x-Math.sin(yaw)*back+side*Math.cos(yaw),0,playerPos.z-Math.cos(yaw)*back-side*Math.sin(yaw));
  }
  const toTarget=new THREE.Vector3().subVectors(target,m.mesh.position); toTarget.y=0;
  const dist=toTarget.length();
  if(dist>0.3){ toTarget.normalize(); m.mesh.position.addScaledVector(toTarget,Math.min(dist,6*dt)); m.mesh.rotation.y=Math.atan2(toTarget.x,toTarget.z); }
  World.resolveCollision(m.mesh.position,0.35);
 });
 Gang.suppressCooldown=Math.max(0,Gang.suppressCooldown-dt);
 if(PoliceAI.active && Gang.suppressCooldown<=0){
  Gang.suppressCooldown=3+Math.random()*2;
  const activeCars=PoliceAI.cars.filter(c=>c.visible);
  if(activeCars.length>0 && Math.random()<Math.min(0.8,0.2*Gang.members.length)){
   const car=activeCars[Math.floor(Math.random()*activeCars.length)];
   car.visible=false; car.position.set(9999,9999,9999);
  }
 }
};
/* $15,000/member goes to "the crew" (not individually tracked — they're world NPCs, not persistent
   economic agents); the remainder is the player's cut. Bigger crew = more cover fire, smaller cut. */
Gang.distributePayout=function(totalLoot){
 const crewCut=15000*Gang.members.length, playerCut=Math.max(0,totalLoot-crewCut);
 Economy.cash+=playerCut;
 return {playerCut,crewCut,totalLoot};
};

/* ---- Bank Heist: walk up to the vault door inside the bank interior to auto-start;
   walk near each cash bag to auto-collect; collecting all of them completes the heist. ---- */
const HeistSystem={active:false,collected:0};
HeistSystem.start=function(){
 if(HeistSystem.active) return false;
 HeistSystem.active=true; HeistSystem.collected=0;
 World.cashBags.forEach(b=>{ b.collected=false; b.mesh.visible=true; });
 return true;
};
HeistSystem.tick=function(dt){
 if(World.activeInterior!=='bank') return;
 const p=Player.camera.position;
 if(!HeistSystem.active){
  if(World.bankVaultLocal && p.distanceTo(World.bankVaultLocal)<2.2) HeistSystem.start();
  return;
 }
 for(const bag of World.cashBags){
  if(bag.collected) continue;
  if(p.distanceTo(bag.localPos)<1.6){
   bag.collected=true; bag.mesh.visible=false; HeistSystem.collected++;
   if(HeistSystem.collected>=World.cashBags.length) HeistSystem.complete();
  }
 }
};
HeistSystem.complete=function(){
 HeistSystem.active=false;
 const totalLoot=25000+Math.floor(Math.random()*15000);
 const result=Gang.distributePayout(totalLoot);
 Police.wanted=0; Police.addWanted(5); // instant max wanted + full pursuit response = the "aggressive SWAT" escalation
 World.exitInterior(Player.camera,outsidePos);
 $('polTitle').textContent='Heist Complete';
 $('polBody').textContent='Grabbed $'+result.totalLoot+'. Crew cut: $'+result.crewCut+'. Your cut: $'+result.playerCut+'. Cops are already moving.';
 $('pPolice').classList.add('open');
 setTimeout(()=>$('pPolice').classList.remove('open'),2500);
 UI.refreshHUD();
 MissionSystem.notifyHeist();
};

/* ---- Real estate spawn points & Garage (vehicle summon) ---- */
Player.properties=Player.properties||[]; Player.spawnPoint=Player.spawnPoint||null;
const RealEstate={};
RealEstate.setSpawn=function(propertyId){
 if(!Player.properties.includes(propertyId)) return false;
 Player.spawnPoint=propertyId; return true;
};
const Garage={};
Garage.summon=function(ownedIndex){
 const v=Vehicles.owned[ownedIndex]; if(!v) return false;
 const p=Player.camera.position;
 const ang=Math.random()*Math.PI*2;
 v.mesh.position.set(p.x+Math.sin(ang)*4,0,p.z+Math.cos(ang)*4);
 return true;
};
