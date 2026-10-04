/* iOS Safari has no Pointer Lock API: PointerLockControls.unlock() would throw
   "exitPointerLock is not a function" (this froze the intro cutscene). */
if(!document.exitPointerLock) document.exitPointerLock=function(){};
if(!Element.prototype.requestPointerLock) Element.prototype.requestPointerLock=function(){};

/* ============ UI: i18n, Modern Settings, Glassmorphic Menus Wiring ============ */
const GOOGLE_CLIENT_ID="", SUPABASE_URL="", SUPABASE_ANON_KEY="";
const LEGAL_DOCS={tos:"PLACEHOLDER Terms of Service.",priv:"PLACEHOLDER Privacy Policy.",sup:"PLACEHOLDER support@example.com"};
const STORY_LOCATIONS={highSchoolName:"PLACEHOLDER_SCHOOL",prisonName:"PLACEHOLDER_PRISON"};
const ASSET_PATHS={audio:"public/audio/",bill:"public/textures/billboards/",models:"public/models/"};

const I18N={
ar:{dir:"rtl",loading:"جاري التحميل...",title:"الحي",sub:"CORE BUILD",newGame:"لعبة جديدة",cont:"استمرار اللعب",set:"الإعدادات",sup:"الدعم",priv:"الخصوصية",term:"الشروط",close:"إغلاق",lang:"اللغة",qual:"جودة الجرافيك",fps:"حد الإطارات (FPS)",showfps:"عرض FPS",ctrl:"نمط التحكم",skip:"تخطي",enterCar:"E: دخول السيارة",exitCar:"E: خروج",enterBld:"E: دخول",exitBld:"E: خروج",walk:"سير",drive:"قيادة",resume:"استئناف اللعب",restart:"إعادة التشغيل",exitMenu:"القائمة الرئيسية",tabGraphics:"الجرافيك",tabAudio:"الأداء",tabCtrl:"التحكم واللغة",
cs1:"الساعة الواحدة ظهرًا.",cs2:"يتوجه نحو السيارة.",cs3:"الراديو يبث أغنية جزائرية.",cs4:"يتوقف لأخذ ابن عمه.",cs5:"حاجز تفتيش.",cs6:"يعثرون على شيء لا يخصه.",cs7:"بعد خمس سنوات...",cs8:"يخرج من بوابة السجن."},
en:{dir:"ltr",loading:"Loading...",title:"El-Hay",sub:"CORE BUILD",newGame:"New Game",cont:"Continue",set:"Settings",sup:"Support",priv:"Privacy",term:"Terms",close:"Close",lang:"Language",qual:"Graphics Quality",fps:"FPS Limit",showfps:"Show FPS",ctrl:"Control Scheme",skip:"Skip",enterCar:"E: Enter Car",exitCar:"E: Exit",enterBld:"E: Enter",exitBld:"E: Exit",walk:"Walking",drive:"Driving",resume:"Resume",restart:"Restart",exitMenu:"Main Menu",tabGraphics:"Graphics",tabAudio:"Performance",tabCtrl:"Controls & Lang",
cs1:"1:00 PM.",cs2:"He heads to the car.",cs3:"An old Algerian song plays.",cs4:"A stop to pick up his cousin.",cs5:"A checkpoint.",cs6:"They find something that isn't his.",cs7:"Five years later...",cs8:"He walks out the prison gate."},
fr:{dir:"ltr",loading:"Chargement...",title:"El-Hay",sub:"CORE BUILD",newGame:"Nouvelle partie",cont:"Continuer",set:"Paramètres",sup:"Assistance",priv:"Confidentialité",term:"Conditions",close:"Fermer",lang:"Langue",qual:"Qualité Graphique",fps:"Limite FPS",showfps:"Afficher FPS",ctrl:"Contrôles",skip:"Passer",enterCar:"E: Entrer",exitCar:"E: Sortir",enterBld:"E: Entrer",exitBld:"E: Sortir",walk:"Marche",drive:"Conduite",resume:"Reprendre",restart:"Recommencer",exitMenu:"Menu Principal",tabGraphics:"Graphismes",tabAudio:"Performance",tabCtrl:"Contrôles & Langue",
cs1:"13h00.",cs2:"Il va vers la voiture.",cs3:"Une vieille chanson passe.",cs4:"Il récupère son cousin.",cs5:"Un barrage.",cs6:"Ils trouvent un objet qui n'est pas à lui.",cs7:"Cinq ans plus tard...",cs8:"Il sort de la prison."}
};

const S={
  lang:localStorage.getItem('elhay_lang')||'ar',
  qual:localStorage.getItem('elhay_qual')||'med',
  fpsLimit:parseInt(localStorage.getItem('elhay_fps')||'60'),
  showFps:localStorage.getItem('elhay_showfps')==='true',
  ctrl:localStorage.getItem('elhay_ctrl')||'wasd'
};

const $=id=>document.getElementById(id);
function t(k){return (I18N[S.lang]&&I18N[S.lang][k])||I18N['ar'][k]||k}

const UI={};

UI.dom={
 hud:$('hud'),prompt:$('prompt'),crosshair:$('crosshair'),loading:$('loading'),lbFill:$('lbFill'),lbLabel:$('lbLabel'),
 menu:$('menu'),mTitle:$('mTitle'),mSub:$('mSub'),bNew:$('bNew'),bCont:$('bCont'),bSet:$('bSet'),bSup:$('bSup'),bPriv:$('bPriv'),bTerm:$('bTerm'),
 pSettings:$('pSettings'),sTitle:$('sTitle'),lLang:$('lLang'),lQual:$('lQual'),lFps:$('lFps'),lShow:$('lShow'),lCtrl:$('lCtrl'),sClose:$('sClose'),
 selLang:$('selLang'),selQual:$('selQual'),selFps:$('selFps'),chkFps:$('chkFps'),selCtrl:$('selCtrl'),
 pLegal:$('pLegal'),lgTitle:$('lgTitle'),lgBody:$('lgBody'),lgClose:$('lgClose'),
 pShop:$('pShop'),
 pauseBtn:$('pauseBtn')
};

UI.applyLang=function(){
 const d=UI.dom;

 document.documentElement.lang=S.lang;
 document.documentElement.dir=I18N[S.lang]?.dir || 'rtl';

 if(d.mTitle) d.mTitle.textContent=t('title');
 if(d.mSub) d.mSub.textContent=t('sub');
 if(d.bNew) d.bNew.textContent=t('newGame');
 if(d.bCont) d.bCont.textContent=t('cont');
 if(d.bSet) d.bSet.textContent=t('set');
 if(d.bSup) d.bSup.textContent=t('sup');
 if(d.bPriv) d.bPriv.textContent=t('priv');
 if(d.bTerm) d.bTerm.textContent=t('term');

 if(d.sTitle) d.sTitle.textContent=t('set');
 if(d.lLang) d.lLang.textContent=t('lang');
 if(d.lQual) d.lQual.textContent=t('qual');
 if(d.lFps) d.lFps.textContent=t('fps');
 if(d.lShow) d.lShow.textContent=t('showfps');
 if(d.lCtrl) d.lCtrl.textContent=t('ctrl');
 if(d.sClose) d.sClose.textContent=t('close');
 if(d.lgClose) d.lgClose.textContent=t('close');

 localStorage.setItem('elhay_lang',S.lang);

 const skipBtn=$('csSkip');
 if(skipBtn) skipBtn.textContent=t('skip');
};

UI.init=function(onNewGame,onContinue){
 const d=UI.dom;

 if(d.selLang) d.selLang.value=S.lang;
 if(d.selQual) d.selQual.value=S.qual;
 if(d.selFps) d.selFps.value=String(S.fpsLimit);
 if(d.chkFps) d.chkFps.checked=S.showFps;
 if(d.selCtrl) d.selCtrl.value=S.ctrl;

 UI.applyLang();

 if(d.hud) d.hud.style.display=S.showFps?'block':'none';

 if(d.selLang){
   d.selLang.onchange=e=>{
     S.lang=e.target.value;
     UI.applyLang();
   };
 }

 if(d.selQual){
   d.selQual.onchange=e=>{
     S.qual=e.target.value;
     localStorage.setItem('elhay_qual',S.qual);
     if(window.World&&World.applyQuality) World.applyQuality();
   };
 }

 if(d.selFps){
   d.selFps.onchange=e=>{
     S.fpsLimit=parseInt(e.target.value);
     localStorage.setItem('elhay_fps',S.fpsLimit);
   };
 }

 if(d.chkFps){
   d.chkFps.onchange=e=>{
     S.showFps=e.target.checked;
     localStorage.setItem('elhay_showfps',S.showFps);
     if(d.hud) d.hud.style.display=S.showFps?'block':'none';
   };
 }

 if(d.selCtrl){
   d.selCtrl.onchange=e=>{
     S.ctrl=e.target.value;
     localStorage.setItem('elhay_ctrl',S.ctrl);
   };
 }

 if(d.bSet){
   d.bSet.onclick=()=>{
     if(d.pSettings) d.pSettings.classList.add('open');
   };
 }

 if(d.sClose){
   d.sClose.onclick=()=>{
     if(d.pSettings) d.pSettings.classList.remove('open');
   };
 }

 function legal(titleKey,body){
   if(d.lgTitle) d.lgTitle.textContent=t(titleKey);
   if(d.lgBody) d.lgBody.textContent=body;
   if(d.pLegal) d.pLegal.classList.add('open');
 }

 if(d.bSup) d.bSup.onclick=()=>legal('sup',LEGAL_DOCS.sup);
 if(d.bPriv) d.bPriv.onclick=()=>legal('priv',LEGAL_DOCS.priv);
 if(d.bTerm) d.bTerm.onclick=()=>legal('term',LEGAL_DOCS.tos);

 if(d.lgClose){
   d.lgClose.onclick=()=>{
     if(d.pLegal) d.pLegal.classList.remove('open');
   };
 }

 /* New Game — نفس منطق التشغيل الأصلي */
 if(d.bNew){
   d.bNew.onclick=()=>{
     if(d.menu) d.menu.style.display='none';
     if(typeof onNewGame==='function') onNewGame();
   };
 }

 /* Continue — لا يبدأ إلا إذا كان هناك Save */
 if(d.bCont){
   d.bCont.onclick=()=>{
     if(!localStorage.getItem('elhay_save')) return;
     if(d.menu) d.menu.style.display='none';
     if(typeof onContinue==='function') onContinue();
   };
 }
};

/* ============ Pause Menu Toggle ============ */
UI.togglePauseMenu=function(){
 const menu=UI.dom.menu;

 if(!menu) return;

 if(menu.style.display==='flex'){
   menu.style.display='none';
 }else{
   menu.style.display='flex';
 }
};

/* ============ Shops / Relationships / Inventory panels ============ */
const shopTitleEl=$('shopTitle'), shopListEl=$('shopList');

function row(label,btnLabel,onClick,disabled){
 const r=document.createElement('div');
 r.className='shopItem';

 const span=document.createElement('span');
 span.textContent=label;
 r.appendChild(span);

 const btn=document.createElement('button');
 btn.textContent=btnLabel;
 btn.disabled=!!disabled;
 btn.onclick=onClick;
 r.appendChild(btn);

 return r;
}

UI.openShop=function(id){
 if(!shopListEl) return;

 shopListEl.innerHTML='';

 if(id==='store'||id==='cafe'){
   if(shopTitleEl) shopTitleEl.textContent=id==='store'?'Store':'Café';

   const ids=id==='store'
     ? ['water','sandwich','soap','flowers']
     : ['coffee','sandwich','water'];

   ids.forEach(k=>{
     const it=ITEMS[k];

     if(!it) return;

     shopListEl.appendChild(
       row(
         it.name+' — $'+it.price,
         'Buy',
         ()=>{
           if(window.Economy&&Economy.buy(k)) UI.refreshHUD();
         }
       )
     );
   });

 }else if(id==='dealership'){
   if(shopTitleEl) shopTitleEl.textContent='Dealership';

   if(window.DEALERSHIP){
     DEALERSHIP.forEach(c=>{
       shopListEl.appendChild(
         row(
           c.name+' — $'+c.price,
           'Buy',
           ()=>{
             if(window.Vehicles&&Vehicles.buy(c.id)) UI.refreshHUD();
           }
         )
       );
     });
   }

   if(window.Vehicles&&Vehicles.owned){
     Vehicles.owned.forEach((v,i)=>{
       if(v.mesh!==World.playerCar){
         shopListEl.appendChild(
           row(
             'Sell: '+v.name,
             'Sell',
             ()=>{
               if(Vehicles.sell(i)) UI.openShop('dealership');
               UI.refreshHUD();
             }
           )
         );
       }
     });
   }

 }else if(id==='drivingSchool'){
   if(shopTitleEl) shopTitleEl.textContent='Driving School';

   const held=!!(window.License&&License.has);

   shopListEl.appendChild(
     row(
       'License status: '+(held?'Held':'None'),
       held?'✔':'—',
       ()=>{},
       true
     )
   );

   shopListEl.appendChild(
     row(
       'Express license — $'+DrivingTest.expressPrice,
       'Buy',
       ()=>{
         if(DrivingTest.expressBuy()){
           UI.refreshHUD();
           UI.openShop('drivingSchool');
         }
       },
       held||Economy.cash<DrivingTest.expressPrice
     )
   );

   shopListEl.appendChild(
     row(
       'Practical test — $'+DrivingTest.price,
       'Start Test',
       ()=>{
         if(Economy.cash<DrivingTest.price) return;
         Economy.cash-=DrivingTest.price;
         UI.refreshHUD();
         DrivingTest.begin();
       },
       held||Economy.cash<DrivingTest.price
     )
   );

 }else if(id==='cityHall'){
   if(shopTitleEl) shopTitleEl.textContent='City Hall';

   shopListEl.appendChild(
     row(
       'Marital status: '+
       (
         window.Player&&Player.married
         ? ('Married to '+(NPC_DEFS.find(n=>n.id===Player.spouse)||{}).name)
         : 'Single'
       ),
       'Divorce',
       ()=>{
         if(window.Relationships&&Relationships.divorce()) UI.openShop('cityHall');
         UI.refreshHUD();
       },
       !(window.Player&&Player.married)
     )
   );

 }else if(id==='gunshop'){
   if(shopTitleEl) shopTitleEl.textContent='Gun Shop';

   const licensed=window.Docs&&Docs.has('gunLicense');

   if(!licensed){
     shopListEl.appendChild(
       row(
         '🔒 A Gun License is required. Buy one at the Police Station (office desk).',
         'Locked',
         ()=>{},
         true
       )
     );
   }

   WEAPON_STOCK.forEach(entry=>{
     const w=ARSENAL[entry.id];
     const owned=Weapons.owned.includes(entry.id);
     const isGun=w.type==='gun';

     shopListEl.appendChild(
       row(
         w.name+(owned?' (Owned)':' — $'+entry.price)+(isGun?'':' [melee]'),
         owned?(isGun?'Buy Ammo':'Owned'):'Buy',
         ()=>{
           if(!licensed) return;

           if(!owned){
             if(Economy.cash<entry.price) return;

             Economy.cash-=entry.price;
             Weapons.buy(entry.id,isGun?w.maxAmmo*2:0);
           }else if(isGun){
             const cost=entry.ammoPrice*20;

             if(Economy.cash<cost) return;

             Economy.cash-=cost;
             Weapons.buy(entry.id,20);
           }

           UI.refreshHUD();
           Weapons.refreshHUD();
           UI.openShop('gunshop');
         },
         !licensed||(owned&&!isGun)
       )
     );
   });

 }else if(id==='pharmacy'||id==='supermarket'){
   if(shopTitleEl) shopTitleEl.textContent=id==='pharmacy'?'Pharmacy':'Supermarket';

   const list=id==='pharmacy'
     ? ['bandage','painkillers','vitamins','firstaid','water']
     : ['water','juice','sandwich','soap','coffee'];

   list.forEach(k=>{
     const it=ITEMS[k];
     if(!it) return;
     shopListEl.appendChild(
       row(
         it.name+' — $'+it.price,
         'Buy',
         ()=>{
           if(Economy.buy(k)) UI.refreshHUD();
         }
       )
     );
   });

 }else if(id==='policeDesk'){
   if(shopTitleEl) shopTitleEl.textContent='Police Station — Licensing Desk';

   const has=window.Docs&&Docs.has('gunLicense');
   const hasID=window.Docs&&Docs.has('idCard');
   const price=window.GUN_LICENSE_PRICE||1500;

   shopListEl.appendChild(
     row(
       'Gun License — $'+price+(hasID?'':'  (ID Card required)'),
       has?'Owned':'Buy',
       ()=>{
         if(has||!hasID||Economy.cash<price) return;
         Economy.cash-=price;
         Docs.give('gunLicense');
         UI.refreshHUD();
         UI.openShop('policeDesk');
       },
       has||!hasID||Economy.cash<price
     )
   );
 }

 if(UI.dom.pShop){
   UI.dom.pShop.classList.add('open');
 }
};

function d0Close(){
 const p=$('pShop');
 if(p) p.classList.remove('open');
}

UI.openRelationship=function(npcId){
 const def=NPC_DEFS.find(n=>n.id===npcId);
 const st=Relationships.state[npcId];

 if(!def||!st) return;

 if(shopTitleEl){
   shopTitleEl.textContent=
     def.name+' — Affinity '+Math.round(st.affinity)+'%';
 }

 if(!shopListEl) return;

 shopListEl.innerHTML='';

 shopListEl.appendChild(
   row(
     'Talk',
     'Talk',
     ()=>{
       Relationships.talkSimple(npcId);
       MissionSystem.notifyTalk(npcId);
       UI.openRelationship(npcId);
     }
   )
 );

 shopListEl.appendChild(
   row(
     'Give Flowers',
     'Gift',
     ()=>{
       if(Relationships.gift(npcId,'flowers')) UI.openRelationship(npcId);
       UI.refreshHUD();
     },
     !Economy.inventory.find(i=>i.id==='flowers')
   )
 );

 if(npcId!=='sofia') shopListEl.appendChild(
   row(
     'Invite for a date ($20)',
     'Date',
     ()=>{
       if(Relationships.dateAtCafe(npcId)) UI.openRelationship(npcId);
       UI.refreshHUD();
     }
   )
 );

 shopListEl.appendChild(
   row(
     'Propose marriage',
     'Propose',
     ()=>{
       if(Relationships.propose(npcId)) UI.openRelationship(npcId);
     },
     st.affinity<80||Player.married
   )
 );

 const p=$('pShop');
 if(p) p.classList.add('open');
};

UI.openInventory=function(){
 if(shopTitleEl) shopTitleEl.textContent='المحفظة / Inventory';

 if(!shopListEl) return;

 shopListEl.innerHTML='';

 if(!window.Economy||Economy.inventory.length===0){

   shopListEl.appendChild(
     row(
       'فارغة / Empty',
       '',
       ()=>{},
       true
     )
   );

 }else{

   Economy.inventory.forEach(line=>{
     const it=ITEMS[line.id];

     if(!it) return;

     const r=row(
       it.name+' x'+line.qty,
       'استعمال',
       ()=>{
         Economy.useItem(line.id);
         UI.refreshHUD();
         UI.openInventory();
       }
     );

     const sellBtn=document.createElement('button');
     sellBtn.textContent='بيع';
     sellBtn.className='sm-btn';

     sellBtn.onclick=()=>{
       Economy.sellItem(line.id);
       UI.refreshHUD();
       UI.openInventory();
     };

     if(!it.doc) r.appendChild(sellBtn);
     shopListEl.appendChild(r);
   });
 }

 const p=$('pShop');
 if(p) p.classList.add('open');
};

UI.refreshHUD=function(){
 const c=$('cashBox');

 if(c&&window.Economy){
   c.textContent='$'+Economy.cash;
 }

 if(window.Vitals&&typeof Vitals.refreshHUD==='function'){
   Vitals.refreshHUD();
 }
};

UI.initExtras=function(){

 const sClose=$('shopClose');

 if(sClose){
   sClose.onclick=()=>{
     const shop=$('pShop');
     if(shop) shop.classList.remove('open');
   };
 }

 const inv=$('invBtn');

 if(inv){
   inv.onclick=UI.openInventory;

   inv.addEventListener(
     'touchstart',
     e=>{
       e.preventDefault();
       e.stopPropagation();
       UI.openInventory();
     },
     {passive:false}
   );
 }

 const pBtn=$('pauseBtn');

 if(pBtn){
   pBtn.onclick=UI.togglePauseMenu;

   pBtn.addEventListener(
     'touchstart',
     e=>{
       e.preventDefault();
       e.stopPropagation();
       UI.togglePauseMenu();
     },
     {passive:false}
   );
 }

 /*
  * Police buttons:
  * المشروع يستعمل PoliceAI وليس Police.
  * نستعمل فحص آمن حتى لا يتوقف main.js إذا لم يكن النظام جاهزاً.
  */
 const polC=$('polComply');
 const polP=$('polPay');
 const polF=$('polFlee');

 const policeSystem=
   typeof PoliceAI!=='undefined'
   ? PoliceAI
   : null;

 if(polC){
   polC.onclick=()=>{
     if(policeSystem&&typeof policeSystem.comply==='function'){
       policeSystem.comply();
     }
   };
 }

 if(polP){
   polP.onclick=()=>{
     if(policeSystem&&typeof policeSystem.payFine==='function'){
       policeSystem.payFine();
     }
   };
 }

 if(polF){
   polF.onclick=()=>{
     if(policeSystem&&typeof policeSystem.flee==='function'){
       policeSystem.flee();
     }
   };
 }

 if($('vitalsBox')){
   $('vitalsBox').style.display='block';
 }

 if($('cashBox')){
   $('cashBox').style.display='block';
 }

 if(inv){
   inv.style.display='flex';
 }

 if(!window.IS_TOUCH){
   addEventListener('keydown',e=>{
     if(e.code==='KeyI'){
       UI.openInventory();
     }
   });
 }

 const m=$('minimap');

 if(m){
   m.style.display='block';
   m.style.cursor='pointer';

   m.onclick=()=>{
     if(typeof Minimap!=='undefined'&&
        typeof Minimap.toggleFullscreen==='function'){
       Minimap.toggleFullscreen();
     }
   };
 }

 const fClose=$('fullMapClose');

 if(fClose){
   fClose.onclick=()=>{
     if(typeof Minimap!=='undefined'&&
        typeof Minimap.toggleFullscreen==='function'){
       Minimap.toggleFullscreen();
     }
   };
 }
};
