/* ============ Missions: 40-entry story arc + generic objective engine + minimap ============ */

/* First 10: hand-authored narrative beats continuing "struggle to success" after release.
   Remaining 30: templated objective types (delivery/driving-test/rivalry/property) per the brief —
   flagged clearly here since they are procedurally generated from a small set of real, working
   objective types rather than 30 individually bespoke scripted missions. */
const MISSIONS=[
 {id:1,title:'First Steps',desc:'Walk to your old home and see what is left of it.',type:'goto',target:{x:-70,z:-16},reward:{cash:50}},
 {id:2,title:'An Old Friend',desc:'Find Sofia near the house — she remembers you.',type:'talk',target:'sofia',reward:{cash:30}},
 {id:3,title:'Getting By',desc:'You need cash. Visit the store and see what work is around.',type:'goto',target:{x:20,z:-15},reward:{cash:60}},
 {id:4,title:'A Warm Meal',desc:'Head to the café — Karim said he might have news for you.',type:'talk',target:'karim',reward:{cash:30}},
 {id:5,title:'Wheels Again',desc:'Get to the dealership and see about a car — you cannot walk everywhere.',type:'goto',target:{x:60,z:13},reward:{cash:0}},
 {id:6,title:'Papers in Order',desc:'The police stop unlicensed drivers. Get to the driving school.',type:'goto',target:{x:-40,z:35},reward:{cash:20}},
 {id:7,title:'Passing the Test',desc:'Complete the driving test course to earn your license.',type:'drive',target:{x:-20,z:20},reward:{cash:100}},
 {id:8,title:'Making Rounds',desc:'Drive to the hospital — a courier job is waiting.',type:'drive',target:{x:-60,z:-53},reward:{cash:80}},
 {id:9,title:'Yasmine',desc:'Someone new at the café has been asking about you.',type:'talk',target:'yasmine',reward:{cash:20}},
 {id:10,title:'Standing on Your Own',desc:'Report to City Hall — it is time to make things official in the neighborhood.',type:'goto',target:{x:0,z:35},reward:{cash:150}},
];
const TEMPLATES=[
 {title:'Courier Run',desc:'Deliver a package across town.',type:'drive'},
 {title:'Driving Refresher',desc:'Prove you still remember the checkpoint course.',type:'drive'},
 {title:'Neighborhood Dispute',desc:'Talk to a local about the rivalry brewing on the block.',type:'talk'},
 {title:'Property Scouting',desc:'Check out a building that might be worth buying into.',type:'goto'},
];
const NPC_POOL=['yasmine','karim','sofia'];
const SPOTS=[{x:20,z:-15},{x:0,z:-36},{x:-40,z:35},{x:60,z:13},{x:-60,z:-53},{x:0,z:35},{x:30,z:50}];
for(let i=0;i<30;i++){
 const tpl=TEMPLATES[i%TEMPLATES.length];
 const target=tpl.type==='talk'?NPC_POOL[i%NPC_POOL.length]:SPOTS[i%SPOTS.length];
 MISSIONS.push({id:11+i,title:tpl.title+' #'+(i+1),desc:tpl.desc,type:tpl.type,target,reward:{cash:40+Math.floor(Math.random()*60)}});
}
// Bank Heist beat, spliced in as an early-crew-building milestone rather than appended at the end
MISSIONS.splice(4,0,{id:'heist',title:'The Big Score',desc:'Recruit some backup, then hit the bank vault. Grab every bag before the police catch on.',type:'heist',target:null,reward:{cash:0}});

const MissionSystem={index:0,active:false};
MissionSystem.start=function(){ MissionSystem.index=0; MissionSystem.active=true; MissionSystem.render(); };
MissionSystem.current=function(){ return MissionSystem.active?MISSIONS[MissionSystem.index]:null; };
MissionSystem.complete=function(){
 const m=MissionSystem.current(); if(!m) return;
 Economy.cash+=m.reward.cash||0; UI.refreshHUD();
 MissionSystem.index++;
 if(MissionSystem.index>=MISSIONS.length){ MissionSystem.active=false; }
 MissionSystem.render();
};
MissionSystem.notifyTalk=function(npcId){ const m=MissionSystem.current(); if(m&&m.type==='talk'&&m.target===npcId) MissionSystem.complete(); };
MissionSystem.notifyHeist=function(){ const m=MissionSystem.current(); if(m&&m.type==='heist') MissionSystem.complete(); };
MissionSystem.checkProgress=function(playerPos,carPos,mode){
 const m=MissionSystem.current(); if(!m) return;
 if(m.type==='goto' && playerPos.distanceTo(new THREE.Vector3(m.target.x,playerPos.y,m.target.z))<5) MissionSystem.complete();
 if(m.type==='drive' && mode==='drive' && carPos.distanceTo(new THREE.Vector3(m.target.x,carPos.y,m.target.z))<6) MissionSystem.complete();
};
MissionSystem.render=function(){
 const box=$('missionBox');
 const m=MissionSystem.current();
 if(!m){ box.style.display='none'; return; }
 box.style.display='block';
 box.innerHTML='<b>'+m.title+'</b>'+m.desc+(m.type==='story'?'<br><button id="misContinue">Continue</button>':'');
 if(m.type==='story'){ $('misContinue').onclick=MissionSystem.complete; }
};

/* ---- Minimap: top-down, fixed north-up, custom icons per POI type, player + waypoint.
   Toggleable full-screen overlay via clicking the small map or pressing M. ---- */
const Minimap={scale:1.6,fullscreenOpen:false};
const POI_ICONS={hospital:'🏥',police:'🚓',prison:'🔒',home:'🏠',store:'🛒',cafe:'☕',
 dealership:'🚗',drivingSchool:'🚦',cityHall:'🏛️',bank:'🏦',gunshop:'🔫',studio:'🏠',flat2:'🏠'};
function drawMinimapTo(cv,camera,scale){
 if(!cv) return;
 const ctx=cv.getContext('2d'); const w=cv.width,h=cv.height;
 ctx.clearRect(0,0,w,h); ctx.fillStyle='#141a1e'; ctx.fillRect(0,0,w,h);
 const px=camera.position.x, pz=camera.position.z;
 const toMap=(x,z)=>({mx:w/2+(x-px)*scale, my:h/2+(z-pz)*scale});
 World.pois.forEach(p=>{ const m=toMap(p.pos.x,p.pos.z); if(m.mx<-20||m.mx>w+20||m.my<-20||m.my>h+20) return;
  ctx.font=(scale>2?'20px':'13px')+' sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(POI_ICONS[p.id]||'📍',m.mx,m.my);
 });
 const mission=MissionSystem.current();
 if(mission && mission.target && mission.target.x!==undefined){
  const m=toMap(mission.target.x,mission.target.z);
  ctx.strokeStyle='#e7c65a'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(m.mx,m.my,scale>2?12:7,0,7); ctx.stroke();
 }
 ctx.save(); ctx.translate(w/2,h/2); ctx.rotate(-camera.rotation.y);
 ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(0,-7); ctx.lineTo(5,6); ctx.lineTo(-5,6); ctx.closePath(); ctx.fill();
 ctx.restore();
}
Minimap.draw=function(camera){
 if($('minimap').style.display!=='none') drawMinimapTo($('mmCanvas'),camera,Minimap.scale);
 if(Minimap.fullscreenOpen) drawMinimapTo($('fullMapCanvas'),camera,0.7);
};
Minimap.toggleFullscreen=function(){
 Minimap.fullscreenOpen=!Minimap.fullscreenOpen;
 $('fullMap').classList.toggle('open',Minimap.fullscreenOpen);
};
