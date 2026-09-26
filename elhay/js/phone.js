/* ============ Phone: contacts/chat, camera, video stub, delivery, market, weapon shop ============ */
const Phone={open:false,tab:'contacts'};
const CHAT_REPLIES={
 low:['Who is this?','Kinda busy right now.','...ok.'],
 mid:['Hey! Good to hear from you.','What\'s up?','Sure, let\'s catch up soon.'],
 high:['I was just thinking about you <3','Anything for you.','Come by whenever.'],
};
Phone.replyTier=function(npcId){ const a=Relationships.state[npcId].affinity; return a>=60?'high':a>=25?'mid':'low'; };

Phone.toggle=function(){ Phone.open?Phone.close():Phone.openPanel(); };
Phone.openPanel=function(){ Phone.open=true; $('pPhone').classList.add('open'); Phone.render('contacts'); };
Phone.close=function(){ Phone.open=false; $('pPhone').classList.remove('open'); };

Phone.render=function(tabId){
 Phone.tab=tabId;
 document.querySelectorAll('.ptab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tabId));
 const body=$('phoneBody'); body.innerHTML='';
 if(tabId==='contacts') Phone.renderContacts(body);
 else if(tabId==='camera') Phone.renderCamera(body);
 else if(tabId==='video') Phone.renderVideo(body);
 else if(tabId==='delivery') Phone.renderDelivery(body);
 else if(tabId==='realestate') Phone.renderMarket(body);
 else if(tabId==='weapons') Phone.renderWeaponShop(body);
};

Phone.renderContacts=function(body){
 body.innerHTML='<h3>Contacts</h3>';
 NPC_DEFS.forEach(n=>{
  const wrap=document.createElement('div'); wrap.style.marginBottom='10px';
  const btn=document.createElement('button'); btn.className='btn sm'; btn.textContent='Text '+n.name;
  const log=document.createElement('div'); log.className='chatLog'; log.style.display='none';
  btn.onclick=()=>{
   log.style.display=log.style.display==='none'?'block':'none';
   if(!log.dataset.opened){
    log.dataset.opened='1';
    const reply=CHAT_REPLIES[Phone.replyTier(n.id)][Math.floor(Math.random()*3)];
    log.innerHTML='<div class="me">Hey, what\'s up?</div><div>'+reply+'</div>';
   }
  };
  wrap.appendChild(btn); wrap.appendChild(log); body.appendChild(wrap);
 });
};

Phone.renderCamera=function(body){
 body.innerHTML='<h3>Camera</h3>';
 const btn=document.createElement('button'); btn.className='btn sm'; btn.textContent='📸 Take Photo';
 btn.onclick=()=>{
  try{
   const dataUrl=World.renderer.domElement.toDataURL('image/png');
   let img=$('photoThumb');
   if(!img){ img=document.createElement('img'); img.id='photoThumb'; body.appendChild(img); }
   img.src=dataUrl;
   let link=$('photoDownload');
   if(!link){ link=document.createElement('a'); link.id='photoDownload'; link.className='btn sm'; link.style.display='inline-block';link.style.marginTop='6px'; link.textContent='Download'; body.appendChild(link); }
   link.href=dataUrl; link.download='elhay-photo.png';
  }catch(e){ body.insertAdjacentHTML('beforeend','<p style="color:var(--dim)">Camera capture failed in this browser.</p>'); }
 };
 body.appendChild(btn);
};

Phone.renderVideo=function(body){
 body.innerHTML='<h3>El-Hay TV</h3><p style="color:var(--dim)">Simulated stream (placeholder — swap for a real video element or link when you have content).</p>'+
  '<div style="height:120px;border-radius:8px;background:linear-gradient(135deg,#2a2015,#3d5a6c,#7a5230);background-size:400% 400%;animation:pulse 3s infinite"></div>';
};

Phone.renderDelivery=function(body){
 body.innerHTML='<h3>Delivery</h3>';
 ['water','sandwich','coffee'].forEach(id=>{
  const it=ITEMS[id];
  const row=document.createElement('div'); row.className='shopItem';
  row.innerHTML='<span>'+it.name+' — $'+(it.price+10)+' (delivery fee incl.)</span>';
  const btn=document.createElement('button'); btn.textContent='Order';
  btn.onclick=()=>{
   if(Economy.cash<it.price+10) return;
   Economy.cash-=(it.price+10); UI.refreshHUD(); btn.disabled=true; btn.textContent='On the way...';
   setTimeout(()=>{ Vitals.applyItem(it.effect); UI.refreshHUD(); btn.textContent='Delivered ✓'; },4000);
  };
  row.appendChild(btn); body.appendChild(row);
 });
};

const PROPERTIES=[{id:'studio',name:'Studio Apartment',price:5000},{id:'flat2',name:'2-Room Flat',price:15000}];
Phone.renderMarket=function(body){
 body.innerHTML='<h3>Real Estate & Vehicles</h3><p style="color:var(--dim);font-size:12px">Property ownership is tracked but does not yet unlock gameplay perks — flagged as a stub for a future pass.</p>';
 Player.properties=Player.properties||[];
 PROPERTIES.forEach(p=>{
  const owned=Player.properties.includes(p.id);
  const row=document.createElement('div'); row.className='shopItem';
  row.innerHTML='<span>'+p.name+' — $'+p.price+(owned?' (Owned)':'')+'</span>';
  const btn=document.createElement('button'); btn.textContent='Buy'; btn.disabled=owned||Economy.cash<p.price;
  btn.onclick=()=>{ if(Economy.cash>=p.price&&!owned){ Economy.cash-=p.price; Player.properties.push(p.id); UI.refreshHUD(); Phone.render('realestate'); } };
  row.appendChild(btn); body.appendChild(row);
 });
 body.insertAdjacentHTML('beforeend','<h3 style="margin-top:16px">Vehicles</h3>');
 DEALERSHIP.forEach(c=>{
  const row=document.createElement('div'); row.className='shopItem';
  row.innerHTML='<span>'+c.name+' — $'+c.price+'</span>';
  const btn=document.createElement('button'); btn.textContent='Buy'; btn.disabled=Economy.cash<c.price;
  btn.onclick=()=>{ if(Vehicles.buy(c.id)){ UI.refreshHUD(); Phone.render('realestate'); } };
  row.appendChild(btn); body.appendChild(row);
 });
};

Phone.renderWeaponShop=function(body){
 body.innerHTML='<h3>Clandestine Shop</h3><p style="color:var(--dim);font-size:12px">Fictional in-game items only.</p>';
 [{id:'pistol',price:800,ammoPrice:5},{id:'rifle',price:2500,ammoPrice:8}].forEach(entry=>{
  const w=ARSENAL[entry.id];
  const row=document.createElement('div'); row.className='shopItem';
  const owned=Weapons.owned.includes(entry.id);
  row.innerHTML='<span>'+w.name+(owned?' (Owned)':' — $'+entry.price)+'</span>';
  const btn=document.createElement('button'); btn.textContent=owned?'Buy Ammo x20':'Buy';
  btn.onclick=()=>{
   if(!owned){ if(Economy.cash<entry.price) return; Economy.cash-=entry.price; Weapons.buy(entry.id,20); }
   else{ const cost=entry.ammoPrice*20; if(Economy.cash<cost) return; Economy.cash-=cost; Weapons.buy(entry.id,20); }
   UI.refreshHUD(); Weapons.refreshHUD(); Phone.render('weapons');
  };
  row.appendChild(btn); body.appendChild(row);
 });
};

Phone.initTabs=function(){
 document.querySelectorAll('.ptab').forEach(b=>b.onclick=()=>Phone.render(b.dataset.tab));
 $('phoneClose').onclick=Phone.close;
 $('phoneBtn').onclick=Phone.toggle;
};
