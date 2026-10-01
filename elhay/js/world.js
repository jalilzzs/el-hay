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
  return {
   x:coord+off,
   z:along,
   faceRotY:side>0?-Math.PI/2:Math.PI/2
  };
 }
 return {
  x:along,
  z:coord+off,
  faceRotY:side>0?Math.PI:0
 };
}

/* ============ WORLD INIT ============ */
World.init=function(scene,renderer){
 World.scene=scene;
 World.renderer=renderer;
 World.collidables=[];
 World.npcs=[];
 World.interiors={};
 World.interiorInteractables={};
 World.interiorMeta={};
 World.activeInterior=null;
 World.currentInteriorMeta=null;

 const groundMat=new THREE.MeshStandardMaterial({
  map:TEX.grass,
  roughness:1
 });

 TEX.grass.repeat.set(200,200);

 const ground=new THREE.Mesh(
  new THREE.PlaneGeometry(2000,2000),
  groundMat
 );

 ground.rotation.x=-Math.PI/2;
 ground.position.y=0;
 ground.receiveShadow=true;
 scene.add(ground);

 const roadMat=new THREE.MeshStandardMaterial({
  map:TEX.road,
  roughness:0.9,
  polygonOffset:true,
  polygonOffsetFactor:-1,
  polygonOffsetUnits:-1
 });

 const stripeMat=new THREE.MeshStandardMaterial({
  map:TEX.roadStripe,
  roughness:0.9,
  transparent:true,
  alphaTest:0.4,
  polygonOffset:true,
  polygonOffsetFactor:-2,
  polygonOffsetUnits:-2
 });

 const sidewalkMat=new THREE.MeshStandardMaterial({
  map:TEX.sidewalk,
  roughness:1
 });

 TEX.road.repeat.set(1,50);
 TEX.roadStripe.repeat.set(1,50);

 function makeRoad(x,z,w,l){
  const asphalt=new THREE.Mesh(
   new THREE.PlaneGeometry(w,l),
   roadMat
  );
  asphalt.rotation.x=-Math.PI/2;
  asphalt.position.set(x,0.02,z);
  asphalt.receiveShadow=true;
  scene.add(asphalt);

  const stripe=new THREE.Mesh(
   new THREE.PlaneGeometry(w,l),
   stripeMat
  );
  stripe.rotation.x=-Math.PI/2;
  stripe.position.set(x,0.04,z);
  scene.add(stripe);
 }

 function makeSidewalk(x,z,w,l){
  const s=new THREE.Mesh(
   new THREE.PlaneGeometry(w,l),
   sidewalkMat
  );
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

 const parkedTypes=[
  'sedan',
  'hatchback',
  'sedan',
  'hatchback',
  'sedan'
 ];

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
 World.checkpointPos=new THREE.Vector3();

 World.randomizeCheckpoint();

 World.chunks=new Map();
 World.updateChunks(0,0);

 Traffic.init();
};

/* ============ CHECKPOINT ============ */
World.randomizeCheckpoint=function(){
 const vertical=Math.random()<0.5;
 const k=(Math.floor(Math.random()*7)-3)*40;
 const along=(Math.random()<0.5?-1:1)*(60+Math.random()*90);

 let x,z,rotY;

 if(vertical){
  x=k;
  z=along;
  rotY=0;
 }else{
  x=along;
  z=k;
  rotY=Math.PI/2;
 }

 World.checkpointBarrier.position.set(x,0.6,z);
 World.checkpointBarrier.rotation.y=rotY;

 World.checkpointOfficer.mesh.position.set(
  x+(vertical?1.5:0),
  0,
  z+(vertical?0:1.5)
 );

 World.checkpointOfficer2.mesh.position.set(
  x-(vertical?1.5:0),
  0,
  z-(vertical?0:1.5)
 );

 World.checkpointOfficer.mesh.rotation.y=
 World.checkpointOfficer2.mesh.rotation.y=rotY;

 World.checkpointCruiser.position.set(
  x+(vertical?3:0),
  0,
  z+(vertical?0:3)
 );

 World.checkpointCruiser.rotation.y=rotY+Math.PI/2;
 World.checkpointPos.set(x,0,z);
};

/* ============ COLLISION ============ */
World.resolveCollision=function(pos,radius){
 for(const b of World.collidables){
  const minX=b.min.x-radius;
  const maxX=b.max.x+radius;
  const minZ=b.min.z-radius;
  const maxZ=b.max.z+radius;

  if(
   pos.x>minX&&
   pos.x<maxX&&
   pos.z>minZ&&
   pos.z<maxZ
  ){
   const pushLeft=pos.x-minX;
   const pushRight=maxX-pos.x;
   const pushBack=pos.z-minZ;
   const pushFwd=maxZ-pos.z;

   const min=Math.min(
    pushLeft,
    pushRight,
    pushBack,
    pushFwd
   );

   if(min===pushLeft)pos.x=minX;
   else if(min===pushRight)pos.x=maxX;
   else if(min===pushBack)pos.z=minZ;
   else pos.z=maxZ;
  }
 }

 return pos;
};

/* ============ LANDMARK MATERIALS ============ */
const matRes=new THREE.MeshStandardMaterial({
 map:TEX.residential,
 roughness:0.85
});

const matRetail=new THREE.MeshStandardMaterial({
 map:TEX.retail,
 roughness:0.85
});

const matHosp=new THREE.MeshStandardMaterial({
 map:TEX.hospital,
 roughness:0.6
});

const matPolice=new THREE.MeshStandardMaterial({
 map:TEX.police,
 roughness:0.95
});

function block(scene,x,y,z,w,h,d,mat){
 const m=new THREE.Mesh(
  new THREE.BoxGeometry(w,h,d),
  mat
 );

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
  new THREE.MeshBasicMaterial({
   map:signboardTex(text,bg,fg)
  })
 );

 mesh.position.set(x,y,z);
 mesh.rotation.y=rotY;
 scene.add(mesh);

 return mesh;
}

/* ============ LANDMARKS ============ */
World.landmarks={};

const matCafe=new THREE.MeshStandardMaterial({
 color:0x7a5230,
 roughness:0.8
});

const matDeal=new THREE.MeshStandardMaterial({
 color:0x3d5a6c,
 roughness:0.6
});

const matSchool=new THREE.MeshStandardMaterial({
 color:0xb8a06a,
 roughness:0.8
});

const matHall=new THREE.MeshStandardMaterial({
 color:0xe3d9c0,
 roughness:0.7
});

const matBank=new THREE.MeshStandardMaterial({
 color:0xcfc9b8,
 roughness:0.5,
 metalness:0.1
});

const matGunShop=new THREE.MeshStandardMaterial({
 color:0x3a3a3a,
 roughness:0.9
});

const matSafehouse=new THREE.MeshStandardMaterial({
 map:TEX.residential2,
 roughness:0.85
});

const matVilla=new THREE.MeshStandardMaterial({
 color:0xe8dcc0,
 roughness:0.6,
 metalness:0.05
});

/* New building materials */
const matRestaurant=new THREE.MeshStandardMaterial({
 color:0x9b3d2f,
 roughness:0.72
});

const matMechanic=new THREE.MeshStandardMaterial({
 color:0x49545b,
 roughness:0.82,
 metalness:0.1
});

const matSupermarket=new THREE.MeshStandardMaterial({
 color:0xd4c15b,
 roughness:0.78
});

const matOffice=new THREE.MeshStandardMaterial({
 color:0x687989,
 roughness:0.62,
 metalness:0.05
});

const matMotel=new THREE.MeshStandardMaterial({
 color:0x9c7659,
 roughness:0.8
});

const matPharmacy=new THREE.MeshStandardMaterial({
 color:0xdde8df,
 roughness:0.65
});

function buildLandmarks(scene){

 World.landmarks.hospital=
  block(scene,-60,0,-60,14,10,14,matHosp);

 roofLedge(
  scene,
  -60,10.15,-60,
  14,14,
  0xffffff
 );

 World.landmarks.police=
  block(scene,60,0,-60,12,9,12,matPolice);

 roofLedge(
  scene,
  60,9.15,-60,
  12,12,
  0x3d3a35
 );

 World.landmarks.prison=
  block(scene,30,0,60,18,12,20,matPolice);

 roofLedge(
  scene,
  30,12.15,60,
  18,20,
  0x3d3a35
 );

 const wallMat=new THREE.MeshStandardMaterial({
  color:0x4a4842,
  roughness:1
 });

 [
  [-18,0,50,3,6,20],
  [18,0,50,3,6,20]
 ].forEach(p=>{
  block(
   scene,
   p[0]+12,
   p[1],
   p[2],
   p[3],
   p[4],
   p[5],
   wallMat
  );
 });

 World.landmarks.home=
  block(scene,-70,0,-20,8,7,8,matRes);

 World.landmarks.retail=
  block(scene,20,0,-20,10,6,10,matRetail);

 World.landmarks.cafe=
  block(scene,0,0,-40,8,5,8,matCafe);

 World.landmarks.dealership=
  block(scene,60,0,20,12,5,14,matDeal);

 World.landmarks.drivingSchool=
  block(scene,-40,0,40,10,5,10,matSchool);

 World.landmarks.cityHall=
  block(scene,0,0,40,12,8,12,matHall);

 roofLedge(
  scene,0,8.15,40,
  12,12,
  0xe3d9c0
 );

 World.landmarks.bank=
  block(scene,-60,0,20,14,10,14,matBank);

 roofLedge(
  scene,-60,10.15,20,
  14,14,
  0xcfc9b8
 );

 World.landmarks.gunshop=
  block(scene,60,0,-20,8,5,8,matGunShop);

 World.landmarks.studio=
  block(scene,20,0,20,8,6,8,matSafehouse);

 World.landmarks.flat2=
  block(scene,-20,0,-60,8,6,8,matSafehouse);

 World.landmarks.villa=
  block(scene,-20,0,60,12,8,12,matVilla);

 roofLedge(
  scene,-20,8.15,60,
  12,12,
  0xe8dcc0
 );

 /* New enterable buildings */

 World.landmarks.restaurant=
  block(scene,-20,0,20,10,6,10,matRestaurant);

 /*
  * IMPORTANT:
  * Supermarket used to be at the exact same position as Restaurant.
  * It is moved to a free block at (-40,20).
  */
 World.landmarks.supermarket=
  block(scene,-40,0,20,12,6,10,matSupermarket);

 World.landmarks.mechanic=
  block(scene,40,0,40,12,6,14,matMechanic);

 World.landmarks.office=
  block(scene,60,0,60,12,8,10,matOffice);

 World.landmarks.motel=
  block(scene,-60,0,60,12,6,14,matMotel);

 World.landmarks.pharmacy=
  block(scene,20,0,60,8,5,8,matPharmacy);

 /* Signs */
 mountSignboard(
  scene,60,7.5,-53.7,
  0,4.2,1.1,
  'مركز الشرطة',
  '#1f3b57','#ffffff'
 );

 mountSignboard(
  scene,-60,7.5,12.7,
  Math.PI,3.2,1.1,
  'البنك',
  '#f2f0e6','#1f3b57'
 );

 mountSignboard(
  scene,30,9.5,49.7,
  Math.PI,3.6,1.1,
  'السجن',
  '#1c1c1c','#e0e0e0'
 );

 mountSignboard(
  scene,-20,6.7,14.8,
  0,3.4,0.9,
  'RESTAURANT',
  '#7b1e16','#fff1dc'
 );

 mountSignboard(
  scene,40,6.7,32.8,
  Math.PI,3.8,0.9,
  'AUTO SERVICE',
  '#26343c','#f4d35e'
 );

 mountSignboard(
  scene,20,5.7,55.8,
  Math.PI,3.2,0.9,
  'PHARMACY',
  '#eaf4ed','#217346'
 );

 mountSignboard(
  scene,-60,6.7,52.8,
  0,3.4,0.9,
  'MOTEL',
  '#704c38','#fff'
 );

 mountSignboard(
  scene,-40,6.7,14.8,
  0,3.6,0.9,
  'SUPERMARKET',
  '#8a7418','#fff8cf'
 );
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
 return new THREE.MeshStandardMaterial({
  color,
  roughness,
  polygonOffset:true,
  polygonOffsetFactor:1,
  polygonOffsetUnits:1
 });
}

function registerInteriorObject(room,type,position,options={}){
 if(!World.interiorInteractables[room]){
  World.interiorInteractables[room]=[];
 }

 const item={
  room,
  type,
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

 /*
  * Every interior is a clean 12x12 room.
  * The shell is slightly larger than the floor so the floor never
  * overlaps the wall geometry.
  */
 const ROOM_W=12;
 const ROOM_D=12;
 const FLOOR_Y=-2.50;
 const CEILING_Y=2.50;

 const shellMat=new THREE.MeshBasicMaterial({
  color:wallColor,
  side:THREE.BackSide,
  depthWrite:true
 });

 const shell=new THREE.Mesh(
  new THREE.BoxGeometry(ROOM_W,5,ROOM_D),
  shellMat
 );

 g.add(shell);

 /*
  * Stable interior floor:
  * - explicit Y level
  * - polygon offset
  * - depthWrite enabled
  * This prevents the furniture/rug/floor from fighting visually.
  */
 const floorMat=new THREE.MeshStandardMaterial({
  color:floorColor,
  roughness:0.9,
  metalness:0,
  polygonOffset:true,
  polygonOffsetFactor:2,
  polygonOffsetUnits:2,
  depthWrite:true
 });

 const floor=new THREE.Mesh(
  new THREE.PlaneGeometry(ROOM_W-0.08,ROOM_D-0.08),
  floorMat
 );

 floor.rotation.x=-Math.PI/2;
 floor.position.y=FLOOR_Y;
 floor.receiveShadow=true;
 floor.renderOrder=0;
 g.add(floor);

 /* Ceiling */
 const ceilingMat=new THREE.MeshStandardMaterial({
  color:wallColor,
  roughness:0.95,
  side:THREE.FrontSide
 });

 const ceiling=new THREE.Mesh(
  new THREE.PlaneGeometry(ROOM_W-0.08,ROOM_D-0.08),
  ceilingMat
 );

 ceiling.rotation.x=Math.PI/2;
 ceiling.position.y=CEILING_Y;
 ceiling.receiveShadow=true;
 g.add(ceiling);

 /* Ceiling lamp */
 const lamp=new THREE.Mesh(
  new THREE.CylinderGeometry(0.18,0.32,0.08,16),
  new THREE.MeshStandardMaterial({
   color:0xfff5d6,
   emissive:0xffd98a,
   emissiveIntensity:0.7
  })
 );

 lamp.position.set(0,2.2,0);
 g.add(lamp);

 /* Back-wall decorative strip */
 if(accent){
  const a=new THREE.Mesh(
   new THREE.BoxGeometry(7,0.9,0.12),
   interiorMaterial(accent,0.7)
  );

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
 const mesh=new THREE.Mesh(
  new THREE.BoxGeometry(w,h,d),
  interiorMaterial(color,roughness)
 );

 mesh.position.set(x,y,z);
 mesh.castShadow=true;
 mesh.receiveShadow=true;
 parent.add(mesh);

 return mesh;
}

function addCylinder(parent,x,y,z,r,h,color,segments=16){
 const mesh=new THREE.Mesh(
  new THREE.CylinderGeometry(r,r,h,segments),
  interiorMaterial(color,0.75)
 );

 mesh.position.set(x,y,z);
 mesh.castShadow=true;
 mesh.receiveShadow=true;
 parent.add(mesh);

 return mesh;
}

function addRug(parent,x,z,w,d,color){
 const rug=new THREE.Mesh(
  new THREE.BoxGeometry(w,0.035,d),
  new THREE.MeshStandardMaterial({
   color,
   roughness:1,
   polygonOffset:true,
   polygonOffsetFactor:-2,
   polygonOffsetUnits:-2,
   depthWrite:true
  })
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

 [
  [-w/2+0.12,-d/2+0.12],
  [w/2-0.12,-d/2+0.12],
  [-w/2+0.12,d/2-0.12],
  [w/2-0.12,d/2-0.12]
 ].forEach(p=>{
  addBox(
   parent,
   x+p[0],
   -1.9,
   z+p[1],
   0.11,
   1.0,
   0.11,
   legColor
  );
 });

 return top;
}

function addChair(parent,x,z,rot=0,color=0x4a3022){
 const g=new THREE.Group();

 const seat=addBox(g,0,0,0,0.55,0.12,0.55,color);
 seat.position.y=-1.55;

 const back=addBox(g,0,0.42,-0.22,0.55,0.75,0.1,color);

 [
  [-0.2,-0.35],
  [0.2,-0.35],
  [-0.2,0.2],
  [0.2,0.2]
 ].forEach(p=>{
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
 addBox(g,1.25,-1.25,0,0.22,0.9,color);

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

 const screenOffMat=new THREE.MeshStandardMaterial({
  color:0x080b0e,
  roughness:0.25,
  metalness:0.25,
  emissive:0x000000,
  emissiveIntensity:0
 });

 const screenOnMat=new THREE.MeshStandardMaterial({
  color:0x263d4b,
  roughness:0.22,
  metalness:0.2,
  emissive:0x123b55,
  emissiveIntensity:0.9
 });

 addBox(g,0,0,0,1.65,0.95,0.12,0x171717,0.35);

 const screen=new THREE.Mesh(
  new THREE.BoxGeometry(1.35,0.68,0.035),
  screenOffMat
 );

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

  screen.material=
   g.userData.on?
    g.userData.screenOnMaterial:
    g.userData.screenOffMaterial;

  screenLight.intensity=
   g.userData.on?0.65:0;
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

 for(let i=-1;i<=1;i++){
  addBox(g,i*0.85,-1.5,0.34,0.65,0.65,0.04,0x4b3325);
 }

 addBox(g,0,-0.63,0.02,0.9,0.08,0.4,0xd7d7d0,0.3);

 addCylinder(g,-0.25,-0.48,0.02,0.04,0.35,0x777777,10);
 addCylinder(g,0.25,-0.48,0.02,0.04,0.35,0x777777,10);

 addBox(g,-1.05,-0.25,0,0.7,2.0,0.55,0xeee8dc);
 addBox(g,1.05,-0.25,0,0.7,2.0,0.55,0xeee8dc);

 g.userData.kitchen=true;
 g.userData.onUse=function(){
  g.userData.lastUsed=performance.now();
 };

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
 g.userData.onUse=function(){
  g.userData.lastUsed=performance.now();
 };

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
 g.userData.onUse=function(){
  g.userData.lastUsed=performance.now();
 };

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
 g.userData.onUse=function(){
  g.userData.lastUsed=performance.now();
 };

 g.position.set(x,0,z);
 g.rotation.y=rot;
 parent.add(g);

 return g;
}

function addPlant(parent,x,z){
 const g=new THREE.Group();

 addCylinder(g,0,-1.85,0,0.28,0.5,0x8c5739,12);

 const leafMat=new THREE.MeshStandardMaterial({
  color:0x3f7a45,
  roughness:0.8
 });

 for(let i=0;i<5;i++){
  const leaf=new THREE.Mesh(
   new THREE.SphereGeometry(0.23,8,6),
   leafMat
  );

  const a=(i/5)*Math.PI*2;
  leaf.position.set(
   Math.cos(a)*0.25,
   -1.35+Math.random()*0.3,
   Math.sin(a)*0.25
  );

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
  addBox(
   parent,
   x+i*0.52,
   -0.4,
   z,
   0.46,
   2.8,
   0.48,
   0x56636b,
   0.6
  );
 }
}

/* ============ INTERACTION REGISTRATION ============ */

function registerSeat(room,type,x,z,rot,options={}){
 const item=registerInteriorObject(
  room,
  type,
  new THREE.Vector3(x,50-1.45,z),
  {
   radius:options.radius||1.35,
   sitPosition:new THREE.Vector3(
    x,
    50-0.72,
    z
   ),
   sitRotationY:rot,
   label:options.label||'Sit',
   onUse:options.onUse||null,
   ...options
  }
 );

 return item;
}

function registerTV(room,x,z,rot,tv){
 return registerInteriorObject(
  room,
  'tv',
  new THREE.Vector3(x,49.45,z),
  {
   radius:1.7,
   label:'Watch TV',
   object:tv,
   rotationY:rot,
   onUse:function(item){
    if(item.object&&item.object.userData&&item.object.userData.toggle){
     item.object.userData.toggle();
    }
   }
  }
 );
}

function registerBed(room,x,z){
 return registerInteriorObject(
  room,
  'bed',
  new THREE.Vector3(x,48.28,z),
  {
   radius:1.6,
   label:'Sleep',
   onUse:function(){
    if(typeof Vitals!=='undefined'&&Vitals.sleep){
     Vitals.sleep();
    }
   }
  }
 );
}

function registerToilet(room,x,z){
 return registerInteriorObject(
  room,
  'toilet',
  new THREE.Vector3(x,48.35,z),
  {
   radius:1.5,
   label:'Use Bathroom',
   onUse:function(){
    if(typeof Vitals!=='undefined'&&Vitals.useToilet){
     Vitals.useToilet();
    }
   }
  }
 );
}

function registerKitchen(room,x,z){
 return registerInteriorObject(
  room,
  'kitchen',
  new THREE.Vector3(x,48.85,z),
  {
   radius:1.7,
   label:'Use Kitchen'
  }
 );
}

function registerTable(room,x,z,type='table'){
 return registerInteriorObject(
  room,
  type,
  new THREE.Vector3(x,48.65,z),
  {
   radius:1.7,
   label:type==='restaurantTable'?'Sit at Table':'Use Table'
  }
 );
}

/* ============ INTERIOR BUILD ============ */
function buildInteriors(scene){

 /* ---------- HOSPITAL ---------- */
 makeInterior(
  scene,
  'hospital',
  0xeaf1f8,
  0xdfe9f2,
  0xc0392b
 );

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
 makeInterior(
  scene,
  'police',
  0x3a3733,
  0x2a2825,
  0x146b3a
 );

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

 /* ---------- PRISON ---------- */
 makeInterior(
  scene,
  'prison',
  0x2c2c2c,
  0x1f1f1f,
  0x555555
 );

 const prison=World.interiors.prison;

 addRug(prison,0,0,8,8,0x292929);

 const bunkPositions=[
  [-3,2.8],
  [0,2.8],
  [3,2.8]
 ];

 bunkPositions.forEach(p=>{
  addBed(prison,p[0],p[1],1.8,2.5,0x3a3a3a,0x777777);
 });

 const barMat=new THREE.MeshStandardMaterial({
  color:0x1a1a1a,
  metalness:0.7,
  roughness:0.35
 });

 for(let i=-5;i<=5;i++){
  const bar=new THREE.Mesh(
   new THREE.CylinderGeometry(0.045,0.045,3.8,8),
   barMat
  );

  bar.position.set(i*0.65,-0.2,5.4);
  prison.add(bar);
 }

 addBox(prison,0,-1.0,5.25,7.5,0.12,0.15,0x333333);

 /* ---------- HOME ---------- */
 makeInterior(
  scene,
  'home',
  0xe7d9be,
  0xc7a97a,
  0x8a5a3a
 );

 const home=World.interiors.home;

 addRug(home,0,0,7.5,5.5,0xa67b54);

 addBed(
  home,
  -3,-2.4,
  2.2,3.0,
  0x8b5e3c,
  0xd8dce2
 );

 addWardrobe(home,-4.8,-2.2,1.4,0.55);

 const homeSofa=addSofa(home,2.6,1.4,Math.PI,0x5a4034);
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

 World.homeBedLocal=
  new THREE.Vector3(-3,50-1.72,-2.4);

 World.homeToiletLocal=
  new THREE.Vector3(4.3,50-1.65,3.7);

 registerBed('home',-3,-2.4);

 /* ---------- BANK ---------- */
 makeInterior(
  scene,
  'bank',
  0xd9d4c4,
  0xb8ae94,
  0x8a7a4a
 );

 const bank=World.interiors.bank;

 addRug(bank,0,0,8,8,0x9a8661);

 addBox(bank,3.5,-1.55,3.5,2.5,0.9,0.75,0x5a4a30);

 const tellerGlass=new THREE.Mesh(
  new THREE.BoxGeometry(2.5,0.85,0.05),
  new THREE.MeshPhysicalMaterial({
   color:0xcfe8ff,
   transparent:true,
   opacity:0.32,
   roughness:0.05
  })
 );

 tellerGlass.position.set(3.5,-0.65,3.12);
 bank.add(tellerGlass);

 World.bankTellerLocal=
  new THREE.Vector3(3.5,50-1.55,3.5);

 registerInteriorObject(
  'bank',
  'teller',
  new THREE.Vector3(3.5,48.45,3.5),
  {
   radius:1.8,
   label:'Banking'
  }
 );

 const vaultDoor=new THREE.Mesh(
  new THREE.CylinderGeometry(
   1.35,1.35,0.35,24
  ),
  new THREE.MeshStandardMaterial({
   color:0x8a8a8a,
   metalness:0.8,
   roughness:0.25
  })
 );

 vaultDoor.rotation.x=Math.PI/2;
 vaultDoor.position.set(0,-0.3,-5.2);
 bank.add(vaultDoor);

 World.bankVaultLocal=
  new THREE.Vector3(0,50-0.3,-5.2);

 const bagPositions=[
  [-3,-1.7,-2.8],
  [-1,-1.7,-2.8],
  [1,-1.7,-2.8],
  [3,-1.7,-2.8],
  [0,-1.7,-1]
 ];

 World.cashBags=bagPositions.map(p=>{
  const bag=addBox(
   bank,
   p[0],p[1],p[2],
   0.55,0.42,0.4,
   0x2f6b4a
  );

  return {
   mesh:bag,
   localPos:new THREE.Vector3(
    p[0],
    50+p[1],
    p[2]
   ),
   collected:false
  };
 });

 /* ---------- GUN SHOP ---------- */
 makeInterior(
  scene,
  'gunshop',
  0x2a2a2a,
  0x1c1c1c,
  0x8a2020
 );

 const gunshop=World.interiors.gunshop;

 addRug(gunshop,0,0,8,8,0x202020);

 addBox(
  gunshop,
  0,-1.55,-3.5,
  2.8,0.9,0.8,
  0x4a3a2a
 );

 World.gunShopCounterLocal=
  new THREE.Vector3(0,50-1.55,-3.5);

 registerInteriorObject(
  'gunshop',
  'counter',
  new THREE.Vector3(0,48.45,-3.5),
  {
   radius:1.8,
   label:'Browse Weapons'
  }
 );

 [-3.2,3.2].forEach(sx=>{
  addBox(
   gunshop,
   sx,-0.9,-4.7,
   0.7,2.0,0.3,
   0x333333
  );
 });

 /* ---------- STUDIO ---------- */
 makeInterior(
  scene,
  'studio',
  0xe7d9be,
  0xc7a97a,
  0x8a5a3a
 );

 const studio=World.interiors.studio;

 addRug(studio,0,0,7.5,7,0xb78d67);

 addBed(
  studio,
  -3,-2.6,
  2.0,2.8,
  0x75472d,
  0xe0e0dc
 );

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
 makeInterior(
  scene,
  'flat2',
  0xded2bf,
  0xb7a98e,
  0x6b5947
 );

 const flat2=World.interiors.flat2;

 addRug(flat2,1,0,6.5,4.2,0x8e6b50);

 addBed(
  flat2,
  -3,-2.5,
  2.1,2.9,
  0x69442f,
  0xcfd5da
 );

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
 makeInterior(
  scene,
  'villa',
  0xf0e6cc,
  0xd8c49a,
  0xc9a24b
 );

 const villa=World.interiors.villa;

 addRug(villa,0,0,9,7,0xa8362f);

 addBed(
  villa,
  -3,-2.8,
  2.4,3.2,
  0x6c432b,
  0xe8e5dc
 );

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
 makeInterior(
  scene,
  'restaurant',
  0x4b2520,
  0x6c4030,
  0xb53b2d
 );

 const restaurant=World.interiors.restaurant;

 addRug(restaurant,0,0,9,8,0x57251e);

 addBox(
  restaurant,
  0,-1.35,-4.6,
  5.2,1.1,0.7,
  0x5a3828
 );

 addKitchen(restaurant,-3,3.6);
 registerKitchen('restaurant',-3,3.6);

 [
  [-2,0.8],
  [2,0.8],
  [-2,-1.8],
  [2,-1.8]
 ].forEach(p=>{
  addTable(
   restaurant,
   p[0],
   p[1],
   1.3,
   0.8,
   0x75472e
  );

  addChair(
   restaurant,
   p[0]-0.85,
   p[1],
   Math.PI/2
  );

  addChair(
   restaurant,
   p[0]+0.85,
   p[1],
   -Math.PI/2
  );

  registerSeat(
   'restaurant',
   'restaurantChair',
   p[0]-0.85,
   p[1],
   Math.PI/2,
   {radius:1.15}
  );

  registerSeat(
   'restaurant',
   'restaurantChair',
   p[0]+0.85,
   p[1],
   -Math.PI/2,
   {radius:1.15}
  );

  registerTable(
   'restaurant',
   p[0],
   p[1],
   'restaurantTable'
  );
 });

 const restaurantTV=addTV(restaurant,3.8,4.4,Math.PI);
 registerTV('restaurant',3.8,4.4,Math.PI,restaurantTV);

 addPlant(restaurant,4.5,-4);

 /* ---------- MECHANIC WORKSHOP ---------- */
 makeInterior(
  scene,
  'mechanic',
  0x3d454a,
  0x3a3d3e,
  0xe1a92b
 );

 const mechanic=World.interiors.mechanic;

 for(let i=-4;i<=4;i+=2){
  addBox(
   mechanic,
   i,-2.43,0,
   0.12,0.02,9,
   0xe1a92b,
   0.9
  );
 }

 addBox(
  mechanic,
  -3,-1.25,-3.7,
  3.0,1.1,0.7,
  0x4b3528
 );

 addLocker(mechanic,1.5,3.8,4);

 addBox(
  mechanic,
  2,-2.25,-0.5,
  3.4,0.15,5.0,
  0x202326,
  0.55
 );

 const workshopCar=World.makeCar(
  9999,
  9999,
  0x5b6870,
  'sedan'
 );

 workshopCar.scale.setScalar(0.72);
 workshopCar.position.set(2,-2.2,-0.5);
 mechanic.add(workshopCar);

 addDesk(mechanic,-3,1.2);
 addChair(mechanic,-3,2.0,Math.PI);

 registerSeat('mechanic','chair',-3,2.0,Math.PI);

 registerInteriorObject(
  'mechanic',
  'workbench',
  new THREE.Vector3(-3,48.7,-3.7),
  {
   radius:1.8,
   label:'Use Workbench'
  }
 );

 /* ---------- SUPERMARKET ---------- */
 makeInterior(
  scene,
  'supermarket',
  0xd8cfad,
  0xb9b29a,
  0xd4b52c
 );

 const supermarket=World.interiors.supermarket;

 addRug(
  supermarket,
  0,0,
  10,9,
  0xd0c7aa
 );

 [-3.2,0,3.2].forEach(x=>{
  addBox(
   supermarket,
   x,-0.6,0,
   1.4,2.7,5.8,
   0x76573b
  );

  for(let row=0;row<3;row++){
   for(let col=0;col<3;col++){
    const colors=[
     0xc4473a,
     0x4c75a3,
     0xd3a73a,
     0x5c9a5c
    ];

    addBox(
     supermarket,
     x-0.4+col*0.4,
     -1.5+row*0.55,
     -1.8+col*1.4,
     0.18,0.22,0.32,
     colors[(row+col)%colors.length],
     0.7
    );
   }
  }
 });

 addBox(
  supermarket,
  0,-1.3,-4.5,
  4.5,1.0,0.7,
  0x6b4932
 );

 const supermarketTV=addTV(supermarket,4.4,3.8,Math.PI);
 registerTV('supermarket',4.4,3.8,Math.PI,supermarketTV);

 registerInteriorObject(
  'supermarket',
  'counter',
  new THREE.Vector3(0,48.7,-4.5),
  {
   radius:1.8,
   label:'Checkout'
  }
 );

 /* ---------- OFFICE ---------- */
 makeInterior(
  scene,
  'office',
  0x687989,
  0x8e8d82,
  0x2e506f
 );

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
 makeInterior(
  scene,
  'motel',
  0x7e5f4b,
  0x735c4a,
  0xa17a57
 );

 const motel=World.interiors.motel;

 addRug(motel,0,0,9,8,0x6c4d3d);

 addBed(
  motel,
  0,-1.8,
  2.5,3.2,
  0x5a392b,
  0xd8d8d0
 );

 addBed(
  motel,
  0,2.0,
  2.5,2.4,
  0x5a392b,
  0xcfcfc9
 );

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
 makeInterior(
  scene,
  'pharmacy',
  0xdde8df,
  0xcfd8d1,
  0x4b9a68
 );

 const pharmacy=World.interiors.pharmacy;

 addBox(
  pharmacy,
  0,-1.4,-4.5,
  5.0,1.0,0.7,
  0xffffff
 );

 [-3,-1,1,3].forEach(x=>{
  addBox(
   pharmacy,
   x,-0.5,0.5,
   1.0,2.8,3.8,
   0xf0f0e8,
   0.75
  );
 });

 addPlant(pharmacy,4.4,-4);

 addDesk(pharmacy,-3,3.8);
 addChair(pharmacy,-3,4.7);

 registerSeat('pharmacy','chair',-3,4.7,0);

 registerInteriorObject(
  'pharmacy',
  'counter',
  new THREE.Vector3(0,48.6,-4.5),
  {
   radius:1.8,
   label:'Pharmacy Counter'
  }
 );

 /* ============ INTERIOR METADATA ============ */
 World.interiorMeta={
  hospital:{
   label:'Hospital',
   sleep:false,
   sleepBonus:0,
   category:'medical'
  },
  police:{
   label:'Police Station',
   sleep:false,
   sleepBonus:0,
   category:'police'
  },
  prison:{
   label:'Prison',
   sleep:false,
   sleepBonus:0,
   category:'security'
  },
  home:{
   label:'Home',
   sleep:true,
   sleepBonus:1,
   category:'home'
  },
  bank:{
   label:'Bank',
   sleep:false,
   sleepBonus:0,
   category:'bank'
  },
  gunshop:{
   label:'Gun Shop',
   sleep:false,
   sleepBonus:0,
   category:'shop'
  },
  studio:{
   label:'Studio Apartment',
   sleep:true,
   sleepBonus:1,
   category:'home'
  },
  flat2:{
   label:'2-Room Flat',
   sleep:true,
   sleepBonus:1.2,
   category:'home'
  },
  villa:{
   label:'Villa',
   sleep:true,
   sleepBonus:1.5,
   category:'home'
  },
  restaurant:{
   label:'Restaurant',
   sleep:false,
   sleepBonus:0,
   category:'food'
  },
  mechanic:{
   label:'Mechanic Workshop',
   sleep:false,
   sleepBonus:0,
   category:'mechanic'
  },
  supermarket:{
   label:'Supermarket',
   sleep:false,
   sleepBonus:0,
   category:'shop'
  },
  office:{
   label:'Office',
   sleep:false,
   sleepBonus:0,
   category:'business'
  },
  motel:{
   label:'Motel',
   sleep:false,
   sleepBonus:0,
   category:'hotel'
  },
  pharmacy:{
   label:'Pharmacy',
   sleep:false,
   sleepBonus:0,
   category:'medical'
  }
 };

 World.safehouseBedLocal={
  studio:new THREE.Vector3(-3,50-1.72,-2.6),
  flat2:new THREE.Vector3(-3,50-1.72,-2.5),
  villa:new THREE.Vector3(-3,50-1.72,-2.8)
 };

 World.homeBedLocal=
  new THREE.Vector3(-3,50-1.72,-2.4);

 World.homeToiletLocal=
  new THREE.Vector3(4.3,50-1.65,3.7);
}

/* ============ ENTER / EXIT INTERIOR ============ */
World.enterInterior=function(name,camera,outsidePos){
 if(World.activeInterior)return;

 const poi=World.pois.find(p=>p.id===name);

 if(!poi)return;

 if(
  poi.ownable &&
  !(Player.properties&&Player.properties.includes(name))
 ){
  if(typeof UI!=='undefined'&&UI.dom&&UI.dom.prompt){
   UI.dom.prompt.textContent='🔒 You need to buy this property first.';
   UI.dom.prompt.style.display='block';

   clearTimeout(World._interiorPrompt);

   World._interiorPrompt=setTimeout(()=>{
    if(UI.dom.prompt){
     UI.dom.prompt.style.display='none';
    }
   },1800);
  }

  return;
 }

 if(!World.interiors[name])return;

 outsidePos.copy(camera.position);

 Object.values(World.interiors).forEach(i=>{
  i.visible=false;
 });

 World.interiors[name].visible=true;
 World.activeInterior=name;

 const room=World.interiors[name];
 const eyeY=
  room.userData&&room.userData.eyeY?
   room.userData.eyeY:
   49.2;

 camera.position.set(0,eyeY,3.8);
 camera.rotation.order='YXZ';
 camera.lookAt(0,eyeY-0.2,-2);

 World.currentInteriorMeta=
  World.interiorMeta?
   World.interiorMeta[name]||null:
   null;
};

World.exitInterior=function(camera,outsidePos){
 if(!World.activeInterior)return;

 if(World.interiors[World.activeInterior]){
  World.interiors[World.activeInterior].visible=false;
 }

 World.activeInterior=null;
 World.currentInteriorMeta=null;

 camera.position.copy(outsidePos);
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

World.makeCar=function(x,z,color,type){
 type=type||'sedan';

 const g=new THREE.Group();

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

 const lower=new THREE.Mesh(
  new THREE.BoxGeometry(1.78,0.34,bodyLen),
  bodyMat
 );

 lower.position.y=0.35;
 lower.castShadow=true;
 g.add(lower);

 const hood=new THREE.Mesh(
  new THREE.BoxGeometry(1.7,0.22,hoodLen),
  bodyMat
 );

 hood.position.set(
  0,
  0.57,
  bodyLen/2-hoodLen/2
 );

 hood.castShadow=true;
 g.add(hood);

 const trunk=new THREE.Mesh(
  new THREE.BoxGeometry(
   1.7,
   isHatch?0.5:0.26,
   trunkLen
  ),
  bodyMat
 );

 trunk.position.set(
  0,
  isHatch?0.68:0.6,
  -(bodyLen/2-trunkLen/2)
 );

 trunk.castShadow=true;
 g.add(trunk);

 const cabin=new THREE.Mesh(
  new THREE.BoxGeometry(
   1.5,
   0.48,
   midLen*0.92
  ),
  new THREE.MeshPhysicalMaterial({
   color:0x0e1b1d,
   transparent:true,
   opacity:0.55,
   roughness:0.1
  })
 );

 cabin.position.set(
  0,
  0.9,
  (hoodLen-trunkLen)*0.15
 );

 g.add(cabin);

 const lightMat=new THREE.MeshStandardMaterial({
  color:0xfff3c0,
  emissive:0xffdd88,
  emissiveIntensity:0.8
 });

 const tailMat=new THREE.MeshStandardMaterial({
  color:0x990000,
  emissive:0x660000,
  emissiveIntensity:0.6
 });

 [
  [-0.62,0.42,bodyLen/2-0.05],
  [0.62,0.42,bodyLen/2-0.05]
 ].forEach(p=>{
  const l=new THREE.Mesh(
   new THREE.BoxGeometry(0.24,0.13,0.06),
   lightMat
  );
  l.position.set(p[0],p[1],p[2]);
  g.add(l);
 });

 [
  [-0.62,0.42,-(bodyLen/2-0.05)],
  [0.62,0.42,-(bodyLen/2-0.05)]
 ].forEach(p=>{
  const l=new THREE.Mesh(
   new THREE.BoxGeometry(0.24,0.13,0.06),
   tailMat
  );
  l.position.set(p[0],p[1],p[2]);
  g.add(l);
 });

 const wheelMat=new THREE.MeshStandardMaterial({
  color:0x111111,
  roughness:0.9
 });

 const wheelX=0.92;
 const wheelZ=bodyLen/2-0.75;

 [
  [-wheelX,0.33,wheelZ],
  [wheelX,0.33,wheelZ],
  [-wheelX,0.33,-wheelZ],
  [wheelX,0.33,-wheelZ]
 ].forEach(p=>{
  const wheel=new THREE.Mesh(
   new THREE.CylinderGeometry(0.35,0.35,0.26,14),
   wheelMat
  );

  wheel.rotation.z=Math.PI/2;
  wheel.position.set(p[0],p[1],p[2]);
  wheel.castShadow=true;
  g.add(wheel);
 });

 if(type==='police'){
  const doorMat=new THREE.MeshStandardMaterial({
   color:0xf2f2f2
  });

  [-1,1].forEach(side=>{
   const panel=new THREE.Mesh(
    new THREE.BoxGeometry(
     0.04,
     0.26,
     midLen*0.85
    ),
    doorMat
   );

   panel.position.set(side*0.9,0.42,0);
   g.add(panel);
  });

  const barBase=new THREE.Mesh(
   new THREE.BoxGeometry(0.85,0.1,0.32),
   new THREE.MeshStandardMaterial({color:0x1a1a1a})
  );

  barBase.position.set(0,1.16,0.25);
  g.add(barBase);

  const red=new THREE.Mesh(
   new THREE.BoxGeometry(0.38,0.09,0.28),
   new THREE.MeshStandardMaterial({
    color:0xff2222,
    emissive:0xff0000,
    emissiveIntensity:1
   })
  );

  red.position.set(-0.22,1.22,0.25);
  g.add(red);

  const blue=new THREE.Mesh(
   new THREE.BoxGeometry(0.38,0.09,0.28),
   new THREE.MeshStandardMaterial({
    color:0x2244ff,
    emissive:0x0033ff,
    emissiveIntensity:1
   })
  );

  blue.position.set(0.22,1.22,0.25);
  g.add(blue);

  [-1,1].forEach(side=>{
   const decal=new THREE.Mesh(
    new THREE.PlaneGeometry(midLen*0.75,0.28),
    new THREE.MeshBasicMaterial({
     map:policeDecal,
     transparent:true
    })
   );

   decal.position.set(side*0.905,0.42,0);
   decal.rotation.y=side>0?Math.PI/2:-Math.PI/2;
   g.add(decal);
  });

  g.userData.lightBar={
   red,
   blue
  };
 }

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

 if(
  billboardResolved[fileName] instanceof THREE.Texture
 ){
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
  ()=>{
   billboardResolved[fileName]='fail';
  }
 );
}

function makeBillboard(parent,x,y,z,rotY,fileName,label){
 const mat=new THREE.MeshStandardMaterial({
  map:billboardPlaceholderTex(label),
  roughness:0.8
 });

 const mesh=new THREE.Mesh(
  new THREE.PlaneGeometry(4,2.4),
  mat
 );

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
 makeBillboard(
  scene,
  p.x,3,p.z,p.faceRotY,
  'ad1.jpg',
  'EL-HAY COLA'
 );

 p=sidewalkSpot('z',-40,-50,-1);

 makeBillboard(
  scene,
  p.x,3,p.z,p.faceRotY,
  'ad2.jpg',
  'SOUK MARKET'
 );

 p=sidewalkSpot('x',40,-50,1);

 makeBillboard(
  scene,
  p.x,3,p.z,p.faceRotY,
  'ad3.jpg',
  'TELECOM+'
 );
}

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

const signMat=new THREE.MeshStandardMaterial({
 color:0x333,
 roughness:0.7
});

const signBoardMat=new THREE.MeshStandardMaterial({
 map:trafficSignTex(),
 roughness:0.6
});

function makeTrafficSign(parent,x,z){
 const pole=new THREE.Mesh(
  new THREE.CylinderGeometry(0.06,0.06,2.2,6),
  signMat
 );

 pole.position.set(x,1.1,z);
 parent.add(pole);

 const board=new THREE.Mesh(
  new THREE.CircleGeometry(0.35,16),
  signBoardMat
 );

 board.position.set(x,2.1,z);
 board.rotation.y=Math.PI/2;
 parent.add(board);
}

const treeTrunkMat=new THREE.MeshStandardMaterial({
 color:0x6b4a30,
 roughness:0.9
});

const treeFoliageMat=new THREE.MeshStandardMaterial({
 color:0x3f7a3f,
 roughness:0.85
});

function makeTree(parent,x,z){
 const trunk=new THREE.Mesh(
  new THREE.CylinderGeometry(0.12,0.16,1.4,6),
  treeTrunkMat
 );

 trunk.position.set(x,0.7,z);
 trunk.castShadow=true;
 parent.add(trunk);

 const foliage=new THREE.Mesh(
  new THREE.ConeGeometry(0.85,1.8,8),
  treeFoliageMat
 );

 foliage.position.set(x,2.1,z);
 foliage.castShadow=true;
 parent.add(foliage);
}

/* ============ TRAFFIC ============ */
const Traffic={
 cars:[],
 size:6
};

Traffic.init=function(){
 const colors=[
  0x8a3a3a,
  0x3a5a8a,
  0x555555,
  0x2f6b4a,
  0x9c7a3a,
  0x6b4226
 ];

 for(let i=0;i<Traffic.size;i++){
  const mesh=World.makeCar(
   9999,
   9999,
   colors[i%colors.length],
   i%2===0?'sedan':'hatchback'
  );

  Traffic.cars.push({
   mesh,
   axis:'x',
   dir:1,
   speed:6+Math.random()*3
  });
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

  car.mesh.position.set(
   k+(dir>0?-2:2),
   0,
   playerPos.z-dir*ahead
  );

  car.mesh.rotation.y=dir>0?0:Math.PI;
 }else{
  car.axis='x';
  car.dir=dir;

  car.mesh.position.set(
   playerPos.x-dir*ahead,
   0,
   k+(dir>0?2:-2)
  );

  car.mesh.rotation.y=dir>0?Math.PI/2:-Math.PI/2;
 }
};

Traffic.update=function(dt,playerPos){
 Traffic.cars.forEach(car=>{
  if(
   playerPos.distanceTo(car.mesh.position)>150
  ){
   Traffic.respawn(car,playerPos);
   return;
  }

  if(car.axis==='z'){
   car.mesh.position.z+=car.dir*car.speed*dt;
  }else{
   car.mesh.position.x+=car.dir*car.speed*dt;
  }
 });
};

/* ============ NPCs ============ */
const SKIN=[
 0xC68642,
 0x8D5524,
 0xE0AC69,
 0xF1C27D
];

const OUTFIT=[
 0x3d5a6c,
 0x6b4226,
 0x4a4a48,
 0x7a5230,
 0x2f4a3e
];

const PANTS=[
 0x2b2f38,
 0x4a3a2a,
 0x1f1f1f,
 0x5a4632,
 0x30323a
];

function spawnNPC(x,z){
 const skin=SKIN[
  Math.floor(Math.random()*SKIN.length)
 ];

 const outfit=OUTFIT[
  Math.floor(Math.random()*OUTFIT.length)
 ];

 const pants=PANTS[
  Math.floor(Math.random()*PANTS.length)
 ];

 const height=0.88+Math.random()*0.28;

 const g=new THREE.Group();

 const skinMat=new THREE.MeshStandardMaterial({
  color:skin
 });

 const outfitMat=new THREE.MeshStandardMaterial({
  color:outfit
 });

 const pantsMat=new THREE.MeshStandardMaterial({
  color:pants
 });

 const torso=new THREE.Mesh(
  new THREE.BoxGeometry(0.42,0.55,0.26),
  outfitMat
 );

 torso.position.y=1.05;
 torso.castShadow=true;
 g.add(torso);

 const head=new THREE.Mesh(
  new THREE.SphereGeometry(0.16,10,10),
  skinMat
 );

 head.position.y=1.48;
 g.add(head);

 const armGeo=new THREE.CylinderGeometry(
  0.055,0.055,0.5,6
 );

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

 const legGeo=new THREE.CylinderGeometry(
  0.08,0.075,0.62,6
 );

 const legL=new THREE.Mesh(legGeo,pantsMat);
 legL.position.set(-0.12,0.5,0);
 legL.castShadow=true;
 g.add(legL);

 const legR=new THREE.Mesh(legGeo,pantsMat);
 legR.position.set(0.12,0.5,0);
 legR.castShadow=true;
 g.add(legR);

 g.scale.setScalar(height);
 g.position.set(x,0,z);

 World.scene.add(g);

 const entry={
  mesh:g,
  dir:Math.random()*Math.PI*2,
  timer:0
 };

 World.npcs.push(entry);

 return entry;
}

World.keyNpcs={};

function spawnKeyNpcs(){
 World.keyNpcs.yasmine=
  spawnNPC(2,-38);

 World.keyNpcs.karim=
  spawnNPC(22,-16);

 World.keyNpcs.sofia=
  spawnNPC(-68,-14);
}

World.update=function(px,pz,dt){
 World.updateChunks(px,pz);

 Traffic.update(
  dt,
  new THREE.Vector3(px,0,pz)
 );
};

/* ============ CHUNK STREAMING ============ */
World.CHUNK=40;
World.RADIUS=3;

const buildingGeo=new THREE.BoxGeometry(6,1,6);

const bMatVariants=[
 new THREE.MeshStandardMaterial({
  map:TEX.residential,
  roughness:0.85
 }),
 new THREE.MeshStandardMaterial({
  map:TEX.residential2,
  roughness:0.85
 })
];

const lampGeo=new THREE.CylinderGeometry(
 0.08,0.08,3,6
);

const lampMat=new THREE.MeshStandardMaterial({
 color:0x333,
 roughness:0.8
});

const lampHeadGeo=new THREE.SphereGeometry(
 0.18,8,8
);

const lampHeadMat=new THREE.MeshStandardMaterial({
 color:0xffe9b0,
 emissive:0xffcf7a,
 emissiveIntensity:0.6
});

function chunkKey(cx,cz){
 return cx+','+cz;
}

function hash(cx,cz){
 let h=cx*374761393+cz*668265263;
 h=(h^(h>>>13))*1274126177;
 return ((h^(h>>>16))>>>0)/4294967295;
}

function clampAwayFromRoad(v){
 const nearest=Math.round(v/40)*40;
 const d=v-nearest;

 if(Math.abs(d)<World.roadClearance){
  return nearest+
   (d<0?-World.roadClearance:World.roadClearance);
 }

 return v;
}

function buildChunk(cx,cz){
 const group=new THREE.Group();

 group.userData.boxes=[];

 const count=6;

 const bMesh=new THREE.InstancedMesh(
  buildingGeo,
  bMatVariants[Math.abs(cx+cz)%2],
  count
 );

 bMesh.castShadow=true;
 bMesh.receiveShadow=true;

 const lampPoles=new THREE.InstancedMesh(
  lampGeo,
  lampMat,
  4
 );

 const lampHeads=new THREE.InstancedMesh(
  lampHeadGeo,
  lampHeadMat,
  4
 );

 const dummy=new THREE.Object3D();

 const originX=cx*World.CHUNK;
 const originZ=cz*World.CHUNK;

 for(let i=0;i<count;i++){
  const h=hash(
   cx*13+i,
   cz*7+i
  );

  const w=4+h*4;
  const ht=5+h*14;
  const d=4+((h*31)%1)*4;

  let px=
   originX+
   (((i%3)-1)*World.CHUNK/3)+
   (h-0.5)*6;

  let pz=
   originZ+
   ((Math.floor(i/3)-0.5)*World.CHUNK/2)+
   (h-0.5)*6;

  px=clampAwayFromRoad(px);
  pz=clampAwayFromRoad(pz);

  dummy.position.set(
   px,
   ht/2,
   pz
  );

  dummy.scale.set(
   w/6,
   ht,
   d/6
  );

  dummy.updateMatrix();

  bMesh.setMatrixAt(i,dummy.matrix);

  group.userData.boxes.push({
   min:new THREE.Vector3(
    px-w/2,
    0,
    pz-d/2
   ),
   max:new THREE.Vector3(
    px+w/2,
    ht,
    pz+d/2
   )
  });
 }

 const lampSpots=[
  sidewalkSpot('x',originX,originZ+15,1),
  sidewalkSpot('x',originX,originZ-15,-1),
  sidewalkSpot('z',originZ,originX+15,1),
  sidewalkSpot('z',originX-15,-1)
 ];

 lampSpots.forEach((s,i)=>{
  dummy.position.set(
   s.x,
   1.5,
   s.z
  );

  dummy.scale.set(1,1,1);
  dummy.updateMatrix();
  lampPoles.setMatrixAt(i,dummy.matrix);

  dummy.position.set(
   s.x,
   3.05,
   s.z
  );

  dummy.updateMatrix();
  lampHeads.setMatrixAt(i,dummy.matrix);
 });

 bMesh.instanceMatrix.needsUpdate=true;
 lampPoles.instanceMatrix.needsUpdate=true;
 lampHeads.instanceMatrix.needsUpdate=true;

 group.add(
  bMesh,
  lampPoles,
  lampHeads
 );

 let s=sidewalkSpot(
  'x',
  originX,
  originZ+8,
  1
 );

 makeTree(
  group,
  s.x,
  s.z
 );

 s=sidewalkSpot(
  'z',
  originZ,
  originX-8,
  -1
 );

 makeTree(
  group,
  s.x,
  s.z
 );

 s=sidewalkSpot(
  'x',
  originX,
  originZ-8,
  -1
 );

 makeTrafficSign(
  group,
  s.x,
  s.z
 );

 if(hash(cx*3,cz*5)>0.55){
  s=sidewalkSpot(
   'x',
   originX,
   originZ+(hash(cx,cz)-0.5)*20,
   1
  );

  const curbX=
   originX+ROAD_HALF+0.9;

  const pc=World.makeCar(
   curbX,
   s.z,
   [
    0x8a3a3a,
    0x3a5a8a,
    0x555555,
    0x2f6b4a
   ][Math.floor(hash(cx,cz+1)*4)],
   hash(cx,cz+2)>0.5?
    'hatchback':
    'sedan'
  );

  pc.rotation.y=Math.PI/2;
  group.add(pc);
 }

 if(hash(cx*17,cz*19)>0.7){
  s=sidewalkSpot(
   'x',
   originX,
   originZ+(hash(cx,cz)-0.5)*20,
   1
  );

  makeBillboard(
   group,
   s.x,
   3,
   s.z,
   s.faceRotY,
   'ad_generic.jpg',
   'SIDEWALK AD'
  );
 }

 return group;
}

World.landmarkCollidableCount=0;

World.updateChunks=function(px,pz){
 const ccx=Math.round(px/World.CHUNK);
 const ccz=Math.round(pz/World.CHUNK);

 const wanted=new Set();
 let changed=false;

 for(
  let dx=-World.RADIUS;
  dx<=World.RADIUS;
  dx++
 ){
  for(
   let dz=-World.RADIUS;
   dz<=World.RADIUS;
   dz++
  ){
   const cx=ccx+dx;
   const cz=ccz+dz;

   if(
    Math.abs(cx)<=2&&
    Math.abs(cz)<=2
   )continue;

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
   World.scene.remove(g);
   World.chunks.delete(key);
   changed=true;
  }
 }

 if(changed){
  World.collidables.length=
   World.landmarkCollidableCount;

  for(
   const g of World.chunks.values()
  ){
   World.collidables.push(
    ...g.userData.boxes
   );
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
 }[S.qual]||{
  pr:1.5,
  sh:true,
  fog:150
 };

 World.renderer.setPixelRatio(
  Math.min(devicePixelRatio,m.pr)
 );

 World.renderer.shadowMap.enabled=m.sh;

 World.scene.fog.far=m.fog;
};

/* ============ DAY / NIGHT ============ */
World.dayNight={
 time:12,
 speedPerSec:24/1200
};

World.setLights=function(hemi,sun){
 World._hemi=hemi;
 World._sun=sun;
};

const DAYNIGHT_SKY_NIGHT=
 new THREE.Color(0x0b1220);

const DAYNIGHT_SKY_DAY=
 new THREE.Color(0xbfd4e6);

const DAYNIGHT_TMP=
 new THREE.Color();

World.updateDayNight=function(dt){

 World.dayNight.time=
  (World.dayNight.time+
   World.dayNight.speedPerSec*dt)%24;

 const angle=
  ((World.dayNight.time-6)/24)*
  Math.PI*2;

 const sunHeight=Math.sin(angle);
 const dayAmt=Math.max(0,sunHeight);

 if(World._sun){
  World._sun.position.set(
   Math.cos(angle)*80,
   Math.max(5,sunHeight*80),
   Math.sin(angle)*24-20
  );

  World._sun.intensity=
   0.15+dayAmt*1.15;

  const warmth=
   1-Math.min(
    1,
    Math.abs(sunHeight)*2
   );

  World._sun.color.setRGB(
   1,
   0.85-warmth*0.15,
   0.7-warmth*0.25
  );
 }

 if(World._hemi){
  World._hemi.intensity=
   0.25+dayAmt*0.5;

  World._hemi.color.setHSL(
   0.58,
   0.4,
   0.5+dayAmt*0.3
  );

  World._hemi.groundColor.setHSL(
   0.08,
   0.3,
   0.15+dayAmt*0.15
  );
 }

 if(World.scene){
  DAYNIGHT_TMP.copy(
   DAYNIGHT_SKY_NIGHT
  ).lerp(
   DAYNIGHT_SKY_DAY,
   dayAmt
  );

  World.scene.background.copy(
   DAYNIGHT_TMP
  );

  if(World.scene.fog){
   World.scene.fog.color.copy(
    DAYNIGHT_TMP
   );
  }
 }

 const wantLit=sunHeight<0.15;

 if(World._lampsLit!==wantLit){
  World._lampsLit=wantLit;

  lampHeadMat.emissiveIntensity=
   wantLit?1.4:0.15;

  lampHeadMat.color.set(
   wantLit?
    0xffe9b0:
    0x554433
  );
 }
};
