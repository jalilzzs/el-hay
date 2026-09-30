/* ============ UI: i18n, settings, menu/settings/legal wiring ============ */
const GOOGLE_CLIENT_ID="", SUPABASE_URL="", SUPABASE_ANON_KEY="";
const LEGAL_DOCS={tos:"PLACEHOLDER Terms of Service.",priv:"PLACEHOLDER Privacy Policy.",sup:"PLACEHOLDER support@example.com"};
const STORY_LOCATIONS={highSchoolName:"PLACEHOLDER_SCHOOL",prisonName:"PLACEHOLDER_PRISON"};
const ASSET_PATHS={audio:"public/audio/",bill:"public/textures/billboards/",models:"public/models/"};

const I18N={
ar:{dir:"rtl",loading:"جاري التحميل...",title:"الحي",sub:"CORE BUILD",newGame:"بدء لعبة جديدة",cont:"استمرار اللعب",set:"الإعدادات",sup:"الدعم",priv:"الخصوصية",term:"الشروط",close:"إغلاق",lang:"اللغة",qual:"الجودة",fps:"حد FPS",showfps:"عرض FPS",ctrl:"التحكم",skip:"تخطي",enterCar:"E: دخول السيارة",exitCar:"E: خروج",enterBld:"E: دخول",exitBld:"E: خروج",walk:"سير",drive:"قيادة",
cs1:"الساعة الواحدة ظهرًا.",cs2:"يتوجه نحو السيارة.",cs3:"الراديو يبث أغنية جزائرية.",cs4:"يتوقف لأخذ ابن عمه.",cs5:"حاجز تفتيش.",cs6:"يعثرون على شيء لا يخصه.",cs7:"بعد خمس سنوات...",cs8:"يخرج من بوابة السجن."},
en:{dir:"ltr",loading:"Loading...",title:"El-Hay",sub:"CORE BUILD",newGame:"Start New Game",cont:"Continue",set:"Settings",sup:"Support",priv:"Privacy",term:"Terms",close:"Close",lang:"Language",qual:"Quality",fps:"FPS Limit",showfps:"Show FPS",ctrl:"Controls",skip:"Skip",enterCar:"E: Enter Car",exitCar:"E: Exit",enterBld:"E: Enter",exitBld:"E: Exit",walk:"Walking",drive:"Driving",
cs1:"1:00 PM.",cs2:"He heads to the car.",cs3:"An old Algerian song plays.",cs4:"A stop to pick up his cousin.",cs5:"A checkpoint.",cs6:"They find something that isn't his.",cs7:"Five years later...",cs8:"He walks out the prison gate."},
fr:{dir:"ltr",loading:"Chargement...",title:"El-Hay",sub:"CORE BUILD",newGame:"Nouvelle partie",cont:"Continuer",set:"Paramètres",sup:"Assistance",priv:"Confidentialité",term:"Conditions",close:"Fermer",lang:"Langue",qual:"Qualité",fps:"Limite FPS",showfps:"Afficher FPS",ctrl:"Contrôles",skip:"Passer",enterCar:"E: Entrer",exitCar:"E: Sortir",enterBld:"E: Entrer",exitBld:"E: Sortir",walk:"Marche",drive:"Conduite",
cs1:"13h00.",cs2:"Il va vers la voiture.",cs3:"Une vieille chanson passe.",cs4:"Il récupère son cousin.",cs5:"Un barrage.",cs6:"Ils trouvent un objet qui n'est pas à lui.",cs7:"Cinq ans plus tard...",cs8:"Il sort de la prison."},
zh:{dir:"ltr",loading:"加载中...",title:"El-Hay",sub:"CORE BUILD",newGame:"开始新游戏",cont:"继续",set:"设置",sup:"支持",priv:"隐私",term:"条款",close:"关闭",lang:"语言",qual:"画质",fps:"帧率限制",showfps:"显示FPS",ctrl:"控制",skip:"跳过",enterCar:"E: 上车",exitCar:"E: 下车",enterBld:"E: 进入",exitBld:"E: 离开",walk:"步行",drive:"驾驶",
cs1:"下午一点。",cs2:"他走向汽车。",cs3:"收音机播放老歌。",cs4:"他去接表弟。",cs5:"检查站。",cs6:"他们发现了不属于他的东西。",cs7:"五年后...",cs8:"他走出监狱大门。"}};

const S={lang:localStorage.getItem('elhay_lang')||'ar',qual:localStorage.getItem('elhay_qual')||'med',
 fpsLimit:parseInt(localStorage.getItem('elhay_fps')||'60'),showFps:localStorage.getItem('elhay_showfps')==='true',
 ctrl:localStorage.getItem('elhay_ctrl')||'wasd'};

const $=id=>document.getElementById(id);
function t(k){return I18N[S.lang][k]||k}

const UI={};
UI.dom={hud:$('hud'),prompt:$('prompt'),crosshair:$('crosshair'),loading:$('loading'),lbFill:$('lbFill'),lbLabel:$('lbLabel'),
 menu:$('menu'),mTitle:$('mTitle'),mSub:$('mSub'),bNew:$('bNew'),bCont:$('bCont'),bSet:$('bSet'),bSup:$('bSup'),bPriv:$('bPriv'),bTerm:$('bTerm'),
 pSettings:$('pSettings'),sTitle:$('sTitle'),lLang:$('lLang'),lQual:$('lQual'),lFps:$('lFps'),lShow:$('lShow'),lCtrl:$('lCtrl'),sClose:$('sClose'),
 selLang:$('selLang'),selQual:$('selQual'),selFps:$('selFps'),chkFps:$('chkFps'),selCtrl:$('selCtrl'),
 pLegal:$('pLegal'),lgTitle:$('lgTitle'),lgBody:$('lgBody'),lgClose:$('lgClose')};

UI.applyLang=function(){
 const d=UI.dom;
 document.documentElement.lang=S.lang; document.documentElement.dir=I18N[S.lang].dir;
 d.mTitle.textContent=t('title'); d.mSub.textContent=t('sub'); d.bNew.textContent=t('newGame'); d.bCont.textContent=t('cont'); d.bSet.textContent=t('set');
 d.bSup.textContent=t('sup'); d.bPriv.textContent=t('priv'); d.bTerm.textContent=t('term'); d.sTitle.textContent=t('set'); d.lLang.textContent=t('lang');
 d.lQual.textContent=t('qual'); d.lFps.textContent=t('fps'); d.lShow.textContent=t('showfps'); d.lCtrl.textContent=t('ctrl'); d.sClose.textContent=t('close');
 d.lgClose.textContent=t('close'); localStorage.setItem('elhay_lang',S.lang);
 const skipBtn=$('csSkip'); if(skipBtn) skipBtn.textContent=t('skip');
};

UI.init=function(onNewGame,onContinue){
 const d=UI.dom;
 d.selLang.value=S.lang; d.selQual.value=S.qual; d.selFps.value=String(S.fpsLimit); d.chkFps.checked=S.showFps; d.selCtrl.value=S.ctrl;
 UI.applyLang(); d.hud.style.display=S.showFps?'block':'none';
 d.selLang.onchange=e=>{S.lang=e.target.value;UI.applyLang();};
 d.selQual.onchange=e=>{S.qual=e.target.value;localStorage.setItem('elhay_qual',S.qual);World.applyQuality();};
 d.selFps.onchange=e=>{S.fpsLimit=parseInt(e.target.value);localStorage.setItem('elhay_fps',S.fpsLimit);};
 d.chkFps.onchange=e=>{S.showFps=e.target.checked;localStorage.setItem('elhay_showfps',S.showFps);d.hud.style.display=S.showFps?'block':'none';};
 d.selCtrl.onchange=e=>{S.ctrl=e.target.value;localStorage.setItem('elhay_ctrl',S.ctrl);};
 d.bSet.onclick=()=>d.pSettings.classList.add('open'); d.sClose.onclick=()=>d.pSettings.classList.remove('open');
 function legal(titleKey,body){d.lgTitle.textContent=t(titleKey);d.lgBody.textContent=body;d.pLegal.classList.add('open');}
 d.bSup.onclick=()=>legal('sup',LEGAL_DOCS.sup); d.bPriv.onclick=()=>legal('priv',LEGAL_DOCS.priv); d.bTerm.onclick=()=>legal('term',LEGAL_DOCS.tos);
 d.lgClose.onclick=()=>d.pLegal.classList.remove('open');
 d.bNew.onclick=()=>{d.menu.style.display='none';onNewGame();};
 d.bCont.onclick=()=>{ if(!localStorage.getItem('elhay_save')) return; d.menu.style.display='none'; onContinue(); };
};

/* ============ Shops / Relationships / Inventory panels ============ */
const shopTitleEl=$('shopTitle'), shopListEl=$('shopList');
function row(label,btnLabel,onClick,disabled){
 const r=document.createElement('div'); r.className='shopItem';
 const span=document.createElement('span'); span.textContent=label; r.appendChild(span);
 const btn=document.createElement('button'); btn.textContent=btnLabel; btn.disabled=!!disabled; btn.onclick=onClick; r.appendChild(btn);
 return r;
}
UI.openShop=function(id){
 shopListEl.innerHTML='';
 if(id==='store'||id==='cafe'){
  shopTitleEl.textContent=id==='store'?'Store':'Café';
  const ids=id==='store'?['water','sandwich','soap','flowers']:['coffee','sandwich','water'];
  ids.forEach(k=>{const it=ITEMS[k]; shopListEl.appendChild(row(it.name+' — $'+it.price,'Buy',()=>{ if(Economy.buy(k)) UI.refreshHUD(); }));});
 } else if(id==='dealership'){
  shopTitleEl.textContent='Dealership';
  DEALERSHIP.forEach(c=>shopListEl.appendChild(row(c.name+' — $'+c.price,'Buy',()=>{ if(Vehicles.buy(c.id)) UI.refreshHUD(); })));
  Vehicles.owned.forEach((v,i)=>{ if(v.mesh!==World.playerCar) shopListEl.appendChild(row('Sell: '+v.name,'Sell',()=>{ if(Vehicles.sell(i)) UI.openShop('dealership'); UI.refreshHUD(); })); });
 } else if(id==='drivingSchool'){
  shopTitleEl.textContent='Driving School';
  shopListEl.appendChild(row('License status: '+(License.has?'Held':'None'),'Start Test',()=>{ DrivingSchool.start(); d0Close(); },License.has));
 } else if(id==='cityHall'){
  shopTitleEl.textContent='City Hall';
  shopListEl.appendChild(row('Marital status: '+(Player.married?('Married to '+(NPC_DEFS.find(n=>n.id===Player.spouse)||{}).name):'Single'),'Divorce',()=>{ if(Relationships.divorce()) UI.openShop('cityHall'); UI.refreshHUD(); },!Player.married));
 } else if(id==='gunshop'){
  shopTitleEl.textContent='Gun Shop';
  [{id:'pistol',price:800,ammoPrice:5},{id:'rifle',price:2500,ammoPrice:8}].forEach(entry=>{
   const w=ARSENAL[entry.id], owned=Weapons.owned.includes(entry.id);
   shopListEl.appendChild(row(w.name+(owned?' (Owned)':' — $'+entry.price),owned?'Buy Ammo x20':'Buy',()=>{
    if(!owned){ if(Economy.cash<entry.price) return; Economy.cash-=entry.price; Weapons.buy(entry.id,20); }
    else{ const cost=entry.ammoPrice*20; if(Economy.cash<cost) return; Economy.cash-=cost; Weapons.buy(entry.id,20); }
    UI.refreshHUD(); Weapons.refreshHUD(); UI.openShop('gunshop');
   }));
  });
 }
 UI.dom.pShop=UI.dom.pShop||$('pShop'); UI.dom.pShop.classList.add('open');
};
function d0Close(){ $('pShop').classList.remove('open'); }
UI.openRelationship=function(npcId){
 const def=NPC_DEFS.find(n=>n.id===npcId); const st=Relationships.state[npcId];
 shopTitleEl.textContent=def.name+' — Affinity '+Math.round(st.affinity)+'%';
 shopListEl.innerHTML='';
 shopListEl.appendChild(row('Talk','Talk',()=>{ Relationships.talk(npcId); MissionSystem.notifyTalk(npcId); UI.openRelationship(npcId); }));
 shopListEl.appendChild(row('Give Flowers (uses inventory item)','Gift',()=>{ if(Relationships.gift(npcId,'flowers')) UI.openRelationship(npcId); UI.refreshHUD(); }, !Economy.inventory.find(i=>i.id==='flowers')));
 shopListEl.appendChild(row('Invite for a date at the café ($20)','Date',()=>{ if(Relationships.dateAtCafe(npcId)) UI.openRelationship(npcId); UI.refreshHUD(); }));
 shopListEl.appendChild(row('Propose marriage (needs 80% affinity)','Propose',()=>{ if(Relationships.propose(npcId)) UI.openRelationship(npcId); },st.affinity<80||Player.married));
 $('pShop').classList.add('open');
};
UI.openInventory=function(){
 shopTitleEl.textContent='Inventory';
 shopListEl.innerHTML='';
 if(Economy.inventory.length===0) shopListEl.appendChild(row('Empty','',()=>{},true));
 Economy.inventory.forEach(line=>{
  const it=ITEMS[line.id];
  const r=row(it.name+' x'+line.qty,'Use',()=>{ Economy.useItem(line.id); UI.refreshHUD(); UI.openInventory(); });
  const sellBtn=document.createElement('button'); sellBtn.textContent='Sell'; sellBtn.style.marginLeft='6px';
  sellBtn.onclick=()=>{ Economy.sellItem(line.id); UI.refreshHUD(); UI.openInventory(); };
  r.appendChild(sellBtn); shopListEl.appendChild(r);
 });
 $('pShop').classList.add('open');
};
UI.refreshHUD=function(){
 $('cashBox').textContent='$'+Economy.cash;
 Vitals.refreshHUD();
};
UI.initExtras=function(){
 $('shopClose').onclick=()=>$('pShop').classList.remove('open');
 $('invBtn').onclick=UI.openInventory;
 $('invBtn').addEventListener('touchstart',e=>{ e.preventDefault(); e.stopPropagation(); UI.openInventory(); },{passive:false});
 $('polComply').onclick=Police.comply; $('polPay').onclick=Police.payFine; $('polFlee').onclick=Police.flee;
 $('vitalsBox').style.display='block'; $('cashBox').style.display='block'; $('invBtn').style.display='block';
 if(!IS_TOUCH) addEventListener('keydown',e=>{ if(e.code==='KeyI') UI.openInventory(); });
 $('minimap').style.display='block';
 $('minimap').style.cursor='pointer';
 $('minimap').addEventListener('click',()=>Minimap.toggleFullscreen());
 $('fullMapClose').onclick=()=>Minimap.toggleFullscreen();
};
