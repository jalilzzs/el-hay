/* ============ Persistence: Supabase (REST) with localStorage fallback ============ */
/* Requires a Supabase table `saves` with columns: user_id (text, primary key), data (jsonb).
   Works fully offline via localStorage today; starts writing to Supabase the moment
   SUPABASE_URL/SUPABASE_ANON_KEY (js/ui.js) are filled in and the table exists. */
const Persistence={};
Persistence.supabaseReady=function(){ return !!(SUPABASE_URL && SUPABASE_ANON_KEY); };
Persistence.userId=function(){
 let id=localStorage.getItem('elhay_uid');
 if(!id){ id='guest_'+Math.random().toString(36).slice(2); localStorage.setItem('elhay_uid',id); }
 return id;
};
Persistence.serialize=function(){
 return {
  cash:Economy.cash,
  inventory:Economy.inventory,
  vehicles:Vehicles.owned.slice(1).map(v=>({name:v.name,registered:v.registered,x:v.mesh.position.x,z:v.mesh.position.z})),
  missionIndex:MissionSystem.index, missionActive:MissionSystem.active,
  affinities:Object.fromEntries(Object.entries(Relationships.state).map(([k,v])=>[k,v.affinity])),
  married:Player.married, spouse:Player.spouse,
  license:License.has,
  vitals:{health:Vitals.health,energy:Vitals.energy,hunger:Vitals.hunger,thirst:Vitals.thirst,hygiene:Vitals.hygiene},
  properties:Player.properties||[],
  spawnPoint:Player.spawnPoint||null,
  wanted:Police.wanted,
  gangCount:Gang.members.length, // members re-recruited fresh from the pool on load, not the same individuals
  weaponsOwned:Weapons.owned, weaponsReserve:Weapons.reserve,
  playerPos:Player.camera?{x:Player.camera.position.x,y:Player.camera.position.y,z:Player.camera.position.z}:null,
 };
};
Persistence.save=async function(){
 const data=Persistence.serialize();
 localStorage.setItem('elhay_save',JSON.stringify(data)); // always kept in sync as the offline fallback
 if(!Persistence.supabaseReady()) return;
 try{
  await fetch(SUPABASE_URL+'/rest/v1/saves',{
   method:'POST',
   headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ANON_KEY,'Prefer':'resolution=merge-duplicates'},
   body:JSON.stringify([{user_id:Persistence.userId(),data}])
  });
 }catch(e){ console.warn('Supabase save failed — local save kept as fallback.',e); }
};
Persistence.load=async function(){
 let data=null;
 if(Persistence.supabaseReady()){
  try{
   const res=await fetch(SUPABASE_URL+'/rest/v1/saves?user_id=eq.'+Persistence.userId()+'&select=data',
    {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ANON_KEY}});
   const rows=await res.json();
   if(Array.isArray(rows)&&rows[0]) data=rows[0].data;
  }catch(e){ console.warn('Supabase load failed — falling back to local save.',e); }
 }
 if(!data){ const raw=localStorage.getItem('elhay_save'); if(raw){ try{ data=JSON.parse(raw); }catch(e){} } }
 if(!data) return false;
 Persistence.apply(data);
 return true;
};
Persistence.apply=function(data){
 Economy.cash=data.cash??Economy.cash;
 Economy.inventory=data.inventory||[];
 MissionSystem.index=data.missionIndex||0; MissionSystem.active=data.missionActive!==false; MissionSystem.render();
 if(data.affinities) Object.keys(data.affinities).forEach(k=>{ if(Relationships.state[k]) Relationships.state[k].affinity=data.affinities[k]; });
 Player.married=!!data.married; Player.spouse=data.spouse||null;
 License.has=!!data.license;
 if(data.vitals) Object.assign(Vitals,data.vitals);
 Player.properties=data.properties||[];
 Player.spawnPoint=data.spawnPoint||null;
 if(typeof data.wanted==='number' && data.wanted>0) Police.addWanted(data.wanted);
 if(data.gangCount){
  const candidates=NPCPool.pool.filter(n=>n.active&&!n.recruited);
  for(let i=0;i<Math.min(data.gangCount,candidates.length);i++) Gang.recruit(candidates[i]);
 }
 if(data.weaponsOwned) Weapons.owned=data.weaponsOwned;
 if(data.weaponsReserve) Weapons.reserve=data.weaponsReserve;
 if(data.vehicles) data.vehicles.forEach(v=>{ const mesh=World.makeCar(v.x,v.z,0x555555); Vehicles.owned.push({mesh,registered:v.registered,name:v.name}); });
 if(data.playerPos && Player.camera) Player.camera.position.set(data.playerPos.x,data.playerPos.y,data.playerPos.z);
 UI.refreshHUD(); Weapons.refreshHUD();
};
