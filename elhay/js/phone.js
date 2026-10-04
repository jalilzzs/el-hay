/* ============ Phone: Real Smartphone UI & Apps System ============ */
/* ============ Contacts / Dating / Relationship System ============ */

const Phone = {
  open: false,
  currentApp: 'home'
};

/* =========================================================
   BASIC CHAT REPLIES
   ========================================================= */

const CHAT_REPLIES = {
  low: [
    'Who is this?',
    'Kinda busy right now.',
    '...ok.',
    'I don\'t really know you yet.',
    'Maybe we can talk later.'
  ],

  mid: [
    'Hey! Good to hear from you.',
    'What\'s up?',
    'Sure, let\'s catch up soon.',
    'Haha, really?',
    'Tell me more.',
    'That sounds nice.'
  ],

  high: [
    'I was just thinking about you <3',
    'Anything for you.',
    'Come by whenever.',
    'You always know how to make me smile ❤️',
    'I really like talking to you.',
    'I missed you today.'
  ]
};


/* =========================================================
   RELATIONSHIP DATA
   ========================================================= */

const RELATIONSHIP_CONFIG = {
  DATE_COOLDOWN: 7 * 60 * 1000,
  FLOWER_COOLDOWN: 3 * 60 * 1000,
  GIFT_COOLDOWN: 10 * 60 * 1000,

  DATE_AFFINITY: 5,
  FLOWER_AFFINITY: 3,
  GIFT_AFFINITY: 5,

  MARRIAGE_REQUIRED: 80
};


/* =========================================================
   SAFE RELATIONSHIP STATE
   ========================================================= */

Phone.ensureRelationship = function(npcId) {
  if (typeof Relationships === 'undefined') return null;

  if (!Relationships.state) {
    Relationships.state = {};
  }

  if (!Relationships.state[npcId]) {
    Relationships.state[npcId] = {
      affinity: 0,
      relationship: 'stranger',

      following: false,
      married: false,

      proposalPending: false,
      proposalTime: 0,

      lastDateAt: 0,
      lastFlowerAt: 0,
      lastGiftAt: 0,
      lastChatAt: 0,

      dates: 0,
      flowers: 0,
      gifts: 0,
      conversations: 0
    };
  }

  const s = Relationships.state[npcId];

  if (typeof s.affinity !== 'number') s.affinity = 0;
  if (!s.relationship) s.relationship = 'stranger';

  if (typeof s.following !== 'boolean') s.following = false;
  if (typeof s.married !== 'boolean') s.married = false;
  if (typeof s.proposalPending !== 'boolean') s.proposalPending = false;

  if (!s.proposalTime) s.proposalTime = 0;
  if (!s.lastDateAt) s.lastDateAt = 0;
  if (!s.lastFlowerAt) s.lastFlowerAt = 0;
  if (!s.lastGiftAt) s.lastGiftAt = 0;
  if (!s.lastChatAt) s.lastChatAt = 0;

  if (!s.dates) s.dates = 0;
  if (!s.flowers) s.flowers = 0;
  if (!s.gifts) s.gifts = 0;
  if (!s.conversations) s.conversations = 0;

  return s;
};


/* =========================================================
   AFFINITY HELPERS
   ========================================================= */

Phone.getAffinity = function(npcId) {
  const s = Phone.ensureRelationship(npcId);
  return s ? Math.max(0, Math.min(100, Number(s.affinity) || 0)) : 0;
};

Phone.setAffinity = function(npcId, value) {
  const s = Phone.ensureRelationship(npcId);
  if (!s) return 0;

  s.affinity = Math.max(0, Math.min(100, Number(value) || 0));

  Phone.updateRelationshipTier(npcId);

  try {
    if (typeof UI !== 'undefined' && UI.refreshHUD) {
      UI.refreshHUD();
    }
  } catch (e) {}

  return s.affinity;
};

Phone.addAffinity = function(npcId, amount) {
  const current = Phone.getAffinity(npcId);
  return Phone.setAffinity(npcId, current + amount);
};

Phone.updateRelationshipTier = function(npcId) {
  const s = Phone.ensureRelationship(npcId);
  if (!s || s.married) return;

  const a = Phone.getAffinity(npcId);

  if (a >= 80) {
    if (s.relationship === 'stranger' ||
        s.relationship === 'friend' ||
        s.relationship === 'talking') {
      s.relationship = 'dating';
    }
  } else if (a >= 40) {
    if (s.relationship === 'stranger') {
      s.relationship = 'friend';
    }
  } else if (a >= 15) {
    if (s.relationship === 'stranger') {
      s.relationship = 'talking';
    }
  }
};


/* =========================================================
   REPLY TIER
   ========================================================= */

Phone.replyTier = function(npcId) {
  const a = Phone.getAffinity(npcId);
  return a >= 60 ? 'high' : a >= 25 ? 'mid' : 'low';
};


/* =========================================================
   NPC HELPERS
   ========================================================= */

Phone.getNPC = function(npcId) {
  if (typeof NPC_DEFS === 'undefined' || !Array.isArray(NPC_DEFS)) {
    return null;
  }

  return NPC_DEFS.find(n => String(n.id) === String(npcId)) || null;
};

Phone.isFemale = function(npc) {
  if (!npc) return false;

  if (npc.gender) {
    return String(npc.gender).toLowerCase() === 'female' ||
           String(npc.gender).toLowerCase() === 'woman' ||
           String(npc.gender).toLowerCase() === 'girl';
  }

  if (npc.sex) {
    return String(npc.sex).toLowerCase() === 'female' ||
           String(npc.sex).toLowerCase() === 'f';
  }

  return false;
};

Phone.getNPCName = function(npcId) {
  const npc = Phone.getNPC(npcId);
  return npc?.name || 'Unknown';
};


/* =========================================================
   COOLDOWNS
   ========================================================= */

Phone.getCooldown = function(lastTime, cooldown) {
  const now = Date.now();
  const remaining = cooldown - (now - (lastTime || 0));
  return Math.max(0, remaining);
};

Phone.formatCooldown = function(ms) {
  if (ms <= 0) return 'Ready';

  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  return `${seconds}s`;
};


/* =========================================================
   PHONE OPEN / CLOSE
   ========================================================= */

Phone.toggle = function() {
  Phone.open ? Phone.close() : Phone.openPanel();
};

Phone.openPanel = function() {
  Phone.open = true;

  const pPhone = $('pPhone');

  if (pPhone) {
    pPhone.classList.add('open');
  }

  Phone.renderHome();
};

Phone.close = function() {
  Phone.open = false;

  const pPhone = $('pPhone');

  if (pPhone) {
    pPhone.classList.remove('open');
  }
};


/* =========================================================
   PHONE HOME
   ========================================================= */

Phone.renderHome = function() {
  Phone.currentApp = 'home';

  const phoneCard = $('phoneCard');
  if (!phoneCard) return;

  phoneCard.innerHTML = `
    <div id="phoneScreen">

      <div style="
        height:24px;
        padding:0 14px;
        display:flex;
        justify-content:space-between;
        align-items:center;
        font-size:11px;
        color:#aaa;
        background:rgba(0,0,0,0.2)
      ">
        <span id="phoneTime">12:00</span>
        <span>5G 🔋100%</span>
      </div>

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

        <div class="app-icon" onclick="Phone.openApp('jobs')">
          <div class="app-box" style="background:#16a085">💼</div>
          <span class="app-name">Jobs</span>
        </div>

        <div class="app-icon" onclick="Phone.openApp('weapons')">
          <div class="app-box" style="background:#34495e">🔫</div>
          <span class="app-name">DarkNet</span>
        </div>

      </div>

      <div class="phone-home-bar" style="margin-top:auto;">
        <div class="home-btn-pill" onclick="Phone.close()"></div>
      </div>

    </div>
  `;

  Phone.updateHomeTime();
};

Phone.updateHomeTime = function() {
  const el = $('phoneTime');
  if (!el) return;

  const d = new Date();

  el.textContent =
    String(d.getHours()).padStart(2, '0') +
    ':' +
    String(d.getMinutes()).padStart(2, '0');
};


/* =========================================================
   OPEN APP
   ========================================================= */

Phone.openApp = function(appId) {
  Phone.currentApp = appId;

  const phoneCard = $('phoneCard');
  if (!phoneCard) return;

  phoneCard.innerHTML = `
    <div id="phoneScreen">

      <div style="
        height:35px;
        padding:0 12px;
        display:flex;
        justify-content:space-between;
        align-items:center;
        background:rgba(0,0,0,0.5);
        border-bottom:1px solid rgba(255,255,255,0.08)
      ">
        <span
          onclick="Phone.renderHome()"
          style="cursor:pointer;color:var(--accent);font-size:13px"
        >◀ Home</span>

        <span style="
          font-size:12px;
          font-weight:bold;
          color:var(--text)
        ">
          ${appId.toUpperCase()}
        </span>

        <span
          onclick="Phone.close()"
          style="cursor:pointer;color:#e74c3c;font-size:14px"
        >✖</span>
      </div>

      <div
        id="phoneBody"
        style="
          flex:1;
          padding:12px;
          overflow-y:auto;
          font-size:13px;
        "
      ></div>

      <div class="phone-home-bar">
        <div class="home-btn-pill" onclick="Phone.renderHome()"></div>
      </div>

    </div>
  `;

  const body = $('phoneBody');
  if (!body) return;

  if (appId === 'contacts') Phone.renderContacts(body);
  else if (appId === 'camera') Phone.renderCamera(body);
  else if (appId === 'video') Phone.renderVideo(body);
  else if (appId === 'shop') Phone.renderShop(body);
  else if (appId === 'delivery') Phone.renderDelivery(body);
  else if (appId === 'realestate') Phone.renderMarket(body);
  else if (appId === 'weapons') Phone.renderWeaponShop(body);
  else if (appId === 'jobs') Phone.renderJobs(body);
};


/* =========================================================
   CONTACTS
   ========================================================= */

Phone.renderContacts = function(body) {
  body.innerHTML = '';

  const title = document.createElement('h3');
  title.style.cssText = 'color:var(--accent);margin:0 0 8px';
  title.textContent = 'Contacts';

  body.appendChild(title);

  const subtitle = document.createElement('div');
  subtitle.style.cssText = 'color:var(--dim);font-size:11px;margin-bottom:12px';
  subtitle.textContent = 'People you can talk to';

  body.appendChild(subtitle);

  if (typeof NPC_DEFS === 'undefined' || !Array.isArray(NPC_DEFS)) {
    body.insertAdjacentHTML(
      'beforeend',
      '<p style="color:var(--dim)">No contacts available.</p>'
    );
    return;
  }

  NPC_DEFS.forEach(npc => {
    const state = Phone.ensureRelationship(npc.id);

    const row = document.createElement('div');

    row.style.cssText = `
      margin-bottom:9px;
      padding:10px;
      border-radius:12px;
      background:rgba(255,255,255,0.05);
      border:1px solid rgba(255,255,255,0.07);
    `;

    const top = document.createElement('div');

    top.style.cssText = `
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
    `;

    const info = document.createElement('div');

    const name = document.createElement('div');

    name.style.cssText = `
      font-weight:700;
      color:var(--text);
      font-size:14px;
    `;

    name.textContent = npc.name || 'Unknown';

    const relation = document.createElement('div');

    relation.style.cssText = `
      color:var(--dim);
      font-size:10px;
      margin-top:2px;
    `;

    relation.textContent =
      `${Phone.getRelationshipLabel(npc.id)} • ${Phone.getAffinity(npc.id)}%`;

    info.appendChild(name);
    info.appendChild(relation);

    const openBtn = document.createElement('button');

    openBtn.className = 'btn sm';
    openBtn.style.cssText = `
      width:auto;
      min-width:75px;
      margin:0;
    `;

    openBtn.textContent = 'Open';

    openBtn.onclick = function() {
      Phone.openContact(npc.id);
    };

    top.appendChild(info);
    top.appendChild(openBtn);

    row.appendChild(top);
    body.appendChild(row);
  });
};


/* =========================================================
   CONTACT PAGE
   ========================================================= */

Phone.openContact = function(npcId) {
  const body = $('phoneBody');
  if (!body) return;

  const npc = Phone.getNPC(npcId);

  if (!npc) {
    body.innerHTML = '<p>Contact not found.</p>';
    return;
  }

  const state = Phone.ensureRelationship(npcId);
  const affinity = Phone.getAffinity(npcId);

  body.innerHTML = `
    <div style="
      text-align:center;
      padding:4px 0 12px;
    ">

      <div style="
        width:62px;
        height:62px;
        margin:0 auto 8px;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        background:linear-gradient(135deg,#ff6b00,#8e2b00);
        font-size:27px;
      ">
        ${Phone.isFemale(npc) ? '👩' : '👨'}
      </div>

      <div style="
        font-size:18px;
        font-weight:800;
      ">
        ${npc.name || 'Unknown'}
      </div>

      <div style="
        color:var(--dim);
        font-size:11px;
        margin-top:2px;
      ">
        ${Phone.getRelationshipLabel(npcId)}
      </div>

      <div style="
        margin-top:12px;
        height:7px;
        border-radius:20px;
        overflow:hidden;
        background:rgba(255,255,255,0.1);
      ">
        <div style="
          width:${affinity}%;
          height:100%;
          background:linear-gradient(90deg,#ff4d6d,#ff6b00);
          transition:width .3s;
        "></div>
      </div>

      <div style="
        margin-top:5px;
        font-size:11px;
        color:#ff9d00;
      ">
        ❤️ Affection ${affinity}%
      </div>

    </div>

    <div id="contactActions"></div>

    <div
      id="contactConversation"
      style="margin-top:12px"
    ></div>
  `;

  Phone.renderContactActions(npcId);
};


/* =========================================================
   RELATIONSHIP LABEL
   ========================================================= */

Phone.getRelationshipLabel = function(npcId) {
  const s = Phone.ensureRelationship(npcId);

  if (!s) return 'Stranger';

  if (s.married) return 'Married ❤️';
  if (s.proposalPending) return 'Marriage Proposal 💍';

  switch (s.relationship) {
    case 'dating':
      return 'Dating ❤️';

    case 'friend':
      return 'Friend';

    case 'talking':
      return 'Getting to know each other';

    case 'rejected':
      return 'Rejected';

    default:
      return 'Stranger';
  }
};


/* =========================================================
   CONTACT ACTIONS
   ========================================================= */

Phone.renderContactActions = function(npcId) {
  const container = $('contactActions');
  if (!container) return;

  const npc = Phone.getNPC(npcId);
  const state = Phone.ensureRelationship(npcId);

  container.innerHTML = '';

  const actions = [
    {
      label: '💬 Talk',
      action: () => Phone.startConversation(npcId)
    },
    {
      label: '📞 Call',
      action: () => Phone.callContact(npcId)
    },
    ...(npcId === 'sofia' ? [] : [{
      label: '📅 Date',
      action: () => Phone.requestDate(npcId)
    }]),
    {
      label: '🌹 Flowers',
      action: () => Phone.sendFlowers(npcId)
    },
    {
      label: '🎁 Gift',
      action: () => Phone.sendGift(npcId)
    }
  ];

  if (Phone.isFemale(npc)) {
    actions.push({
      label: state?.following ? '❌ Unfollow' : '➕ Follow',
      action: () => Phone.toggleFollow(npcId)
    });

    actions.push({
      label: '💍 Marriage',
      action: () => Phone.proposeMarriage(npcId)
    });
  }

  actions.forEach(item => {
    const btn = document.createElement('button');

    btn.className = 'btn sm';

    btn.style.cssText = `
      width:100%;
      margin-bottom:6px;
    `;

    btn.textContent = item.label;

    btn.onclick = item.action;

    container.appendChild(btn);
  });
};


/* =========================================================
   CONVERSATION SYSTEM
   ========================================================= */

Phone.startConversation = function(npcId) {
  const body = $('phoneBody');
  if (!body) return;

  const npc = Phone.getNPC(npcId);
  if (!npc) return;

  const conversation = $('contactConversation');

  if (!conversation) return;

  const state = Phone.ensureRelationship(npcId);

  state.lastChatAt = Date.now();
  state.conversations++;

  const lines = Phone.generateConversation(npcId);

  conversation.innerHTML = '';

  const title = document.createElement('div');

  title.style.cssText = `
    font-weight:700;
    margin-bottom:8px;
    color:var(--accent);
  `;

  title.textContent = `${npc.name}:`;

  conversation.appendChild(title);

  const message = document.createElement('div');

  message.style.cssText = `
    padding:10px;
    border-radius:12px;
    background:rgba(255,255,255,0.06);
    margin-bottom:10px;
    line-height:1.5;
  `;

  message.textContent = lines.question;

  conversation.appendChild(message);

  const choices = document.createElement('div');

  lines.choices.forEach(choice => {
    const btn = document.createElement('button');

    btn.className = 'btn sm';

    btn.style.cssText = `
      width:100%;
      margin-bottom:6px;
      text-align:right;
    `;

    btn.textContent = choice.text;

    btn.onclick = function() {
      Phone.answerConversation(
        npcId,
        choice,
        choices,
        message,
        conversation
      );
    };

    choices.appendChild(btn);
  });

  conversation.appendChild(choices);
};


/* =========================================================
   CONVERSATION GENERATOR
   ========================================================= */

Phone.generateConversation = function(npcId) {
  const npc = Phone.getNPC(npcId);
  const affinity = Phone.getAffinity(npcId);

  let question = '';

  if (affinity < 20) {
    question = `${npc.name}: Hey... I don't really know you yet. Tell me something about yourself.`;
  } else if (affinity < 50) {
    question = `${npc.name}: So, what have you been doing lately?`;
  } else if (affinity < 80) {
    question = `${npc.name}: I like talking to you. What are you thinking about?`;
  } else {
    question = `${npc.name}: I missed talking to you. What are you doing right now? ❤️`;
  }

  const choices = [
    {
      text: '❤️ "Honestly, I was thinking about you."',
      delta: 3,
      response: 'That\'s actually really sweet... ❤️'
    },
    {
      text: '😊 "Nothing special, just trying to have a good day."',
      delta: 2,
      response: 'I hope your day gets better then.'
    },
    {
      text: '😏 "Why? You miss me already?"',
      delta: 1,
      response: 'Maybe... don\'t get too confident 😏'
    },
    {
      text: '😐 "I\'m busy. We\'ll talk later."',
      delta: -2,
      response: 'Oh... okay. Talk later then.'
    }
  ];

  return {
    question,
    choices
  };
};


/* =========================================================
   CONVERSATION ANSWER
   ========================================================= */

Phone.answerConversation = function(
  npcId,
  choice,
  choicesContainer,
  messageElement,
  conversation
) {
  const npc = Phone.getNPC(npcId);

  if (!npc) return;

  Phone.addAffinity(npcId, choice.delta);

  choicesContainer.innerHTML = '';

  const playerMessage = document.createElement('div');

  playerMessage.style.cssText = `
    padding:8px 10px;
    border-radius:12px;
    background:rgba(255,107,0,0.16);
    margin-bottom:7px;
    text-align:right;
  `;

  playerMessage.textContent = choice.text;

  conversation.appendChild(playerMessage);

  const response = document.createElement('div');

  response.style.cssText = `
    padding:10px;
    border-radius:12px;
    background:rgba(255,255,255,0.06);
    margin-bottom:10px;
    line-height:1.5;
  `;

  response.textContent =
    `${npc.name}: ${choice.response}`;

  conversation.appendChild(response);

  const result = document.createElement('div');

  result.style.cssText = `
    text-align:center;
    color:${choice.delta >= 0 ? '#7dff9a' : '#ff7777'};
    font-size:11px;
    margin-bottom:8px;
  `;

  result.textContent =
    choice.delta > 0
      ? '❤️ She liked that.'
      : choice.delta < 0
        ? '💔 She didn\'t like that.'
        : '😐 No change.';

  conversation.appendChild(result);

  const next = document.createElement('button');

  next.className = 'btn sm';
  next.style.width = '100%';
  next.textContent = 'Continue talking';

  next.onclick = function() {
    Phone.startConversation(npcId);
  };

  conversation.appendChild(next);

  Phone.refreshContactHeader(npcId);
};


/* =========================================================
   REFRESH CONTACT HEADER
   ========================================================= */

Phone.refreshContactHeader = function(npcId) {
  const affinity = Phone.getAffinity(npcId);

  const bars = document.querySelectorAll('#phoneBody [style*="width:"]');

  bars.forEach(bar => {
    if (
      bar.style.background &&
      bar.parentElement &&
      bar.parentElement.style.height === '7px'
    ) {
      bar.style.width = affinity + '%';
    }
  });
};


/* =========================================================
   CALL
   ========================================================= */

Phone.callContact = function(npcId) {
  const npc = Phone.getNPC(npcId);
  if (!npc) return;

  const state = Phone.ensureRelationship(npcId);

  const affinity = Phone.getAffinity(npcId);

  let response;

  if (affinity >= 60) {
    response = `${npc.name}: Hey ❤️ I was happy to see your call.`;
  } else if (affinity >= 25) {
    response = `${npc.name}: Hey! What's going on?`;
  } else {
    response = `${npc.name}: Hello... why are you calling?`;
  }

  state.lastChatAt = Date.now();

  const conversation = $('contactConversation');

  if (!conversation) return;

  conversation.innerHTML = `
    <div style="
      padding:14px;
      border-radius:14px;
      background:rgba(46,204,113,.12);
      text-align:center;
      margin-top:10px;
    ">
      📞 Calling ${npc.name}...
    </div>

    <div style="
      padding:10px;
      margin-top:8px;
      border-radius:12px;
      background:rgba(255,255,255,.06);
    ">
      ${response}
    </div>

    <button
      class="btn sm"
      style="width:100%;margin-top:8px"
      onclick="Phone.addAffinity('${npcId}',1); Phone.openContact('${npcId}')"
    >
      End Call
    </button>
  `;
};


/* =========================================================
   DATE SYSTEM
   ========================================================= */

Phone.requestDate = function(npcId) {
  const npc = Phone.getNPC(npcId);
  if (!npc) return;

  if (npcId === 'sofia') {
    Phone.showContactMessage(npc.name + ': Let\'s just chat, I am not into dates.');
    return;
  }

  const state = Phone.ensureRelationship(npcId);

  const remaining = Phone.getCooldown(
    state.lastDateAt,
    RELATIONSHIP_CONFIG.DATE_COOLDOWN
  );

  if (remaining > 0) {
    Phone.showContactMessage(
      `${npc.name}: You just took me out recently 😅 Try again in ${Phone.formatCooldown(remaining)}.`
    );
    return;
  }

  if (state.married) {
    Phone.showContactMessage(
      `${npc.name}: We're already married ❤️ Let's spend time together at home.`
    );
    return;
  }

  Phone.showDateConfirmation(npcId);
};


Phone.showDateConfirmation = function(npcId) {
  const npc = Phone.getNPC(npcId);
  if (!npc) return;

  const conversation = $('contactConversation');
  if (!conversation) return;

  conversation.innerHTML = `
    <div style="
      padding:13px;
      border-radius:14px;
      background:rgba(255,107,0,.10);
      text-align:center;
    ">
      <div style="font-size:25px">📅</div>

      <div style="
        font-weight:700;
        margin-top:5px;
      ">
        Invite ${npc.name} to a date?
      </div>

      <div style="
        color:var(--dim);
        font-size:11px;
        margin-top:5px;
      ">
        A successful date increases affection by 5%.
      </div>

      <div style="
        display:flex;
        gap:6px;
        margin-top:12px;
      ">
        <button
          class="btn sm"
          style="flex:1"
          onclick="Phone.confirmDate('${npcId}')"
        >
          Yes ❤️
        </button>

        <button
          class="btn sm"
          style="flex:1"
          onclick="Phone.openContact('${npcId}')"
        >
          Cancel
        </button>
      </div>
    </div>
  `;
};


Phone.confirmDate = function(npcId) {
  const npc = Phone.getNPC(npcId);
  if (!npc) return;

  const state = Phone.ensureRelationship(npcId);

  const remaining = Phone.getCooldown(
    state.lastDateAt,
    RELATIONSHIP_CONFIG.DATE_COOLDOWN
  );

  if (remaining > 0) {
    Phone.openContact(npcId);
    return;
  }

  state.lastDateAt = Date.now();
  state.dates++;

  if (state.relationship === 'stranger') {
    state.relationship = 'talking';
  }

  Phone.addAffinity(
    npcId,
    RELATIONSHIP_CONFIG.DATE_AFFINITY
  );

  const conversation = $('contactConversation');

  if (!conversation) return;

  conversation.innerHTML = `
    <div style="
      text-align:center;
      padding:15px;
      border-radius:14px;
      background:rgba(46,204,113,.12);
    ">
      <div style="font-size:30px">❤️</div>

      <div style="
        font-size:16px;
        font-weight:800;
      ">
        Date completed
      </div>

      <div style="
        margin-top:5px;
        color:var(--dim);
      ">
        You went out with ${npc.name}.
      </div>

      <div style="
        margin-top:8px;
        color:#7dff9a;
      ">
        Affection +5%
      </div>

      <div style="
        margin-top:8px;
        color:#aaa;
        font-size:10px;
      ">
        Next date available in 7 minutes.
      </div>

      <button
        class="btn sm"
        style="width:100%;margin-top:10px"
        onclick="Phone.openContact('${npcId}')"
      >
        Continue
      </button>
    </div>
  `;
};


/* =========================================================
   FLOWERS
   ========================================================= */

Phone.sendFlowers = function(npcId) {
  const npc = Phone.getNPC(npcId);
  if (!npc) return;

  const state = Phone.ensureRelationship(npcId);

  const remaining = Phone.getCooldown(
    state.lastFlowerAt,
    RELATIONSHIP_CONFIG.FLOWER_COOLDOWN
  );

  if (remaining > 0) {
    Phone.showContactMessage(
      `${npc.name}: Another bouquet already? 😅 Try again in ${Phone.formatCooldown(remaining)}.`
    );
    return;
  }

  if (typeof Economy !== 'undefined' && Economy.cash < 20) {
    Phone.showContactMessage(
      `${npc.name}: You don't have enough money for flowers.`
    );
    return;
  }

  if (typeof Economy !== 'undefined') {
    Economy.cash -= 20;
  }

  state.lastFlowerAt = Date.now();
  state.flowers++;

  Phone.addAffinity(
    npcId,
    RELATIONSHIP_CONFIG.FLOWER_AFFINITY
  );

  Phone.showContactMessage(
    `${npc.name}: Aww... 🌹 Thank you! That's really sweet ❤️`
  );

  try {
    if (typeof UI !== 'undefined') UI.refreshHUD();
  } catch (e) {}
};


/* =========================================================
   GIFTS
   ========================================================= */

Phone.sendGift = function(npcId) {
  const npc = Phone.getNPC(npcId);
  if (!npc) return;

  const state = Phone.ensureRelationship(npcId);

  const remaining = Phone.getCooldown(
    state.lastGiftAt,
    RELATIONSHIP_CONFIG.GIFT_COOLDOWN
  );

  if (remaining > 0) {
    Phone.showContactMessage(
      `${npc.name}: You already gave me something recently 😄 Try again in ${Phone.formatCooldown(remaining)}.`
    );
    return;
  }

  const giftPrice = 50;

  if (typeof Economy !== 'undefined' && Economy.cash < giftPrice) {
    Phone.showContactMessage(
      `${npc.name}: You need $${giftPrice} for a gift.`
    );
    return;
  }

  if (typeof Economy !== 'undefined') {
    Economy.cash -= giftPrice;
  }

  state.lastGiftAt = Date.now();
  state.gifts++;

  Phone.addAffinity(
    npcId,
    RELATIONSHIP_CONFIG.GIFT_AFFINITY
  );

  Phone.showContactMessage(
    `${npc.name}: You got me a gift? 🎁 Thank you ❤️`
  );

  try {
    if (typeof UI !== 'undefined') UI.refreshHUD();
  } catch (e) {}
};


/* =========================================================
   FOLLOW / UNFOLLOW
   ========================================================= */

Phone.toggleFollow = function(npcId) {
  const npc = Phone.getNPC(npcId);
  if (!npc) return;

  const state = Phone.ensureRelationship(npcId);

  state.following = !state.following;

  if (state.following) {
    Phone.showContactMessage(
      `${npc.name}: Okay, I'll follow you ❤️`
    );

    Phone.tryMakeNPCFollow(npcId);
  } else {
    Phone.showContactMessage(
      `${npc.name}: Okay... I'll stop following you.`
    );

    Phone.tryStopNPCFollow(npcId);
  }

  Phone.renderContactActions(npcId);
};


/* =========================================================
   NPC FOLLOW HOOKS
   ========================================================= */

Phone.tryMakeNPCFollow = function(npcId) {
  try {
    if (Relationships.follow) {
      Relationships.follow(npcId);
      return;
    }
    if (typeof NPCPool !== 'undefined') {
      if (typeof NPCPool.followPlayer === 'function') {
        NPCPool.followPlayer(npcId);
        return;
      }

      if (typeof NPCPool.setFollow === 'function') {
        NPCPool.setFollow(npcId, true);
        return;
      }
    }

    if (typeof NPCSystem !== 'undefined') {
      if (typeof NPCSystem.followPlayer === 'function') {
        NPCSystem.followPlayer(npcId);
        return;
      }

      if (typeof NPCSystem.setFollow === 'function') {
        NPCSystem.setFollow(npcId, true);
      }
    }
  } catch (e) {
    console.warn('NPC follow hook unavailable:', e);
  }
};

Phone.tryStopNPCFollow = function(npcId) {
  try {
    if (Relationships.stopFollow) {
      Relationships.stopFollow(npcId);
      return;
    }
    if (typeof NPCPool !== 'undefined') {
      if (typeof NPCPool.stopFollowing === 'function') {
        NPCPool.stopFollowing(npcId);
        return;
      }

      if (typeof NPCPool.setFollow === 'function') {
        NPCPool.setFollow(npcId, false);
        return;
      }
    }

    if (typeof NPCSystem !== 'undefined') {
      if (typeof NPCSystem.stopFollowing === 'function') {
        NPCSystem.stopFollowing(npcId);
        return;
      }

      if (typeof NPCSystem.setFollow === 'function') {
        NPCSystem.setFollow(npcId, false);
      }
    }
  } catch (e) {
    console.warn('NPC stop-follow hook unavailable:', e);
  }
};


/* =========================================================
   MARRIAGE PROPOSAL
   ========================================================= */

Phone.proposeMarriage = function(npcId) {
  const npc = Phone.getNPC(npcId);
  if (!npc) return;

  const state = Phone.ensureRelationship(npcId);
  const affinity = Phone.getAffinity(npcId);

  if (state.married) {
    Phone.showContactMessage(
      `${npc.name}: We're already married ❤️`
    );
    return;
  }

  if (state.proposalPending) {
    Phone.showContactMessage(
      `${npc.name}: I'm still thinking about your proposal... 💍`
    );
    return;
  }

  if (affinity < RELATIONSHIP_CONFIG.MARRIAGE_REQUIRED) {
    Phone.showContactMessage(
      `${npc.name}: I like you, but I don't think we're ready for marriage yet. ❤️`
    );
    return;
  }

  Phone.showMarriageConfirmation(npcId);
};


Phone.showMarriageConfirmation = function(npcId) {
  const npc = Phone.getNPC(npcId);
  if (!npc) return;

  const conversation = $('contactConversation');
  if (!conversation) return;

  conversation.innerHTML = `
    <div style="
      padding:15px;
      border-radius:15px;
      background:linear-gradient(
        135deg,
        rgba(255,107,0,.14),
        rgba(255,70,120,.10)
      );
      text-align:center;
      border:1px solid rgba(255,107,0,.18);
    ">

      <div style="font-size:34px">💍</div>

      <div style="
        font-size:17px;
        font-weight:800;
      ">
        Marriage Proposal
      </div>

      <div style="
        margin-top:7px;
        color:var(--dim);
        font-size:11px;
        line-height:1.5;
      ">
        Are you sure you want to propose to ${npc.name}?
      </div>

      <div style="
        display:flex;
        gap:7px;
        margin-top:13px;
      ">

        <button
          class="btn sm"
          style="flex:1"
          onclick="Phone.confirmMarriageProposal('${npcId}')"
        >
          YES 💍
        </button>

        <button
          class="btn sm"
          style="flex:1"
          onclick="Phone.openContact('${npcId}')"
        >
          CANCEL
        </button>

      </div>
    </div>
  `;
};


Phone.confirmMarriageProposal = function(npcId) {
  const npc = Phone.getNPC(npcId);
  if (!npc) return;

  const state = Phone.ensureRelationship(npcId);

  if (Phone.getAffinity(npcId) < RELATIONSHIP_CONFIG.MARRIAGE_REQUIRED) {
    Phone.openContact(npcId);
    return;
  }

  state.proposalPending = true;
  state.proposalTime = Date.now();

  Phone.showMarriagePending(npcId);
};


Phone.showMarriagePending = function(npcId) {
  const npc = Phone.getNPC(npcId);
  if (!npc) return;

  const conversation = $('contactConversation');
  if (!conversation) return;

  conversation.innerHTML = `
    <div style="
      text-align:center;
      padding:16px;
      border-radius:15px;
      background:rgba(155,89,182,.12);
    ">

      <div style="font-size:35px">💍</div>

      <div style="
        font-weight:800;
        font-size:16px;
      ">
        Proposal Sent
      </div>

      <div style="
        margin-top:7px;
        color:var(--dim);
        font-size:11px;
        line-height:1.5;
      ">
        You proposed to ${npc.name}.
        <br>
        She is thinking about it...
      </div>

      <div style="
        margin-top:12px;
        color:#ffcf70;
      ">
        ⏳ Waiting for her answer
      </div>

      <button
        class="btn sm"
        style="width:100%;margin-top:12px"
        onclick="Phone.checkMarriageAnswer('${npcId}')"
      >
        Check Answer
      </button>

    </div>
  `;
};


/* =========================================================
   MARRIAGE ANSWER
   ========================================================= */

Phone.checkMarriageAnswer = function(npcId) {
  const npc = Phone.getNPC(npcId);
  if (!npc) return;

  const state = Phone.ensureRelationship(npcId);

  if (!state.proposalPending) {
    Phone.openContact(npcId);
    return;
  }

  /*
     The answer is determined from the relationship and personality
     when available. For now, high affinity gives a very strong
     chance of acceptance while still allowing a rejection.
  */

  const affinity = Phone.getAffinity(npcId);

  let acceptanceChance = 0.25;

  if (affinity >= 90) acceptanceChance = 0.95;
  else if (affinity >= 85) acceptanceChance = 0.85;
  else if (affinity >= 80) acceptanceChance = 0.70;

  /* affinity >= MARRIAGE_REQUIRED was checked when proposing: always accepted */
  const accepted = affinity >= RELATIONSHIP_CONFIG.MARRIAGE_REQUIRED;

  state.proposalPending = false;

  if (accepted) {
    Relationships.marry(npcId);

    Phone.showMarriageAccepted(npcId);

    Phone.tryMakeNPCFollow(npcId);
  } else {
    state.relationship = 'rejected';

    Phone.showMarriageRejected(npcId);
  }
};


Phone.showMarriageAccepted = function(npcId) {
  const npc = Phone.getNPC(npcId);
  if (!npc) return;

  const conversation = $('contactConversation');
  if (!conversation) return;

  conversation.innerHTML = `
    <div style="
      text-align:center;
      padding:18px;
      border-radius:16px;
      background:rgba(46,204,113,.13);
      border:1px solid rgba(46,204,113,.25);
    ">

      <div style="font-size:40px">💍❤️</div>

      <div style="
        font-size:19px;
        font-weight:900;
      ">
        She said YES!
      </div>

      <div style="
        margin-top:7px;
        color:var(--dim);
        line-height:1.5;
      ">
        ${npc.name} accepted your marriage proposal.
        <br>
        You are now married.
      </div>

      <div style="
        margin-top:10px;
        color:#7dff9a;
        font-weight:700;
      ">
        ❤️ ${npc.name} is now your wife.
      </div>

      <button
        class="btn sm"
        style="width:100%;margin-top:12px"
        onclick="Phone.openContact('${npcId}')"
      >
        Continue
      </button>

    </div>
  `;
};


Phone.showMarriageRejected = function(npcId) {
  const npc = Phone.getNPC(npcId);
  if (!npc) return;

  const conversation = $('contactConversation');
  if (!conversation) return;

  conversation.innerHTML = `
    <div style="
      text-align:center;
      padding:18px;
      border-radius:16px;
      background:rgba(231,76,60,.10);
      border:1px solid rgba(231,76,60,.20);
    ">

      <div style="font-size:38px">💔</div>

      <div style="
        font-size:17px;
        font-weight:800;
      ">
        She said no
      </div>

      <div style="
        margin-top:7px;
        color:var(--dim);
        line-height:1.5;
      ">
        ${npc.name} isn't ready to marry you.
      </div>

      <button
        class="btn sm"
        style="width:100%;margin-top:12px"
        onclick="Phone.openContact('${npcId}')"
      >
        Continue
      </button>

    </div>
  `;
};


/* =========================================================
   CONTACT MESSAGE
   ========================================================= */

Phone.showContactMessage = function(message) {
  const conversation = $('contactConversation');

  if (!conversation) return;

  conversation.innerHTML = `
    <div style="
      padding:13px;
      border-radius:13px;
      background:rgba(255,255,255,.06);
      line-height:1.5;
    ">
      ${message}
    </div>
  `;
};


/* =========================================================
   CAMERA
   ========================================================= */

Phone.renderCamera = function(body) {
  body.innerHTML =
    '<h3 style="color:var(--accent);margin-top:0">Camera</h3>';

  const btn = document.createElement('button');

  btn.className = 'btn sm';
  btn.textContent = '📸 Take Photo';

  btn.onclick = () => {
    try {
      const dataUrl =
        World.renderer.domElement.toDataURL('image/png');

      let img = $('photoThumb');

      if (!img) {
        img = document.createElement('img');
        img.id = 'photoThumb';
        img.style.cssText = `
          display:block;
          width:100%;
          margin-top:8px;
          border-radius:10px;
        `;
        body.appendChild(img);
      }

      img.src = dataUrl;

      let link = $('photoDownload');

      if (!link) {
        link = document.createElement('a');
        link.id = 'photoDownload';
        link.className = 'btn sm';
        link.style.display = 'inline-block';
        link.style.marginTop = '6px';
        link.textContent = 'Download';
        body.appendChild(link);
      }

      link.href = dataUrl;
      link.download = 'elhay-photo.png';

    } catch (e) {
      body.insertAdjacentHTML(
        'beforeend',
        '<p style="color:var(--dim)">Camera capture failed in this browser.</p>'
      );
    }
  };

  body.appendChild(btn);
};


/* =========================================================
   EL-HAY TV
   ========================================================= */

Phone.renderVideo = function(body) {
  body.innerHTML =
    '<h3 style="color:var(--accent);margin-top:0">El-Hay TV</h3>' +
    '<p style="color:var(--dim)">Live Streaming Channel</p>' +
    '<div style="' +
      'height:140px;' +
      'border-radius:12px;' +
      'background:linear-gradient(135deg,#2a2015,#3d5a6c,#7a5230);' +
      'background-size:400% 400%;' +
      'animation:pulse 3s infinite;' +
      'display:flex;' +
      'align-items:center;' +
      'justify-content:center;' +
      'color:#fff' +
    '">▶ PLAYING LIVE</div>';
};


/* =========================================================
   DELIVERY
   ========================================================= */

Phone.renderDelivery = function(body) {
  body.innerHTML =
    '<h3 style="color:var(--accent);margin-top:0">Express Delivery</h3>';

  ['water', 'sandwich', 'coffee'].forEach(id => {
    const it = ITEMS[id];

    if (!it) return;

    const row = document.createElement('div');

    row.className = 'shopItem';

    row.innerHTML =
      '<span>' +
      it.name +
      ' — $' +
      (it.price + 10) +
      '</span>';

    const btn = document.createElement('button');

    btn.textContent = 'Order';

    btn.onclick = () => {
      if (Economy.cash < it.price + 10) return;

      Economy.cash -= (it.price + 10);

      UI.refreshHUD();

      btn.disabled = true;
      btn.textContent = 'On way...';

      setTimeout(() => {
        Vitals.applyItem(it.effect);
        UI.refreshHUD();
        btn.textContent = 'Delivered ✓';
      }, 4000);
    };

    row.appendChild(btn);
    body.appendChild(row);
  });
};


/* =========================================================
   REAL ESTATE
   ========================================================= */

const PROPERTIES = [
  {
    id: 'studio',
    name: 'Studio Apartment',
    price: 5000,
    perk: 'Sleep restores energy.'
  },
  {
    id: 'flat2',
    name: '2-Room Flat',
    price: 15000,
    perk: 'Sleep restores energy + health.'
  },
  {
    id: 'villa',
    name: 'Villa',
    price: 35000,
    perk: 'Sleep restores everything + passive regen.'
  }
];


Phone.renderMarket = function(body) {
  body.innerHTML =
    '<h3 style="color:var(--accent);margin-top:0">Real Estate</h3>';

  Player.properties = Player.properties || [];

  PROPERTIES.forEach(p => {
    const owned = Player.properties.includes(p.id);
    const isSpawn = Player.spawnPoint === p.id;

    const row = document.createElement('div');

    row.className = 'shopItem';

    row.innerHTML =
      '<span>' +
      p.name +
      ' — $' +
      p.price +
      (owned ? ' (Owned)' : '') +
      '<br><small style="color:var(--dim)">' +
      p.perk +
      '</small></span>';

    const btn = document.createElement('button');

    btn.textContent =
      owned
        ? (isSpawn ? 'Spawn Set' : 'Set Spawn')
        : 'Buy';

    btn.disabled =
      owned
        ? isSpawn
        : Economy.cash < p.price;

    btn.onclick = () => {
      if (!owned) {
        if (Economy.cash >= p.price) {
          Economy.cash -= p.price;
          Player.properties.push(p.id);
          UI.refreshHUD();
        }
      } else {
        RealEstate.setSpawn(p.id);
      }

      Phone.openApp('realestate');
    };

    row.appendChild(btn);
    body.appendChild(row);
  });


  body.insertAdjacentHTML(
    'beforeend',
    '<h3 style="margin-top:14px;color:var(--accent)">Vehicles</h3>'
  );

  DEALERSHIP.forEach(c => {
    const row = document.createElement('div');

    row.className = 'shopItem';

    row.innerHTML =
      '<span>' +
      c.name +
      ' — $' +
      c.price +
      '</span>';

    const buyBtn = document.createElement('button');

    buyBtn.textContent = 'Buy';
    buyBtn.disabled = Economy.cash < c.price;

    buyBtn.onclick = () => {
      if (Vehicles.buy(c.id)) {
        UI.refreshHUD();
        Phone.openApp('realestate');
      }
    };

    row.appendChild(buyBtn);
    body.appendChild(row);
  });


  body.insertAdjacentHTML(
    'beforeend',
    '<h3 style="margin-top:14px;color:var(--accent)">Garage</h3>'
  );

  Vehicles.owned.forEach((v, i) => {
    const row = document.createElement('div');

    row.className = 'shopItem';

    const isCurrent =
      v.mesh === World.playerCar;

    row.innerHTML =
      '<span>' +
      v.name +
      (isCurrent ? ' (Active)' : '') +
      '</span>';

    const btn = document.createElement('button');

    btn.textContent = 'Summon';
    btn.disabled = isCurrent;

    btn.onclick = () => {
      Garage.summon(i);
      Phone.close();
    };

    row.appendChild(btn);
    body.appendChild(row);
  });
};


/* =========================================================
   WEAPON SHOP
   ========================================================= */

Phone.renderWeaponShop = function(body) {
  body.innerHTML =
    '<h3 style="color:var(--accent);margin-top:0">Black Market</h3>' +
    '<div style="color:var(--dim);font-size:11px;margin-bottom:8px">No questions asked — prices +' +
    Math.round((DARKNET_MARKUP - 1) * 100) + '%</div>';

  const licensed = Docs.has('gunLicense');

  if (DARKNET_NEEDS_LICENSE && !licensed) {
    body.insertAdjacentHTML('beforeend',
      '<p style="color:#e74c3c">🔒 A Gun License is required.</p>');
    return;
  }

  WEAPON_STOCK.forEach(entry => {

    const w = ARSENAL[entry.id];

    if (!w) return;

    const price = Math.round(entry.price * DARKNET_MARKUP);
    const isGun = w.type === 'gun';
    const owned = Weapons.owned.includes(entry.id);

    const row = document.createElement('div');
    row.className = 'shopItem';

    row.innerHTML =
      '<span>' + w.name + (owned ? ' (Owned)' : ' — $' + price) + '</span>';

    const btn = document.createElement('button');

    btn.textContent = owned ? (isGun ? 'Buy Ammo' : 'Owned') : 'Buy';
    btn.disabled = owned && !isGun;

    btn.onclick = () => {

      if (!owned) {
        if (Economy.cash < price) return;
        Economy.cash -= price;
        Weapons.buy(entry.id, isGun ? w.maxAmmo * 2 : 0);
      } else if (isGun) {
        const cost = Math.round(entry.ammoPrice * 20 * DARKNET_MARKUP);
        if (Economy.cash < cost) return;
        Economy.cash -= cost;
        Weapons.buy(entry.id, 20);
      }

      UI.refreshHUD();
      Weapons.refreshHUD();

      Phone.openApp('weapons');
    };

    row.appendChild(btn);
    body.appendChild(row);
  });
};


/* =========================================================
   GENERAL STORE
   ========================================================= */

Phone.renderShop = function(body) {
  body.innerHTML =
    '<h3 style="color:var(--accent);margin-top:0">General Store</h3>';

  ['water', 'sandwich', 'soap', 'flowers'].forEach(id => {

    const it = ITEMS[id];

    if (!it) return;

    const row = document.createElement('div');

    row.className = 'shopItem';

    row.innerHTML =
      '<span>' +
      it.name +
      ' — $' +
      it.price +
      '</span>';

    const btn = document.createElement('button');

    btn.textContent = 'Buy';

    btn.disabled =
      Economy.cash < it.price;

    btn.onclick = () => {

      if (Economy.buy(id)) {
        UI.refreshHUD();
        Phone.openApp('shop');
      }
    };

    row.appendChild(btn);

    body.appendChild(row);
  });
};


/* =========================================================
   TABS / PHONE BUTTON
   ========================================================= */

Phone.initTabs = function() {
  const phoneBtn = $('phoneBtn');

  if (phoneBtn) {

    phoneBtn.onclick = Phone.toggle;

    phoneBtn.addEventListener(
      'touchstart',
      e => {
        e.preventDefault();
        e.stopPropagation();
        Phone.toggle();
      },
      {
        passive: false
      }
    );
  }
};


/* =========================================================
   REAL-TIME PHONE UPDATE
   ========================================================= */

Phone.update = function() {
  if (!Phone.open) return;

  if (Phone.currentApp === 'home') {
    Phone.updateHomeTime();
  }
};


/* =========================================================
   OPTIONAL SAVE HOOK
   ========================================================= */

Phone.saveRelationships = function() {
  try {
    if (
      typeof Persistence !== 'undefined' &&
      typeof Persistence.save === 'function'
    ) {
      Persistence.save();
    }
  } catch (e) {
    console.warn('Relationship save hook failed:', e);
  }
};


/* =========================================================
   AUTO UPDATE LOOP
   ========================================================= */

Phone._lastUpdate = 0;

Phone.tick = function() {
  const now = Date.now();

  if (now - Phone._lastUpdate < 1000) {
    return;
  }

  Phone._lastUpdate = now;

  Phone.update();
};


/* =========================================================
   GLOBAL PHONE TICK
   ========================================================= */

if (!window.__ELHAY_PHONE_TICK__) {

  window.__ELHAY_PHONE_TICK__ = true;

  setInterval(() => {
    try {
      Phone.tick();
    } catch (e) {
      console.warn('Phone tick error:', e);
    }
  }, 1000);
}


/* =========================================================
   JOBS APP
   ========================================================= */

Phone.renderJobs = function(body) {
  body.innerHTML = '';
  const cur = Jobs.list.find(j => j.id === Jobs.employed);

  const st = document.createElement('div');
  st.style.cssText = 'padding:10px;border-radius:12px;background:rgba(255,255,255,0.07);margin-bottom:12px';
  st.innerHTML = '<b style="color:var(--accent)">Status</b><br>' +
    (cur ? 'Employed at <b>' + cur.name + '</b> (' + cur.desc + ')' : 'Unemployed');
  if (cur) {
    const q = document.createElement('button');
    q.textContent = 'Cancel Job';
    q.style.cssText = 'margin-top:8px;padding:6px 12px;border-radius:8px;border:0;background:#e74c3c;color:#fff;cursor:pointer';
    q.onclick = function() { Jobs.quit(); Phone.renderJobs(body); };
    st.appendChild(q);
  }
  body.appendChild(st);

  Jobs.list.forEach(j => {
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom:8px;padding:10px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.07)';
    row.innerHTML = '<b>' + j.name + '</b> <span style="color:var(--dim)">~$' + j.pay + '/shift</span><br><span style="color:var(--dim);font-size:11px">' + j.desc + '</span><br>';
    const go = document.createElement('button');
    go.textContent = '📍 Teleport';
    go.style.cssText = 'margin:6px 6px 0 0;padding:5px 10px;border-radius:8px;border:0;background:#3498db;color:#fff;cursor:pointer';
    go.onclick = function() { if (Jobs.teleport(j.id)) Phone.close(); };
    const ap = document.createElement('button');
    ap.textContent = Jobs.employed === j.id ? '✔ Employed' : 'Take Job';
    ap.style.cssText = 'margin-top:6px;padding:5px 10px;border-radius:8px;border:0;background:#2ecc71;color:#111;cursor:pointer';
    ap.onclick = function() { Jobs.apply(j.id); Phone.renderJobs(body); };
    row.appendChild(go);
    row.appendChild(ap);
    body.appendChild(row);
  });
};
