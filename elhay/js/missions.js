/* ============ Missions: 40-entry story arc + generic objective engine + minimap ============ */

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

const NPC_POOL=[
 'yasmine',
 'karim',
 'sofia'
];

const SPOTS=[
 {x:20,z:-15},
 {x:0,z:-36},
 {x:-40,z:35},
 {x:60,z:13},
 {x:-60,z:-53},
 {x:0,z:35},
 {x:30,z:50}
];

for(let i=0;i<30;i++){

 const tpl=
  TEMPLATES[
   i%TEMPLATES.length
  ];

 const target=
  tpl.type==='talk'
   ? NPC_POOL[
      i%NPC_POOL.length
     ]
   : SPOTS[
      i%SPOTS.length
     ];

 MISSIONS.push({
  id:11+i,
  title:
   tpl.title+
   ' #'+
   (i+1),
  desc:tpl.desc,
  type:tpl.type,
  target,
  reward:{
   cash:
    40+
    Math.floor(
     Math.random()*60
    )
  }
 });
}

MISSIONS.splice(
 4,
 0,
 {
  id:'heist',
  title:'The Big Score',
  desc:'Recruit some backup, then hit the bank vault. Grab every bag before the police catch on.',
  type:'heist',
  target:null,
  reward:{cash:0}
 }
);

const MissionSystem={
 index:0,
 active:false
};

MissionSystem.start=function(){

 MissionSystem.index=0;
 MissionSystem.active=true;

 MissionSystem.render();
};

MissionSystem.current=function(){

 return MissionSystem.active
  ? MISSIONS[
     MissionSystem.index
    ]
  : null;
};

MissionSystem.complete=function(){

 const m=
  MissionSystem.current();

 if(!m) return;

 Economy.cash+=
  m.reward.cash||
  0;

 UI.refreshHUD();

 MissionSystem.index++;

 if(
  MissionSystem.index>=
  MISSIONS.length
 ){
  MissionSystem.active=false;
 }

 MissionSystem.render();
};

MissionSystem.notifyTalk=function(
 npcId
){

 const m=
  MissionSystem.current();

 if(
  m&&
  m.type==='talk'&&
  m.target===npcId
 ){
  MissionSystem.complete();
 }
};

MissionSystem.notifyHeist=function(){

 const m=
  MissionSystem.current();

 if(
  m&&
  m.type==='heist'
 ){
  MissionSystem.complete();
 }
};

MissionSystem.checkProgress=function(
 playerPos,
 carPos,
 mode
){

 const m=
  MissionSystem.current();

 if(!m) return;

 if(m.id===7&&typeof License!=='undefined'&&License.has){
  MissionSystem.complete();
  return;
 }

 if(
  m.type==='goto'&&
  playerPos.distanceTo(
   new THREE.Vector3(
    m.target.x,
    playerPos.y,
    m.target.z
   )
  )<5
 ){

  MissionSystem.complete();
 }

 if(
  m.type==='drive'&&
  mode==='drive'&&
  carPos.distanceTo(
   new THREE.Vector3(
    m.target.x,
    carPos.y,
    m.target.z
   )
  )<6
 ){

  MissionSystem.complete();
 }
};

MissionSystem.render=function(){
 MissionSystem.renderList();

 const box=$('missionBox');

 if(!box) return;

 const m=
  MissionSystem.current();

 if(!m){

  box.style.display='none';

  return;
 }

 box.style.display='none'; /* missions are shown in the map menu */

 box.innerHTML=
  '<b>'+
  m.title+
  '</b>'+
  m.desc+
  (
   m.type==='story'
    ? '<br><button id="misContinue">Continue</button>'
    : ''
  );

 if(m.type==='story'){

  const btn=
   $('misContinue');

  if(btn){
   btn.onclick=
    MissionSystem.complete;
  }
 }
};


/* ============ Minimap ============ */

const Minimap={
 scale:1.6,
 fullscreenOpen:false
};

const POI_ICONS={
 hospital:'🏥',
 police:'🚓',
 prison:'🔒',
 home:'🏠',
 store:'🛒',
 cafe:'☕',
 dealership:'🚗',
 drivingSchool:'🚦',
 cityHall:'🏛️',
 bank:'🏦',
 gunshop:'🔫',
 studio:'🏠',
 flat2:'🏠',
 villa:'🏠',
 restaurant:'🍽️',
 mechanic:'🔧',
 supermarket:'🛒',
 office:'🏢',
 motel:'🛏️',
 pharmacy:'💊',
 factory:'🏭',
 warehouse:'📦',
 postOffice:'📮',
 constructionSite:'🚧',
 taxiDepot:'🚕'
};

function drawMinimapTo(
 cv,
 camera,
 scale
){

 if(!cv) return;

 const ctx=
  cv.getContext('2d');

 const w=cv.width;
 const h=cv.height;

 ctx.clearRect(
  0,
  0,
  w,
  h
 );

 ctx.fillStyle='#2c4527';
 ctx.fillRect(0,0,w,h);

 (function(){
  if(typeof World==='undefined')return;
  const cx0=camera.position.x,cz0=camera.position.z;
  const hx=w/2/scale+20,hz=h/2/scale+20;
  const S=40;
  /* sidewalks then asphalt, along both axes */
  [[14,'#8d8d86'],[8,'#3b3f44']].forEach(function(L){
   ctx.fillStyle=L[1];
   for(let k=Math.ceil((cx0-hx)/S);k<=Math.floor((cx0+hx)/S);k++){
    ctx.fillRect(w/2+(k*S-L[0]/2-cx0)*scale,0,L[0]*scale,h);
   }
   for(let k=Math.ceil((cz0-hz)/S);k<=Math.floor((cz0+hz)/S);k++){
    ctx.fillRect(0,h/2+(k*S-L[0]/2-cz0)*scale,w,L[0]*scale);
   }
  });
  /* dashed centre lines */
  ctx.strokeStyle='rgba(240,220,120,.55)';
  ctx.lineWidth=1;
  ctx.setLineDash([6,6]);
  ctx.beginPath();
  for(let k=Math.ceil((cx0-hx)/S);k<=Math.floor((cx0+hx)/S);k++){
   const X=w/2+(k*S-cx0)*scale;ctx.moveTo(X,0);ctx.lineTo(X,h);
  }
  for(let k=Math.ceil((cz0-hz)/S);k<=Math.floor((cz0+hz)/S);k++){
   const Y=h/2+(k*S-cz0)*scale;ctx.moveTo(0,Y);ctx.lineTo(w,Y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  /* real building footprints */
  if(Array.isArray(World.collidables)){
   ctx.fillStyle='#9aa3ad';
   ctx.strokeStyle='#4b535c';
   World.collidables.forEach(function(b){
    if(!b||!b.min||!b.max)return;
    if(b.max.x<cx0-hx||b.min.x>cx0+hx||b.max.z<cz0-hz||b.min.z>cz0+hz)return;
    const x=w/2+(b.min.x-cx0)*scale,y=h/2+(b.min.z-cz0)*scale;
    const bw=(b.max.x-b.min.x)*scale,bh=(b.max.z-b.min.z)*scale;
    if(bw<1.5||bh<1.5)return;
    ctx.fillRect(x,y,bw,bh);
    ctx.strokeRect(x,y,bw,bh);
   });
  }
 })();

 const px=
  camera.position.x;

 const pz=
  camera.position.z;

 const toMap=function(
  x,
  z
 ){

  return{
   mx:
    w/2+
    (x-px)*scale,

   my:
    h/2+
    (z-pz)*scale
  };
 };

 if(
  typeof World!=='undefined'&&
  Array.isArray(World.pois)
 ){

  World.pois.forEach(
   p=>{

    if(!p||!p.pos) return;

    const m=
     toMap(
      p.pos.x,
      p.pos.z
     );

    if(
     m.mx<-20||
     m.mx>w+20||
     m.my<-20||
     m.my>h+20
    ){
     return;
    }

    ctx.font=
     (
      scale>2
       ? '20px'
       : '13px'
     )+
     ' sans-serif';

    ctx.textAlign='center';
    ctx.textBaseline='middle';

    ctx.fillText(
     POI_ICONS[p.id]||
      '📍',
     m.mx,
     m.my
    );
   }
  );
 }

 /*
  * Relationship NPCs.
  */
 if(
  typeof NPCPool!=='undefined'&&
  Array.isArray(NPCPool.pool)
 ){

  NPCPool.pool.forEach(
   n=>{

    if(
     !n||
     !n.active||
     !n.relationshipId
    ){
     return;
    }

    if(!n.mesh) return;

    const m=
     toMap(
      n.mesh.position.x,
      n.mesh.position.z
     );

    if(
     m.mx<-20||
     m.mx>w+20||
     m.my<-20||
     m.my>h+20
    ){
     return;
    }

    let icon='👤';

    if(
     typeof Relationships!=='undefined'&&
     Relationships.isSpouse&&
     Relationships.isSpouse(
      n.relationshipId
     )
    ){

     icon='❤️';

    }else if(
     typeof Relationships!=='undefined'&&
     Relationships.isFollowing&&
     Relationships.isFollowing(
      n.relationshipId
     )
    ){

     icon='💚';
    }

    ctx.font=
     (
      scale>2
       ? '17px'
       : '12px'
     )+
     ' sans-serif';

    ctx.fillText(
     icon,
     m.mx,
     m.my
    );
   }
  );
 }

 const mission=
  MissionSystem.current();

 if(
  mission&&
  mission.target&&
  mission.target.x!==undefined
 ){

  const m=
   toMap(
    mission.target.x,
    mission.target.z
   );

  ctx.strokeStyle=
   '#e7c65a';

  ctx.lineWidth=2;

  ctx.beginPath();

  ctx.arc(
   m.mx,
   m.my,
   scale>2
    ? 12
    : 7,
   0,
   7
  );

  ctx.stroke();
 }

 ctx.save();

 ctx.translate(
  w/2,
  h/2
 );

 ctx.rotate(
  -camera.rotation.y
 );

 ctx.fillStyle='#fff';

 ctx.beginPath();

 ctx.moveTo(
  0,
  -7
 );

 ctx.lineTo(
  5,
  6
 );

 ctx.lineTo(
  -5,
  6
 );

 ctx.closePath();

 ctx.fill();

 ctx.restore();
}

Minimap.draw=function(
 camera
){

 const mini=
  $('minimap');

 if(
  mini&&
  mini.style.display!=='none'
 ){

  drawMinimapTo(
   $('mmCanvas'),
   camera,
   Minimap.scale
  );
 }

 if(
  Minimap.fullscreenOpen
 ){

  drawMinimapTo(
   $('fullMapCanvas'),
   camera,
   Minimap.detail?1.5:0.7
  );
 }
};

Minimap.toggleFullscreen=function(){

 Minimap.fullscreenOpen=
  !Minimap.fullscreenOpen;

 const fullMap=
  $('fullMap');

 if(fullMap){

  fullMap.classList.toggle(
   'open',
   Minimap.fullscreenOpen
  );
 }
};


/* ============ Map menu: missions list, settings, detailed map ============ */
MissionSystem.renderList=function(){
 const el=$('mapMissions');
 if(!el)return;
 const cur=MissionSystem.current();
 let h='';
 if(cur){
  h+='<div class="mi"><b>'+cur.title+'</b>'+cur.desc+'</div>';
 }else{
  h+='<div class="mi">لا توجد مهمة نشطة حالياً.</div>';
 }
 const idx=MissionSystem.index||0;
 for(let i=Math.max(0,idx-3);i<idx&&i<MISSIONS.length;i++){
  h+='<div class="mi done"><b>✔ '+MISSIONS[i].title+'</b></div>';
 }
 el.innerHTML=h;
};

Minimap.detail=false;
Minimap.setView=function(detail){
 Minimap.detail=!!detail;
 const fm=$('fullMap'),ml=$('mapMissions');
 if(fm)fm.classList.toggle('detail',Minimap.detail);
 if(ml)ml.style.display=Minimap.detail?'none':'block';
 const b1=$('mapBtnView'),b2=$('mapBtnMis');
 if(b1)b1.classList.toggle('on',Minimap.detail);
 if(b2)b2.classList.toggle('on',!Minimap.detail);
 MissionSystem.renderList();
};
(function(){
 const wire=function(){
  const a=$('mapBtnSet'),b=$('mapBtnView'),c=$('mapBtnMis');
  if(!a||!b||!c)return setTimeout(wire,500);
  a.onclick=function(){const p=$('pSettings');if(p)p.classList.add('open');};
  b.onclick=function(){Minimap.setView(true);};
  c.onclick=function(){Minimap.setView(false);};
 };
 wire();
})();
