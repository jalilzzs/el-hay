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
 if(jail){ World.enterInterior('prison',Player.camera,outsidePos); }
};
Police.payFine=function(){
 if(Economy.cash>=100){ Economy.cash-=100; $('pPolice').classList.remove('open'); }
 else Police.comply();
};
Police.flee=function(){ Police.wanted++; $('pPolice').classList.remove('open'); PoliceAI.trigger(Player.camera.position); };

/* ---- Multiplayer architecture stub (offline mode is the only implemented mode) ---- */
const NetworkManager={ws:null,
 connect(url){ try{ this.ws=new WebSocket(url); this.ws.onmessage=e=>this.onMessage(JSON.parse(e.data)); this.ws.onerror=()=>console.warn('NetworkManager: no server at',url); }catch(e){ console.warn('NetworkManager: connect failed',e); } },
 send(type,payload){ if(this.ws&&this.ws.readyState===1) this.ws.send(JSON.stringify({type,payload})); },
 onMessage(msg){ /* route: 'pvp','respawn','heist','role' — wired once a real server exists */ }
};
