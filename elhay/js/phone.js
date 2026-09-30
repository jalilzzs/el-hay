/* ============ Phone: Real Smartphone UI & Apps System ============ */
const Phone = { open: false, currentApp: 'home' };

const CHAT_REPLIES = {
 low: ['Who is this?', 'Kinda busy right now.', '...ok.'],
 mid: ['Hey! Good to hear from you.', 'What\'s up?', 'Sure, let\'s catch up soon.'],
 high: ['I was just thinking about you <3', 'Anything for you.', 'Come by whenever.'],
};

Phone.replyTier = function(npcId) { 
  const a = Relationships.state[npcId]?.affinity || 0; 
  return a >= 60 ? 'high' : a >= 25 ? 'mid' : 'low'; 
};

Phone.toggle = function() { Phone.open ? Phone.close() : Phone.openPanel(); };

Phone.openPanel = function() { 
  Phone.open = true; 
  const pPhone = $('pPhone');
  if (pPhone) pPhone.classList.add('open'); 
  Phone.renderHome(); 
};

Phone.close = function() { 
  Phone.open = false; 
  const pPhone = $('pPhone');
  if (pPhone) pPhone.classList.remove('open'); 
};

// الشاشة الرئيسية للتطبيقات (Home Screen Grid)
Phone.renderHome = function() {
  Phone.currentApp = 'home';
  const phoneCard = $('phoneCard');
  if (!phoneCard) return;

  phoneCard.innerHTML = `
    <div id="phoneScreen">
      <!-- Top Status Bar -->
      <div style="height:24px; padding:0 14px; display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#aaa; background:rgba(0,0,0,0.2)">
        <span>12:00</span>
        <span>5G 🔋100%</span>
      </div>

      <!-- App Grid -->
      <div class="phone-home-grid">
        <div class="app-icon" onclick="Phone.openApp('contacts')">
          <div class="app-box" style="background:#2ecc71">💬</div>
          <span class="app-name">Contacts</span>
        </div>
        <div class="app-icon" onclick="Phone.openApp('camera')">
          <div class="app-box" style="background:#e67e22">📸</div>
          <span class="app-name">Camera</span>
        </div>
        <div class="app-icon" onclick="Phone.openApp('video')">
          <div class="app-box" style="background:#e74c3c">📺</div>
          <span class="app-name">El-Hay TV</span>
        </div>
        <div class="app-icon" onclick="Phone.openApp('shop')">
          <div class="app-box" style="background:#3498db">🛒</div>
          <span class="app-name">Market</span>
        </div>
        <div class="app-icon" onclick="Phone.openApp('delivery')">
          <div class="app-box" style="background:#f1c40f">🛵</div>
          <span class="app-name">Delivery</span>
        </div>
        <div class="app-icon" onclick="Phone.openApp('realestate')">
          <div class="app-box" style="background:#9b59b6">🏠</div>
          <span class="app-name">Estate&Auto</span>
        </div>
        <div class="app-icon" onclick="Phone.openApp('weapons')">
          <div class="app-box" style="background:#34495e">🔫</div>
          <span class="app-name">DarkNet</span>
        </div>
      </div>

      <!-- Home Button Bar -->
      <div class="phone-home-bar" style="margin-top:auto;">
        <div class="home-btn-pill" onclick="Phone.close()"></div>
      </div>
    </div>
  `;
};

// فتح أي تطبيق داخل شاشة الهاتف
Phone.openApp = function(appId) {
  Phone.currentApp = appId;
  const phoneCard = $('phoneCard');
  if (!phoneCard) return;

  phoneCard.innerHTML = `
    <div id="phoneScreen">
      <!-- App Header -->
      <div style="height:35px; padding:0 12px; display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.5); border-bottom:1px solid rgba(255,255,255,0.08)">
        <span onclick="Phone.renderHome()" style="cursor:pointer; color:var(--accent); font-size:13px">◀ Home</span>
        <span style="font-size:12px; font-weight:bold; color:var(--text);">${appId.toUpperCase()}</span>
        <span onclick="Phone.close()" style="cursor:pointer; color:#e74c3c; font-size:14px">✖</span>
      </div>

      <!-- App Content Area -->
      <div id="phoneBody" style="flex:1; padding:12px; overflow-y:auto; font-size:13px;"></div>

      <!-- Bottom Home Bar -->
      <div class="phone-home-bar">
        <div class="home-btn-pill" onclick="Phone.renderHome()"></div>
      </div>
    </div>
  `;

  const body = $('phoneBody');
  if (appId === 'contacts') Phone.renderContacts(body);
  else if (appId === 'camera') Phone.renderCamera(body);
  else if (appId === 'video') Phone.renderVideo(body);
  else if (appId === 'shop') Phone.renderShop(body);
  else if (appId === 'delivery') Phone.renderDelivery(body);
  else if (appId === 'realestate') Phone.renderMarket(body);
  else if (appId === 'weapons') Phone.renderWeaponShop(body);
};

Phone.renderContacts = function(body) {
  body.innerHTML = '<h3 style="color:var(--accent);margin-top:0">Messages</h3>';
  NPC_DEFS.forEach(n => {
    const wrap = document.createElement('div'); wrap.style.marginBottom = '10px';
    const btn = document.createElement('button'); btn.className = 'btn sm'; btn.style.width = '100%'; btn.textContent = 'Text ' + n.name;
    const log = document.createElement('div'); log.className = 'chatLog'; log.style.display = 'none';
    btn.onclick = () => {
      log.style.display = log.style.display === 'none' ? 'block' : 'none';
      if (!log.dataset.opened) {
        log.dataset.opened = '1';
        const reply = CHAT_REPLIES[Phone.replyTier(n.id)][Math.floor(Math.random() * 3)];
        log.innerHTML = '<div class="me">Hey, what\'s up?</div><div>' + reply + '</div>';
      }
    };
    wrap.appendChild(btn); wrap.appendChild(log); body.appendChild(wrap);
  });
};

Phone.renderCamera = function(body) {
  body.innerHTML = '<h3 style="color:var(--accent);margin-top:0">Camera</h3>';
  const btn = document.createElement('button'); btn.className = 'btn sm'; btn.textContent = '📸 Take Photo';
  btn.onclick = () => {
    try {
      const dataUrl = World.renderer.domElement.toDataURL('image/png');
      let img = $('photoThumb');
      if (!img) { img = document.createElement('img'); img.id = 'photoThumb'; body.appendChild(img); }
      img.src = dataUrl;
      let link = $('photoDownload');
      if (!link) { link = document.createElement('a'); link.id = 'photoDownload'; link.className = 'btn sm'; link.style.display = 'inline-block'; link.style.marginTop = '6px'; link.textContent = 'Download'; body.appendChild(link); }
      link.href = dataUrl; link.download = 'elhay-photo.png';
    } catch (e) { body.insertAdjacentHTML('beforeend', '<p style="color:var(--dim)">Camera capture failed in this browser.</p>'); }
  };
  body.appendChild(btn);
};

Phone.renderVideo = function(body) {
  body.innerHTML = '<h3 style="color:var(--accent);margin-top:0">El-Hay TV</h3><p style="color:var(--dim)">Live Streaming Channel</p>' +
    '<div style="height:140px;border-radius:12px;background:linear-gradient(135deg,#2a2015,#3d5a6c,#7a5230);background-size:400% 400%;animation:pulse 3s infinite;display:flex;align-items:center;justify-content:center;color:#fff">▶ PLAYING LIVE</div>';
};

Phone.renderDelivery = function(body) {
  body.innerHTML = '<h3 style="color:var(--accent);margin-top:0">Express Delivery</h3>';
  ['water', 'sandwich', 'coffee'].forEach(id => {
    const it = ITEMS[id];
    const row = document.createElement('div'); row.className = 'shopItem';
    row.innerHTML = '<span>' + it.name + ' — $' + (it.price + 10) + '</span>';
    const btn = document.createElement('button'); btn.textContent = 'Order';
    btn.onclick = () => {
      if (Economy.cash < it.price + 10) return;
      Economy.cash -= (it.price + 10); UI.refreshHUD(); btn.disabled = true; btn.textContent = 'On way...';
      setTimeout(() => { Vitals.applyItem(it.effect); UI.refreshHUD(); btn.textContent = 'Delivered ✓'; }, 4000);
    };
    row.appendChild(btn); body.appendChild(row);
  });
};

const PROPERTIES = [
  { id: 'studio', name: 'Studio Apartment', price: 5000, perk: 'Sleep restores energy.' },
  { id: 'flat2', name: '2-Room Flat', price: 15000, perk: 'Sleep restores energy + health.' },
  { id: 'villa', name: 'Villa', price: 35000, perk: 'Sleep restores everything + passive regen.' },
];

Phone.renderMarket = function(body) {
  body.innerHTML = '<h3 style="color:var(--accent);margin-top:0">Real Estate</h3>';
  Player.properties = Player.properties || [];
  PROPERTIES.forEach(p => {
    const owned = Player.properties.includes(p.id);
    const isSpawn = Player.spawnPoint === p.id;
    const row = document.createElement('div'); row.className = 'shopItem';
    row.innerHTML = '<span>' + p.name + ' — $' + p.price + (owned ? ' (Owned)' : '') + '<br><small style="color:var(--dim)">' + p.perk + '</small></span>';
    const btn = document.createElement('button');
    btn.textContent = owned ? (isSpawn ? 'Spawn Set' : 'Set Spawn') : 'Buy';
    btn.disabled = owned ? isSpawn : Economy.cash < p.price;
    btn.onclick = () => {
      if (!owned) { if (Economy.cash >= p.price) { Economy.cash -= p.price; Player.properties.push(p.id); UI.refreshHUD(); } }
      else RealEstate.setSpawn(p.id);
      Phone.openApp('realestate');
    };
    row.appendChild(btn); body.appendChild(row);
  });

  body.insertAdjacentHTML('beforeend', '<h3 style="margin-top:14px;color:var(--accent)">Vehicles</h3>');
  DEALERSHIP.forEach(c => {
    const row = document.createElement('div'); row.className = 'shopItem';
    row.innerHTML = '<span>' + c.name + ' — $' + c.price + '</span>';
    const buyBtn = document.createElement('button'); buyBtn.textContent = 'Buy'; buyBtn.disabled = Economy.cash < c.price;
    buyBtn.onclick = () => { if (Vehicles.buy(c.id)) { UI.refreshHUD(); Phone.openApp('realestate'); } };
    row.appendChild(buyBtn); body.appendChild(row);
  });

  body.insertAdjacentHTML('beforeend', '<h3 style="margin-top:14px;color:var(--accent)">Garage</h3>');
  Vehicles.owned.forEach((v, i) => {
    const row = document.createElement('div'); row.className = 'shopItem';
    const isCurrent = v.mesh === World.playerCar;
    row.innerHTML = '<span>' + v.name + (isCurrent ? ' (Active)' : '') + '</span>';
    const btn = document.createElement('button'); btn.textContent = 'Summon'; btn.disabled = isCurrent;
    btn.onclick = () => { Garage.summon(i); Phone.close(); };
    row.appendChild(btn); body.appendChild(row);
  });
};

Phone.renderWeaponShop = function(body) {
  body.innerHTML = '<h3 style="color:var(--accent);margin-top:0">Black Market</h3>';
  [{ id: 'pistol', price: 800, ammoPrice: 5 }, { id: 'rifle', price: 2500, ammoPrice: 8 }].forEach(entry => {
    const w = ARSENAL[entry.id];
    const row = document.createElement('div'); row.className = 'shopItem';
    const owned = Weapons.owned.includes(entry.id);
    row.innerHTML = '<span>' + w.name + (owned ? ' (Owned)' : ' — $' + entry.price) + '</span>';
    const btn = document.createElement('button'); btn.textContent = owned ? 'Buy Ammo' : 'Buy';
    btn.onclick = () => {
      if (!owned) { if (Economy.cash < entry.price) return; Economy.cash -= entry.price; Weapons.buy(entry.id, 20); }
      else { const cost = entry.ammoPrice * 20; if (Economy.cash < cost) return; Economy.cash -= cost; Weapons.buy(entry.id, 20); }
      UI.refreshHUD(); Weapons.refreshHUD(); Phone.openApp('weapons');
    };
    row.appendChild(btn); body.appendChild(row);
  });
};

Phone.renderShop = function(body) {
  body.innerHTML = '<h3 style="color:var(--accent);margin-top:0">General Store</h3>';
  ['water', 'sandwich', 'soap', 'flowers'].forEach(id => {
    const it = ITEMS[id];
    const row = document.createElement('div'); row.className = 'shopItem';
    row.innerHTML = '<span>' + it.name + ' — $' + it.price + '</span>';
    const btn = document.createElement('button'); btn.textContent = 'Buy'; btn.disabled = Economy.cash < it.price;
    btn.onclick = () => { if (Economy.buy(id)) { UI.refreshHUD(); Phone.openApp('shop'); } };
    row.appendChild(btn); body.appendChild(row);
  });
};

Phone.initTabs = function() {
  const phoneBtn = $('phoneBtn');
  if (phoneBtn) {
    phoneBtn.onclick = Phone.toggle;
    phoneBtn.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); Phone.toggle(); }, { passive: false });
  }
};
