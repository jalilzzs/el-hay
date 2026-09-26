/* ============ World: textures, chunk streaming, buildings, vehicles, interiors, NPCs ============ */
const World={};

function canvasTex(draw,w=256,h=256){const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);
 const tx=new THREE.CanvasTexture(cv);tx.wrapS=tx.wrapT=THREE.RepeatWrapping;return tx;}

/* Building facade textures with procedural windows, balconies, entrance door, roof ledge painted in */
function facadeTex(base,trim,winColor,hasBalcony){
 return canvasTex((g,w,h)=>{
  g.fillStyle=base; g.fillRect(0,0,w,h);
  // roof ledge
  g.fillStyle=trim; g.fillRect(0,0,w,10);
  // windows grid, recessed look via double-rect shading
  const rows=5, cols=4, mx=18, my=26, cw=(w-mx*2)/cols, chh=(h-my*2)/rows;
  for(let r=0;r<rows;r++)for(let cIdx=0;cIdx<cols;cIdx++){
   const x=mx+cIdx*cw+cw*0.18, y=my+r*chh+chh*0.15, ww=cw*0.64, hh=chh*0.6;
   g.fillStyle='rgba(0,0,0,0.25)'; g.fillRect(x-2,y-2,ww+4,hh+4);
   g.fillStyle=winColor; g.fillRect(x,y,ww,hh);
   g.strokeStyle='rgba(0,0,0,0.3)'; g.lineWidth=1; g.strokeRect(x,y,ww,hh);
   if(hasBalcony && r%2===0){ g.fillStyle=trim; g.fillRect(x-4,y+hh+3,ww+8,4); }
  }
  // entrance door
  g.fillStyle=trim; g.fillRect(w/2-14,h-30,28,30);
  g.fillStyle='#2b2b2b'; g.fillRect(w/2-10,h-27,20,24);
 },256,384);
}
const TEX={
 residential:facadeTex('#d8b98a','#8a5a3a','#3d4d55',true),
 residential2:facadeTex('#e3c9a0','#7a4a30','#33424a',true),
 retail:canvasTex((g,w,h)=>{g.fillStyle='#e7dcc4';g.fillRect(0,0,w,h);g.fillStyle='#b23a2e';g.fillRect(0,h-40,w,30);
  g.fillStyle='#fff';g.fillRect(10,h-70,w-20,16);g.fillStyle='#2b2b2b';g.fillRect(20,h-30,w-40,26);}),
 hospital:canvasTex((g,w,h)=>{g.fillStyle='#f2f6fa';g.fillRect(0,0,w,h);g.fillStyle='#2f6fb0';g.fillRect(0,h-24,w,24);
  for(let r=0;r<6;r++)for(let cIdx=0;cIdx<4;cIdx++){g.fillStyle='#bcd4ea';g.fillRect(20+cIdx*60,30+r*40,40,26);}
  g.fillStyle='#c0392b';g.fillRect(w/2-6,h/2-24,12,48);g.fillRect(w/2-24,h/2-6,48,12);}),
 police:canvasTex((g,w,h)=>{g.fillStyle='#5a5750';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=18)g.fillRect(0,y,w,2,g.fillStyle='#3d3a35');
  g.fillStyle='#146b3a';g.beginPath();g.arc(w/2,h/2-20,20,0,7);g.fill();g.fillStyle='#c0392b';g.beginPath();g.arc(w/2,h/2-20,9,0,7);g.fill();}),
 road:canvasTex((g,w,h)=>{g.fillStyle='#2b2b2e';g.fillRect(0,0,w,h);},64,160),
 roadStripe:canvasTex((g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle='#e7c65a';for(let y=0;y<h;y+=40)g.fillRect(w/2-2,y,4,24);},64,160),
 grass:canvasTex((g,w,h)=>{g.fillStyle='#3f6b3a';g.fillRect(0,0,w,h);g.fillStyle='#365c32';
  for(let i=0;i<80;i++){const x=Math.random()*w,y=Math.random()*h;g.fillRect(x,y,2,2);}}),
 sidewalk:canvasTex((g,w,h)=>{g.fillStyle='#9c988c';g.fillRect(0,0,w,h);g.strokeStyle='#7d7a70';for(let x=0;x<w;x+=16){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}})
};
Object.values(TEX).forEach(tx=>tx.repeat.set(1,1));
World.TEX=TEX;

World.init=function(scene,renderer){
 World.scene=scene; World.renderer=renderer;
 World.collidables=[]; // AABB list for wall collisions: landmarks (fixed) + active-chunk buildings (rebuilt on stream)

 /* Layering fixes z-fighting: grass ground y=0, asphalt y=0.02, stripes y=0.04 (own thin
    transparent layer). polygonOffset on both road layers also prevents flicker where the
    horizontal and vertical road strips cross each other at the same y. */
 const groundMat=new THREE.MeshStandardMaterial({map:TEX.grass,roughness:1});
 TEX.grass.repeat.set(200,200);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),groundMat);
 ground.rotation.x=-Math.PI/2; ground.position.y=0; ground.receiveShadow=true; scene.add(ground);

 const ROAD_W=8, ROAD_HALF=ROAD_W/2, SIDEWALK_W=3;
 const roadMat=new THREE.MeshStandardMaterial({map:TEX.road,roughness:0.9,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const stripeMat=new THREE.MeshStandardMaterial({map:TEX.roadStripe,roughness:0.9,transparent:true,alphaTest:0.4,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 const sidewalkMat=new THREE.MeshStandardMaterial({map:TEX.sidewalk,roughness:1});
 TEX.road.repeat.set(1,50); TEX.roadStripe.repeat.set(1,50);
 function makeRoad(x,z,w,l){
  const asphalt=new THREE.Mesh(new THREE.PlaneGeometry(w,l),roadMat); asphalt.rotation.x=-Math.PI/2; asphalt.position.set(x,0.02,z); asphalt.receiveShadow=true; scene.add(asphalt);
  const stripe=new THREE.Mesh(new THREE.PlaneGeometry(w,l),stripeMat); stripe.rotation.x=-Math.PI/2; stripe.position.set(x,0.04,z); scene.add(stripe);
 }
 // sidewalk strips flank every road on both sides, between the road edge and the grass
 function makeSidewalk(x,z,w,l){
  const s=new THREE.Mesh(new THREE.PlaneGeometry(w,l),sidewalkMat); s.rotation.x=-Math.PI/2; s.position.set(x,0.015,z); s.receiveShadow=true; scene.add(s);
 }
 for(let i=-4;i<=4;i++){
  makeRoad(i*40,0,ROAD_W,2000); makeRoad(0,i*40,2000,ROAD_W);
  makeSidewalk(i*40-ROAD_HALF-SIDEWALK_W/2,0,SIDEWALK_W,2000); makeSidewalk(i*40+ROAD_HALF+SIDEWALK_W/2,0,SIDEWALK_W,2000);
  makeSidewalk(0,i*40-ROAD_HALF-SIDEWALK_W/2,2000,SIDEWALK_W); makeSidewalk(0,i*40+ROAD_HALF+SIDEWALK_W/2,2000,SIDEWALK_W);
 }
 World.roadClearance=ROAD_HALF+SIDEWALK_W+2; // buildings must stay this far from any road centerline

 buildLandmarks(scene);
 World.landmarkCollidableCount=World.collidables.length;
 buildBillboardLandmarks(scene);
 buildInteriors(scene);
 World.playerCar=World.makeCar(-68,-18,0x274b52);
 World.parkedCars=[];
 for(let i=0;i<5;i++){const c=World.makeCar(-40+i*20,10,[0x8a3a3a,0x3a5a8a,0x555,0x2f6b4a,0x9c7a3a][i]);c.rotation.y=Math.random()*Math.PI;World.parkedCars.push(c);}

 World.npcs=[]; // populated by NPCPool (js/npc.js); World.keyNpcs (below) are the fixed named characters
 spawnKeyNpcs();

 World.checkpointBarrier=new THREE.Mesh(new THREE.BoxGeometry(6,0.4,0.4),new THREE.MeshStandardMaterial({color:0xd94b3a}));
 scene.add(World.checkpointBarrier);
 World.checkpointOfficer=spawnNPC(0,0);
 World.checkpointOfficer.mesh.children[0].material.color.set(0x1f3b57); // force police-blue shirt
 World.checkpointPos=new THREE.Vector3();
 World.randomizeCheckpoint();

 World.chunks=new Map();
 World.updateChunks(0,0);
};

/* Randomized checkpoint: picks a random point along a random road centerline each session,
   well clear of the spawn/landmark zone, and orients the barrier across that road. */
World.randomizeCheckpoint=function(){
 const vertical=Math.random()<0.5;
 const k=(Math.floor(Math.random()*7)-3)*40; // one of the road lines, -120..120
 const along=(Math.random()<0.5?-1:1)*(60+Math.random()*90); // 60..150 units out from center
 let x,z,rotY;
 if(vertical){ x=k; z=along; rotY=0; } else { x=along; z=k; rotY=Math.PI/2; }
 World.checkpointBarrier.position.set(x,0.6,z); World.checkpointBarrier.rotation.y=rotY;
 World.checkpointOfficer.mesh.position.set(x+(vertical?1.5:0),0,z+(vertical?0:1.5));
 World.checkpointPos.set(x,0,z);
};

/* ---- Wall collision: simple AABB resolution, used by both the player and wandering NPCs ---- */
World.resolveCollision=function(pos,radius){
 for(const b of World.collidables){
  const minX=b.min.x-radius, maxX=b.max.x+radius, minZ=b.min.z-radius, maxZ=b.max.z+radius;
  if(pos.x>minX&&pos.x<maxX&&pos.z>minZ&&pos.z<maxZ){
   const pushLeft=pos.x-minX, pushRight=maxX-pos.x, pushBack=pos.z-minZ, pushFwd=maxZ-pos.z;
   const min=Math.min(pushLeft,pushRight,pushBack,pushFwd);
   if(min===pushLeft) pos.x=minX; else if(min===pushRight) pos.x=maxX; else if(min===pushBack) pos.z=minZ; else pos.z=maxZ;
  }
 }
 return pos;
};

/* ---- Landmarks: distinct, detailed buildings ---- */
const matRes=new THREE.MeshStandardMaterial({map:TEX.residential,roughness:0.85});
const matRetail=new THREE.MeshStandardMaterial({map:TEX.retail,roughness:0.85});
const matHosp=new THREE.MeshStandardMaterial({map:TEX.hospital,roughness:0.6});
const matPolice=new THREE.MeshStandardMaterial({map:TEX.police,roughness:0.95});
function block(scene,x,y,z,w,h,d,mat){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y+h/2,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);
 World.collidables.push({min:new THREE.Vector3(x-w/2,0,z-d/2),max:new THREE.Vector3(x+w/2,h,z+d/2)});
 return m;
}
function roofLedge(scene,x,y,z,w,d,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w+0.6,0.3,d+0.6),new THREE.MeshStandardMaterial({color}));m.position.set(x,y,z);scene.add(m);return m;}

World.landmarks={};
const matCafe=new THREE.MeshStandardMaterial({color:0x7a5230,roughness:0.8});
const matDeal=new THREE.MeshStandardMaterial({color:0x3d5a6c,roughness:0.6});
const matSchool=new THREE.MeshStandardMaterial({color:0xb8a06a,roughness:0.8});
const matHall=new THREE.MeshStandardMaterial({color:0xe3d9c0,roughness:0.7});
function buildLandmarks(scene){
 World.landmarks.hospital=block(scene,-60,0,-60,14,10,14,matHosp); roofLedge(scene,-60,10.15,-60,14,14,0xffffff);
 World.landmarks.police=block(scene,60,0,-60,12,9,12,matPolice); roofLedge(scene,60,9.15,-60,12,12,0x3d3a35);
 World.landmarks.prison=block(scene,30,0,60,18,12,20,matPolice); roofLedge(scene,30,12.15,60,18,20,0x3d3a35);
 const wallMat=new THREE.MeshStandardMaterial({color:0x4a4842,roughness:1});
 [[-18,0,50,3,6,20],[18,0,50,3,6,20]].forEach(p=>block(scene,p[0]+12,p[1],p[2],p[3],p[4],p[5],wallMat));
 World.landmarks.home=block(scene,-70,0,-20,8,7,8,matRes);
 World.landmarks.retail=block(scene,20,0,-20,10,6,10,matRetail);
 World.landmarks.cafe=block(scene,0,0,-40,8,5,8,matCafe);
 World.landmarks.dealership=block(scene,60,0,20,12,5,14,matDeal);
 World.landmarks.drivingSchool=block(scene,-40,0,40,10,5,10,matSchool);
 World.landmarks.cityHall=block(scene,0,0,40,12,8,12,matHall); roofLedge(scene,0,8.15,40,12,12,0xe3d9c0);
}

/* Unified point-of-interest registry: drives entrances, minimap markers, mission waypoints, shops */
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
];
World.entrances=World.pois.filter(p=>p.type==='interior');
World.shops=World.pois.filter(p=>p.type==='shop');

/* ---- Interiors ---- */
World.interiors={}; World.activeInterior=null;
function makeInterior(scene,name,wallColor,floorColor,accent){
 const g=new THREE.Group(); g.visible=false;
 g.add(new THREE.Mesh(new THREE.BoxGeometry(10,4,10),new THREE.MeshBasicMaterial({color:wallColor,side:THREE.BackSide})));
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshStandardMaterial({color:floorColor}));floor.rotation.x=-Math.PI/2;floor.position.y=-2;g.add(floor);
 if(accent){const a=new THREE.Mesh(new THREE.BoxGeometry(1,1,0.2),new THREE.MeshStandardMaterial({color:accent}));a.position.set(0,0,-4.8);g.add(a);}
 g.position.set(0,50,0); scene.add(g); World.interiors[name]=g;
}
function buildInteriors(scene){
 makeInterior(scene,'hospital',0xeaf1f8,0xdfe9f2,0xc0392b);
 makeInterior(scene,'police',0x3a3733,0x2a2825,0x146b3a);
 makeInterior(scene,'prison',0x2c2c2c,0x1f1f1f,0x555555);
 makeInterior(scene,'home',0xe7d9be,0xc7a97a,0x8a5a3a);
 const home=World.interiors.home;
 const bed=new THREE.Mesh(new THREE.BoxGeometry(2,0.6,3),new THREE.MeshStandardMaterial({color:0x8b5e3c})); bed.position.set(-3,-1.7,-3); home.add(bed);
 const toilet=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.8,0.8),new THREE.MeshStandardMaterial({color:0xf2f6fa})); toilet.position.set(3,-1.6,3); home.add(toilet);
 World.homeBedLocal=new THREE.Vector3(-3,50-1.7,-3); World.homeToiletLocal=new THREE.Vector3(3,50-1.6,3);
}
World.enterInterior=function(name,camera,outsidePos){
 if(World.activeInterior) return;
 outsidePos.copy(camera.position);
 Object.values(World.interiors).forEach(i=>i.visible=false);
 World.interiors[name].visible=true; World.activeInterior=name;
 camera.position.set(0,52,3); camera.lookAt(0,51,-4);
};
World.exitInterior=function(camera,outsidePos){
 if(!World.activeInterior) return;
 World.interiors[World.activeInterior].visible=false; World.activeInterior=null; camera.position.copy(outsidePos);
};

/* ---- Detailed vehicle factory: wheels, glass, lights ---- */
World.makeCar=function(x,z,color){
 const g=new THREE.Group();
 const body=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.65,3.6),new THREE.MeshStandardMaterial({color,metalness:0.5,roughness:0.35}));
 body.position.y=0.5; body.castShadow=true; g.add(body);
 const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.5,1.9),new THREE.MeshPhysicalMaterial({color:0x0e1b1d,transparent:true,opacity:0.55,roughness:0.1}));
 cabin.position.set(0,1.0,-0.15); g.add(cabin);
 const lightMat=new THREE.MeshStandardMaterial({color:0xfff3c0,emissive:0xffdd88,emissiveIntensity:0.8});
 const tailMat=new THREE.MeshStandardMaterial({color:0x990000,emissive:0x660000,emissiveIntensity:0.6});
 [[-0.6,0.55,1.82],[0.6,0.55,1.82]].forEach(p=>{const l=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.12,0.05),lightMat);l.position.set(p[0],p[1],p[2]);g.add(l);});
 [[-0.6,0.55,-1.82],[0.6,0.55,-1.82]].forEach(p=>{const l=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.12,0.05),tailMat);l.position.set(p[0],p[1],p[2]);g.add(l);});
 const wheelMat=new THREE.MeshStandardMaterial({color:0x111111,roughness:0.9});
 [[-0.9,0.32,1.2],[0.9,0.32,1.2],[-0.9,0.32,-1.2],[0.9,0.32,-1.2]].forEach(p=>{
  const wheel=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,0.28,12),wheelMat);
  wheel.rotation.z=Math.PI/2; wheel.position.set(p[0],p[1],p[2]); wheel.castShadow=true; g.add(wheel);});
 g.position.set(x,0,z); World.scene.add(g); return g;
};

/* ---- Billboards: real assets from public/textures/billboards/, with a cached placeholder fallback ---- */
function billboardPlaceholderTex(label){
 return canvasTex((g,w,h)=>{
  g.fillStyle='#1c2b30'; g.fillRect(0,0,w,h);
  g.strokeStyle='#c9a24b'; g.lineWidth=6; g.strokeRect(4,4,w-8,h-8);
  g.fillStyle='#c9a24b'; g.font='bold 26px sans-serif'; g.textAlign='center'; g.fillText(label,w/2,h/2+10);
 },256,160);
}
const billboardResolved={}; // fileName -> THREE.Texture (loaded) | 'fail' (404'd once, don't retry)
function applyBillboardTexture(mat,fileName){
 if(billboardResolved[fileName]==='fail') return;
 if(billboardResolved[fileName] instanceof THREE.Texture){ mat.map=billboardResolved[fileName]; mat.needsUpdate=true; return; }
 new THREE.TextureLoader().load(ASSET_PATHS.bill+fileName,
  tex=>{ tex.colorSpace=THREE.SRGBColorSpace; billboardResolved[fileName]=tex; mat.map=tex; mat.needsUpdate=true; },
  undefined, ()=>{ billboardResolved[fileName]='fail'; });
}
function makeBillboard(parent,x,y,z,rotY,fileName,label){
 const mat=new THREE.MeshStandardMaterial({map:billboardPlaceholderTex(label),roughness:0.8});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(4,2.4),mat); mesh.position.set(x,y,z); mesh.rotation.y=rotY;
 const post=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,y*2,6),new THREE.MeshStandardMaterial({color:0x333}));
 post.position.set(x,y-1.2,z);
 parent.add(mesh,post);
 applyBillboardTexture(mat,fileName);
 return mesh;
}
function buildBillboardLandmarks(scene){
 makeBillboard(scene,0,3,-8,0,'ad1.jpg','EL-HAY COLA');
 makeBillboard(scene,-30,3,-2,Math.PI/2,'ad2.jpg','SOUK MARKET');
 makeBillboard(scene,40,3,-30,Math.PI,'ad3.jpg','TELECOM+');
}

/* ---- NPCs: simple anatomical humanoid (head/torso/arms/legs), randomized look ---- */
const SKIN=[0xC68642,0x8D5524,0xE0AC69,0xF1C27D]; const OUTFIT=[0x3d5a6c,0x6b4226,0x4a4a48,0x7a5230,0x2f4a3e];
const PANTS=[0x2b2f38,0x4a3a2a,0x1f1f1f,0x5a4632,0x30323a];
function spawnNPC(x,z){
 const skin=SKIN[Math.floor(Math.random()*SKIN.length)], outfit=OUTFIT[Math.floor(Math.random()*OUTFIT.length)], pants=PANTS[Math.floor(Math.random()*PANTS.length)];
 const height=0.88+Math.random()*0.28; // per-NPC height/build variety
 const g=new THREE.Group();
 const skinMat=new THREE.MeshStandardMaterial({color:skin}), outfitMat=new THREE.MeshStandardMaterial({color:outfit}), pantsMat=new THREE.MeshStandardMaterial({color:pants});
 const torso=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.55,0.26),outfitMat); torso.position.y=1.05; torso.castShadow=true; g.add(torso); // children[0] — used by weapons.js hit detection
 const head=new THREE.Mesh(new THREE.SphereGeometry(0.16,10,10),skinMat); head.position.y=1.48; g.add(head);
 const armGeo=new THREE.CylinderGeometry(0.055,0.055,0.5,6);
 const armL=new THREE.Mesh(armGeo,skinMat); armL.position.set(-0.27,1.05,0); armL.rotation.z=0.12; armL.castShadow=true; g.add(armL);
 const armR=new THREE.Mesh(armGeo,skinMat); armR.position.set(0.27,1.05,0); armR.rotation.z=-0.12; armR.castShadow=true; g.add(armR);
 const legGeo=new THREE.CylinderGeometry(0.08,0.075,0.62,6);
 const legL=new THREE.Mesh(legGeo,pantsMat); legL.position.set(-0.12,0.5,0); legL.castShadow=true; g.add(legL);
 const legR=new THREE.Mesh(legGeo,pantsMat); legR.position.set(0.12,0.5,0); legR.castShadow=true; g.add(legR);
 g.scale.setScalar(height);
 g.position.set(x,0,z); World.scene.add(g);
 const entry={mesh:g,dir:Math.random()*Math.PI*2,timer:0};
 World.npcs.push(entry);
 return entry;
}
World.keyNpcs={};
function spawnKeyNpcs(){
 World.keyNpcs.yasmine=spawnNPC(2,-38);   // near café
 World.keyNpcs.karim=spawnNPC(22,-16);    // near store
 World.keyNpcs.sofia=spawnNPC(-68,-14);   // near home
}
World.update=function(px,pz,dt){ World.updateChunks(px,pz); };

/* ---- Chunk streaming (proximity-based spawn/despawn, LOD via distance) ---- */
World.CHUNK=40; World.RADIUS=3;
const buildingGeo=new THREE.BoxGeometry(6,1,6);
const bMatVariants=[new THREE.MeshStandardMaterial({map:TEX.residential,roughness:0.85}),new THREE.MeshStandardMaterial({map:TEX.residential2,roughness:0.85})];
const lampGeo=new THREE.CylinderGeometry(0.08,0.08,3,6), lampMat=new THREE.MeshStandardMaterial({color:0x333,roughness:0.8});
const lampHeadGeo=new THREE.SphereGeometry(0.18,8,8), lampHeadMat=new THREE.MeshStandardMaterial({color:0xffe9b0,emissive:0xffcf7a,emissiveIntensity:0.6});
function chunkKey(cx,cz){return cx+','+cz;}
function hash(cx,cz){let h=cx*374761393+cz*668265263;h=(h^(h>>>13))*1274126177;return ((h^(h>>>16))>>>0)/4294967295;}
function clampAwayFromRoad(v){
 const nearest=Math.round(v/40)*40, d=v-nearest;
 if(Math.abs(d)<World.roadClearance) return nearest+(d<0?-World.roadClearance:World.roadClearance);
 return v;
}
function buildChunk(cx,cz){
 const group=new THREE.Group();
 group.userData.boxes=[];
 const count=6;
 const bMesh=new THREE.InstancedMesh(buildingGeo,bMatVariants[Math.abs(cx+cz)%2],count);
 bMesh.castShadow=true; bMesh.receiveShadow=true;
 const lampPoles=new THREE.InstancedMesh(lampGeo,lampMat,4), lampHeads=new THREE.InstancedMesh(lampHeadGeo,lampHeadMat,4);
 const dummy=new THREE.Object3D();
 const originX=cx*World.CHUNK, originZ=cz*World.CHUNK;
 for(let i=0;i<count;i++){
  const h=hash(cx*13+i,cz*7+i);
  const w=4+h*4, ht=5+h*14, d=4+((h*31)%1)*4;
  let px=originX+(((i%3)-1)*World.CHUNK/3)+(h-0.5)*6, pz=originZ+((Math.floor(i/3)-0.5))*World.CHUNK/2+(h-0.5)*6;
  px=clampAwayFromRoad(px); pz=clampAwayFromRoad(pz);
  dummy.position.set(px,ht/2,pz); dummy.scale.set(w/6,ht,d/6); dummy.updateMatrix();
  bMesh.setMatrixAt(i,dummy.matrix);
  group.userData.boxes.push({min:new THREE.Vector3(px-w/2,0,pz-d/2),max:new THREE.Vector3(px+w/2,ht,pz+d/2)});
 }
 for(let i=0;i<4;i++){
  const px=originX+(i%2===0?-World.CHUNK/2+2:World.CHUNK/2-2), pz=originZ+(i<2?-World.CHUNK/2+2:World.CHUNK/2-2);
  dummy.position.set(px,1.5,pz); dummy.scale.set(1,1,1); dummy.updateMatrix(); lampPoles.setMatrixAt(i,dummy.matrix);
  dummy.position.set(px,3.05,pz); dummy.updateMatrix(); lampHeads.setMatrixAt(i,dummy.matrix);
 }
 bMesh.instanceMatrix.needsUpdate=true; lampPoles.instanceMatrix.needsUpdate=true; lampHeads.instanceMatrix.needsUpdate=true;
 group.add(bMesh,lampPoles,lampHeads);

 // parked curb cars per chunk (proximity-spawned detail)
 if(hash(cx*3,cz*5)>0.55){
  const pc=World.makeCar(originX+World.CHUNK/2-4,originZ+(hash(cx,cz)-0.5)*20,[0x8a3a3a,0x3a5a8a,0x555555,0x2f6b4a][Math.floor(hash(cx,cz+1)*4)]);
  pc.rotation.y=Math.PI/2; group.add(pc);
 }
 // proximity-spawned sidewalk billboard, tied to this chunk's lifecycle (no leak on despawn)
 if(hash(cx*17,cz*19)>0.7){
  makeBillboard(group,originX-World.CHUNK/2+3,3,originZ,Math.PI/2,'ad_generic.jpg','SIDEWALK AD');
 }
 return group;
}
World.landmarkCollidableCount=0; // set right after buildLandmarks in init; chunk boxes are everything after this index
World.updateChunks=function(px,pz){
 const ccx=Math.round(px/World.CHUNK), ccz=Math.round(pz/World.CHUNK);
 const wanted=new Set();
 let changed=false;
 for(let dx=-World.RADIUS;dx<=World.RADIUS;dx++)for(let dz=-World.RADIUS;dz<=World.RADIUS;dz++){
  const cx=ccx+dx, cz=ccz+dz; if(Math.abs(cx)<=2&&Math.abs(cz)<=2) continue; // keep landmark/spawn area clear
  const key=chunkKey(cx,cz); wanted.add(key);
  if(!World.chunks.has(key)){const g=buildChunk(cx,cz);World.scene.add(g);World.chunks.set(key,g);changed=true;}
 }
 for(const [key,g] of World.chunks){ if(!wanted.has(key)){World.scene.remove(g);World.chunks.delete(key);changed=true;} }
 if(changed){
  World.collidables.length=World.landmarkCollidableCount;
  for(const g of World.chunks.values()) World.collidables.push(...g.userData.boxes);
 }
};

World.applyQuality=function(){
 const m={low:{pr:1,sh:false,fog:200},med:{pr:1.5,sh:true,fog:150},high:{pr:2,sh:true,fog:120},ultra:{pr:2,sh:true,fog:80}}[S.qual]||{pr:1.5,sh:true,fog:150};
 World.renderer.setPixelRatio(Math.min(devicePixelRatio,m.pr)); World.renderer.shadowMap.enabled=m.sh; World.scene.fog.far=m.fog;
};
