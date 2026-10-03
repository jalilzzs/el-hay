/* ============ World: textures, chunk streaming, buildings, vehicles, interiors, NPCs ============ */
const World={};

function canvasTex(draw,w=256,h=256){
 const cv=document.createElement('canvas');
 cv.width=w;cv.height=h;
 draw(cv.getContext('2d'),w,h);
 const tx=new THREE.CanvasTexture(cv);
 tx.wrapS=tx.wrapT=THREE.RepeatWrapping;
 return tx;
}

/* ============ BUILDING FACADE TEXTURES ============ */
function facadeTex(base,trim,winColor,hasBalcony){
 return canvasTex((g,w,h)=>{
  g.fillStyle=base;g.fillRect(0,0,w,h);
  g.fillStyle=trim;g.fillRect(0,0,w,10);
  const rows=5,cols=4,mx=18,my=26;
  const cw=(w-mx*2)/cols,chh=(h-my*2)/rows;
  for(let r=0;r<rows;r++)for(let cIdx=0;cIdx<cols;cIdx++){
   const x=mx+cIdx*cw+cw*0.18;
   const y=my+r*chh+chh*0.15;
   const ww=cw*0.64;
   const hh=chh*0.6;
   g.fillStyle='rgba(0,0,0,0.25)';
   g.fillRect(x-2,y-2,ww+4,hh+4);
   g.fillStyle=winColor;
   g.fillRect(x,y,ww,hh);
   g.strokeStyle='rgba(0,0,0,0.3)';
   g.lineWidth=1;
   g.strokeRect(x,y,ww,hh);
   if(hasBalcony&&r%2===0){
    g.fillStyle=trim;
    g.fillRect(x-4,y+hh+3,ww+8,4);
   }
  }
  g.fillStyle=trim;
  g.fillRect(w/2-14,h-30,28,30);
  g.fillStyle='#2b2b2b';
  g.fillRect(w/2-10,h-27,20,24);
 },256,384);
}

const TEX={
 residential:facadeTex('#d8b98a','#8a5a3a','#3d4d55',true),
 residential2:facadeTex('#e3c9a0','#7a4a30','#33424a',true),

 retail:canvasTex((g,w,h)=>{
  g.fillStyle='#e7dcc4';g.fillRect(0,0,w,h);
  g.fillStyle='#b23a2e';g.fillRect(0,h-40,w,30);
  g.fillStyle='#fff';g.fillRect(10,h-70,w-20,16);
  g.fillStyle='#2b2b2b';g.fillRect(20,h-30,w-40,26);
 }),

 hospital:canvasTex((g,w,h)=>{
  g.fillStyle='#f2f6fa';g.fillRect(0,0,w,h);
  g.fillStyle='#2f6fb0';g.fillRect(0,h-24,w,24);
  for(let r=0;r<6;r++)for(let cIdx=0;cIdx<4;cIdx++){
   g.fillStyle='#bcd4ea';
   g.fillRect(20+cIdx*60,30+r*40,40,26);
  }
  g.fillStyle='#c0392b';
  g.fillRect(w/2-6,h/2-24,12,48);
  g.fillRect(w/2-24,h/2-6,48,12);
 }),

 police:canvasTex((g,w,h)=>{
  g.fillStyle='#5a5750';g.fillRect(0,0,w,h);
  for(let y=0;y<h;y+=18){
   g.fillStyle='#3d3a35';
   g.fillRect(0,y,w,2);
  }
  g.fillStyle='#146b3a';
  g.beginPath();g.arc(w/2,h/2-20,20,0,7);g.fill();
  g.fillStyle='#c0392b';
  g.beginPath();g.arc(w/2,h/2-20,9,0,7);g.fill();
 }),

 road:canvasTex((g,w,h)=>{
  g.fillStyle='#2b2b2e';g.fillRect(0,0,w,h);
 },64,160),

 roadStripe:canvasTex((g,w,h)=>{
  g.clearRect(0,0,w,h);
  g.fillStyle='#e7c65a';
  for(let y=0;y<h;y+=40)g.fillRect(w/2-2,y,4,24);
  g.fillStyle='#f0ece2';
  g.fillRect(4,0,3,h);
  g.fillRect(w-7,0,3,h);
 },64,160),

 grass:canvasTex((g,w,h)=>{
  g.fillStyle='#3f6b3a';g.fillRect(0,0,w,h);
  g.fillStyle='#365c32';
  for(let i=0;i<80;i++){
   const x=Math.random()*w,y=Math.random()*h;
   g.fillRect(x,y,2,2);
  }
 }),

 sidewalk:canvasTex((g,w,h)=>{
  g.fillStyle='#b0aca0';g.fillRect(0,0,w,h);
  g.strokeStyle='#8f8b7e';g.lineWidth=1.5;
  for(let x=0;x<=w;x+=16){
   g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();
  }
  for(let y=0;y<=h;y+=16){
   g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();
  }
  g.strokeStyle='#c7c3b6';g.lineWidth=0.75;
  for(let x=1;x<w;x+=16){
   g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();
  }
 })
};

Object.values(TEX).forEach(tx=>tx.repeat.set(1,1));
World.TEX=TEX;

/* ============ ROADS ============ */
const ROAD_HALF=4;
const SIDEWALK_W=3;
const SIDEWALK_MID=ROAD_HALF+SIDEWALK_W/2;

function sidewalkSpot(axis,coord,along,side){
 const off=side*SIDEWALK_MID;
 if(axis==='x'){
  return {x:coord+off,z:along,faceRotY:side>0?-Math.PI/2:Math.PI/2};
 }
 return {x:along,z:coord+off,faceRotY:side>0?Math.PI:0};
}

/* ============ WORLD INIT ============ */
World.init=function(scene,renderer){
 World.scene=scene;
 World.renderer=renderer;
 World.collidables=[];
 World.npcs=[];
 World._roadMeshes=[];
 World.interiors={};
 World.interiorInteractables={};
 World.interiorMeta={};
 World.activeInterior=null;
 World.currentInteriorMeta=null;
 World._signs=[];
 World._ledges=[];
 World._lmWalls=[];

 const groundMat=new THREE.MeshStandardMaterial({map:TEX.grass,roughness:1});
 TEX.grass.repeat.set(200,200);

 const ground=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),groundMat);
 ground.rotation.x=-Math.PI/2;
 ground.position.y=0;
 ground.receiveShadow=true;
 scene.add(ground);

 const roadMat=new THREE.MeshStandardMaterial({
  map:TEX.road,roughness:0.9,
  polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1
 });

 const stripeMat=new THREE.MeshStandardMaterial({
  map:TEX.roadStripe,roughness:0.9,transparent:true,alphaTest:0.4,
  polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2
 });

 const sidewalkMat=new THREE.MeshStandardMaterial({map:TEX.sidewalk,roughness:1});

 TEX.road.repeat.set(1,50);
 TEX.roadStripe.repeat.set(1,50);

 function makeRoad(x,z,w,l){
  const asphalt=new THREE.Mesh(new THREE.PlaneGeometry(w,l),roadMat);
  asphalt.rotation.x=-Math.PI/2;
  asphalt.position.set(x,0.02,z);
  asphalt.receiveShadow=true;
  scene.add(asphalt);
  World._roadMeshes.push(asphalt);

  const stripe=new THREE.Mesh(new THREE.PlaneGeometry(w,l),stripeMat);
  stripe.rotation.x=-Math.PI/2;
  stripe.position.set(x,0.04,z);
  scene.add(stripe);
  World._roadMeshes.push(stripe);
 }

 function makeSidewalk(x,z,w,l){
  const s=new THREE.Mesh(new THREE.PlaneGeometry(w,l),sidewalkMat);
  s.rotation.x=-Math.PI/2;
  s.position.set(x,0.015,z);
  s.receiveShadow=true;
  scene.add(s);
 }

 for(let i=-4;i<=4;i++){
  makeRoad(i*40,0,ROAD_HALF*2,2000);
  makeRoad(0,i*40,2000,ROAD_HALF*2);
  makeSidewalk(i*40-SIDEWALK_MID,0,SIDEWALK_W,2000);
  makeSidewalk(i*40+SIDEWALK_MID,0,SIDEWALK_W,2000);
  makeSidewalk(0,i*40-SIDEWALK_MID,2000,SIDEWALK_W);
  makeSidewalk(0,i*40+SIDEWALK_MID,2000,SIDEWALK_W);
 }

 World.roadClearance=ROAD_HALF+SIDEWALK_W+2;

 buildLandmarks(scene);
 World.landmarkCollidableCount=World.collidables.length;

 const cruiser=World.makeCar(50,-50,0x151515,'police');
 cruiser.rotation.y=Math.PI/4;

 const officer=spawnNPC(58,-52);
 officer.mesh.children[0].material.color.set(0x1f3b57);

 buildBillboardLandmarks(scene);
 buildInteriors(scene);

 World.playerCar=World.makeCar(-68,-18,0x274b52,'sedan');
 World.parkedCars=[];

 /* Parked cars now use the real models: sedans, hatchbacks (compact sedans), an SUV and a pickup */
 const parkedTypes=['sedan','suv','pickup','hatchback','sedan'];

 for(let i=0;i<5;i++){
  const c=World.makeCar(
   -40+i*20,
   10,
   [0x8a3a3a,0x3a5a8a,0x555,0x2f6b4a,0x9c7a3a][i],
   parkedTypes[i]
  );
  c.rotation.y=Math.random()*Math.PI;
  World.parkedCars.push(c);
 }

 spawnKeyNpcs();

 World.checkpointBarrier=new THREE.Mesh(
  new THREE.BoxGeometry(6,0.4,0.4),
  new THREE.MeshStandardMaterial({color:0xd94b3a})
 );
 scene.add(World.checkpointBarrier);

 World.checkpointOfficer=spawnNPC(0,0);
 World.checkpointOfficer.mesh.children[0].material.color.set(0x1f3b57);

 World.checkpointOfficer2=spawnNPC(0,0);
 World.checkpointOfficer2.mesh.children[0].material.color.set(0x1f3b57);

 World.checkpointCruiser=World.makeCar(0,0,0x151515,'police');
 World.checkpointCruiser2=World.makeCar(0,0,0x151515,'police');
 World.checkpointPos=null;
 World.cp={state:'init',t:0,hold:0,dir:1,vertical:true,k:0,stop:0};
 World.checkpointBarrier.visible=false;
 World.checkpointOfficer.mesh.visible=false;
 World.checkpointOfficer2.mesh.visible=false;

 World.chunks=new Map();
 World.updateChunks(0,0);

 Traffic.init();

 /* city models (GLB): buildings, roads, characters, trees */
 CityAssets.start();
};

/* ============ MOBILE CHECKPOINT ============
 * Two police cruisers patrol the roads, stop at a random spot, set up a
 * roadblock for a while, then pack up and move to another place.
 */
function cpLane(vertical,k,along,dir){
 /* lane position + heading of a car driving in direction dir on a road line */
 if(vertical)return {x:k+(dir>0?-2:2),z:along,rot:dir>0?0:Math.PI};
 return {x:along,z:k+(dir>0?2:-2),rot:dir>0?Math.PI/2:-Math.PI/2};
}

World.cpSpawn=function(px,pz){
 const cp=World.cp;
 cp.vertical=Math.random()<0.5;
 cp.dir=Math.random()<0.5?1:-1;
 const near=cp.vertical?px:pz;
 const alongP=cp.vertical?pz:px;
 cp.k=(Math.round(near/40)+Math.floor(Math.random()*5)-2)*40;
 const raw=alongP+(Math.random()<0.5?-1:1)*(50+Math.random()*60);
 cp.stop=Math.floor(raw/40)*40+12+Math.random()*16; /* never inside an intersection */
 cp.pos=cp.stop-cp.dir*70;
 cp.state='drive';
 cp.t=0;
 World.cpPlaceCars();
};

World.cpPlaceCars=function(){
 const cp=World.cp;
 const a=cpLane(cp.vertical,cp.k,cp.pos,cp.dir);
 const b=cpLane(cp.vertical,cp.k,cp.pos-cp.dir*8,cp.dir);
 World.checkpointCruiser.position.set(a.x,0,a.z);
 World.checkpointCruiser.rotation.y=a.rot;
 World.checkpointCruiser2.position.set(b.x,0,b.z);
 World.checkpointCruiser2.rotation.y=b.rot;
};

World.cpSetup=function(){
 const cp=World.cp;
 const x=cp.vertical?cp.k:cp.stop;
 const z=cp.vertical?cp.stop:cp.k;
 const v=cp.vertical;
 const rotY=v?0:Math.PI/2;

 World.checkpointBarrier.visible=true;
 World.checkpointBarrier.position.set(x,0.6,z);
 World.checkpointBarrier.rotation.y=rotY;

 const o1=World.checkpointOfficer.mesh,o2=World.checkpointOfficer2.mesh;
 o1.visible=o2.visible=true;
 o1.position.set(x+(v?1.5:0),0,z+(v?0:1.5));
 o2.position.set(x-(v?1.5:0),0,z-(v?0:1.5));
 o1.rotation.y=o2.rotation.y=rotY;

 World.checkpointCruiser.position.set(x+(v?3:0),0,z+(v?0:3));
 World.checkpointCruiser.rotation.y=rotY+Math.PI/2;
 World.checkpointCruiser2.position.set(x-(v?3:0),0,z-(v?0:3));
 World.checkpointCruiser2.rotation.y=rotY-Math.PI/2;

 World.checkpointPos=new THREE.Vector3(x,0,z);
 cp.state='hold';
 cp.hold=50+Math.random()*40;
};

World.cpPack=function(){
 const cp=World.cp;
 World.checkpointBarrier.visible=false;
 World.checkpointOfficer.mesh.visible=false;
 World.checkpointOfficer2.mesh.visible=false;
 World.checkpointPos=null;
 cp.state='leave';
 cp.pos=cp.stop;
 cp.t=0;
 World.cpPlaceCars();
};

World.updateCheckpoint=function(px,pz,dt){
 const cp=World.cp;
 if(!cp)return;
 if(cp.state==='init'){World.cpSpawn(px,pz);return;}

 if(cp.state==='drive'||cp.state==='leave'){
  cp.pos+=cp.dir*9*dt;
  cp.t+=dt;
  World.cpPlaceCars();
  if(cp.state==='drive'&&(cp.pos-cp.stop)*cp.dir>=0){World.cpSetup();return;}
  if(cp.state==='leave'){
   const A=World.checkpointCruiser.position;
   const far=Math.hypot(A.x-px,A.z-pz)>170;
   if(far||cp.t>30)World.cpSpawn(px,pz);
  }
 }else if(cp.state==='hold'){
  cp.hold-=dt;
  if(cp.hold<=0&&!(typeof Police!=='undefined'&&Police.checkpointActive))World.cpPack();
 }
};

World.randomizeCheckpoint=function(){
 if(World.cp&&World.cp.state==='hold')World.cpPack();
 if(World.cp)World.cp.state='init';
};

/* ============ COLLISION ============ */
World.resolveCollision=function(pos,radius){
 for(const b of World.collidables){
  const minX=b.min.x-radius;
  const maxX=b.max.x+radius;
  const minZ=b.min.z-radius;
  const maxZ=b.max.z+radius;

  if(pos.x>minX&&pos.x<maxX&&pos.z>minZ&&pos.z<maxZ){
   const pushLeft=pos.x-minX;
   const pushRight=maxX-pos.x;
   const pushBack=pos.z-minZ;
   const pushFwd=maxZ-pos.z;
   const min=Math.min(pushLeft,pushRight,pushBack,pushFwd);

   if(min===pushLeft)pos.x=minX;
   else if(min===pushRight)pos.x=maxX;
   else if(min===pushBack)pos.z=minZ;
   else pos.z=maxZ;
  }
 }
 return pos;
};

/* ============ LANDMARK MATERIALS ============ */
const matRes=new THREE.MeshStandardMaterial({map:TEX.residential,roughness:0.85});
const matRetail=new THREE.MeshStandardMaterial({map:TEX.retail,roughness:0.85});
const matHosp=new THREE.MeshStandardMaterial({map:TEX.hospital,roughness:0.6});
const matPolice=new THREE.MeshStandardMaterial({map:TEX.police,roughness:0.95});

function block(scene,x,y,z,w,h,d,mat){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
 m.position.set(x,y+h/2,z);
 m.castShadow=true;
 m.receiveShadow=true;
 scene.add(m);

 World.collidables.push({
  min:new THREE.Vector3(x-w/2,0,z-d/2),
  max:new THREE.Vector3(x+w/2,h,z+d/2)
 });
 return m;
}

function roofLedge(scene,x,y,z,w,d,color){
 const m=new THREE.Mesh(
  new THREE.BoxGeometry(w+0.6,0.3,d+0.6),
  new THREE.MeshStandardMaterial({color})
 );
 m.position.set(x,y,z);
 scene.add(m);
 if(World._ledges)World._ledges.push(m);
 return m;
}

/* ============ SIGNS ============ */
function signboardTex(text,bg,fg){
 return canvasTex((g,w,h)=>{
  g.fillStyle=bg;
  g.fillRect(0,0,w,h);
  g.strokeStyle='rgba(0,0,0,0.3)';
  g.lineWidth=5;
  g.strokeRect(3,3,w-6,h-6);
  g.fillStyle=fg;
  g.font='bold 66px "Segoe UI",Tahoma,sans-serif';
  g.textAlign='center';
  g.textBaseline='middle';
  g.fillText(text,w/2,h/2+2);
 },512,128);
}

function mountSignboard(scene,x,y,z,rotY,w,h,text,bg,fg){
 const mesh=new THREE.Mesh(
  new THREE.PlaneGeometry(w,h),
  new THREE.MeshBasicMaterial({map:signboardTex(text,bg,fg)})
 );
 mesh.position.set(x,y,z);
 mesh.rotation.y=rotY;
 scene.add(mesh);
 if(World._signs)World._signs.push(mesh);
 return mesh;
}

/* ============ LANDMARKS ============ */
World.landmarks={};

const matCafe=new THREE.MeshStandardMaterial({color:0x7a5230,roughness:0.8});
const matDeal=new THREE.MeshStandardMaterial({color:0x3d5a6c,roughness:0.6});
const matSchool=new THREE.MeshStandardMaterial({color:0xb8a06a,roughness:0.8});
const matHall=new THREE.MeshStandardMaterial({color:0xe3d9c0,roughness:0.7});
const matBank=new THREE.MeshStandardMaterial({color:0xcfc9b8,roughness:0.5,metalness:0.1});
const matGunShop=new THREE.MeshStandardMaterial({color:0x3a3a3a,roughness:0.9});
const matSafehouse=new THREE.MeshStandardMaterial({map:TEX.residential2,roughness:0.85});
const matVilla=new THREE.MeshStandardMaterial({color:0xe8dcc0,roughness:0.6,metalness:0.05});

/* New building materials */
const matRestaurant=new THREE.MeshStandardMaterial({color:0x9b3d2f,roughness:0.72});
const matMechanic=new THREE.MeshStandardMaterial({color:0x49545b,roughness:0.82,metalness:0.1});
const matSupermarket=new THREE.MeshStandardMaterial({color:0xd4c15b,roughness:0.78});
const matOffice=new THREE.MeshStandardMaterial({color:0x687989,roughness:0.62,metalness:0.05});
const matMotel=new THREE.MeshStandardMaterial({color:0x9c7659,roughness:0.8});
const matPharmacy=new THREE.MeshStandardMaterial({color:0xdde8df,roughness:0.65});

/* ============ JOBS ============ */
const Jobs={
 last:{},
 msg(t){
  if(typeof UI!=='undefined'&&UI.dom&&UI.dom.prompt){
   UI.dom.prompt.textContent=t;
   UI.dom.prompt.style.display='block';
   clearTimeout(Jobs._t);
   Jobs._t=setTimeout(()=>{if(UI.dom.prompt)UI.dom.prompt.style.display='none';},2200);
  }
 },
 work(id,o){
  const now=performance.now();
  if(Jobs.last[id]&&now-Jobs.last[id]<5000){Jobs.msg('⏳ Take a short break first...');return;}
  if(o.license&&typeof License!=='undefined'&&!License.has){Jobs.msg('🚫 You need a driving license for this job.');return;}
  if(typeof Vitals!=='undefined'){
   if(Vitals.energy<12){Jobs.msg('😴 Too tired to work. Get some sleep.');return;}
   if(Vitals.hunger<8){Jobs.msg('🍔 Too hungry to work. Eat something.');return;}
   Vitals.energy=Math.max(0,Vitals.energy-(o.energy||8));
   Vitals.hunger=Math.max(0,Vitals.hunger-(o.hunger||4));
  }
  Jobs.last[id]=now;
  const room=id.split(':')[0];
  const mult=Jobs.employed===room?1.25:(Jobs.employed?0.7:0.6);
  const pay=Math.round(o.pay*mult*(0.9+Math.random()*0.3));
  if(typeof Economy!=='undefined')Economy.cash+=pay;
  Jobs.msg('💼 '+o.title+' — you earned $'+pay);
 }
};

Jobs.employed=null;
Jobs.list=[
 {id:'factory',name:'Factory',desc:'Assembly line shifts',pay:48},
 {id:'warehouse',name:'Warehouse',desc:'Load and move crates',pay:42},
 {id:'postOffice',name:'Post Office',desc:'Sort mail',pay:36},
 {id:'constructionSite',name:'Construction Site',desc:'Heavy work, best pay on foot',pay:62},
 {id:'taxiDepot',name:'Taxi Depot',desc:'Taxi shifts (license needed)',pay:72},
 {id:'hospital',name:'Hospital',desc:'Nurse shifts',pay:58},
 {id:'office',name:'Office',desc:'Desk work',pay:52},
 {id:'mechanic',name:'Mechanic Workshop',desc:'Repair cars',pay:56},
 {id:'restaurant',name:'Restaurant',desc:'Wait tables',pay:30},
 {id:'supermarket',name:'Supermarket',desc:'Work the till',pay:30},
 {id:'pharmacy',name:'Pharmacy',desc:'Serve customers',pay:32}
];
Jobs.apply=function(id){Jobs.employed=id;Jobs.msg('✅ You now work at: '+(Jobs.list.find(j=>j.id===id)||{}).name);};
Jobs.quit=function(){Jobs.employed=null;Jobs.msg('You quit your job.');};
Jobs.teleport=function(id){
 if(World.activeInterior){Jobs.msg('Leave the building first.');return false;}
 if(typeof Player!=='undefined'&&Player.mode==='drive'){Jobs.msg('Get out of the car first.');return false;}
 const poi=World.pois.find(p=>p.id===id&&!p.dyn);
 if(!poi||typeof camera==='undefined')return false;
 camera.position.set(poi.pos.x,camera.position.y,poi.pos.z+1.5);
 return true;
};

function jobSpot(room,x,z,o){
 return registerInteriorObject(room,'job',new THREE.Vector3(x,48.9,z),{radius:2,label:o.title,onUse:()=>Jobs.work(room+':'+o.title,o)});
}

function buildLandmarks(scene){

 World.landmarks.hospital=block(scene,-60,0,-60,14,10,14,matHosp);
 roofLedge(scene,-60,10.15,-60,14,14,0xffffff);

 World.landmarks.police=block(scene,60,0,-60,12,9,12,matPolice);
 roofLedge(scene,60,9.15,-60,12,12,0x3d3a35);

 World.landmarks.prison=block(scene,30,0,60,18,12,20,matPolice);
 roofLedge(scene,30,12.15,60,18,20,0x3d3a35);

 const wallMat=new THREE.MeshStandardMaterial({color:0x4a4842,roughness:1});

 [
  [-18,0,50,3,6,20],
  [18,0,50,3,6,20]
 ].forEach(p=>{
  World._lmWalls.push(block(scene,p[0]+12,p[1],p[2],p[3],p[4],p[5],wallMat));
 });

 World.landmarks.home=block(scene,-70,0,-20,8,7,8,matRes);
 World.landmarks.retail=block(scene,20,0,-20,10,6,10,matRetail);
 World.landmarks.cafe=block(scene,0,0,-40,8,5,8,matCafe);
 World.landmarks.dealership=block(scene,60,0,20,12,5,14,matDeal);
 World.landmarks.drivingSchool=block(scene,-40,0,40,10,5,10,matSchool);

 World.landmarks.cityHall=block(scene,0,0,40,12,8,12,matHall);
 roofLedge(scene,0,8.15,40,12,12,0xe3d9c0);

 World.landmarks.bank=block(scene,-60,0,20,14,10,14,matBank);
 roofLedge(scene,-60,10.15,20,14,14,0xcfc9b8);

 World.landmarks.gunshop=block(scene,60,0,-20,8,5,8,matGunShop);
 World.landmarks.studio=block(scene,20,0,20,8,6,8,matSafehouse);
 World.landmarks.flat2=block(scene,-20,0,-60,8,6,8,matSafehouse);

 World.landmarks.villa=block(scene,-20,0,60,12,8,12,matVilla);
 roofLedge(scene,-20,8.15,60,12,12,0xe8dcc0);

 /* New enterable buildings */
 World.landmarks.restaurant=block(scene,-20,0,20,10,6,10,matRestaurant);

 /*
  * IMPORTANT:
  * Supermarket used to be at the exact same position as Restaurant.
  * It is moved to a free block at (-40,20).
  */
 World.landmarks.supermarket=block(scene,-40,0,20,12,6,10,matSupermarket);
 World.landmarks.mechanic=block(scene,40,0,40,12,6,14,matMechanic);
 World.landmarks.office=block(scene,60,0,60,12,8,10,matOffice);
 World.landmarks.motel=block(scene,-60,0,60,12,6,14,matMotel);
 World.landmarks.pharmacy=block(scene,20,0,60,8,5,8,matPharmacy);

 /* Signs */
 mountSignboard(scene,60,7.5,-53.7,0,4.2,1.1,'مركز الشرطة','#1f3b57','#ffffff');
 mountSignboard(scene,-60,7.5,12.7,Math.PI,3.2,1.1,'البنك','#f2f0e6','#1f3b57');
 mountSignboard(scene,30,9.5,49.7,Math.PI,3.6,1.1,'السجن','#1c1c1c','#e0e0e0');
 mountSignboard(scene,-20,6.7,14.8,0,3.4,0.9,'RESTAURANT','#7b1e16','#fff1dc');
 mountSignboard(scene,40,6.7,32.8,Math.PI,3.8,0.9,'AUTO SERVICE','#26343c','#f4d35e');
 mountSignboard(scene,20,5.7,55.8,Math.PI,3.2,0.9,'PHARMACY','#eaf4ed','#217346');
 mountSignboard(scene,-60,6.7,52.8,0,3.4,0.9,'MOTEL','#704c38','#fff');
 mountSignboard(scene,-40,6.7,14.8,0,3.6,0.9,'SUPERMARKET','#8a7418','#fff8cf');
}

/* ============ POI REGISTRY ============ */
World.pois=[
 {id:'hospital',name:'Hospital',type:'interior',pos:new THREE.Vector3(-60,1,-53),color:'#4a90b8'},
 {id:'police',name:'Police Station',type:'interior',pos:new THREE.Vector3(60,1,-54),color:'#3d5a6c'},
 {id:'prison',name:'Prison',type:'interior',pos:new THREE.Vector3(30,1,50),color:'#555'},
 {id:'home',name:'Home',type:'interior',pos:new THREE.Vector3(-70,1,-16),color:'#c9a24b'},

 {id:'store',name:'Store',type:'shop',pos:new THREE.Vector3(20,1,-15),color:'#e7dcc4'},
 {id:'cafe',name:'Café',type:'shop',pos:new THREE.Vector3(0,1,-36),color:'#7a5230'},
 {id:'dealership',name:'Dealership',type:'shop',pos:new THREE.Vector3(60,1,13),color:'#3d5a6c'},
 {id:'drivingSchool',name:'Driving School',type:'shop',pos:new THREE.Vector3(-40,1,35),color:'#b8a06a'},
 {id:'cityHall',name:'City Hall',type:'shop',pos:new THREE.Vector3(0,1,35),color:'#e3d9c0'},

 {id:'bank',name:'Bank',type:'interior',pos:new THREE.Vector3(-60,1,13),color:'#cfc9b8'},
 {id:'gunshop',name:'Gun Shop',type:'interior',pos:new THREE.Vector3(60,1,-16),color:'#3a3a3a'},

 {id:'studio',name:'Studio Apartment',type:'interior',pos:new THREE.Vector3(20,1,16),color:'#e3c9a0',ownable:true},
 {id:'flat2',name:'2-Room Flat',type:'interior',pos:new THREE.Vector3(-20,1,-56),color:'#e3c9a0',ownable:true},
 {id:'villa',name:'Villa',type:'interior',pos:new THREE.Vector3(-20,1,54),color:'#e8dcc0',ownable:true},

 {id:'restaurant',name:'Restaurant',type:'interior',pos:new THREE.Vector3(-20,1,14.5),color:'#9b3d2f'},
 {id:'mechanic',name:'Mechanic Workshop',type:'interior',pos:new THREE.Vector3(40,1,32.5),color:'#49545b'},
 {id:'supermarket',name:'Supermarket',type:'interior',pos:new THREE.Vector3(-40,1,14.5),color:'#d4c15b'},
 {id:'office',name:'Office',type:'interior',pos:new THREE.Vector3(60,1,54.5),color:'#687989'},
 {id:'motel',name:'Motel',type:'interior',pos:new THREE.Vector3(-60,1,52.5),color:'#9c7659'},
 {id:'pharmacy',name:'Pharmacy',type:'interior',pos:new THREE.Vector3(20,1,55),color:'#dde8df'}
];

World.entrances=World.pois.filter(p=>p.type==='interior');
World.shops=World.pois.filter(p=>p.type==='shop');

/* ============ INTERIOR SYSTEM ============ */
World.interiors={};
World.interiorInteractables={};
World.activeInterior=null;
World.currentInteriorMeta=null;

function interiorMaterial(color,roughness=0.85){
 return new THREE.MeshStandardMaterial({color,roughness,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
}

function registerInteriorObject(room,type,position,options={}){
 if(!World.interiorInteractables[room]){World.interiorInteractables[room]=[];}
 const item={
  room,type,
  position:position.clone?position.clone():new THREE.Vector3(position.x,position.y,position.z),
  radius:options.radius||1.35,
  label:options.label||null,
  ...options
 };
 World.interiorInteractables[room].push(item);
 return item;
}

function makeInterior(scene,name,wallColor,floorColor,accent){
 const g=new THREE.Group();
 g.visible=false;

 /* Every interior is a clean 12x12 room. */
 const ROOM_W=12;
 const ROOM_D=12;
 const FLOOR_Y=-2.50;
 const CEILING_Y=2.50;

 const shellMat=new THREE.MeshBasicMaterial({color:wallColor,side:THREE.BackSide,depthWrite:true});
 const shell=new THREE.Mesh(new THREE.BoxGeometry(ROOM_W,5,ROOM_D),shellMat);
 g.add(shell);

 const floorMat=new THREE.MeshStandardMaterial({
  color:floorColor,roughness:0.9,metalness:0,
  polygonOffset:true,polygonOffsetFactor:2,polygonOffsetUnits:2,depthWrite:true
 });
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W-0.08,ROOM_D-0.08),floorMat);
 floor.rotation.x=-Math.PI/2;
 floor.position.y=FLOOR_Y;
 floor.receiveShadow=true;
 floor.renderOrder=0;
 g.add(floor);

 const ceilingMat=new THREE.MeshStandardMaterial({color:wallColor,roughness:0.95,side:THREE.FrontSide});
 const ceiling=new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W-0.08,ROOM_D-0.08),ceilingMat);
 ceiling.rotation.x=Math.PI/2;
 ceiling.position.y=CEILING_Y;
 ceiling.receiveShadow=true;
 g.add(ceiling);

 const lamp=new THREE.Mesh(
  new THREE.CylinderGeometry(0.18,0.32,0.08,16),
  new THREE.MeshStandardMaterial({color:0xfff5d6,emissive:0xffd98a,emissiveIntensity:0.7})
 );
 lamp.position.set(0,2.2,0);
 g.add(lamp);

 if(accent){
  const a=new THREE.Mesh(new THREE.BoxGeometry(7,0.9,0.12),interiorMaterial(accent,0.7));
  a.position.set(0,0.2,-5.85);
  g.add(a);
 }

 g.position.set(0,50,0);
 g.userData.width=ROOM_W;
 g.userData.depth=ROOM_D;
 g.userData.floorY=50+FLOOR_Y;
 g.userData.eyeY=49.2;
 g.userData.ceilingY=50+CEILING_Y;

 scene.add(g);
 World.interiors[name]=g;
 World.interiorInteractables[name]=[];
 return g;
}

/* ============ FURNITURE HELPERS ============ */
function addBox(parent,x,y,z,w,h,d,color,roughness=0.8){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),interiorMaterial(color,roughness));
 mesh.position.set(x,y,z);
 mesh.castShadow=true;
 mesh.receiveShadow=true;
 parent.add(mesh);
 return mesh;
}

function addCylinder(parent,x,y,z,r,h,color,segments=16){
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),interiorMaterial(color,0.75));
 mesh.position.set(x,y,z);
 mesh.castShadow=true;
 mesh.receiveShadow=true;
 parent.add(mesh);
 return mesh;
}

function addRug(parent,x,z,w,d,color){
 const rug=new THREE.Mesh(
  new THREE.BoxGeometry(w,0.035,d),
  new THREE.MeshStandardMaterial({color,roughness:1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,depthWrite:true})
 );
 rug.position.set(x,-2.43,z);
 rug.receiveShadow=true;
 rug.renderOrder=1;
 parent.add(rug);
 return rug;
}

function addTable(parent,x,z,w=1.8,d=1,color=0x70472b){
 const top=addBox(parent,x,-1.35,z,w,0.16,d,color);
 const legColor=0x3d291d;
 [[-w/2+0.12,-d/2+0.12],[w/2-0.12,-d/2+0.12],[-w/2+0.12,d/2-0.12],[w/2-0.12,d/2-0.12]].forEach(p=>{
  addBox(parent,x+p[0],-1.9,z+p[1],0.11,1.0,0.11,legColor);
 });
 return top;
}

function addChair(parent,x,z,rot=0,color=0x4a3022){
 const g=new THREE.Group();
 const seat=addBox(g,0,0,0,0.55,0.12,0.55,color);
 seat.position.y=-1.55;
 addBox(g,0,0.42,-0.22,0.55,0.75,0.1,color);
 [[-0.2,-0.35],[0.2,-0.35],[-0.2,0.2],[0.2,0.2]].forEach(p=>{
  addBox(g,p[0],-1.98,p[1],0.08,0.45,0.08,color);
 });
 g.position.set(x,0,z);
 g.rotation.y=rot;
 parent.add(g);
 return g;
}

function addSofa(parent,x,z,rot=0,color=0x5a4034){
 const g=new THREE.Group();
 addBox(g,0,-1.55,0,2.8,0.5,0.95,color);
 addBox(g,0,-1.05,-0.34,2.8,0.95,0.22,color);
 addBox(g,-1.25,-1.25,0,0.22,0.9,0.95,color);
 addBox(g,1.25,-1.25,0,0.22,0.9,0.95,color); /* fixed: depth argument was missing */
 g.position.set(x,0,z);
 g.rotation.y=rot;
 parent.add(g);
 return g;
}

function addBed(parent,x,z,w=2.2,d=3.1,color=0x75472d,sheet=0xd8dce2){
 const g=new THREE.Group();
 addBox(g,0,-1.72,0,w,0.42,d,color);
 addBox(g,0,-1.47,0,w-0.15,0.16,d-0.15,sheet);
 addBox(g,0,-0.8,-d/2+0.18,w,1.2,0.22,color);
 const pillow1=addBox(g,-w*0.24,-1.34,-d/2+0.52,w*0.32,0.18,0.48,0xf3f0e7);
 const pillow2=addBox(g,w*0.24,-1.34,-d/2+0.52,w*0.32,0.18,0.48,0xf3f0e7);
 pillow1.rotation.x=-0.04;
 pillow2.rotation.x=0.04;
 g.position.set(x,0,z);
 parent.add(g);
 return g;
}

function addWardrobe(parent,x,z,w=1.5,d=0.5,color=0x5b3926){
 const g=new THREE.Group();
 addBox(g,0,-0.25,0,w,3.1,d,color);
 const doorMat=0x70472f;
 addBox(g,-w*0.25,0,d/2+0.015,w*0.45,2.8,0.035,doorMat);
 addBox(g,w*0.25,0,d/2+0.015,w*0.45,2.8,0.035,doorMat);
 addCylinder(g,-0.08,0.1,d/2+0.05,0.025,0.05,0xc6a45d,10);
 addCylinder(g,0.08,0.1,d/2+0.05,0.025,0.05,0xc6a45d,10);
 g.position.set(x,0,z);
 parent.add(g);
 return g;
}

function addTV(parent,x,z,rot=0){
 const g=new THREE.Group();

 const screenOffMat=new THREE.MeshStandardMaterial({color:0x080b0e,roughness:0.25,metalness:0.25,emissive:0x000000,emissiveIntensity:0});
 const screenOnMat=new THREE.MeshStandardMaterial({color:0x263d4b,roughness:0.22,metalness:0.2,emissive:0x123b55,emissiveIntensity:0.9});

 addBox(g,0,0,0,1.65,0.95,0.12,0x171717,0.35);

 const screen=new THREE.Mesh(new THREE.BoxGeometry(1.35,0.68,0.035),screenOffMat);
 screen.position.set(0,0,0.08);
 g.add(screen);

 addBox(g,0,-0.62,0,0.65,0.08,0.35,0x222222,0.5);

 const screenLight=new THREE.PointLight(0x4aa9ff,0,2.8,2);
 screenLight.position.set(0,0,0.18);
 g.add(screenLight);

 g.userData.tv=true;
 g.userData.on=false;
 g.userData.screen=screen;
 g.userData.screenOffMaterial=screenOffMat;
 g.userData.screenOnMaterial=screenOnMat;
 g.userData.screenLight=screenLight;

 g.userData.toggle=function(){
  g.userData.on=!g.userData.on;
  screen.material=g.userData.on?g.userData.screenOnMaterial:g.userData.screenOffMaterial;
  screenLight.intensity=g.userData.on?0.65:0;
 };

 g.position.set(x,-0.55,z);
 g.rotation.y=rot;
 parent.add(g);
 return g;
}

function addKitchen(parent,x,z,rot=0){
 const g=new THREE.Group();
 addBox(g,0,-1.35,0,3.0,1.15,0.65,0x6b4b36);
 addBox(g,0,-0.72,0,3.0,0.08,0.65,0xb9b7ad,0.35);
 for(let i=-1;i<=1;i++){addBox(g,i*0.85,-1.5,0.34,0.65,0.65,0.04,0x4b3325);}
 addBox(g,0,-0.63,0.02,0.9,0.08,0.4,0xd7d7d0,0.3);
 addCylinder(g,-0.25,-0.48,0.02,0.04,0.35,0x777777,10);
 addCylinder(g,0.25,-0.48,0.02,0.04,0.35,0x777777,10);
 addBox(g,-1.05,-0.25,0,0.7,2.0,0.55,0xeee8dc);
 addBox(g,1.05,-0.25,0,0.7,2.0,0.55,0xeee8dc);
 g.userData.kitchen=true;
 g.userData.onUse=function(){g.userData.lastUsed=performance.now();};
 g.position.set(x,0,z);
 g.rotation.y=rot;
 parent.add(g);
 return g;
}

function addSink(parent,x,z,rot=0){
 const g=new THREE.Group();
 addBox(g,0,-1.4,0,0.8,1.0,0.65,0xd8d3c8);
 addBox(g,0,-0.85,0,0.72,0.08,0.58,0xf1f1ee,0.3);
 addCylinder(g,0,-0.58,-0.12,0.035,0.45,0x777777,10);
 g.userData.sink=true;
 g.userData.onUse=function(){g.userData.lastUsed=performance.now();};
 g.position.set(x,0,z);
 g.rotation.y=rot;
 parent.add(g);
 return g;
}

function addToilet(parent,x,z,rot=0){
 const g=new THREE.Group();
 addBox(g,0,-1.65,0,0.7,0.48,0.75,0xf4f5f2,0.35);
 addBox(g,0,-1.18,-0.24,0.65,0.72,0.15,0xf4f5f2,0.35);
 addBox(g,0,-0.75,-0.3,0.62,0.5,0.12,0xf4f5f2,0.35);
 g.userData.toilet=true;
 g.userData.onUse=function(){g.userData.lastUsed=performance.now();};
 g.position.set(x,0,z);
 g.rotation.y=rot;
 parent.add(g);
 return g;
}

function addShower(parent,x,z,rot=0){
 const g=new THREE.Group();
 addBox(g,0,-0.45,0,1.4,0.08,1.4,0xadb5ba,0.3);
 const frameMat=0x7f8a8e;
 addBox(g,-0.68,0,0,0.06,2.3,0.06,frameMat);
 addBox(g,0.68,0,0,0.06,2.3,0.06,frameMat);
 addBox(g,0,1.12,-0.68,1.4,0.06,0.06,frameMat);
 addCylinder(g,0,0.55,0,0.055,0.5,0x777777,10);
 addCylinder(g,0,0.82,0,0.18,0.06,0x777777,12);
 g.userData.shower=true;
 g.userData.onUse=function(){g.userData.lastUsed=performance.now();};
 g.position.set(x,0,z);
 g.rotation.y=rot;
 parent.add(g);
 return g;
}

function addPlant(parent,x,z){
 const g=new THREE.Group();
 addCylinder(g,0,-1.85,0,0.28,0.5,0x8c5739,12);
 const leafMat=new THREE.MeshStandardMaterial({color:0x3f7a45,roughness:0.8});
 for(let i=0;i<5;i++){
  const leaf=new THREE.Mesh(new THREE.SphereGeometry(0.23,8,6),leafMat);
  const a=(i/5)*Math.PI*2;
  leaf.position.set(Math.cos(a)*0.25,-1.35+Math.random()*0.3,Math.sin(a)*0.25);
  leaf.scale.set(1,1.4,0.8);
  g.add(leaf);
 }
 g.position.set(x,0,z);
 parent.add(g);
 return g;
}

function addDesk(parent,x,z,rot=0){
 const g=new THREE.Group();
 addBox(g,0,-1.3,0,2.2,0.16,0.9,0x543724);
 addBox(g,-0.9,-1.85,0,0.12,1.0,0.7,0x543724);
 addBox(g,0.9,-1.85,0,0.12,1.0,0.7,0x543724);
 addBox(g,0,-0.95,0.05,0.7,0.45,0.08,0x15191d,0.3);
 g.position.set(x,0,z);
 g.rotation.y=rot;
 parent.add(g);
 return g;
}

function addLocker(parent,x,z,count=3){
 for(let i=0;i<count;i++){
  addBox(parent,x+i*0.52,-0.4,z,0.46,2.8,0.48,0x56636b,0.6);
 }
}

/* ============ INTERACTION REGISTRATION ============ */
function registerSeat(room,type,x,z,rot,options={}){
 return registerInteriorObject(room,type,new THREE.Vector3(x,50-1.45,z),{
  radius:options.radius||1.35,
  sitPosition:new THREE.Vector3(x,50-0.72,z),
  sitRotationY:rot,
  label:options.label||'Sit',
  onUse:options.onUse||null,
  ...options
 });
}

function registerTV(room,x,z,rot,tv){
 return registerInteriorObject(room,'tv',new THREE.Vector3(x,49.45,z),{
  radius:1.7,label:'Watch TV',object:tv,rotationY:rot,
  onUse:function(item){
   if(item.object&&item.object.userData&&item.object.userData.toggle){item.object.userData.toggle();}
  }
 });
}

function registerBed(room,x,z){
 return registerInteriorObject(room,'bed',new THREE.Vector3(x,48.28,z),{
  radius:1.6,label:'Sleep',
  onUse:function(){if(typeof Vitals!=='undefined'&&Vitals.sleep){Vitals.sleep();}}
 });
}

function registerToilet(room,x,z){
 return registerInteriorObject(room,'toilet',new THREE.Vector3(x,48.35,z),{
  radius:1.5,label:'Use Bathroom',
  onUse:function(){if(typeof Vitals!=='undefined'&&Vitals.useToilet){Vitals.useToilet();}}
 });
}

function registerKitchen(room,x,z){
 return registerInteriorObject(room,'kitchen',new THREE.Vector3(x,48.85,z),{radius:1.7,label:'Use Kitchen'});
}

function registerTable(room,x,z,type='table'){
 return registerInteriorObject(room,type,new THREE.Vector3(x,48.65,z),{
  radius:1.7,label:type==='restaurantTable'?'Sit at Table':'Use Table'
 });
}

/* ============ INTERIOR BUILD ============ */
function buildInteriors(scene){

 /* ---------- HOSPITAL ---------- */
 makeInterior(scene,'hospital',0xeaf1f8,0xdfe9f2,0xc0392b);
 const hospital=World.interiors.hospital;
 addRug(hospital,0,0,7.5,8,0xe7edf2);
 addBox(hospital,0,-1.3,-4.2,4.2,1.1,0.75,0x7a553a);
 addBox(hospital,0,-0.65,-4.25,3.9,0.08,0.7,0xe6e6e0,0.35);
 const hospitalTV=addTV(hospital,0,-5.2);
 registerTV('hospital',0,-5.2,0,hospitalTV);
 [-3,0,3].forEach(x=>{
  addBed(hospital,x,0,1.7,2.4,0xc4cbd0,0xffffff);
  addBox(hospital,x,-1.2,0.9,1.5,1.1,0.08,0x2f6fb0);
  registerBed('hospital',x,0);
 });
 addPlant(hospital,-5,3);
 addPlant(hospital,5,3);

 /* ---------- POLICE ---------- */
 makeInterior(scene,'police',0x3a3733,0x2a2825,0x146b3a);
 const police=World.interiors.police;
 addRug(police,0,0,8,8,0x333c38);
 addDesk(police,-2,-2.5);
 addDesk(police,2,-2.5);
 addChair(police,-2,-1.35,Math.PI);
 addChair(police,2,-1.35,Math.PI);
 registerSeat('police','chair',-2,-1.35,Math.PI);
 registerSeat('police','chair',2,-1.35,Math.PI);
 addLocker(police,-4.7,2.5,4);
 const policeTV=addTV(police,3.8,3.2,Math.PI);
 registerTV('police',3.8,3.2,Math.PI,policeTV);
 addBox(police,0,-1.0,5.1,3.0,2.0,0.15,0x333333);
 registerInteriorObject('police','licenseDesk',new THREE.Vector3(2,48.9,-1.9),{radius:2.2,label:'Licensing Desk (Gun License)',onUse:()=>{Jobs.msg('👮 Officer: "Licensing desk — how can I help?"');UI.openShop('policeDesk');}});

 /* ---------- PRISON ---------- */
 makeInterior(scene,'prison',0x2c2c2c,0x1f1f1f,0x555555);
 const prison=World.interiors.prison;
 addRug(prison,0,0,8,8,0x292929);
 [[-3,2.8],[0,2.8],[3,2.8]].forEach(p=>{
  addBed(prison,p[0],p[1],1.8,2.5,0x3a3a3a,0x777777);
 });
 const barMat=new THREE.MeshStandardMaterial({color:0x1a1a1a,metalness:0.7,roughness:0.35});
 for(let i=-5;i<=5;i++){
  const bar=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,3.8,8),barMat);
  bar.position.set(i*0.65,-0.2,5.4);
  prison.add(bar);
 }
 addBox(prison,0,-1.0,5.25,7.5,0.12,0.15,0x333333);

 /* ---------- HOME ---------- */
 makeInterior(scene,'home',0xe7d9be,0xc7a97a,0x8a5a3a);
 const home=World.interiors.home;
 addRug(home,0,0,7.5,5.5,0xa67b54);
 addBed(home,-3,-2.4,2.2,3.0,0x8b5e3c,0xd8dce2);
 addWardrobe(home,-4.8,-2.2,1.4,0.55);
 addSofa(home,2.6,1.4,Math.PI,0x5a4034);
 registerSeat('home','sofa',2.6,1.4,Math.PI,{radius:1.8});
 const homeTV=addTV(home,2.6,3.5,Math.PI);
 registerTV('home',2.6,3.5,Math.PI,homeTV);
 addTable(home,1.2,-1.0,1.4,0.85,0x70472b);
 addChair(home,0.5,-1.0,Math.PI/2);
 addChair(home,1.9,-1.0,-Math.PI/2);
 registerSeat('home','chair',0.5,-1.0,Math.PI/2);
 registerSeat('home','chair',1.9,-1.0,-Math.PI/2);
 registerTable('home',1.2,-1.0,'table');
 addKitchen(home,0,4.5,0);
 registerKitchen('home',0,4.5);
 addToilet(home,4.3,3.7,Math.PI);
 registerToilet('home',4.3,3.7);
 addShower(home,4.0,1.7,Math.PI);
 addPlant(home,4.5,-3.7);
 World.homeBedLocal=new THREE.Vector3(-3,50-1.72,-2.4);
 World.homeToiletLocal=new THREE.Vector3(4.3,50-1.65,3.7);
 registerBed('home',-3,-2.4);

 /* ---------- BANK ---------- */
 makeInterior(scene,'bank',0xd9d4c4,0xb8ae94,0x8a7a4a);
 const bank=World.interiors.bank;
 addRug(bank,0,0,8,8,0x9a8661);
 addBox(bank,3.5,-1.55,3.5,2.5,0.9,0.75,0x5a4a30);
 const tellerGlass=new THREE.Mesh(
  new THREE.BoxGeometry(2.5,0.85,0.05),
  new THREE.MeshPhysicalMaterial({color:0xcfe8ff,transparent:true,opacity:0.32,roughness:0.05})
 );
 tellerGlass.position.set(3.5,-0.65,3.12);
 bank.add(tellerGlass);
 World.bankTellerLocal=new THREE.Vector3(3.5,50-1.55,3.5);
 registerInteriorObject('bank','teller',new THREE.Vector3(3.5,48.45,3.5),{radius:1.8,label:'Banking'});

 const vaultDoor=new THREE.Mesh(
  new THREE.CylinderGeometry(1.35,1.35,0.35,24),
  new THREE.MeshStandardMaterial({color:0x8a8a8a,metalness:0.8,roughness:0.25})
 );
 vaultDoor.rotation.x=Math.PI/2;
 vaultDoor.position.set(0,-0.3,-5.2);
 bank.add(vaultDoor);
 World.bankVaultLocal=new THREE.Vector3(0,50-0.3,-5.2);

 const bagPositions=[[-3,-1.7,-2.8],[-1,-1.7,-2.8],[1,-1.7,-2.8],[3,-1.7,-2.8],[0,-1.7,-1]];
 World.cashBags=bagPositions.map(p=>{
  const bag=addBox(bank,p[0],p[1],p[2],0.55,0.42,0.4,0x2f6b4a);
  return {mesh:bag,localPos:new THREE.Vector3(p[0],50+p[1],p[2]),collected:false};
 });

 /* ---------- GUN SHOP ---------- */
 makeInterior(scene,'gunshop',0x2a2a2a,0x1c1c1c,0x8a2020);
 const gunshop=World.interiors.gunshop;
 addRug(gunshop,0,0,8,8,0x202020);
 addBox(gunshop,0,-1.55,-3.5,2.8,0.9,0.8,0x4a3a2a);
 World.gunShopCounterLocal=new THREE.Vector3(0,50-1.55,-3.5);
 registerInteriorObject('gunshop','counter',new THREE.Vector3(0,48.45,-3.5),{radius:1.8,label:'Browse Weapons'});
 [-3.2,3.2].forEach(sx=>{addBox(gunshop,sx,-0.9,-4.7,0.7,2.0,0.3,0x333333);});

 /* ---------- STUDIO ---------- */
 makeInterior(scene,'studio',0xe7d9be,0xc7a97a,0x8a5a3a);
 const studio=World.interiors.studio;
 addRug(studio,0,0,7.5,7,0xb78d67);
 addBed(studio,-3,-2.6,2.0,2.8,0x75472d,0xe0e0dc);
 addWardrobe(studio,-4.7,-2.3,1.25,0.5);
 addSofa(studio,2.6,1.3,Math.PI,0x5b4638);
 registerSeat('studio','sofa',2.6,1.3,Math.PI,{radius:1.8});
 const studioTV=addTV(studio,2.5,3.5,Math.PI);
 registerTV('studio',2.5,3.5,Math.PI,studioTV);
 addKitchen(studio,0,4.5);
 registerKitchen('studio',0,4.5);
 addToilet(studio,4.4,3.5);
 registerToilet('studio',4.4,3.5);
 addShower(studio,4.2,1.7);
 addTable(studio,1.2,-0.7,1.25,0.8,0x6b452e);
 addChair(studio,0.55,-0.7,Math.PI/2);
 addChair(studio,1.85,-0.7,-Math.PI/2);
 registerSeat('studio','chair',0.55,-0.7,Math.PI/2);
 registerSeat('studio','chair',1.85,-0.7,-Math.PI/2);
 registerTable('studio',1.2,-0.7,'table');
 addPlant(studio,4.5,-3.8);
 registerBed('studio',-3,-2.6);

 /* ---------- FLAT 2 ---------- */
 makeInterior(scene,'flat2',0xded2bf,0xb7a98e,0x6b5947);
 const flat2=World.interiors.flat2;
 addRug(flat2,1,0,6.5,4.2,0x8e6b50);
 addBed(flat2,-3,-2.5,2.1,2.9,0x69442f,0xcfd5da);
 addWardrobe(flat2,-4.8,-2.2,1.35,0.5);
 addSofa(flat2,2.3,1.5,Math.PI,0x4d514e);
 registerSeat('flat2','sofa',2.3,1.5,Math.PI,{radius:1.8});
 const flatTV=addTV(flat2,2.3,3.5,Math.PI);
 registerTV('flat2',2.3,3.5,Math.PI,flatTV);
 addKitchen(flat2,-0.2,4.5);
 registerKitchen('flat2',-0.2,4.5);
 addTable(flat2,1.0,-0.8,1.5,0.85,0x65442e);
 addChair(flat2,0.25,-0.8,Math.PI/2);
 addChair(flat2,1.8,-0.8,-Math.PI/2);
 registerSeat('flat2','chair',0.25,-0.8,Math.PI/2);
 registerSeat('flat2','chair',1.8,-0.8,-Math.PI/2);
 registerTable('flat2',1.0,-0.8,'table');
 addToilet(flat2,4.4,3.4);
 registerToilet('flat2',4.4,3.4);
 addShower(flat2,4.2,1.7);
 addPlant(flat2,4.6,-3.6);
 registerBed('flat2',-3,-2.5);

 /* ---------- VILLA ---------- */
 makeInterior(scene,'villa',0xf0e6cc,0xd8c49a,0xc9a24b);
 const villa=World.interiors.villa;
 addRug(villa,0,0,9,7,0xa8362f);
 addBed(villa,-3,-2.8,2.4,3.2,0x6c432b,0xe8e5dc);
 addWardrobe(villa,-5,-2.4,1.6,0.6);
 addSofa(villa,2.5,1.4,Math.PI,0x5d463b);
 registerSeat('villa','sofa',2.5,1.4,Math.PI,{radius:1.8});
 const villaTV=addTV(villa,2.5,3.6,Math.PI);
 registerTV('villa',2.5,3.6,Math.PI,villaTV);
 addTable(villa,0.8,-0.5,1.8,1.0,0x6b4a30);
 addChair(villa,-0.15,-0.5,Math.PI/2);
 addChair(villa,1.75,-0.5,-Math.PI/2);
 registerSeat('villa','chair',-0.15,-0.5,Math.PI/2);
 registerSeat('villa','chair',1.75,-0.5,-Math.PI/2);
 registerTable('villa',0.8,-0.5,'table');
 addKitchen(villa,-0.2,4.6);
 registerKitchen('villa',-0.2,4.6);
 addToilet(villa,4.6,3.5);
 registerToilet('villa',4.6,3.5);
 addShower(villa,4.3,1.7);
 addPlant(villa,4.8,-3.8);
 addPlant(villa,-5,3.6);
 addSofa(villa,-1.0,1.6,0,0x765548);
 registerSeat('villa','sofa',-1.0,1.6,0,{radius:1.8});
 registerBed('villa',-3,-2.8);

 /* ---------- RESTAURANT ---------- */
 makeInterior(scene,'restaurant',0x4b2520,0x6c4030,0xb53b2d);
 const restaurant=World.interiors.restaurant;
 addRug(restaurant,0,0,9,8,0x57251e);
 addBox(restaurant,0,-1.35,-4.6,5.2,1.1,0.7,0x5a3828);
 addKitchen(restaurant,-3,3.6);
 registerKitchen('restaurant',-3,3.6);
 [[-2,0.8],[2,0.8],[-2,-1.8],[2,-1.8]].forEach(p=>{
  addTable(restaurant,p[0],p[1],1.3,0.8,0x75472e);
  addChair(restaurant,p[0]-0.85,p[1],Math.PI/2);
  addChair(restaurant,p[0]+0.85,p[1],-Math.PI/2);
  registerSeat('restaurant','restaurantChair',p[0]-0.85,p[1],Math.PI/2,{radius:1.15});
  registerSeat('restaurant','restaurantChair',p[0]+0.85,p[1],-Math.PI/2,{radius:1.15});
  registerTable('restaurant',p[0],p[1],'restaurantTable');
 });
 const restaurantTV=addTV(restaurant,3.8,4.4,Math.PI);
 registerTV('restaurant',3.8,4.4,Math.PI,restaurantTV);
 addPlant(restaurant,4.5,-4);

 /* ---------- MECHANIC WORKSHOP ---------- */
 makeInterior(scene,'mechanic',0x3d454a,0x3a3d3e,0xe1a92b);
 const mechanic=World.interiors.mechanic;
 for(let i=-4;i<=4;i+=2){addBox(mechanic,i,-2.43,0,0.12,0.02,9,0xe1a92b,0.9);}
 addBox(mechanic,-3,-1.25,-3.7,3.0,1.1,0.7,0x4b3528);
 addLocker(mechanic,1.5,3.8,4);
 addBox(mechanic,2,-2.25,-0.5,3.4,0.15,5.0,0x202326,0.55);

 /* The workshop car uses a real model (loaded asynchronously) */
 const workshopCar=World.makeCar(9999,9999,0x5b6870,'sedan');
 workshopCar.scale.setScalar(0.72);
 workshopCar.position.set(2,-2.2,-0.5);
 mechanic.add(workshopCar);

 addDesk(mechanic,-3,1.2);
 addChair(mechanic,-3,2.0,Math.PI);
 registerSeat('mechanic','chair',-3,2.0,Math.PI);
 registerInteriorObject('mechanic','workbench',new THREE.Vector3(-3,48.7,-3.7),{radius:1.8,label:'Use Workbench'});

 /* ---------- SUPERMARKET ---------- */
 makeInterior(scene,'supermarket',0xd8cfad,0xb9b29a,0xd4b52c);
 const supermarket=World.interiors.supermarket;
 addRug(supermarket,0,0,10,9,0xd0c7aa);
 [-3.2,0,3.2].forEach(x=>{
  addBox(supermarket,x,-0.6,0,1.4,2.7,5.8,0x76573b);
  for(let row=0;row<3;row++){
   for(let col=0;col<3;col++){
    const colors=[0xc4473a,0x4c75a3,0xd3a73a,0x5c9a5c];
    addBox(supermarket,x-0.4+col*0.4,-1.5+row*0.55,-1.8+col*1.4,0.18,0.22,0.32,colors[(row+col)%colors.length],0.7);
   }
  }
 });
 addBox(supermarket,0,-1.3,-4.5,4.5,1.0,0.7,0x6b4932);
 const supermarketTV=addTV(supermarket,4.4,3.8,Math.PI);
 registerTV('supermarket',4.4,3.8,Math.PI,supermarketTV);
 registerInteriorObject('supermarket','counter',new THREE.Vector3(0,48.7,-4.5),{radius:1.8,label:'Checkout'});

 /* ---------- OFFICE ---------- */
 makeInterior(scene,'office',0x687989,0x8e8d82,0x2e506f);
 const office=World.interiors.office;
 addRug(office,0,0,8.5,8,0x5a6671);
 addDesk(office,-2,-1.5);
 addDesk(office,2,-1.5);
 addChair(office,-2,-0.45,Math.PI);
 addChair(office,2,-0.45,Math.PI);
 registerSeat('office','chair',-2,-0.45,Math.PI);
 registerSeat('office','chair',2,-0.45,Math.PI);
 addDesk(office,0,2.5);
 addChair(office,0,3.5,Math.PI);
 registerSeat('office','chair',0,3.5,Math.PI);
 addLocker(office,-5,2.7,4);
 const officeTV=addTV(office,4.2,-3.5);
 registerTV('office',4.2,-3.5,0,officeTV);
 addPlant(office,-4.8,-3.8);

 /* ---------- MOTEL ---------- */
 makeInterior(scene,'motel',0x7e5f4b,0x735c4a,0xa17a57);
 const motel=World.interiors.motel;
 addRug(motel,0,0,9,8,0x6c4d3d);
 addBed(motel,0,-1.8,2.5,3.2,0x5a392b,0xd8d8d0);
 addBed(motel,0,2.0,2.5,2.4,0x5a392b,0xcfcfc9);
 registerBed('motel',0,-1.8);
 registerBed('motel',0,2.0);
 const motelTV=addTV(motel,3.8,3.8,Math.PI);
 registerTV('motel',3.8,3.8,Math.PI,motelTV);
 addTable(motel,-3,2.2,1.2,0.8,0x62422e);
 addChair(motel,-3,1.2);
 registerSeat('motel','chair',-3,1.2,0);
 addToilet(motel,4,-2.8);
 registerToilet('motel',4,-2.8);
 addShower(motel,4,-0.7);
 addPlant(motel,-4,3.8);

 /* ---------- PHARMACY ---------- */
 makeInterior(scene,'pharmacy',0xdde8df,0xcfd8d1,0x4b9a68);
 const pharmacy=World.interiors.pharmacy;
 addBox(pharmacy,0,-1.4,-4.5,5.0,1.0,0.7,0xffffff);
 [-3,-1,1,3].forEach(x=>{addBox(pharmacy,x,-0.5,0.5,1.0,2.8,3.8,0xf0f0e8,0.75);});
 addPlant(pharmacy,4.4,-4);
 addDesk(pharmacy,-3,3.8);
 addChair(pharmacy,-3,4.7);
 registerSeat('pharmacy','chair',-3,4.7,0);
 registerInteriorObject('pharmacy','counter',new THREE.Vector3(0,48.6,-4.5),{radius:1.8,label:'Pharmacy Counter'});

 /* ============ NEW WORK PLACES ============ */
 function wallBoard(room,x,color){addBox(room,x,0.3,-5.8,1.8,1.1,0.1,color,0.6);}

 makeInterior(scene,'factory',0x4a4f55,0x33363a,0xe08a1f);
 const factory=World.interiors.factory;
 addBox(factory,0,-2.2,-1,10,0.35,1.2,0x1d1f21,0.5);
 for(let i=-4;i<=4;i+=2){addBox(factory,i,-1.95,-1,0.7,0.5,0.7,0xc98b2b);}
 addBox(factory,-4.5,-1.4,3,1.6,2.2,1.6,0x6a7077);
 addBox(factory,4.5,-1.4,3,1.6,2.2,1.6,0x6a7077);
 wallBoard(factory,0,0xe08a1f);
 jobSpot('factory',0,-3,{title:'Assembly Line Shift',pay:48,energy:12,hunger:5});

 makeInterior(scene,'warehouse',0x59534a,0x45413a,0x8a6a2f);
 const warehouse=World.interiors.warehouse;
 for(let i=0;i<6;i++){addBox(warehouse,-4.5+(i%3)*1.4,-1.9+Math.floor(i/3)*1.0,-4,1.2,0.95,1.2,0x9b7a46);}
 for(let i=0;i<4;i++){addBox(warehouse,3.5+(i%2)*1.4,-1.9+Math.floor(i/2)*1.0,-3.8,1.2,0.95,1.2,0xb08a52);}
 addBox(warehouse,0,-2.25,1,5,0.2,2.2,0x3b3a37);
 wallBoard(warehouse,0,0x8a6a2f);
 jobSpot('warehouse',0,-4.6,{title:'Load Crates',pay:42,energy:12,hunger:5});

 makeInterior(scene,'postOffice',0xd8d2c0,0xb8b09a,0xb52b2b);
 const postOffice=World.interiors.postOffice;
 addBox(postOffice,0,-1.6,-3.4,7,1.0,0.8,0x6b4a2e);
 for(let i=-3;i<=3;i+=2){addBox(postOffice,i,-0.6,-5.5,1.4,1.6,0.6,0x2e5a8a);}
 addPlant(postOffice,4.8,3);
 wallBoard(postOffice,-4,0xb52b2b);
 jobSpot('postOffice',0,-2.6,{title:'Sort Mail',pay:36,energy:6,hunger:3});

 makeInterior(scene,'constructionSite',0x777168,0x5a564f,0xf0b400);
 const construction=World.interiors.constructionSite;
 addBox(construction,-3.5,-2.0,-3,2.4,0.5,2.4,0xa89b82);
 addBox(construction,3.5,-1.8,-3,0.9,1.0,3.2,0xf0b400);
 for(let i=0;i<3;i++){addBox(construction,-1.5+i*1.4,-2.2,3.2,1.2,0.3,0.5,0x8c6a3a);}
 wallBoard(construction,0,0xf0b400);
 jobSpot('constructionSite',0,-4.2,{title:'Construction Shift',pay:62,energy:16,hunger:7});

 makeInterior(scene,'taxiDepot',0x3b4a3c,0x2f332f,0xf2c500);
 const taxiDepot=World.interiors.taxiDepot;
 addDesk(taxiDepot,-3,-3.2);
 addChair(taxiDepot,-3,-2.3,0);
 addBox(taxiDepot,3.5,-2.1,-3.5,2.4,0.7,1.2,0xf2c500);
 wallBoard(taxiDepot,3,0xf2c500);
 jobSpot('taxiDepot',3.5,-3.5,{title:'Taxi Shift (license)',pay:72,energy:10,hunger:6,license:true});

 /* work stations inside existing places */
 jobSpot('hospital',4.4,-4.6,{title:'Nurse Shift',pay:58,energy:12,hunger:5});
 addBox(World.interiors.hospital,4.4,0.3,-5.8,1.8,1.1,0.1,0x2f8f6a,0.6);
 jobSpot('restaurant',4.4,-4.6,{title:'Wait Tables',pay:30,energy:8,hunger:2});
 addBox(World.interiors.restaurant,4.4,0.3,-5.8,1.8,1.1,0.1,0xb53b2d,0.6);
 jobSpot('office',-4.4,-4.6,{title:'Desk Work',pay:52,energy:7,hunger:4});
 addBox(World.interiors.office,-4.4,0.3,-5.8,1.8,1.1,0.1,0x2e506f,0.6);
 jobSpot('mechanic',-1,-3.9,{title:'Repair Cars',pay:56,energy:13,hunger:5});
 jobSpot('supermarket',4.4,-4.6,{title:'Work the Till',pay:30,energy:6,hunger:3});
 addBox(World.interiors.supermarket,4.4,0.3,-5.8,1.8,1.1,0.1,0xd4b52c,0.6);
 jobSpot('pharmacy',4.4,-4.6,{title:'Serve Customers',pay:32,energy:6,hunger:3});
 addBox(World.interiors.pharmacy,4.4,0.3,-5.8,1.8,1.1,0.1,0x4b9a68,0.6);

 /* ============ INTERIOR METADATA ============ */
 World.interiorMeta={
  hospital:{label:'Hospital',sleep:false,sleepBonus:0,category:'medical'},
  police:{label:'Police Station',sleep:false,sleepBonus:0,category:'police'},
  prison:{label:'Prison',sleep:false,sleepBonus:0,category:'security'},
  home:{label:'Home',sleep:true,sleepBonus:1,category:'home'},
  bank:{label:'Bank',sleep:false,sleepBonus:0,category:'bank'},
  gunshop:{label:'Gun Shop',sleep:false,sleepBonus:0,category:'shop'},
  studio:{label:'Studio Apartment',sleep:true,sleepBonus:1,category:'home'},
  flat2:{label:'2-Room Flat',sleep:true,sleepBonus:1.2,category:'home'},
  villa:{label:'Villa',sleep:true,sleepBonus:1.5,category:'home'},
  restaurant:{label:'Restaurant',sleep:false,sleepBonus:0,category:'food'},
  mechanic:{label:'Mechanic Workshop',sleep:false,sleepBonus:0,category:'mechanic'},
  supermarket:{label:'Supermarket',sleep:false,sleepBonus:0,category:'shop'},
  office:{label:'Office',sleep:false,sleepBonus:0,category:'business'},
  motel:{label:'Motel',sleep:false,sleepBonus:0,category:'hotel'},
  pharmacy:{label:'Pharmacy',sleep:false,sleepBonus:0,category:'medical'},
  factory:{label:'Factory',sleep:false,sleepBonus:0,category:'work'},
  warehouse:{label:'Warehouse',sleep:false,sleepBonus:0,category:'work'},
  postOffice:{label:'Post Office',sleep:false,sleepBonus:0,category:'work'},
  constructionSite:{label:'Construction Site',sleep:false,sleepBonus:0,category:'work'},
  taxiDepot:{label:'Taxi Depot',sleep:false,sleepBonus:0,category:'work'}
 };

 World.safehouseBedLocal={
  studio:new THREE.Vector3(-3,50-1.72,-2.6),
  flat2:new THREE.Vector3(-3,50-1.72,-2.5),
  villa:new THREE.Vector3(-3,50-1.72,-2.8)
 };

 World.homeBedLocal=new THREE.Vector3(-3,50-1.72,-2.4);
 World.homeToiletLocal=new THREE.Vector3(4.3,50-1.65,3.7);
}

/* ============ ENTER / EXIT INTERIOR ============ */
World.enterInterior=function(name,camera,outsidePos){
 if(World.activeInterior)return;

 const poi=World.pois.find(p=>p.id===name);
 if(!poi)return;

 if(poi.ownable&&!(Player.properties&&Player.properties.includes(name))){
  if(typeof UI!=='undefined'&&UI.dom&&UI.dom.prompt){
   UI.dom.prompt.textContent='🔒 You need to buy this property first.';
   UI.dom.prompt.style.display='block';
   clearTimeout(World._interiorPrompt);
   World._interiorPrompt=setTimeout(()=>{
    if(UI.dom.prompt){UI.dom.prompt.style.display='none';}
   },1800);
  }
  return;
 }

 if(!World.interiors[name])return;

 outsidePos.copy(camera.position);

 Object.values(World.interiors).forEach(i=>{i.visible=false;});

 World.interiors[name].visible=true;
 World.activeInterior=name;

 const room=World.interiors[name];
 const eyeY=room.userData&&room.userData.eyeY?room.userData.eyeY:49.2;

 camera.position.set(0,eyeY,3.8);
 camera.rotation.order='YXZ';
 camera.lookAt(0,eyeY-0.2,-2);

 World.currentInteriorMeta=World.interiorMeta?World.interiorMeta[name]||null:null;
};

World.exitInterior=function(camera,outsidePos){
 if(!World.activeInterior)return;
 if(World.interiors[World.activeInterior]){World.interiors[World.activeInterior].visible=false;}
 World.activeInterior=null;
 World.currentInteriorMeta=null;
 camera.position.copy(outsidePos);
};

/* =====================================================================
 * CAR MODELS  (files live in  elhay/public/cars/)
 *
 *   cars/sedan_01.obj ... suv_10.obj, pickup_01.obj, tractor_01.obj, truck_01.obj ...
 *   cars/textures/color_1024x1024.jpg      <- from textures.rar
 *
 * Every model: origin = ground centre, front = +Z, units = meters.
 * No extra three.js loader is needed (tiny OBJ parser below).
 * If a file or the texture is missing, the old boxy procedural car stays
 * visible, so the game never breaks.
 * Change the folder with  ASSET_PATHS.cars = '/my/path/'  if needed.
 * ===================================================================== */
const CAR_BASE=(typeof ASSET_PATHS!=='undefined'&&ASSET_PATHS.cars)||'/cars/';
const CAR_TEXTURE='textures/color_1024x1024.jpg';

const CAR_POOLS={
 sedanLong:['sedan_02','sedan_04','sedan_06','sedan_08'],
 sedanCompact:['sedan_01','sedan_03','sedan_05','sedan_07','sedan_09','sedan_10'],
 suv:['suv_01','suv_02','suv_03','suv_04','suv_05','suv_06','suv_07','suv_08','suv_09','suv_10'],
 pickup:['pickup_01','pickup_02'],
 tractor:['tractor_01','tractor_02','tractor_03','tractor_04'],
 truck:['truck_01','truck_02','truck_03','truck_04']
};

/* game type -> which models, target length in meters (null = native size), dark = tinted material */
const CAR_TYPES={
 sedan:{pool:CAR_POOLS.sedanLong,len:4.5},
 hatchback:{pool:CAR_POOLS.sedanCompact,len:4.0},
 police:{pool:['sedan_02'],len:4.6,dark:true},
 suv:{pool:CAR_POOLS.suv,len:4.8},
 pickup:{pool:CAR_POOLS.pickup,len:5.0},
 tractor:{pool:CAR_POOLS.tractor,len:null},
 truck:{pool:CAR_POOLS.truck,len:null}
};

const CAR_ID_RE=/^(sedan|suv|pickup|tractor|truck)_\d\d$/;

const CarModels={
 loading:{},
 counters:{},
 texture:null,
 mats:{},
 stats:{loaded:0,failed:0}
};

function carSRGB(tex){
 if(tex.colorSpace!==undefined&&THREE.SRGBColorSpace!==undefined)tex.colorSpace=THREE.SRGBColorSpace;
 else if(THREE.sRGBEncoding!==undefined)tex.encoding=THREE.sRGBEncoding;
}

/* one shared material (+ one dark copy for police) for ALL vehicles = very cheap */
CarModels.material=function(dark){
 const key=dark?'dark':'normal';
 if(CarModels.mats[key])return CarModels.mats[key];

 const m=new THREE.MeshStandardMaterial({
  color:dark?0x2c2f33:0x9aa4ab, /* fallback colour until the texture arrives */
  roughness:0.6,
  metalness:0.15
 });
 CarModels.mats[key]=m;

 if(!CarModels.texture){
  CarModels.texture=new THREE.TextureLoader().load(
   CAR_BASE+CAR_TEXTURE,
   tex=>{
    carSRGB(tex);
    tex.anisotropy=4;
    tex.needsUpdate=true;
    Object.keys(CarModels.mats).forEach(k=>{
     const mm=CarModels.mats[k];
     mm.map=tex;
     mm.color.set(k==='dark'?0x666a70:0xffffff);
     mm.needsUpdate=true;
    });
    CarModels._texOK=true;
   },
   undefined,
   ()=>console.warn('[cars] texture not found: '+CAR_BASE+CAR_TEXTURE)
  );
 }else if(CarModels._texOK){
  m.map=CarModels.texture;
  m.color.set(dark?0x666a70:0xffffff);
 }
 return m;
};

/* minimal OBJ -> BufferGeometry (positions, uvs, normals; faces are fan-triangulated) */
function parseCarOBJ(text){
 const v=[],vt=[],vn=[],pos=[],uv=[],nor=[];
 const lines=text.split('\n');
 for(let i=0;i<lines.length;i++){
  const l=lines[i];
  if(l.charCodeAt(0)===118){ /* 'v' */
   const t=l.split(' ');
   if(t[0]==='v')v.push(+t[1],+t[2],+t[3]);
   else if(t[0]==='vt')vt.push(+t[1],+t[2]);
   else if(t[0]==='vn')vn.push(+t[1],+t[2],+t[3]);
  }else if(l.charCodeAt(0)===102){ /* 'f' */
   const t=l.trim().split(/\s+/);
   const c=[];
   for(let k=1;k<t.length;k++){
    const p=t[k].split('/');
    c.push([(+p[0]-1)*3,p[1]?(+p[1]-1)*2:-1,p[2]?(+p[2]-1)*3:-1]);
   }
   for(let k=1;k<c.length-1;k++){
    [c[0],c[k],c[k+1]].forEach(q=>{
     pos.push(v[q[0]],v[q[0]+1],v[q[0]+2]);
     if(q[1]>=0)uv.push(vt[q[1]],vt[q[1]+1]);
     if(q[2]>=0)nor.push(vn[q[2]],vn[q[2]+1],vn[q[2]+2]);
    });
   }
  }
 }
 const geo=new THREE.BufferGeometry();
 const setAttr=(geo.setAttribute||geo.addAttribute).bind(geo);
 setAttr('position',new THREE.Float32BufferAttribute(pos,3));
 if(uv.length)setAttr('uv',new THREE.Float32BufferAttribute(uv,2));
 if(nor.length)setAttr('normal',new THREE.Float32BufferAttribute(nor,3));
 else geo.computeVertexNormals();
 geo.computeBoundingBox();
 return geo;
}

/* load once, cache forever, share between all cars of that model */
CarModels.load=function(id){
 if(CarModels.loading[id])return CarModels.loading[id];
 CarModels.loading[id]=fetch(CAR_BASE+id+'.obj')
  .then(r=>{
   if(!r.ok)throw new Error('HTTP '+r.status);
   return r.text();
  })
  .then(txt=>{
   CarModels.stats.loaded++;
   return parseCarOBJ(txt);
  })
  .catch(err=>{
   CarModels.stats.failed++;
   console.warn('[cars] could not load '+CAR_BASE+id+'.obj ('+err.message+') - using fallback car');
   throw err;
  });
 return CarModels.loading[id];
};

/* decide which model a car gets */
CarModels.resolve=function(type,modelId){
 let id=modelId||null;
 let def=CAR_TYPES[type]||null;

 if(!id&&CAR_ID_RE.test(type)){
  id=type;
  def=CAR_TYPES[type.split('_')[0]]||null;
 }

 if(!id){
  if(!def)return null;
  const pool=def.pool;
  if(CarModels.counters[type]===undefined)CarModels.counters[type]=Math.floor(Math.random()*pool.length);
  id=pool[CarModels.counters[type]++%pool.length];
 }

 return {id,len:def?def.len:null,dark:!!(def&&def.dark)};
};

/* swap the procedural placeholder for the real model once it is loaded */
CarModels.apply=function(g,proc,type,modelId){
 const spec=CarModels.resolve(type,modelId);
 if(!spec)return;

 g.userData.carType=type;
 g.userData.modelId=spec.id;

 CarModels.load(spec.id).then(geo=>{
  const bb=geo.boundingBox;
  const length=bb.max.z-bb.min.z;
  const s=spec.len?spec.len/length:1;

  const mesh=new THREE.Mesh(geo,CarModels.material(spec.dark));
  mesh.scale.setScalar(s);
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  g.add(mesh);

  proc.visible=false;

  const info={
   id:spec.id,
   mesh,
   scale:s,
   length:length*s,
   width:(bb.max.x-bb.min.x)*s,
   height:bb.max.y*s
  };

  g.userData.model=info;
  if(g.userData.fitModel)g.userData.fitModel(info);
 }).catch(()=>{ /* keep procedural car */ });
};

/* place a vehicle anywhere: World.spawnVehicle('truck',10,20,Math.PI/2) or ('suv_03',...) */
World.spawnVehicle=function(type,x,z,rotY,color){
 const c=World.makeCar(x,z,color||0x888888,type);
 c.rotation.y=rotY||0;
 return c;
};

/* ============ VEHICLES ============ */
function policeDecalTex(){
 return canvasTex((g,w,h)=>{
  g.clearRect(0,0,w,h);
  g.fillStyle='#111';
  g.font='bold '+(h*0.6)+'px sans-serif';
  g.textAlign='center';
  g.textBaseline='middle';
  g.fillText('POLICE',w/2,h/2);
 },256,64);
}

const policeDecal=policeDecalTex();

World.makeCar=function(x,z,color,type,modelId){
 type=type||'sedan';

 const g=new THREE.Group();

 /* procedural body = fallback shown until (or if) the real model loads */
 const proc=new THREE.Group();
 g.add(proc);

 const bodyMat=new THREE.MeshStandardMaterial({
  color:type==='police'?0x151515:color,
  metalness:0.5,
  roughness:0.35
 });

 const isHatch=type==='hatchback';

 const bodyLen=isHatch?3.5:4.3;
 const hoodLen=isHatch?0.65:0.95;
 const trunkLen=isHatch?0.35:0.85;
 const midLen=bodyLen-hoodLen-trunkLen;

 const lower=new THREE.Mesh(new THREE.BoxGeometry(1.78,0.34,bodyLen),bodyMat);
 lower.position.y=0.35;
 lower.castShadow=true;
 proc.add(lower);

 const hood=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.22,hoodLen),bodyMat);
 hood.position.set(0,0.57,bodyLen/2-hoodLen/2);
 hood.castShadow=true;
 proc.add(hood);

 const trunk=new THREE.Mesh(new THREE.BoxGeometry(1.7,isHatch?0.5:0.26,trunkLen),bodyMat);
 trunk.position.set(0,isHatch?0.68:0.6,-(bodyLen/2-trunkLen/2));
 trunk.castShadow=true;
 proc.add(trunk);

 const cabin=new THREE.Mesh(
  new THREE.BoxGeometry(1.5,0.48,midLen*0.92),
  new THREE.MeshPhysicalMaterial({color:0x0e1b1d,transparent:true,opacity:0.55,roughness:0.1})
 );
 cabin.position.set(0,0.9,(hoodLen-trunkLen)*0.15);
 proc.add(cabin);

 const lightMat=new THREE.MeshStandardMaterial({color:0xfff3c0,emissive:0xffdd88,emissiveIntensity:0.8});
 const tailMat=new THREE.MeshStandardMaterial({color:0x990000,emissive:0x660000,emissiveIntensity:0.6});

 [[-0.62,0.42,bodyLen/2-0.05],[0.62,0.42,bodyLen/2-0.05]].forEach(p=>{
  const l=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.13,0.06),lightMat);
  l.position.set(p[0],p[1],p[2]);
  proc.add(l);
 });

 [[-0.62,0.42,-(bodyLen/2-0.05)],[0.62,0.42,-(bodyLen/2-0.05)]].forEach(p=>{
  const l=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.13,0.06),tailMat);
  l.position.set(p[0],p[1],p[2]);
  proc.add(l);
 });

 const wheelMat=new THREE.MeshStandardMaterial({color:0x111111,roughness:0.9});
 const wheelX=0.92;
 const wheelZ=bodyLen/2-0.75;

 [[-wheelX,0.33,wheelZ],[wheelX,0.33,wheelZ],[-wheelX,0.33,-wheelZ],[wheelX,0.33,-wheelZ]].forEach(p=>{
  const wheel=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,0.26,14),wheelMat);
  wheel.rotation.z=Math.PI/2;
  wheel.position.set(p[0],p[1],p[2]);
  wheel.castShadow=true;
  proc.add(wheel);
 });

 if(type==='police'){
  const doorMat=new THREE.MeshStandardMaterial({color:0xf2f2f2});

  [-1,1].forEach(side=>{
   const panel=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.26,midLen*0.85),doorMat);
   panel.position.set(side*0.9,0.42,0);
   proc.add(panel);
  });

  /* light bar + decals live on the main group so they stay visible on the real model */
  const barBase=new THREE.Mesh(new THREE.BoxGeometry(0.85,0.1,0.32),new THREE.MeshStandardMaterial({color:0x1a1a1a}));
  barBase.position.set(0,1.16,0.25);
  g.add(barBase);

  const red=new THREE.Mesh(
   new THREE.BoxGeometry(0.38,0.09,0.28),
   new THREE.MeshStandardMaterial({color:0xff2222,emissive:0xff0000,emissiveIntensity:1})
  );
  red.position.set(-0.22,1.22,0.25);
  g.add(red);

  const blue=new THREE.Mesh(
   new THREE.BoxGeometry(0.38,0.09,0.28),
   new THREE.MeshStandardMaterial({color:0x2244ff,emissive:0x0033ff,emissiveIntensity:1})
  );
  blue.position.set(0.22,1.22,0.25);
  g.add(blue);

  const decals=[];
  [-1,1].forEach(side=>{
   const decal=new THREE.Mesh(
    new THREE.PlaneGeometry(midLen*0.75,0.28),
    new THREE.MeshBasicMaterial({map:policeDecal,transparent:true})
   );
   decal.position.set(side*0.905,0.42,0);
   decal.rotation.y=side>0?Math.PI/2:-Math.PI/2;
   g.add(decal);
   decals.push({mesh:decal,side});
  });

  g.userData.lightBar={red,blue};

  /* re-fit the light bar and decals to the real model's roof / sides */
  g.userData.fitModel=function(info){
   const roof=info.height;
   barBase.position.set(0,roof+0.05,0.15);
   red.position.set(-0.22,roof+0.11,0.15);
   blue.position.set(0.22,roof+0.11,0.15);
   decals.forEach(d=>{
    d.mesh.scale.set(info.length*0.4/(midLen*0.75),1,1);
    d.mesh.position.set(d.side*(info.width/2+0.01),info.height*0.33,0);
   });
  };
 }

 CarModels.apply(g,proc,type,modelId);

 g.position.set(x,0,z);
 World.scene.add(g);

 return g;
};

/* ============ BILLBOARDS ============ */
function billboardPlaceholderTex(label){
 return canvasTex((g,w,h)=>{
  g.fillStyle='#1c2b30';
  g.fillRect(0,0,w,h);
  g.strokeStyle='#c9a24b';
  g.lineWidth=6;
  g.strokeRect(4,4,w-8,h-8);
  g.fillStyle='#c9a24b';
  g.font='bold 26px sans-serif';
  g.textAlign='center';
  g.fillText(label,w/2,h/2+10);
 },256,160);
}

const billboardResolved={};

function applyBillboardTexture(mat,fileName){
 if(billboardResolved[fileName]==='fail')return;

 if(billboardResolved[fileName] instanceof THREE.Texture){
  mat.map=billboardResolved[fileName];
  mat.needsUpdate=true;
  return;
 }

 new THREE.TextureLoader().load(
  ASSET_PATHS.bill+fileName,
  tex=>{
   tex.encoding=THREE.sRGBEncoding;
   billboardResolved[fileName]=tex;
   mat.map=tex;
   mat.needsUpdate=true;
  },
  undefined,
  ()=>{billboardResolved[fileName]='fail';}
 );
}

function makeBillboard(parent,x,y,z,rotY,fileName,label){
 const mat=new THREE.MeshStandardMaterial({map:billboardPlaceholderTex(label),roughness:0.8});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(4,2.4),mat);
 mesh.position.set(x,y,z);
 mesh.rotation.y=rotY;

 const post=new THREE.Mesh(
  new THREE.CylinderGeometry(0.08,0.08,y*2,6),
  new THREE.MeshStandardMaterial({color:0x333})
 );
 post.position.set(x,y-1.2,z);

 parent.add(mesh,post);
 applyBillboardTexture(mat,fileName);
 return mesh;
}

function buildBillboardLandmarks(scene){
 let p=sidewalkSpot('x',0,-25,1);
 makeBillboard(scene,p.x,3,p.z,p.faceRotY,'ad1.jpg','EL-HAY COLA');

 p=sidewalkSpot('z',-40,-50,-1);
 makeBillboard(scene,p.x,3,p.z,p.faceRotY,'ad2.jpg','SOUK MARKET');

 p=sidewalkSpot('x',40,-50,1);
 makeBillboard(scene,p.x,3,p.z,p.faceRotY,'ad3.jpg','TELECOM+');
}

/* =====================================================================
 * CITY ASSETS  (GLB files in  elhay/city/glb ... glb6, colour table in city/textures/colormap.png)
 *
 *  - roads, buildings, characters (animated) and props come from your GLB files
 *  - every enterable place is a real building, and is copied across the map
 *  - cars are NOT touched (they still use the OBJ system above)
 *  - no GLTFLoader needed: a small GLB reader (with skinning + animation) is built in
 *
 * Files are found through  city/manifest.json  (optional), a 6-hour browser cache,
 * or the GitHub tree API (CITY_GH below, repo must be public).
 * If anything is missing the old procedural city is used, so the game never breaks.
 * Open the browser console (F12) and look for "[city]" lines to see what happened.
 * ===================================================================== */
const CITY_BASE='/city/';
const CITY_GH={owner:'jalilzzs',repo:'el-hay',branch:'main',root:'elhay/'};
const CITY_ROAD_TILE=8;                 /* road width in meters (= ROAD_HALF*2) */
const CITY_ROAD_ROT=Math.PI/2;          /* road tiles run along X by default; this turns them to run along Z */
const CITY_CACHE_KEY='elhay_city_files_v2';
const CITY_MAX_CHARS=10;
const CITY_LOT_MAX=11;                  /* biggest footprint (m) of a building in a map lot */

/* direction the door looks, in the model's own space (default is -Z) */
const CITY_FRONT={'building-r':[1,0],'building-n':[-1,0],'building-skyscraper-e':[-1,0]};

/* ordinary buildings that fill the city */
const CITY_FILLERS=['building-a','building-b','building-c','building-d','building-e','building-f','building-g','building-h','building-i','building-j','building-k','building-l','building-m','building-o','building-p','building-q','building-t','building-skyscraper-a','building-skyscraper-b','building-skyscraper-c','building-skyscraper-d'];

/* enterable places that already exist: which real building they become.
 * size = longest side in metres, face = way the door looks (x,z) */
const CITY_LANDMARKS={
 hospital:     {model:'building-n',size:17,face:[0,1], sign:['HOSPITAL','#f2f6fa','#c0392b']},
 police:       {model:'building-k',size:14,face:[0,1], sign:['مركز الشرطة','#1f3b57','#ffffff']},
 prison:       {model:'building-q',size:20,face:[0,-1],sign:['السجن','#1c1c1c','#e0e0e0'],prison:true},
 home:         {model:'building-h',size:8.5,face:[0,1]},
 store:        {model:'building-p',size:10,face:[0,1], sign:['STORE','#b23a2e','#ffffff'],alias:'retail'},
 cafe:         {model:'building-a',size:8,face:[0,1],   sign:['CAFÉ','#7a5230','#fff1dc']},
 dealership:   {model:'building-s',size:15,face:[0,-1],sign:['DEALERSHIP','#3d5a6c','#ffffff']},
 drivingSchool:{model:'building-e',size:11,face:[0,-1],sign:['DRIVING SCHOOL','#b8a06a','#2b2b2b']},
 cityHall:     {model:'building-m',size:8,face:[0,-1],  sign:['CITY HALL','#e3d9c0','#2b2b2b']},
 bank:         {model:'building-l',size:11,face:[0,-1], sign:['البنك','#f2f0e6','#1f3b57']},
 gunshop:      {model:'building-c',size:8,face:[0,1],   sign:['GUN SHOP','#3a3a3a','#ffffff']},
 studio:       {model:'building-f',size:9,face:[0,-1]},
 flat2:        {model:'building-g',size:9,face:[0,1]},
 villa:        {model:'building-j',size:14,face:[0,-1]},
 restaurant:   {model:'building-d',size:9,face:[0,-1],  sign:['RESTAURANT','#7b1e16','#fff1dc']},
 mechanic:     {model:'building-r',size:15,face:[0,-1], sign:['AUTO SERVICE','#26343c','#f4d35e']},
 supermarket:  {model:'building-t',size:13,face:[0,-1], sign:['SUPERMARKET','#8a7418','#fff8cf']},
 office:       {model:'building-skyscraper-a',size:9,face:[0,-1],sign:['OFFICE','#687989','#ffffff']},
 motel:        {model:'building-i',size:12,face:[0,-1], sign:['MOTEL','#704c38','#ffffff']},
 pharmacy:     {model:'building-b',size:8.5,face:[0,-1],sign:['PHARMACY','#eaf4ed','#217346']}
};

/* NEW enterable places where you can work (placed on the map at start) */
const CITY_JOBPLACES={
 factory:         {name:'Factory',          model:'building-o',size:14,face:[0,1], pos:[-20,-13],color:'#6d7480',sign:['FACTORY','#4a4f58','#f4d35e'],props:['construction-barrier']},
 warehouse:       {name:'Warehouse',        model:'building-s',size:16,face:[0,1], pos:[20,-53], color:'#8a7d68',sign:['WAREHOUSE','#5a4a30','#fff1dc']},
 constructionSite:{name:'Construction Site',model:'building-skyscraper-e',size:9,face:[-1,0],pos:[94,-20],color:'#e1a92b',sign:['CONSTRUCTION','#e1a92b','#1c1c1c'],props:['construction-cone','construction-barrier','construction-cone']},
 postOffice:      {name:'Post Office',      model:'building-c',size:10,face:[-1,0],pos:[94,60],  color:'#c0392b',sign:['POST OFFICE','#c0392b','#ffffff']},
 taxiDepot:       {name:'Taxi Depot',       model:'building-d',size:10,face:[1,0], pos:[-94,20], color:'#f4d35e',sign:['TAXI DEPOT','#f4d35e','#1c1c1c']}
};

const CITY_NAMES={hospital:'Hospital',police:'Police Station',prison:'Prison',home:'Home',store:'Store',cafe:'Café',dealership:'Dealership',drivingSchool:'Driving School',cityHall:'City Hall',bank:'Bank',gunshop:'Gun Shop',restaurant:'Restaurant',mechanic:'Mechanic Workshop',supermarket:'Supermarket',office:'Office',motel:'Motel',pharmacy:'Pharmacy'};
const CITY_SHOPTYPES={store:1,cafe:1,dealership:1,drivingSchool:1,cityHall:1};

/* places that are repeated across the map (id, how often) */
const CITY_SERVICES=[
 ['hospital',2],['police',2],['bank',2],['restaurant',4],['supermarket',3],['store',3],['cafe',3],['pharmacy',3],
 ['mechanic',2],['office',3],['motel',2],['gunshop',1],['dealership',1],['drivingSchool',1],
 ['factory',2],['warehouse',2],['postOffice',2],['taxiDepot',1],['constructionSite',1]
];
const CITY_SERVICE_TOTAL=CITY_SERVICES.reduce((a,s)=>a+s[1],0);

const CityAssets={
 ready:false,started:false,
 files:{},tpl:{},fillers:[],chars:[],
 pending:[],npcQueue:[],npcs:[],
 _rs:null,_rc:null,_center:null,_kt:{},_plain:{},_sharedMat:{},_signMat:{}
};

/* ---------- colour table (one per kit; falls back to grey, never black) ---------- */
CityAssets.kitTex=function(kit){
 if(CityAssets._kt[kit])return CityAssets._kt[kit];
 const tx=new THREE.Texture();
 tx.flipY=false;
 tx.encoding=THREE.sRGBEncoding;
 tx.generateMipmaps=false;
 tx.minFilter=THREE.LinearFilter;
 tx.magFilter=THREE.LinearFilter;
 /* glb5 is the car kit and has its own colormap; every other kit uses city/textures/colormap.png */
 const urls=kit==='glb5'?[CITY_BASE+'glb5/colormap.png',CITY_BASE+'textures/colormap.png']:[CITY_BASE+'textures/colormap.png'];
 (function tryLoad(i){
  if(i>=urls.length){
   console.warn('[city] colormap not found, tried: '+urls.join(' , '));
   const cv=document.createElement('canvas');cv.width=cv.height=2;
   const g=cv.getContext('2d');g.fillStyle='#b8b4aa';g.fillRect(0,0,2,2);
   tx.image=cv;tx.needsUpdate=true;return;
  }
  const img=new Image();
  img.onload=()=>{tx.image=img;tx.needsUpdate=true;};
  img.onerror=()=>tryLoad(i+1);
  img.src=urls[i];
 })(0);
 CityAssets._kt[kit]=tx;
 return tx;
};

CityAssets.sharedMat=function(kit,skinned){
 const key=kit+(skinned?'|s':'');
 if(CityAssets._sharedMat[key])return CityAssets._sharedMat[key];
 const m=new THREE.MeshStandardMaterial({map:CityAssets.kitTex(kit),roughness:0.9,metalness:0});
 if(skinned)m.skinning=true;
 CityAssets._sharedMat[key]=m;
 return m;
};

CityAssets.plainMat=function(c,unlit,skinned){
 const key=[c[0].toFixed(3),c[1].toFixed(3),c[2].toFixed(3),unlit?1:0,skinned?1:0].join('|');
 if(CityAssets._plain[key])return CityAssets._plain[key];
 const col=new THREE.Color(c[0],c[1],c[2]);
 const m=unlit?new THREE.MeshBasicMaterial({color:col}):new THREE.MeshStandardMaterial({color:col,roughness:0.85,metalness:0});
 if(skinned)m.skinning=true;
 CityAssets._plain[key]=m;
 return m;
};

/* ---------- GLB reader: meshes, node tree, skins and animations ---------- */
function cityAcc(j,bin,idx){
 const a=j.accessors[idx];
 const nc={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type];
 const T={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array}[a.componentType];
 const es=T.BYTES_PER_ELEMENT;
 let out=new T(a.count*nc);
 if(a.bufferView!==undefined){
  const bv=j.bufferViews[a.bufferView];
  const base=(bv.byteOffset||0)+(a.byteOffset||0);
  const stride=bv.byteStride||nc*es;
  if(stride===nc*es){
   out.set(new T(bin.slice(base,base+a.count*nc*es)));
  }else{
   const dvb=new DataView(bin);
   const get={5120:'getInt8',5121:'getUint8',5122:'getInt16',5123:'getUint16',5125:'getUint32',5126:'getFloat32'}[a.componentType];
   for(let i=0;i<a.count;i++)for(let k=0;k<nc;k++)out[i*nc+k]=dvb[get](base+i*stride+k*es,true);
  }
 }
 if(a.normalized&&a.componentType!==5126){
  const div={5120:127,5121:255,5122:32767,5123:65535}[a.componentType];
  const f=new Float32Array(out.length);
  for(let i=0;i<out.length;i++)f[i]=Math.max(out[i]/div,-1);
  out=f;
 }
 return {data:out,nc};
}

function cityParseGLB(buf,rel){
 const kit=rel.split('/')[0];
 const dv=new DataView(buf);
 if(dv.getUint32(0,true)!==0x46546C67)throw new Error('not a GLB file');
 let off=12,j=null,bin=null;
 while(off+8<=buf.byteLength){
  const len=dv.getUint32(off,true),type=dv.getUint32(off+4,true);
  if(type===0x4E4F534A)j=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,off+8,len)));
  else if(type===0x004E4942&&!bin)bin=buf.slice(off+8,off+8+len);
  off+=8+len;
 }
 if(!j)throw new Error('GLB has no JSON chunk');
 if(!bin)throw new Error('GLB uses an external .bin (unsupported)');

 const jointSet=new Set();
 (j.skins||[]).forEach(s=>s.joints.forEach(n=>jointSet.add(n)));
 const meshCache={},matCache={},ibmCache={};

 function getMat(mi,skinned){
  const key=mi+'|'+skinned;
  if(matCache[key])return matCache[key];
  const m=(mi!==undefined&&j.materials&&j.materials[mi])||{};
  const p=m.pbrMetallicRoughness||{};
  const unlit=!!(m.extensions&&m.extensions.KHR_materials_unlit);
  let mat;
  if(p.baseColorTexture)mat=CityAssets.sharedMat(kit,skinned);
  else mat=CityAssets.plainMat(p.baseColorFactor||[0.8,0.8,0.8,1],unlit,skinned);
  matCache[key]=mat;
  return mat;
 }

 function getMesh(mi){
  if(meshCache[mi])return meshCache[mi];
  const parts=[];
  j.meshes[mi].primitives.forEach(p=>{
   if(p.mode!==undefined&&p.mode!==4)return;
   const A=p.attributes,g=new THREE.BufferGeometry();
   const setAttr=(g.setAttribute||g.addAttribute).bind(g);
   setAttr('position',new THREE.BufferAttribute(cityAcc(j,bin,A.POSITION).data,3));
   if(A.NORMAL!==undefined)setAttr('normal',new THREE.BufferAttribute(cityAcc(j,bin,A.NORMAL).data,3));
   if(A.TEXCOORD_0!==undefined)setAttr('uv',new THREE.BufferAttribute(cityAcc(j,bin,A.TEXCOORD_0).data,2));
   if(A.JOINTS_0!==undefined&&A.WEIGHTS_0!==undefined){
    setAttr('skinIndex',new THREE.Uint16BufferAttribute(Uint16Array.from(cityAcc(j,bin,A.JOINTS_0).data),4));
    setAttr('skinWeight',new THREE.Float32BufferAttribute(Float32Array.from(cityAcc(j,bin,A.WEIGHTS_0).data),4));
   }
   if(p.indices!==undefined){
    let ia=cityAcc(j,bin,p.indices).data;
    if(ia instanceof Uint8Array)ia=Uint16Array.from(ia);
    g.setIndex(new THREE.BufferAttribute(ia,1));
   }
   if(A.NORMAL===undefined)g.computeVertexNormals();
   parts.push({geo:g,mi:p.material});
  });
  meshCache[mi]=parts;
  return parts;
 }

 function skinIBM(si){
  if(ibmCache[si])return ibmCache[si];
  const sk=j.skins[si];
  const arr=cityAcc(j,bin,sk.inverseBindMatrices).data;
  ibmCache[si]=sk.joints.map((n,k)=>new THREE.Matrix4().fromArray(arr,k*16));
  return ibmCache[si];
 }

 /* a fresh node tree every call (geometry and materials are shared) */
 function make(){
  const objs={},skinnedList=[];
  function build(ni){
   const n=j.nodes[ni];
   const o=jointSet.has(ni)?new THREE.Bone():new THREE.Group();
   o.name=n.name||('node'+ni);
   if(n.matrix){new THREE.Matrix4().fromArray(n.matrix).decompose(o.position,o.quaternion,o.scale);}
   else{
    if(n.translation)o.position.fromArray(n.translation);
    if(n.rotation)o.quaternion.fromArray(n.rotation);
    if(n.scale)o.scale.fromArray(n.scale);
   }
   objs[ni]=o;
   if(n.mesh!==undefined){
    const sk=n.skin!==undefined;
    getMesh(n.mesh).forEach(p=>{
     const mat=getMat(p.mi,sk);
     const m=sk?new THREE.SkinnedMesh(p.geo,mat):new THREE.Mesh(p.geo,mat);
     if(sk){m.frustumCulled=false;skinnedList.push({m,skin:n.skin});}
     o.add(m);
    });
   }
   (n.children||[]).forEach(c=>o.add(build(c)));
   return o;
  }
  const root=new THREE.Group();
  j.scenes[j.scene||0].nodes.forEach(n=>root.add(build(n)));
  root.updateMatrixWorld(true);
  skinnedList.forEach(s=>{
   const joints=j.skins[s.skin].joints.map(i=>objs[i]);
   s.m.bind(new THREE.Skeleton(joints,skinIBM(s.skin).map(m=>m.clone())),s.m.matrixWorld);
  });
  return root;
 }

 /* animation clips we use */
 const clips=[];
 const want={idle:1,walk:1,sprint:1};
 (j.animations||[]).forEach(a=>{
  if(!want[a.name])return;
  const tracks=[];
  a.channels.forEach(ch=>{
   const s=a.samplers[ch.sampler];
   const nn=j.nodes[ch.target.node].name;
   const times=Array.from(cityAcc(j,bin,s.input).data);
   const vals=Array.from(cityAcc(j,bin,s.output).data);
   const path=ch.target.path;
   if(path==='rotation')tracks.push(new THREE.QuaternionKeyframeTrack(nn+'.quaternion',times,vals));
   else if(path==='translation')tracks.push(new THREE.VectorKeyframeTrack(nn+'.position',times,vals));
   else if(path==='scale')tracks.push(new THREE.VectorKeyframeTrack(nn+'.scale',times,vals));
  });
  clips.push(new THREE.AnimationClip(a.name,-1,tracks));
 });

 return {make,clips,hasSkin:jointSet.size>0};
}

function cityTemplate(def){
 const root=def.make();
 root.updateMatrixWorld(true);
 const bb=new THREE.Box3().setFromObject(root);
 const sz=bb.getSize(new THREE.Vector3());
 return {def,root,w:sz.x,h:sz.y,d:sz.z,cx:(bb.min.x+bb.max.x)/2,cz:(bb.min.z+bb.max.z)/2,minY:bb.min.y};
}

/* a standing copy of a static model (shares geometry and materials) */
function cityInstance(t,s,cast){
 const g=new THREE.Group();
 const inner=t.root.clone();
 inner.position.set(-t.cx,-t.minY,-t.cz);
 g.add(inner);
 g.scale.setScalar(s);
 inner.traverse(o=>{if(o.isMesh){o.castShadow=!!cast;o.receiveShadow=true;}});
 return g;
}

/* angle of a direction (x,z) measured from +Z towards +X */
function cityAng(v){return Math.atan2(v[0],v[1]);}

/* size, orientation and footprint of a model placed facing f */
CityAssets.fit=function(name,size,f){
 const t=CityAssets.tpl[name];
 if(!t)return null;
 const s=size/Math.max(t.w,t.d);
 const front=CITY_FRONT[name]||[0,-1];
 const r=cityAng(f)-cityAng(front);
 const w=t.w*s,d=t.d*s;
 const c=Math.abs(Math.cos(r)),sn=Math.abs(Math.sin(r));
 const ex=(c*w+sn*d)/2,ez=(sn*w+c*d)/2;
 return {t,s,r,w,d,h:t.h*s,ex,ez,frontHalf:Math.abs(f[0])*ex+Math.abs(f[1])*ez};
};

CityAssets.loadModel=function(rel){
 return fetch(CITY_BASE+rel).then(r=>{
  if(!r.ok)throw new Error('HTTP '+r.status);
  return r.arrayBuffer();
 }).then(b=>cityTemplate(cityParseGLB(b,rel)));
};

/* ---------- finding files ---------- */
CityAssets.discover=function(){
 return fetch(CITY_BASE+'manifest.json')
  .then(r=>{if(!r.ok)throw 0;return r.json();})
  .then(m=>Array.isArray(m)?m:(m.files||[]))
  .catch(()=>{
   try{
    const c=JSON.parse(localStorage.getItem(CITY_CACHE_KEY));
    if(c&&c.files&&c.files.length&&c.t>Date.now()-6*3600*1000)return c.files;
   }catch(e){}
   const u='https://api.github.com/repos/'+CITY_GH.owner+'/'+CITY_GH.repo+'/git/trees/'+CITY_GH.branch+'?recursive=1';
   return fetch(u).then(r=>{
    if(!r.ok)throw new Error('GitHub API '+r.status+' (repo private or owner/repo wrong?)');
    return r.json();
   }).then(t=>{
    const pre=CITY_GH.root+'city/';
    const files=t.tree.filter(e=>e.type==='blob'&&e.path.indexOf(pre)===0&&/\.glb$/i.test(e.path)).map(e=>e.path.slice(pre.length));
    try{localStorage.setItem(CITY_CACHE_KEY,JSON.stringify({t:Date.now(),files}));}catch(e){}
    return files;
   });
  });
};

CityAssets.start=function(){
 if(CityAssets.started)return;
 CityAssets.started=true;
 CityAssets.discover().then(files=>{
  files.forEach(rel=>{
   const n=rel.split('/').pop().replace(/\.glb$/i,'');
   if(!CityAssets.files[n])CityAssets.files[n]=rel;
  });
  const need={'road-straight':1,'road-crossroad':1,'construction-cone':1,'construction-barrier':1};
  CITY_FILLERS.forEach(n=>need[n]=1);
  Object.keys(CITY_LANDMARKS).forEach(k=>need[CITY_LANDMARKS[k].model]=1);
  Object.keys(CITY_JOBPLACES).forEach(k=>need[CITY_JOBPLACES[k].model]=1);
  const charNames=Object.keys(CityAssets.files).filter(n=>/^character-(male|female)-[a-z]$/.test(n)).slice(0,CITY_MAX_CHARS);
  charNames.forEach(n=>need[n]=1);
  const names=Object.keys(need).filter(n=>CityAssets.files[n]);
  console.info('[city] '+files.length+' glb files found, loading '+names.length+' models ('+charNames.length+' characters)');
  return Promise.all(names.map(n=>CityAssets.loadModel(CityAssets.files[n]).then(t=>{CityAssets.tpl[n]=t;}).catch(e=>console.warn('[city] failed '+n+': '+e.message)))).then(()=>{
   CityAssets.fillers=CITY_FILLERS.filter(n=>CityAssets.tpl[n]);
   CityAssets.charList=charNames.filter(n=>CityAssets.tpl[n]);
  });
 }).then(()=>{
  CityAssets.ready=true;
  CityAssets._onReady();
 }).catch(e=>console.warn('[city] disabled, using procedural city: '+e.message));
};

/* ---------- world helpers ---------- */
function cityBoxMatch(b,x,z,w,d){
 return Math.abs((b.min.x+b.max.x)/2-x)<0.02&&Math.abs((b.min.z+b.max.z)/2-z)<0.02&&Math.abs((b.max.x-b.min.x)-w)<0.02&&Math.abs((b.max.z-b.min.z)-d)<0.02;
}
World.addStaticBox=function(box){
 World.collidables.splice(World.landmarkCollidableCount,0,box);
 World.landmarkCollidableCount++;
};
World.removeStaticBox=function(box){
 const i=World.collidables.indexOf(box);
 if(i<0)return;
 World.collidables.splice(i,1);
 if(i<World.landmarkCollidableCount)World.landmarkCollidableCount--;
};
CityAssets.removeCubeBox=function(mesh){
 const p=mesh.geometry&&mesh.geometry.parameters;
 if(!p)return;
 for(let i=0;i<World.landmarkCollidableCount;i++){
  const b=World.collidables[i];
  if(cityBoxMatch(b,mesh.position.x,mesh.position.z,p.width,p.depth)){World.removeStaticBox(b);return;}
 }
};
CityAssets.hideDecorNear=function(x0,z0,x1,z1){
 [World._ledges,World._signs].forEach(list=>(list||[]).forEach(m=>{
  if(m.position.x>=x0&&m.position.x<=x1&&m.position.z>=z0&&m.position.z<=z1)m.visible=false;
 }));
};

CityAssets.addPOI=function(poi){
 World.pois.push(poi);
 if(poi.type==='shop')World.shops.push(poi);else World.entrances.push(poi);
};
CityAssets.removePOI=function(poi){
 [World.pois,World.entrances,World.shops].forEach(a=>{const i=a.indexOf(poi);if(i>=0)a.splice(i,1);});
};
CityAssets.dropChunk=function(g){
 (g.userData.pois||[]).forEach(p=>CityAssets.removePOI(p));
 g.userData.pois=[];
};

CityAssets.signMat=function(text,bg,fg){
 const k=text+'|'+bg+'|'+fg;
 if(!CityAssets._signMat[k])CityAssets._signMat[k]=new THREE.MeshBasicMaterial({map:signboardTex(text,bg,fg)});
 return CityAssets._signMat[k];
};
CityAssets.sign=function(parent,P,f,b,sign){
 if(!sign)return null;
 const w=Math.min(Math.max(b.w,b.d)*0.55,5),h=w*0.26;
 const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),CityAssets.signMat(sign[0],sign[1],sign[2]));
 const y=Math.min(Math.max(b.h*0.55,3.4),7);
 m.position.set(P.x-f[0]*1.08,y,P.z-f[1]*1.08);
 m.rotation.y=cityAng(f);
 parent.add(m);
 return m;
};

/* ---------- upgrading the existing cube landmarks ---------- */
CityAssets._upgradeLandmarks=function(){
 Object.keys(CITY_LANDMARKS).forEach(id=>{
  const spec=CITY_LANDMARKS[id];
  const poi=World.pois.find(p=>p.id===id&&!p.dyn);
  const b=CityAssets.fit(spec.model,spec.size,spec.face);
  if(!poi||!b)return;
  const key=spec.alias||id;
  const old=World.landmarks[key];
  const f=spec.face;
  const cx=poi.pos.x-f[0]*(b.frontHalf+1.2),cz=poi.pos.z-f[1]*(b.frontHalf+1.2);
  if(old&&old.geometry){
   old.visible=false;
   CityAssets.removeCubeBox(old);
   const p=old.geometry.parameters;
   CityAssets.hideDecorNear(old.position.x-p.width/2-1,old.position.z-p.depth/2-1,old.position.x+p.width/2+1,old.position.z+p.depth/2+1);
  }
  const g=cityInstance(b.t,b.s,true);
  g.rotation.y=b.r;
  g.position.set(cx,0,cz);
  World.scene.add(g);
  World.landmarks[key]=g;
  World.addStaticBox({min:new THREE.Vector3(cx-b.ex,0,cz-b.ez),max:new THREE.Vector3(cx+b.ex,b.h,cz+b.ez)});
  CityAssets.sign(World.scene,poi.pos,f,b,spec.sign);
  if(spec.prison)CityAssets._prisonYard(cx,cz,b,f);
 });
};

/* walls + watch towers around the prison */
CityAssets._prisonYard=function(cx,cz,b,f){
 /* the two old stray wall blocks were meant for the prison yard: remove them */
 (World._lmWalls||[]).forEach(m=>{m.visible=false;CityAssets.removeCubeBox(m);});
 const wallMat=new THREE.MeshStandardMaterial({color:0x8d8a82,roughness:1});
 const roofMat=new THREE.MeshStandardMaterial({color:0x4a4842,roughness:0.9});
 const m=4.5,x0=cx-b.ex-m,x1=cx+b.ex+m,z0=cz-b.ez-m,z1=cz+b.ez+m,H=3,T=0.7;
 const wall=(ax,az,bx,bz)=>{
  const w=Math.abs(bx-ax)+T,d=Math.abs(bz-az)+T;
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,H,d),wallMat);
  mesh.position.set((ax+bx)/2,H/2,(az+bz)/2);
  mesh.castShadow=mesh.receiveShadow=true;
  World.scene.add(mesh);
  World.addStaticBox({min:new THREE.Vector3((ax+bx)/2-w/2,0,(az+bz)/2-d/2),max:new THREE.Vector3((ax+bx)/2+w/2,H,(az+bz)/2+d/2)});
 };
 /* the side the door looks at keeps a gap in the middle */
 const gap=4;
 if(f[1]!==0){
  const gz=f[1]>0?z1:z0,oz=f[1]>0?z0:z1;
  wall(x0,oz,x1,oz);
  wall(x0,gz,cx-gap,gz);wall(cx+gap,gz,x1,gz);
  wall(x0,z0,x0,z1);wall(x1,z0,x1,z1);
 }else{
  const gx=f[0]>0?x1:x0,ox=f[0]>0?x0:x1;
  wall(ox,z0,ox,z1);
  wall(gx,z0,gx,cz-gap);wall(gx,cz+gap,gx,z1);
  wall(x0,z0,x1,z0);wall(x0,z1,x1,z1);
 }
 [[x0,z0],[x1,z0],[x0,z1],[x1,z1]].forEach(c=>{
  const tw=new THREE.Mesh(new THREE.BoxGeometry(2.2,7,2.2),wallMat);
  tw.position.set(c[0],3.5,c[1]);tw.castShadow=tw.receiveShadow=true;World.scene.add(tw);
  const rf=new THREE.Mesh(new THREE.BoxGeometry(3.2,0.6,3.2),roofMat);
  rf.position.set(c[0],7.3,c[1]);World.scene.add(rf);
  World.addStaticBox({min:new THREE.Vector3(c[0]-1.1,0,c[1]-1.1),max:new THREE.Vector3(c[0]+1.1,7,c[1]+1.1)});
 });
};

/* ---------- new job places placed at start ---------- */
CityAssets._buildJobPlaces=function(){
 Object.keys(CITY_JOBPLACES).forEach(id=>{
  const spec=CITY_JOBPLACES[id];
  const b=CityAssets.fit(spec.model,spec.size,spec.face);
  if(!b)return;
  const f=spec.face,P=new THREE.Vector3(spec.pos[0],1,spec.pos[1]);
  const cx=P.x-f[0]*(b.frontHalf+1.2),cz=P.z-f[1]*(b.frontHalf+1.2);
  const g=cityInstance(b.t,b.s,true);
  g.rotation.y=b.r;g.position.set(cx,0,cz);
  World.scene.add(g);
  World.landmarks[id]=g;
  World.addStaticBox({min:new THREE.Vector3(cx-b.ex,0,cz-b.ez),max:new THREE.Vector3(cx+b.ex,b.h,cz+b.ez)});
  CityAssets.sign(World.scene,P,f,b,spec.sign);
  /* props on the pavement in front */
  const side=[-f[1],f[0]];
  (spec.props||[]).forEach((pn,i)=>{
   const pb=CityAssets.fit(pn,pn==='construction-cone'?1.1:2.6,[0,1]);
   if(!pb)return;
   const k=(i%2?1:-1)*(3+Math.floor(i/2)*1.6);
   const pg=cityInstance(pb.t,pb.s,false);
   pg.position.set(P.x+side[0]*k+f[0]*0.4,0,P.z+side[1]*k+f[1]*0.4);
   pg.rotation.y=cityAng(f);
   World.scene.add(pg);
  });
  CityAssets.addPOI({id,name:spec.name,type:'interior',pos:P,color:spec.color,job:true});
 });
};

/* ---------- map lots: filler buildings + copies of the enterable places, merged per chunk ---------- */
function cityMerge(items,castShadow){
 const groups=new Map();
 items.forEach(it=>{if(!groups.has(it.mat))groups.set(it.mat,[]);groups.get(it.mat).push(it);});
 const out=[];
 groups.forEach((list,mat)=>{
  let nv=0,ni=0;
  list.forEach(it=>{const a=it.geo.attributes.position.count;nv+=a;ni+=it.geo.index?it.geo.index.count:a;});
  const pos=new Float32Array(nv*3),nor=new Float32Array(nv*3),uv=new Float32Array(nv*2),idx=new Uint32Array(ni);
  let vo=0,io=0;
  const v=new THREE.Vector3(),nm=new THREE.Matrix3();
  list.forEach(it=>{
   const gp=it.geo.attributes.position,gn=it.geo.attributes.normal,gu=it.geo.attributes.uv;
   nm.getNormalMatrix(it.m);
   for(let i=0;i<gp.count;i++){
    v.fromBufferAttribute(gp,i).applyMatrix4(it.m);
    pos[(vo+i)*3]=v.x;pos[(vo+i)*3+1]=v.y;pos[(vo+i)*3+2]=v.z;
    if(gn){v.fromBufferAttribute(gn,i).applyMatrix3(nm).normalize();nor[(vo+i)*3]=v.x;nor[(vo+i)*3+1]=v.y;nor[(vo+i)*3+2]=v.z;}
    if(gu){uv[(vo+i)*2]=gu.getX(i);uv[(vo+i)*2+1]=gu.getY(i);}
   }
   if(it.geo.index){for(let i=0;i<it.geo.index.count;i++)idx[io+i]=it.geo.index.getX(i)+vo;io+=it.geo.index.count;}
   else{for(let i=0;i<gp.count;i++)idx[io+i]=vo+i;io+=gp.count;}
   vo+=gp.count;
  });
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  g.setAttribute('normal',new THREE.BufferAttribute(nor,3));
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  g.setIndex(new THREE.BufferAttribute(idx,1));
  g.computeBoundingSphere();
  const m=new THREE.Mesh(g,mat);
  m.castShadow=!!castShadow;m.receiveShadow=true;
  out.push(m);
 });
 return out;
}

CityAssets._keepClear=function(x0,z0,x1,z1){
 /* fixed landmarks */
 for(let i=0;i<World.landmarkCollidableCount;i++){
  const b=World.collidables[i];
  if(x0<b.max.x+1.5&&x1>b.min.x-1.5&&z0<b.max.z+1.5&&z1>b.min.z-1.5)return true;
 }
 /* doors, spawns and start cars */
 const pts=[];
 World.pois.forEach(p=>{if(!p.dyn)pts.push([p.pos.x,p.pos.z]);});
 [[-68,-18],[50,-50],[58,-52]].forEach(p=>pts.push(p));
 for(let i=0;i<5;i++)pts.push([-40+i*20,10]);
 if(typeof NPC_DEFS!=='undefined')NPC_DEFS.forEach(n=>{if(n.spawn)pts.push([n.spawn.x,n.spawn.z]);});
 for(const p of pts)if(p[0]>x0-2.5&&p[0]<x1+2.5&&p[1]>z0-2.5&&p[1]<z1+2.5)return true;
 return false;
};

CityAssets.decorateChunk=function(group,cx,cz,bMesh,center){
 if(!CityAssets.ready){CityAssets.pending.push({group,cx,cz,bMesh,center});return;}
 CityAssets._lots(group,cx,cz,bMesh,center);
};

CityAssets._lots=function(group,cx,cz,bMesh,center){
 if(!CityAssets.fillers.length)return false;
 if(group.userData.lotMeshes)return true;
 if(bMesh)bMesh.visible=false;
 const boxes=group.userData.boxes;
 boxes.length=0;
 group.userData.pois=[];
 const ox=cx*World.CHUNK,oz=cz*World.CHUNK;
 const items=[],meshes=[];
 const mM=new THREE.Matrix4(),tM=new THREE.Matrix4(),rM=new THREE.Matrix4(),sM=new THREE.Matrix4(),oM=new THREE.Matrix4();

 [[-1,-1],[1,-1],[-1,1],[1,1]].forEach((q,i)=>{
  const h=hash(cx*29+i*7,cz*31+i*3),h2=hash(cx*53+i*11,cz*17+i*5),h3=hash(cx*97+i*13,cz*43+i*9);
  const px=ox+q[0]*13.5,pz=oz+q[1]*13.5;
  const alongX=((h*13)%1)<0.5;
  const f=alongX?[-q[0],0]:[0,-q[1]];

  /* what stands here: a service (hospital, bank, work...) or an ordinary building */
  let svc=null;
  if(h2<0.42){
   let r=h3*CITY_SERVICE_TOTAL;
   for(const s of CITY_SERVICES){r-=s[1];if(r<=0){svc=s[0];break;}}
  }
  let spec=null,name,size;
  if(svc){
   spec=CITY_LANDMARKS[svc]||CITY_JOBPLACES[svc];
   if(!spec||!CityAssets.tpl[spec.model])svc=null;
  }
  if(svc){name=spec.model;size=Math.min(spec.size,CITY_LOT_MAX);}
  else{
   name=CityAssets.fillers[Math.floor(h*CityAssets.fillers.length)%CityAssets.fillers.length];
   size=Math.min(CITY_LOT_MAX,8.5+((h*97)%1)*2.5);
  }
  const b=CityAssets.fit(name,size,f);
  if(!b)return;
  if(center&&CityAssets._keepClear(px-b.ex,pz-b.ez,px+b.ex,pz+b.ez))return;

  /* merge this building into the chunk mesh */
  tM.makeTranslation(px,0,pz);rM.makeRotationY(b.r);sM.makeScale(b.s,b.s,b.s);
  oM.makeTranslation(-b.t.cx,-b.t.minY,-b.t.cz);
  b.t.root.updateMatrixWorld(true);
  b.t.root.traverse(o=>{
   if(!o.isMesh)return;
   mM.copy(tM).multiply(rM).multiply(sM).multiply(oM).multiply(o.matrixWorld);
   items.push({geo:o.geometry,mat:o.material,m:mM.clone()});
  });
  boxes.push({min:new THREE.Vector3(px-b.ex,0,pz-b.ez),max:new THREE.Vector3(px+b.ex,b.h,pz+b.ez)});

  if(svc){
   const P=new THREE.Vector3(px+f[0]*(b.frontHalf+1.2),1,pz+f[1]*(b.frontHalf+1.2));
   const poi={id:svc,name:CITY_NAMES[svc]||spec.name||svc,type:CITY_SHOPTYPES[svc]?'shop':'interior',pos:P,color:spec.color||'#888',dyn:true};
   CityAssets.addPOI(poi);
   group.userData.pois.push(poi);
   const sg=CityAssets.sign(group,P,f,b,spec.sign);
   if(sg)meshes.push(sg);
  }
 });
 cityMerge(items,false).forEach(m=>{group.add(m);meshes.push(m);});
 group.userData.lotMeshes=meshes;
 return true;
};

/* ---------- roads: instanced tiles along the grid lines ---------- */
CityAssets._makeSet=function(t,cap){
 const parts=[];
 t.root.updateMatrixWorld(true);
 t.root.traverse(o=>{if(o.isMesh)parts.push({geo:o.geometry,mat:o.material,m:o.matrixWorld.clone()});});
 const s=CITY_ROAD_TILE/Math.max(t.w,t.d);
 const base=new THREE.Matrix4().makeScale(s,s,s).multiply(new THREE.Matrix4().makeTranslation(-t.cx,-t.minY,-t.cz));
 const meshes=parts.map(p=>{
  const im=new THREE.InstancedMesh(p.geo,p.mat,cap);
  im.receiveShadow=true;
  im.frustumCulled=false;
  im.count=0;
  World.scene.add(im);
  return im;
 });
 return {parts,base,meshes,n:0,cap};
};

CityAssets._blocked=function(x,z){
 for(let i=0;i<World.landmarkCollidableCount;i++){
  const b=World.collidables[i];
  if(x>b.min.x-2&&x<b.max.x+2&&z>b.min.z-2&&z<b.max.z+2&&(b.max.y===undefined||b.max.y>2.5))return true;
 }
 return false;
};

CityAssets._put=function(set,x,z,rot){
 if(set.n>=set.cap)return;
 if(CityAssets._blocked(x,z))return;
 const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),rot);
 const inst=new THREE.Matrix4().compose(new THREE.Vector3(x,0.03,z),q,new THREE.Vector3(1,1,1));
 const m=new THREE.Matrix4();
 for(let i=0;i<set.parts.length;i++){
  m.copy(inst).multiply(set.base).multiply(set.parts[i].m);
  set.meshes[i].setMatrixAt(set.n,m);
 }
 set.n++;
};

CityAssets._initRoads=function(){
 const t=CityAssets.tpl['road-straight'];
 if(!t)return;
 CityAssets._rs=CityAssets._makeSet(t,1500);
 if(CityAssets.tpl['road-crossroad'])CityAssets._rc=CityAssets._makeSet(CityAssets.tpl['road-crossroad'],200);
 (World._roadMeshes||[]).forEach(m=>{m.visible=false;});
 if(CityAssets._center)CityAssets._updateRoads(CityAssets._center[0],CityAssets._center[1]);
};

CityAssets.onCenter=function(ccx,ccz){
 const c=CityAssets._center;
 if(c&&c[0]===ccx&&c[1]===ccz)return;
 CityAssets._center=[ccx,ccz];
 CityAssets._updateRoads(ccx,ccz);
};

CityAssets._updateRoads=function(ccx,ccz){
 const rs=CityAssets._rs;
 if(!rs)return;
 const rc=CityAssets._rc;
 rs.n=0;if(rc)rc.n=0;
 const R=World.RADIUS+1,T=CITY_ROAD_TILE,L=World.CHUNK;
 const x0=(ccx-R)*L,x1=(ccx+R)*L,z0=(ccz-R)*L,z1=(ccz+R)*L;
 const lineMax=4;
 for(let k=-lineMax;k<=lineMax;k++){
  const line=k*L;
  if(line>=x0-T&&line<=x1+T){            /* road running along Z at x=line */
   for(let z=Math.ceil(z0/T)*T;z<=z1;z+=T){
    const onCross=Math.abs(((z%L)+L)%L)<0.01&&Math.abs(z)<=lineMax*L;
    if(onCross){if(rc)CityAssets._put(rc,line,z,0);else CityAssets._put(rs,line,z,CITY_ROAD_ROT);}
    else CityAssets._put(rs,line,z,CITY_ROAD_ROT);
   }
  }
  if(line>=z0-T&&line<=z1+T){            /* road running along X at z=line */
   for(let x=Math.ceil(x0/T)*T;x<=x1;x+=T){
    const onCross=Math.abs(((x%L)+L)%L)<0.01&&Math.abs(x)<=lineMax*L;
    if(onCross)continue;                  /* crossing already placed above */
    CityAssets._put(rs,x,line,0);
   }
  }
 }
 [rs,rc].forEach(set=>{
  if(!set)return;
  set.meshes.forEach(im=>{im.count=set.n;im.instanceMatrix.needsUpdate=true;});
 });
};

/* ---------- characters (skinned, animated: idle / walk / sprint) ---------- */
CityAssets.dressNPC=function(g){
 if(!CityAssets.ready){CityAssets.npcQueue.push(g);return;}
 CityAssets._dress(g);
};

CityAssets._dress=function(g){
 const list=CityAssets.charList||[];
 if(!list.length)return;
 const t=CityAssets.tpl[list[Math.floor(Math.random()*list.length)]];
 const root=t.def.make();
 const holder=new THREE.Group();
 root.position.set(-t.cx,-t.minY,-t.cz);
 holder.add(root);
 holder.scale.setScalar(1.65/t.h);
 const mixer=new THREE.AnimationMixer(root);
 const actions={};
 t.def.clips.forEach(c=>{actions[c.name]=mixer.clipAction(c);});
 g.children.forEach(c=>{c.visible=false;});     /* the old box body stays (hidden) so other code keeps working */
 g.add(holder);
 holder.traverse(o=>{if(o.isMesh){o.castShadow=true;}});
 const e={g,holder,mixer,actions,cur:null,lx:g.position.x,lz:g.position.z,tinted:false};
 CityAssets._play(e,'idle');
 CityAssets.npcs.push(e);
};

CityAssets._play=function(e,name){
 const a=e.actions[name];
 if(!a||e.cur===name)return;
 const old=e.cur&&e.actions[e.cur];
 a.reset().setEffectiveWeight(1).fadeIn(0.2).play();
 if(old)old.fadeOut(0.2);
 e.cur=name;
};

CityAssets.update=function(dt){
 if(!CityAssets.npcs.length||dt<=0)return;
 dt=Math.min(dt,0.1);
 for(const e of CityAssets.npcs){
  const g=e.g;
  if(!g.visible){e.lx=g.position.x;e.lz=g.position.z;continue;}
  const dx=g.position.x-e.lx,dz=g.position.z-e.lz;
  e.lx=g.position.x;e.lz=g.position.z;
  const sp=Math.sqrt(dx*dx+dz*dz)/dt;
  /* a big jump = teleport/respawn, not walking */
  const state=sp>30?'idle':sp>3.2?'sprint':sp>0.12?'walk':'idle';
  CityAssets._play(e,state);
  e.mixer.update(dt*(state==='walk'?Math.min(Math.max(sp/1.2,0.6),1.6):1));
  /* police officers keep their blue uniform look */
  if(!e.tinted&&g.children[0]&&g.children[0].material&&g.children[0].material.color.getHex()===0x1f3b57){
   e.tinted=true;
   e.holder.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.setHex(0x7c98d8);}});
  }
 }
};

/* ---------- trees ---------- */
CityAssets.addTree=function(parent,x,z){return false;};

CityAssets._onReady=function(){
 CityAssets._upgradeLandmarks();
 CityAssets._buildJobPlaces();
 CityAssets._initRoads();
 CityAssets.pending.forEach(p=>{
  if(World.chunks&&World.chunks.get(p.cx+','+p.cz)===p.group)CityAssets._lots(p.group,p.cx,p.cz,p.bMesh,p.center);
 });
 CityAssets.pending.length=0;
 World.collidables.length=World.landmarkCollidableCount;
 for(const g of World.chunks.values())World.collidables.push(...g.userData.boxes);
 CityAssets.npcQueue.forEach(g=>CityAssets._dress(g));
 CityAssets.npcQueue.length=0;
 console.info('[city] ready: '+Object.keys(CityAssets.tpl).length+' models, '+CityAssets.fillers.length+' filler buildings, '+(CityAssets.charList||[]).length+' characters');
};

/* ============ STREET FURNITURE ============ */
function trafficSignTex(){
 return canvasTex((g,w,h)=>{
  g.clearRect(0,0,w,h);
  g.fillStyle='#c0392b';
  g.beginPath();
  g.arc(w/2,h/2,w/2-4,0,Math.PI*2);
  g.fill();
  g.fillStyle='#fff';
  g.beginPath();
  g.arc(w/2,h/2,w/2-12,0,Math.PI*2);
  g.fill();
  g.fillStyle='#1c1c1c';
  g.font='bold '+(w*0.34)+'px sans-serif';
  g.textAlign='center';
  g.textBaseline='middle';
  g.fillText('40',w/2,h/2+2);
 },96,96);
}

const signMat=new THREE.MeshStandardMaterial({color:0x333,roughness:0.7});
const signBoardMat=new THREE.MeshStandardMaterial({map:trafficSignTex(),roughness:0.6});

function makeTrafficSign(parent,x,z){
 const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,2.2,6),signMat);
 pole.position.set(x,1.1,z);
 parent.add(pole);

 const board=new THREE.Mesh(new THREE.CircleGeometry(0.35,16),signBoardMat);
 board.position.set(x,2.1,z);
 board.rotation.y=Math.PI/2;
 parent.add(board);
}

const treeTrunkMat=new THREE.MeshStandardMaterial({color:0x6b4a30,roughness:0.9});
const treeFoliageMat=new THREE.MeshStandardMaterial({color:0x3f7a3f,roughness:0.85});

function makeTree(parent,x,z){
 if(CityAssets.addTree(parent,x,z))return;
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.16,1.4,6),treeTrunkMat);
 trunk.position.set(x,0.7,z);
 trunk.castShadow=true;
 parent.add(trunk);

 const foliage=new THREE.Mesh(new THREE.ConeGeometry(0.85,1.8,8),treeFoliageMat);
 foliage.position.set(x,2.1,z);
 foliage.castShadow=true;
 parent.add(foliage);
}

/* ============ TRAFFIC ============ */
const Traffic={cars:[],size:10};

/* mix of real models driving around */
const TRAFFIC_TYPES=['sedan','hatchback','suv','sedan','pickup','hatchback'];

Traffic.init=function(){
 const colors=[0x8a3a3a,0x3a5a8a,0x555555,0x2f6b4a,0x9c7a3a,0x6b4226];

 for(let i=0;i<Traffic.size;i++){
  const mesh=World.makeCar(9999,9999,colors[i%colors.length],TRAFFIC_TYPES[i%TRAFFIC_TYPES.length]);
  Traffic.cars.push({mesh,axis:'x',dir:1,speed:6+Math.random()*3});
 }
};

Traffic.respawn=function(car,playerPos){
 const vertical=Math.random()<0.5;
 const k=(Math.floor(Math.random()*7)-3)*40;
 const dir=Math.random()<0.5?1:-1;
 const ahead=50+Math.random()*40;

 if(vertical){
  car.axis='z';
  car.dir=dir;
  car.mesh.position.set(k+(dir>0?-2:2),0,playerPos.z-dir*ahead);
  car.mesh.rotation.y=dir>0?0:Math.PI;
 }else{
  car.axis='x';
  car.dir=dir;
  car.mesh.position.set(playerPos.x-dir*ahead,0,k+(dir>0?2:-2));
  car.mesh.rotation.y=dir>0?Math.PI/2:-Math.PI/2;
 }
};

Traffic.update=function(dt,playerPos){
 Traffic.cars.forEach(car=>{
  if(playerPos.distanceTo(car.mesh.position)>150){
   Traffic.respawn(car,playerPos);
   return;
  }
  if(car.axis==='z'){car.mesh.position.z+=car.dir*car.speed*dt;}
  else{car.mesh.position.x+=car.dir*car.speed*dt;}
 });
};

/* ============ NPCs ============ */
const SKIN=[0xC68642,0x8D5524,0xE0AC69,0xF1C27D];
const OUTFIT=[0x3d5a6c,0x6b4226,0x4a4a48,0x7a5230,0x2f4a3e];
const PANTS=[0x2b2f38,0x4a3a2a,0x1f1f1f,0x5a4632,0x30323a];

function spawnNPC(x,z){
 const skin=SKIN[Math.floor(Math.random()*SKIN.length)];
 const outfit=OUTFIT[Math.floor(Math.random()*OUTFIT.length)];
 const pants=PANTS[Math.floor(Math.random()*PANTS.length)];
 const height=0.88+Math.random()*0.28;

 const g=new THREE.Group();

 const skinMat=new THREE.MeshStandardMaterial({color:skin});
 const outfitMat=new THREE.MeshStandardMaterial({color:outfit});
 const pantsMat=new THREE.MeshStandardMaterial({color:pants});

 const torso=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.55,0.26),outfitMat);
 torso.position.y=1.05;
 torso.castShadow=true;
 g.add(torso);

 const head=new THREE.Mesh(new THREE.SphereGeometry(0.16,10,10),skinMat);
 head.position.y=1.48;
 g.add(head);

 const armGeo=new THREE.CylinderGeometry(0.055,0.055,0.5,6);

 const armL=new THREE.Mesh(armGeo,skinMat);
 armL.position.set(-0.27,1.05,0);
 armL.rotation.z=0.12;
 armL.castShadow=true;
 g.add(armL);

 const armR=new THREE.Mesh(armGeo,skinMat);
 armR.position.set(0.27,1.05,0);
 armR.rotation.z=-0.12;
 armR.castShadow=true;
 g.add(armR);

 const legGeo=new THREE.CylinderGeometry(0.08,0.075,0.62,6);

 const legL=new THREE.Mesh(legGeo,pantsMat);
 legL.position.set(-0.12,0.5,0);
 legL.castShadow=true;
 g.add(legL);

 const legR=new THREE.Mesh(legGeo,pantsMat);
 legR.position.set(0.12,0.5,0);
 legR.castShadow=true;
 g.add(legR);

 CityAssets.dressNPC(g);
 g.scale.setScalar(height);
 g.position.set(x,0,z);

 World.scene.add(g);

 const entry={mesh:g,dir:Math.random()*Math.PI*2,timer:0};
 World.npcs.push(entry);
 return entry;
}

World.keyNpcs={};

function spawnKeyNpcs(){
 World.keyNpcs.yasmine=spawnNPC(2,-38);
 World.keyNpcs.karim=spawnNPC(22,-16);
 World.keyNpcs.sofia=spawnNPC(-68,-14);
}

World.update=function(px,pz,dt){
 World.updateChunks(px,pz);
 if(!World.testMode){
  Traffic.update(dt,new THREE.Vector3(px,0,pz));
  World.updateCheckpoint(px,pz,dt);
 }
 CityAssets.update(dt);
};

/* ============ CHUNK STREAMING ============ */
World.CHUNK=40;
World.RADIUS=3;

const buildingGeo=new THREE.BoxGeometry(6,1,6);

const bMatVariants=[
 new THREE.MeshStandardMaterial({map:TEX.residential,roughness:0.85}),
 new THREE.MeshStandardMaterial({map:TEX.residential2,roughness:0.85})
];

const lampGeo=new THREE.CylinderGeometry(0.08,0.08,3,6);
const lampMat=new THREE.MeshStandardMaterial({color:0x333,roughness:0.8});
const lampHeadGeo=new THREE.SphereGeometry(0.18,8,8);
const lampHeadMat=new THREE.MeshStandardMaterial({color:0xffe9b0,emissive:0xffcf7a,emissiveIntensity:0.6});

function chunkKey(cx,cz){return cx+','+cz;}

function hash(cx,cz){
 let h=cx*374761393+cz*668265263;
 h=(h^(h>>>13))*1274126177;
 return ((h^(h>>>16))>>>0)/4294967295;
}

function clampAwayFromRoad(v){
 const nearest=Math.round(v/40)*40;
 const d=v-nearest;
 if(Math.abs(d)<World.roadClearance){
  return nearest+(d<0?-World.roadClearance:World.roadClearance);
 }
 return v;
}

function buildChunk(cx,cz){
 const group=new THREE.Group();
 group.userData.boxes=[];
 const center=Math.abs(cx)<=2&&Math.abs(cz)<=2;

 const count=6;

 const bMesh=new THREE.InstancedMesh(buildingGeo,bMatVariants[Math.abs(cx+cz)%2],count);
 bMesh.castShadow=true;
 bMesh.receiveShadow=true;

 const lampPoles=new THREE.InstancedMesh(lampGeo,lampMat,4);
 const lampHeads=new THREE.InstancedMesh(lampHeadGeo,lampHeadMat,4);

 const dummy=new THREE.Object3D();

 const originX=cx*World.CHUNK;
 const originZ=cz*World.CHUNK;

 for(let i=0;i<(center?0:count);i++){
  const h=hash(cx*13+i,cz*7+i);

  const w=4+h*4;
  const ht=5+h*14;
  const d=4+((h*31)%1)*4;

  let px=originX+(((i%3)-1)*World.CHUNK/3)+(h-0.5)*6;
  let pz=originZ+((Math.floor(i/3)-0.5)*World.CHUNK/2)+(h-0.5)*6;

  px=clampAwayFromRoad(px);
  pz=clampAwayFromRoad(pz);

  dummy.position.set(px,ht/2,pz);
  dummy.scale.set(w/6,ht,d/6);
  dummy.updateMatrix();
  bMesh.setMatrixAt(i,dummy.matrix);

  group.userData.boxes.push({
   min:new THREE.Vector3(px-w/2,0,pz-d/2),
   max:new THREE.Vector3(px+w/2,ht,pz+d/2)
  });
 }

 const lampSpots=[
  sidewalkSpot('x',originX,originZ+15,1),
  sidewalkSpot('x',originX,originZ-15,-1),
  sidewalkSpot('z',originZ,originX+15,1),
  sidewalkSpot('z',originZ,originX-15,-1) /* fixed: 'originZ' argument was missing */
 ];

 lampSpots.forEach((s,i)=>{
  dummy.position.set(s.x,1.5,s.z);
  dummy.scale.set(1,1,1);
  dummy.updateMatrix();
  lampPoles.setMatrixAt(i,dummy.matrix);

  dummy.position.set(s.x,3.05,s.z);
  dummy.updateMatrix();
  lampHeads.setMatrixAt(i,dummy.matrix);
 });

 bMesh.instanceMatrix.needsUpdate=true;
 lampPoles.instanceMatrix.needsUpdate=true;
 lampHeads.instanceMatrix.needsUpdate=true;

 group.add(bMesh,lampPoles,lampHeads);

 let s;
 if(!center){
 s=sidewalkSpot('x',originX,originZ+8,1);
 makeTree(group,s.x,s.z);

 s=sidewalkSpot('z',originZ,originX-8,-1);
 makeTree(group,s.x,s.z);

 s=sidewalkSpot('x',originX,originZ-8,-1);
 makeTrafficSign(group,s.x,s.z);
 }

 if(!center&&hash(cx*3,cz*5)>0.55){
  s={z:originZ+(hash(cx,cz+7)<0.5?-1:1)*(9+hash(cx+3,cz)*8)}; /* keep clear of the intersection */

  const curbX=originX+ROAD_HALF+2.1; /* fully on the sidewalk, not on the asphalt */

  /* parked cars along the road: sedans, hatchbacks, SUVs, pickups */
  const parkedPool=['sedan','hatchback','suv','pickup'];

  const pc=World.makeCar(
   curbX,
   s.z,
   [0x8a3a3a,0x3a5a8a,0x555555,0x2f6b4a][Math.floor(hash(cx,cz+1)*4)],
   parkedPool[Math.floor(hash(cx,cz+2)*parkedPool.length)%parkedPool.length]
  );

  pc.rotation.y=Math.PI/2;
  group.add(pc);
 }

 if(!center&&hash(cx*17,cz*19)>0.7){
  s=sidewalkSpot('x',originX,originZ+(hash(cx,cz)-0.5)*20,1);
  makeBillboard(group,s.x,3,s.z,s.faceRotY,'ad_generic.jpg','SIDEWALK AD');
 }

 CityAssets.decorateChunk(group,cx,cz,bMesh,center);

 return group;
}

World.landmarkCollidableCount=0;

World.updateChunks=function(px,pz){
 if(World.testMode)return;
 const ccx=Math.round(px/World.CHUNK);
 const ccz=Math.round(pz/World.CHUNK);
 CityAssets.onCenter(ccx,ccz);

 const wanted=new Set();
 let changed=false;

 for(let dx=-World.RADIUS;dx<=World.RADIUS;dx++){
  for(let dz=-World.RADIUS;dz<=World.RADIUS;dz++){
   const cx=ccx+dx;
   const cz=ccz+dz;

   const key=chunkKey(cx,cz);
   wanted.add(key);

   if(!World.chunks.has(key)){
    const g=buildChunk(cx,cz);
    World.scene.add(g);
    World.chunks.set(key,g);
    changed=true;
   }
  }
 }

 for(const [key,g] of World.chunks){
  if(!wanted.has(key)){
   CityAssets.dropChunk(g);
   World.scene.remove(g);
   World.chunks.delete(key);
   changed=true;
  }
 }

 if(changed){
  World.collidables.length=World.landmarkCollidableCount;
  for(const g of World.chunks.values()){
   World.collidables.push(...g.userData.boxes);
  }
 }
};

/* ============ QUALITY ============ */
World.applyQuality=function(){
 const m={
  low:{pr:1,sh:false,fog:200},
  med:{pr:1.5,sh:true,fog:150},
  high:{pr:2,sh:true,fog:120},
  ultra:{pr:2,sh:true,fog:80}
 }[S.qual]||{pr:1.5,sh:true,fog:150};

 World.renderer.setPixelRatio(Math.min(devicePixelRatio,m.pr));
 World.renderer.shadowMap.enabled=m.sh;
 World.scene.fog.far=m.fog;
};

/* ============ DAY / NIGHT ============ */
World.dayNight={time:12,speedPerSec:24/1200};

World.setLights=function(hemi,sun){
 World._hemi=hemi;
 World._sun=sun;
};

const DAYNIGHT_SKY_NIGHT=new THREE.Color(0x0b1220);
const DAYNIGHT_SKY_DAY=new THREE.Color(0xbfd4e6);
const DAYNIGHT_TMP=new THREE.Color();

World.updateDayNight=function(dt){

 World.dayNight.time=(World.dayNight.time+World.dayNight.speedPerSec*dt)%24;

 const angle=((World.dayNight.time-6)/24)*Math.PI*2;
 const sunHeight=Math.sin(angle);
 const dayAmt=Math.max(0,sunHeight);

 if(World._sun){
  World._sun.position.set(Math.cos(angle)*80,Math.max(5,sunHeight*80),Math.sin(angle)*24-20);
  World._sun.intensity=0.15+dayAmt*1.15;

  const warmth=1-Math.min(1,Math.abs(sunHeight)*2);
  World._sun.color.setRGB(1,0.85-warmth*0.15,0.7-warmth*0.25);
 }

 if(World._hemi){
  World._hemi.intensity=0.25+dayAmt*0.5;
  World._hemi.color.setHSL(0.58,0.4,0.5+dayAmt*0.3);
  World._hemi.groundColor.setHSL(0.08,0.3,0.15+dayAmt*0.15);
 }

 if(World.scene){
  DAYNIGHT_TMP.copy(DAYNIGHT_SKY_NIGHT).lerp(DAYNIGHT_SKY_DAY,dayAmt);
  World.scene.background.copy(DAYNIGHT_TMP);
  if(World.scene.fog){World.scene.fog.color.copy(DAYNIGHT_TMP);}
 }

 const wantLit=sunHeight<0.15;

 if(World._lampsLit!==wantLit){
  World._lampsLit=wantLit;
  lampHeadMat.emissiveIntensity=wantLit?1.4:0.15;
  lampHeadMat.color.set(wantLit?0xffe9b0:0x554433);
 }
};
