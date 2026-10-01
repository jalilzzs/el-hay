/* ============ Persistence: Supabase (REST) with localStorage fallback ============ */

const Persistence={};


/* ============ Supabase ============ */

Persistence.supabaseReady=function(){

 return !!(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY
 );
};

Persistence.userId=function(){

 let id=
  localStorage.getItem(
   'elhay_uid'
  );

 if(!id){

  id=
   'guest_'+
   Math.random()
    .toString(36)
    .slice(2);

  localStorage.setItem(
   'elhay_uid',
   id
  );
 }

 return id;
};


/* ============ Serialize ============ */

Persistence.serialize=function(){

 const relationshipState=
  typeof Relationships!=='undefined'&&
  Relationships.state
   ? Relationships.state
   : {};

 return{

  cash:
   Economy.cash,

  inventory:
   Economy.inventory,


  vehicles:
   Vehicles.owned
    .slice(1)
    .map(v=>({

     name:v.name,

     registered:
      v.registered,

     x:
      v.mesh.position.x,

     z:
      v.mesh.position.z

    })),


  missionIndex:
   MissionSystem.index,

  missionActive:
   MissionSystem.active,


  /*
   * Keep old affinity format for compatibility.
   */
  affinities:
   Object.fromEntries(

    Object.entries(
     relationshipState
    ).map(
     ([k,v])=>[
      k,
      v.affinity||0
     ]
    )
   ),


  /*
   * Full relationship data.
   * This preserves conversations,
   * dates, flowers, gifts,
   * following and proposal timers.
   */
  relationships:
   JSON.parse(
    JSON.stringify(
     relationshipState
    )
   ),


  married:
   Player.married,

  spouse:
   Player.spouse,


  license:
   License.has,


  vitals:{

   health:
    Vitals.health,

   energy:
    Vitals.energy,

   hunger:
    Vitals.hunger,

   thirst:
    Vitals.thirst,

   hygiene:
    Vitals.hygiene

  },


  properties:
   Player.properties||[],

  spawnPoint:
   Player.spawnPoint||null,


  wanted:
   Police.wanted,


  gangCount:
   Gang.members.length,


  weaponsOwned:
   Weapons.owned,

  weaponsReserve:
   Weapons.reserve,


  /*
   * Family / child state.
   */
  family:
   typeof Relationships!=='undefined'&&
   Relationships.family
    ? JSON.parse(
       JSON.stringify(
        Relationships.family
       )
      )
    : null,


  playerPos:
   Player.camera
    ? {

      x:
       Player.camera.position.x,

      y:
       Player.camera.position.y,

      z:
       Player.camera.position.z

     }
    : null
 };
};


/* ============ Save ============ */

Persistence.save=async function(){

 const data=
  Persistence.serialize();


 /*
  * Always keep a local copy.
  */
 localStorage.setItem(
  'elhay_save',
  JSON.stringify(data)
 );


 if(
  !Persistence.supabaseReady()
 ){
  return;
 }


 try{

  await fetch(
   SUPABASE_URL+
   '/rest/v1/saves',
   {

    method:'POST',

    headers:{

     'Content-Type':
      'application/json',

     'apikey':
      SUPABASE_ANON_KEY,

     'Authorization':
      'Bearer '+
      SUPABASE_ANON_KEY,

     'Prefer':
      'resolution=merge-duplicates'

    },

    body:
     JSON.stringify([

      {

       user_id:
        Persistence.userId(),

       data

      }

     ])
   }
  );

 }catch(e){

  console.warn(
   'Supabase save failed — local save kept as fallback.',
   e
  );
 }
};


/* ============ Load ============ */

Persistence.load=async function(){

 let data=null;


 /*
  * Try Supabase first.
  */
 if(
  Persistence.supabaseReady()
 ){

  try{

   const res=
    await fetch(

     SUPABASE_URL+
     '/rest/v1/saves?user_id=eq.'+
     Persistence.userId()+
     '&select=data',

     {

      headers:{

       'apikey':
        SUPABASE_ANON_KEY,

       'Authorization':
        'Bearer '+
        SUPABASE_ANON_KEY

      }
     }
    );


   const rows=
    await res.json();


   if(
    Array.isArray(rows)&&
    rows[0]
   ){

    data=
     rows[0].data;
   }

  }catch(e){

   console.warn(
    'Supabase load failed — falling back to local save.',
    e
   );
  }
 }


 /*
  * Local fallback.
  */
 if(!data){

  const raw=
   localStorage.getItem(
    'elhay_save'
   );

  if(raw){

   try{

    data=
     JSON.parse(raw);

   }catch(e){

    console.warn(
     'Local save is invalid.',
     e
    );
   }
  }
 }


 if(!data){

  return false;
 }


 Persistence.apply(data);

 return true;
};


/* ============ Apply Save ============ */

Persistence.apply=function(data){

 if(!data) return;


 /* ============ Economy ============ */

 if(
  typeof data.cash==='number'
 ){

  Economy.cash=
   data.cash;
 }


 Economy.inventory=
  Array.isArray(
   data.inventory
  )
   ? data.inventory
   : [];


 /* ============ Missions ============ */

 if(
  typeof data.missionIndex==='number'
 ){

  MissionSystem.index=
   data.missionIndex;
 }

 MissionSystem.active=
  data.missionActive!==false;

 MissionSystem.render();


 /* ============ Relationships ============ */

 if(
  typeof Relationships!=='undefined'
 ){

  /*
   * New full relationship save.
   */
  if(
   data.relationships&&
   typeof data.relationships==='object'
  ){

   Object.keys(
    data.relationships
   ).forEach(id=>{

    if(
     !Relationships.state[id]
    ){
     return;
    }

    const saved=
     data.relationships[id];

    const current=
     Relationships.state[id];

    Object.assign(
     current,
     saved
    );

    /*
     * Keep values safe.
     */
    current.affinity=
      Math.max(
       0,
       Math.min(
        100,
        Number(
         current.affinity||0
        )
       )
      );

    current.conversations=
     Number(
      current.conversations||0
     );

    current.dates=
     Number(
      current.dates||0
     );

    current.flowers=
     Number(
      current.flowers||0
     );

    current.gifts=
     Number(
      current.gifts||0
     );

    current.followedByPlayer=
     !!current.followedByPlayer;
   });

  }else if(
   data.affinities
  ){

   /*
    * Compatibility with old saves.
    */
   Object.keys(
    data.affinities
   ).forEach(k=>{

    if(
     Relationships.state[k]
    ){

     Relationships.state[k].affinity=
      Math.max(
       0,
       Math.min(
        100,
        Number(
         data.affinities[k]||0
        )
       )
      );
    }
   });
  }


  /*
   * Restore family/child state.
   */
  if(
   data.family&&
   Relationships.family
  ){

   Object.assign(
    Relationships.family,
    data.family
   );
  }


  /*
   * Restore marriage state.
   */
  if(
   typeof Player!=='undefined'
  ){

   Player.married=
    !!data.married;

   Player.spouse=
    data.spouse||
    null;
  }
 }


 /* ============ License ============ */

 License.has=
  !!data.license;


 /* ============ Vitals ============ */

 if(data.vitals){

  Object.assign(
   Vitals,
   {

    health:
     Number(
      data.vitals.health
     ),

    energy:
     Number(
      data.vitals.energy
     ),

    hunger:
     Number(
      data.vitals.hunger
     ),

    thirst:
     Number(
      data.vitals.thirst
     ),

    hygiene:
     Number(
      data.vitals.hygiene
     )

   }
  );
 }


 /* ============ Properties ============ */

 Player.properties=
  Array.isArray(
   data.properties
  )
   ? data.properties
   : [];

 Player.spawnPoint=
  data.spawnPoint||
  null;


 /* ============ Wanted ============ */

 if(
  typeof data.wanted==='number'&&
  data.wanted>0
 ){

  Police.addWanted(
   data.wanted
  );
 }


 /* ============ Gang ============ */

 if(data.gangCount){

  const candidates=
   NPCPool.pool.filter(
    n=>
     n.active&&
     !n.recruited&&
     !n.relationshipId
   );


  for(
   let i=0;
   i<
   Math.min(
    data.gangCount,
    candidates.length
   );
   i++
  ){

   Gang.recruit(
    candidates[i]
   );
  }
 }


 /* ============ Weapons ============ */

 if(
  Array.isArray(
   data.weaponsOwned
  )
 ){

  Weapons.owned=
   data.weaponsOwned;
 }


 if(
  Array.isArray(
   data.weaponsReserve
  )
 ){

  Weapons.reserve=
   data.weaponsReserve;
 }


 /* ============ Vehicles ============ */

 if(
  Array.isArray(
   data.vehicles
  )
 ){

  data.vehicles.forEach(
   v=>{

    if(
     !World||
     typeof World.makeCar!=='function'
    ){
     return;
    }

    const mesh=
     World.makeCar(
      Number(v.x)||0,
      Number(v.z)||0,
      0x555555
     );

    Vehicles.owned.push({

     mesh,

     registered:
      !!v.registered,

     name:
      v.name||
      'Vehicle'

    });
   }
  );
 }


 /* ============ Player Position ============ */

 if(
  data.playerPos&&
  Player.camera
 ){

  Player.camera.position.set(

   Number(
    data.playerPos.x
   )||0,

   Number(
    data.playerPos.y
   )||1.7,

   Number(
    data.playerPos.z
   )||0

  );
 }


 /* ============ Restore relationship NPC states ============ */

 if(
  typeof NPCPool!=='undefined'&&
  typeof NPCPool.getRelationshipNPC==='function'&&
  typeof Relationships!=='undefined'
 ){

  Object.keys(
   Relationships.state
  ).forEach(id=>{

   const state=
    Relationships.state[id];

   const npc=
    NPCPool.getRelationshipNPC(id);

   if(!npc) return;

   npc.followingPlayer=
    !!state.followedByPlayer;
  });
 }


 /* ============ HUD ============ */

 UI.refreshHUD();

 Weapons.refreshHUD();
};


/* ============ Autosave Helper ============ */

Persistence.clear=function(){

 localStorage.removeItem(
  'elhay_save'
 );

 console.info(
  '[Persistence] Local save cleared.'
 );
};
