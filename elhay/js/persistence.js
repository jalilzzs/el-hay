/* ============ Persistence, Vitals Death, Modern Bank & Marriage System ============ */

// 1. نظام الحفظ والتحميل (Persistence)
const Persistence = {};

Persistence.supabaseReady = function() {
 let ready = !!(
  typeof SUPABASE_URL !== 'undefined' &&
  typeof SUPABASE_ANON_KEY !== 'undefined' &&
  SUPABASE_URL &&
  SUPABASE_ANON_KEY
 );
 return ready;
};

Persistence.userId = function() {
 let id = localStorage.getItem('elhay_uid');
 if(!id){
  id = 'guest_' + Math.random().toString(36).slice(2);
  localStorage.setItem('elhay_uid', id);
 }
 return id;
};

Persistence.serialize = function() {
 return {
  cash: Economy.cash,
  bankLoan: Bank.loan || 0,
  inventory: Economy.inventory,

  vehicles: Vehicles.owned.slice(1).map(v => ({
   name: v.name,
   registered: v.registered,
   x: v.mesh.position.x,
   z: v.mesh.position.z
  })),

  missionIndex: MissionSystem.index,
  missionActive: MissionSystem.active,

  affinities: Object.fromEntries(
   Object.entries(Relationships.state).map(([k,v]) => [k,v.affinity])
  ),

  married: Player.married,
  spouse: Player.spouse,

  spouseFollowing: MarriageSystem.isFollowing,
  hasBaby: MarriageSystem.hasBaby,
  lastGiftTime: MarriageSystem.lastGiftTime,

  license: License.has,

  vitals: {
   health: Vitals.health,
   energy: Vitals.energy,
   hunger: Vitals.hunger,
   thirst: Vitals.thirst,
   hygiene: Vitals.hygiene
  },

  properties: Player.properties || [],
  spawnPoint: Player.spawnPoint || null,

  // استخدام Police إذا كان موجودًا، وإلا PoliceAI
  wanted: (
   typeof Police !== 'undefined' && typeof Police.wanted === 'number'
    ? Police.wanted
    : (
      typeof PoliceAI !== 'undefined' && typeof PoliceAI.wanted === 'number'
       ? PoliceAI.wanted
       : 0
    )
  ),

  gangCount: Gang.members.length,

  weaponsOwned: Weapons.owned,
  weaponsReserve: Weapons.reserve,

  playerPos: Player.camera
   ? {
      x: Player.camera.position.x,
      y: Player.camera.position.y,
      z: Player.camera.position.z
     }
   : null
 };
};

Persistence.save = async function() {
 try {
  const data = Persistence.serialize();

  // الحفظ المحلي دائمًا كنسخة احتياطية
  localStorage.setItem('elhay_save', JSON.stringify(data));

  if(!Persistence.supabaseReady()) return;

  try {
   await fetch(
    SUPABASE_URL + '/rest/v1/saves',
    {
     method: 'POST',
     headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Prefer': 'resolution=merge-duplicates'
     },
     body: JSON.stringify([
      {
       user_id: Persistence.userId(),
       data
      }
     ])
    }
   );
  } catch(e) {
   console.warn(
    'Supabase save failed — local save kept as fallback.',
    e
   );
  }

 } catch(e) {
  console.error('Persistence save failed:', e);
 }
};

Persistence.load = async function() {
 let data = null;

 if(Persistence.supabaseReady()){
  try {
   const res = await fetch(
    SUPABASE_URL +
    '/rest/v1/saves?user_id=eq.' +
    encodeURIComponent(Persistence.userId()) +
    '&select=data',
    {
     headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
     }
    }
   );

   const rows = await res.json();

   if(Array.isArray(rows) && rows[0]){
    data = rows[0].data;
   }

  } catch(e) {
   console.warn(
    'Supabase load failed — falling back to local save.',
    e
   );
  }
 }

 if(!data){
  const raw = localStorage.getItem('elhay_save');

  if(raw){
   try {
    data = JSON.parse(raw);
   } catch(e) {
    console.warn('Local save is corrupted.', e);
   }
  }
 }

 if(!data) return false;

 Persistence.apply(data);
 return true;
};

Persistence.apply = function(data) {
 Economy.cash = data.cash ?? Economy.cash;

 Bank.loan = data.bankLoan || 0;

 Economy.inventory = data.inventory || [];

 MissionSystem.index = data.missionIndex || 0;
 MissionSystem.active = data.missionActive !== false;
 MissionSystem.render();

 if(data.affinities){
  Object.keys(data.affinities).forEach(k => {
   if(Relationships.state[k]){
    Relationships.state[k].affinity = data.affinities[k];
   }
  });
 }

 Player.married = !!data.married;
 Player.spouse = data.spouse || null;

 MarriageSystem.isFollowing = !!data.spouseFollowing;
 MarriageSystem.hasBaby = !!data.hasBaby;
 MarriageSystem.lastGiftTime = data.lastGiftTime || 0;

 License.has = !!data.license;

 if(data.vitals){
  Object.assign(Vitals, data.vitals);
 }

 Player.properties = data.properties || [];
 Player.spawnPoint = data.spawnPoint || null;

 // استرجاع مستوى المطاردة بدون الاعتماد الإجباري على Police
 if(typeof data.wanted === 'number' && data.wanted > 0){

  if(
   typeof Police !== 'undefined' &&
   typeof Police.addWanted === 'function'
  ){
   Police.addWanted(data.wanted);

  } else if(
   typeof PoliceAI !== 'undefined' &&
   typeof PoliceAI.addWanted === 'function'
  ){
   PoliceAI.addWanted(data.wanted);
  }
 }

 if(data.gangCount){
  const candidates = NPCPool.pool.filter(
   n => n.active && !n.recruited
  );

  for(
   let i = 0;
   i < Math.min(data.gangCount, candidates.length);
   i++
  ){
   Gang.recruit(candidates[i]);
  }
 }

 if(data.weaponsOwned){
  Weapons.owned = data.weaponsOwned;
 }

 if(data.weaponsReserve){
  Weapons.reserve = data.weaponsReserve;
 }

 if(data.vehicles){
  data.vehicles.forEach(v => {
   const mesh = World.makeCar(
    v.x,
    v.z,
    0x555555
   );

   Vehicles.owned.push({
    mesh,
    registered: v.registered,
    name: v.name
   });
  });
 }

 if(data.playerPos && Player.camera){
  Player.camera.position.set(
   data.playerPos.x,
   data.playerPos.y,
   data.playerPos.z
  );
 }

 UI.refreshHUD();
 Weapons.refreshHUD();
};


// 2. نظام الموت عند نفاد الصحة
Vitals.checkDeath = function() {

 if(Vitals.health <= 0 && !Player.isDead){

  Player.isDead = true;

  if(
   typeof UI !== 'undefined' &&
   UI.showNotification
  ){
   UI.showNotification(
    "لقد أغمي عليك ونُقلت إلى المستشفى!"
   );
  }

  Economy.cash = Math.max(
   0,
   Economy.cash - 500
  );

  if(typeof Police !== 'undefined'){
   Police.wanted = 0;
  }

  if(
   typeof PoliceAI !== 'undefined' &&
   typeof PoliceAI.clear === 'function'
  ){
   PoliceAI.clear();
  }

  setTimeout(() => {

   Vitals.health = 100;
   Vitals.energy = 80;
   Vitals.hunger = 80;
   Vitals.thirst = 80;

   if(Player.spawnPoint && Player.camera){

    Player.camera.position.set(
     Player.spawnPoint.x,
     Player.spawnPoint.y,
     Player.spawnPoint.z
    );

   } else if(Player.camera){

    Player.camera.position.set(
     0,
     2,
     0
    );
   }

   Player.isDead = false;

   UI.refreshHUD();
   Persistence.save();

  }, 2000);
 }
};


// ربط الفحص بتحديث المؤشرات
const originalVitalsUpdate =
 Vitals.update ||
 function(){};

Vitals.update = function(dt) {
 originalVitalsUpdate.call(this, dt);
 Vitals.checkDeath();
};


// 3. نظام القروض البنكية المودرن
const Bank = {

 loan: 0,
 maxLoan: 50000,
 interestRate: 0.1,

 openBankUI: function() {

  let modal = document.getElementById('bankModal');

  if(!modal){

   modal = document.createElement('div');
   modal.id = 'bankModal';
   modal.className = 'panel open';

   document.body.appendChild(modal);
  }

  modal.innerHTML = `
   <div class="card" style="max-width:400px;text-align:center;">

    <h2>بنك الحي - القروض</h2>

    <p style="color:var(--dim);font-size:13px;">
     احصل على سيولة مالية فورية لتطوير مشاريعك وشراء المركبات.
    </p>

    <div style="
     background:rgba(255,255,255,0.03);
     border:1px solid var(--border);
     border-radius:12px;
     padding:15px;
     margin:15px 0;
    ">

     <div style="font-size:12px;color:var(--dim);">
      الدين الحالي المستحق:
     </div>

     <div style="
      font-size:22px;
      color:#e74c3c;
      font-weight:bold;
      margin-top:4px;
     ">
      ${Bank.loan} دج
     </div>

    </div>

    <div class="row">
     <span>مبلغ القرض المطلوب:</span>

     <select id="loanAmountSelect">
      <option value="5000">5,000 دج</option>
      <option value="10000">10,000 دج</option>
      <option value="25000">25,000 دج</option>
      <option value="50000">50,000 دج</option>
     </select>
    </div>

    <button
     class="btn"
     style="
      background:rgba(46,204,113,0.2);
      border-color:#2ecc71;
      color:#2ecc71;
     "
     onclick="Bank.takeLoan()"
    >
     طلب القرض الآن
    </button>

    ${
     Bank.loan > 0
      ? `
       <button
        class="btn"
        style="
         background:rgba(231,76,60,0.2);
         border-color:#e74c3c;
         color:#e74c3c;
        "
        onclick="Bank.repayLoan()"
       >
        تسديد القرض
       </button>
      `
      : ''
    }

    <button
     class="close"
     onclick="
      document
       .getElementById('bankModal')
       .classList
       .remove('open')
     "
    >
     إغلاق
    </button>

   </div>
  `;

  modal.classList.add('open');
 },

 takeLoan: function() {

  const select =
   document.getElementById('loanAmountSelect');

  if(!select) return;

  const amount =
   parseInt(select.value);

  if(Bank.loan > 0){

   alert(
    "يجب عليك تسديد القرض الحالي أولاً قبل طلب قرض جديد!"
   );

   return;
  }

  const totalWithInterest =
   amount +
   (amount * Bank.interestRate);

  Bank.loan = totalWithInterest;

  Economy.cash += amount;

  UI.refreshHUD();
  Persistence.save();

  alert(
   `تم إضافة ${amount} دج لحسابك. ` +
   `المبلغ المستحق للإرجاع مع الفائدة: ` +
   `${totalWithInterest} دج.`
  );

  Bank.openBankUI();
 },

 repayLoan: function() {

  if(Economy.cash < Bank.loan){

   alert(
    "لا تملك المبلغ الكافي لتسديد الدين مع الفائدة!"
   );

   return;
  }

  Economy.cash -= Bank.loan;
  Bank.loan = 0;

  UI.refreshHUD();
  Persistence.save();

  alert(
   "تم تسديد القرض البنكي بالكامل بنجاح!"
  );

  Bank.openBankUI();
 }
};


// 4. نظام الزواج المتطور
const MarriageSystem = {

 isFollowing: false,
 hasBaby: false,
 lastGiftTime: 0,

 giftCooldown:
  2 * 60 * 1000,

 openInteractionMenu: function() {

  if(!Player.married) return;

  let modal =
   document.getElementById('marriageModal');

  if(!modal){

   modal = document.createElement('div');
   modal.id = 'marriageModal';
   modal.className = 'panel open';

   document.body.appendChild(modal);
  }

  const spouseName =
   Player.spouse || "الزوجة";

  const affinity =
   (
    Relationships.state[spouseName]
     ? Relationships.state[spouseName].affinity
     : 50
   );

  modal.innerHTML = `
   <div
    class="card"
    style="max-width:420px;text-align:center;"
   >

    <h2>
     محل إقامتك مع ${spouseName}
    </h2>

    <div style="
     background:rgba(201,162,75,0.08);
     border:1px solid var(--border);
     border-radius:12px;
     padding:12px;
     margin:12px 0;
    ">

     <div style="font-size:13px;">
      درجة المحبة والترابط:
      <b style="color:var(--accent);">
       ${affinity}/100
      </b>
     </div>

     <div style="
      font-size:12px;
      color:var(--dim);
      margin-top:4px;
     ">
      ${
       MarriageSystem.hasBaby
        ? "👶 عندكم طفل يتربى في المنزل"
        : (
          affinity >= 90
           ? "❤️ درجة المحبة ممتازة! يمكنكم إنجاب طفل قريباً"
           : "قدم الورود باستمرار لزيادة الترابط"
        )
      }
     </div>

    </div>

    <button
     class="btn"
     onclick="MarriageSystem.toggleFollow()"
    >
     ${
      MarriageSystem.isFollowing
       ? '🏠 قولي لها: "استناني فالدار"'
       : '🚶‍♂️ قولي لها: "ارواحي معايا"'
     }
    </button>

    <button
     class="btn"
     onclick="MarriageSystem.giveFlowers()"
    >
     🌹 تقديم وردة (كل 2 دقائق)
    </button>

    ${
     affinity >= 90 &&
     !MarriageSystem.hasBaby
      ? `
       <button
        class="btn"
        style="
         background:rgba(155,89,182,0.25);
         border-color:#9b59b6;
        "
        onclick="MarriageSystem.haveBaby()"
       >
        👶 رزق مولود جديد
       </button>
      `
      : ''
    }

    <button
     class="close"
     onclick="
      document
       .getElementById('marriageModal')
       .classList
       .remove('open')
     "
    >
     إغلاق
    </button>

   </div>
  `;

  modal.classList.add('open');
 },

 toggleFollow: function() {

  MarriageSystem.isFollowing =
   !MarriageSystem.isFollowing;

  alert(
   MarriageSystem.isFollowing
    ? "الزوجة الآن ترافقك في تحركاتك."
    : "الزوجة تنتظرك الآن في المنزل."
  );

  Persistence.save();
  MarriageSystem.openInteractionMenu();
 },

 giveFlowers: function() {

  const now = Date.now();

  const timePassed =
   now -
   MarriageSystem.lastGiftTime;

  if(
   timePassed <
   MarriageSystem.giftCooldown
  ){

   const remainingSec =
    Math.ceil(
     (
      MarriageSystem.giftCooldown -
      timePassed
     ) / 1000
    );

   alert(
    `عليك الانتظار ${remainingSec} ثانية قبل إهدائها وردة أخرى!`
   );

   return;
  }

  MarriageSystem.lastGiftTime = now;

  const spouseName =
   Player.spouse || "الزوجة";

  if(Relationships.state[spouseName]){

   Relationships
    .state[spouseName]
    .affinity =
     Math.min(
      100,
      Relationships.state[spouseName].affinity + 10
     );
  }

  alert(
   `قدمت وردة جميلة لـ ${spouseName}! ` +
   `زادت درجة المحبة والترابط بينكما.`
  );

  Persistence.save();
  MarriageSystem.openInteractionMenu();
 },

 haveBaby: function() {

  MarriageSystem.hasBaby = true;

  alert(
   "مبروك! لقد أصبحتما عائلة وسُرزقتما بمولود جديد يعيش معكم في المنزل 👶❤️"
  );

  Persistence.save();
  MarriageSystem.openInteractionMenu();
 }
};
