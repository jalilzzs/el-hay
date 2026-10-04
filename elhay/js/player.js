/* =========================================================
   EL-HAY — PLAYER SYSTEM
   PC Keyboard + Mouse / Mobile Touch
   Walking / Driving / Interior Interaction
   ========================================================= */

const Player = {
  mode: 'walk',
  suspended: false,
  interiorAction: null,
  properties: []
};

const outsidePos = new THREE.Vector3();

const move = {
  f: false,
  b: false,
  l: false,
  r: false,
  sprint: false
};

const carVel = {
  speed: 0,
  steer: 0
};

const IS_TOUCH =
  ('ontouchstart' in window) ||
  navigator.maxTouchPoints > 0;


/* =========================================================
   INIT
   ========================================================= */

Player.init = function(camera, domElement) {
  Player.camera = camera;

  Player.controls = new THREE.PointerLockControls(
    camera,
    document.body
  );

  bindKeyboard();

  domElement.addEventListener('click', () => {
    if (IS_TOUCH) return;

    if (
      UI.dom.menu.style.display === 'none' &&
      !document.querySelector('.panel.open') &&
      $('csLayer').style.display !== 'block' &&
      Player.mode === 'walk' &&
      !World.activeInterior &&
      !Player.interiorAction
    ) {
      Player.controls.lock();
    }
  });

  domElement.addEventListener('mousedown', e => {
    if (IS_TOUCH || e.button !== 0) return;

    if (
      document.pointerLockElement &&
      Player.mode === 'walk' &&
      !World.activeInterior &&
      !Player.interiorAction
    ) {
      Weapons.fire(Player.camera);
      Weapons.refreshHUD();
    }
  });

  if (IS_TOUCH) {
    initTouchUI();
  }
};


/* =========================================================
   KEYBOARD
   ========================================================= */

function bindKeyboard() {

  const map = () =>
    S.ctrl === 'arrows'
      ? {
          ArrowUp: 'f',
          ArrowDown: 'b',
          ArrowLeft: 'l',
          ArrowRight: 'r'
        }
      : {
          KeyW: 'f',
          KeyS: 'b',
          KeyA: 'l',
          KeyD: 'r'
        };

  addEventListener('keydown', e => {

    const m = map();

    if (m[e.code]) {
      move[m[e.code]] = true;
    }

    if (e.code === 'KeyE') {
      Player.interact();
    }

    if (
      e.code === 'ShiftLeft' ||
      e.code === 'ShiftRight'
    ) {
      move.sprint = true;
    }

    if (e.code === 'Digit1') {
      Weapons.switchTo(0);
    }

    if (e.code === 'Digit2') {
      Weapons.switchTo(1);
    }

    if (e.code === 'Digit3') {
      Weapons.switchTo(2);
    }

    if (e.code === 'Digit4') {
      Weapons.switchTo(3);
    }

    if (e.code === 'Digit5') {
      Weapons.switchTo(4);
    }

    if (e.code === 'KeyV') {
      Weapons.cycle();
    }

    if (e.code === 'KeyR') {
      Weapons.reload();
    }

    if (e.code === 'KeyH') {
      Weapons.holster();
    }

    if (e.code === 'KeyP') {
      Phone.toggle();
    }

    if (e.code === 'KeyM') {
      Minimap.toggleFullscreen();
    }

    Weapons.refreshHUD();
  });

  addEventListener('keyup', e => {

    const m = map();

    if (m[e.code]) {
      move[m[e.code]] = false;
    }

    if (
      e.code === 'ShiftLeft' ||
      e.code === 'ShiftRight'
    ) {
      move.sprint = false;
    }
  });
}


/* =========================================================
   TOUCH
   ========================================================= */

const touch = {
  joyActive: false,
  joyId: null,

  joyVec: {
    x: 0,
    y: 0
  },

  lookId: null,

  lookLast: {
    x: 0,
    y: 0
  },

  yaw: 0,
  pitch: 0,

  gas: false,
  brake: false,
  steerL: false,
  steerR: false,
  sprint: false
};


function initTouchUI() {

  const touchUI = $('touchUI');

  if (!touchUI) return;

  touchUI.classList.add('active');

  if (UI.dom.crosshair) {
    UI.dom.crosshair.style.display = 'none';
  }

  const joyBase = $('joyBase');
  const joyStick = $('joyStick');
  const lookArea = $('lookArea');

  if (!joyBase || !joyStick || !lookArea) {
    return;
  }

  const baseRect = () =>
    joyBase.getBoundingClientRect();


  joyBase.addEventListener(
    'touchstart',
    e => {

      touch.joyActive = true;

      touch.joyId =
        e.changedTouches[0].identifier;

    },
    { passive: true }
  );


  joyBase.addEventListener(
    'touchmove',
    e => {

      for (const tch of e.changedTouches) {

        if (tch.identifier !== touch.joyId) {
          continue;
        }

        const r = baseRect();

        const cx =
          r.left + r.width / 2;

        const cy =
          r.top + r.height / 2;

        let dx =
          tch.clientX - cx;

        let dy =
          tch.clientY - cy;

        const max =
          r.width / 2;

        const len =
          Math.hypot(dx, dy);

        if (len > max) {
          dx = dx / len * max;
          dy = dy / len * max;
        }

        touch.joyVec.x =
          dx / max;

        touch.joyVec.y =
          dy / max;

        joyStick.style.transform =
          `translate(${dx}px,${dy}px)`;
      }
    },
    { passive: true }
  );


  function joyEnd(e) {

    for (const tch of e.changedTouches) {

      if (tch.identifier !== touch.joyId) {
        continue;
      }

      touch.joyActive = false;
      touch.joyId = null;

      touch.joyVec.x = 0;
      touch.joyVec.y = 0;

      joyStick.style.transform =
        'translate(0,0)';
    }
  }


  joyBase.addEventListener(
    'touchend',
    joyEnd
  );

  joyBase.addEventListener(
    'touchcancel',
    joyEnd
  );


  lookArea.addEventListener(
    'touchstart',
    e => {

      const tch =
        e.changedTouches[0];

      touch.lookId =
        tch.identifier;

      touch.lookLast.x =
        tch.clientX;

      touch.lookLast.y =
        tch.clientY;

    },
    { passive: true }
  );


  lookArea.addEventListener(
    'touchmove',
    e => {

      for (const tch of e.changedTouches) {

        if (tch.identifier !== touch.lookId) {
          continue;
        }

        const dx =
          tch.clientX -
          touch.lookLast.x;

        const dy =
          tch.clientY -
          touch.lookLast.y;

        touch.lookLast.x =
          tch.clientX;

        touch.lookLast.y =
          tch.clientY;

        touch.yaw -=
          dx * 0.0032;

        touch.pitch =
          Math.max(
            -1.2,
            Math.min(
              1.2,
              touch.pitch -
              dy * 0.0032
            )
          );
      }
    },
    { passive: true }
  );


  lookArea.addEventListener(
    'touchend',
    e => {

      if (
        e.changedTouches[0].identifier ===
        touch.lookId
      ) {
        touch.lookId = null;
      }
    }
  );


  const interact =
    $('touchInteract');

  if (interact) {

    interact.addEventListener(
      'touchstart',
      e => {

        e.preventDefault();

        Player.interact();

      },
      { passive: false }
    );
  }


  const sprint =
    $('touchSprint');

  if (sprint) {

    sprint.addEventListener(
      'touchstart',
      e => {

        e.preventDefault();

        touch.sprint = true;

      },
      { passive: false }
    );

    sprint.addEventListener(
      'touchend',
      () => {
        touch.sprint = false;
      }
    );

    sprint.addEventListener(
      'touchcancel',
      () => {
        touch.sprint = false;
      }
    );
  }


  const fire =
    $('touchFire');

  if (fire) {

    fire.addEventListener(
      'touchstart',
      e => {

        e.preventDefault();

        if (
          !World.activeInterior &&
          !Player.interiorAction
        ) {
          Weapons.fire(Player.camera);
          Weapons.refreshHUD();
        }

      },
      { passive: false }
    );
  }


  [['touchReload', () => Weapons.reload()], ['touchHolster', () => Weapons.holster()]].forEach(pair => {
    const b = $(pair[0]);
    if (!b) return;
    b.addEventListener('touchstart', e => {
      e.preventDefault();
      pair[1]();
      Weapons.refreshHUD();
    }, { passive: false });
  });

  const weapon =
    $('touchWeapon');

  if (weapon) {

    weapon.addEventListener(
      'touchstart',
      e => {

        e.preventDefault();

        Weapons.cycle();
        Weapons.refreshHUD();

      },
      { passive: false }
    );
  }


  const gas =
    $('btnGas');

  const brake =
    $('btnBrake');

  const left =
    $('btnLeft');

  const right =
    $('btnRight');


  const bind = (el, key) => {

    if (!el) return;

    el.addEventListener(
      'touchstart',
      e => {

        e.preventDefault();

        touch[key] = true;

      },
      { passive: false }
    );

    el.addEventListener(
      'touchend',
      e => {

        e.preventDefault();

        touch[key] = false;

      },
      { passive: false }
    );

    el.addEventListener(
      'touchcancel',
      () => {
        touch[key] = false;
      }
    );
  };


  bind(gas, 'gas');
  bind(brake, 'brake');
  bind(left, 'steerL');
  bind(right, 'steerR');
}


function setDriveButtonsVisible(v) {

  if (!IS_TOUCH) return;

  const drive =
    $('driveControls');

  const ui =
    $('touchUI');

  if (drive) {
    drive.classList.toggle(
      'show',
      v
    );
  }

  if (ui) {
    ui.classList.toggle(
      'driving',
      v
    );
  }
}


/* =========================================================
   INTERIOR HELPERS
   ========================================================= */

Player.stopInteriorAction = function() {

  if (!Player.interiorAction) {
    return;
  }

  const action =
    Player.interiorAction;

  if (
    action.object &&
    action.object.userData
  ) {
    action.object.userData.inUse = false;
  }

  Player.interiorAction = null;

  if (UI.dom.prompt) {
    UI.dom.prompt.style.display =
      'none';
  }
};


Player.isUsingInteriorObject =
  function() {

    return !!Player.interiorAction;
  };


function getInteriorObjects() {

  if (
    !World.activeInterior ||
    !World.interiorInteractables
  ) {
    return [];
  }

  return (
    World.interiorInteractables[
      World.activeInterior
    ] || []
  );
}


function getInteriorInteractable(p) {

  const objects =
    getInteriorObjects();

  let best = null;
  let bestDist = 2.2;

  for (const item of objects) {

    if (!item) continue;

    let pos =
      item.position ||
      item.pos ||
      item.object?.position;

    if (!pos) continue;

    const d =
      p.distanceTo(pos);

    if (d < bestDist) {

      bestDist = d;
      best = item;
    }
  }


  const room =
    World.activeInterior;


  if (
    room === 'home' ||
    room === 'studio' ||
    room === 'flat2' ||
    room === 'villa'
  ) {

    const bedPos =
      room === 'home'
        ? World.homeBedLocal
        : World.safehouseBedLocal?.[room];

    if (
      bedPos &&
      p.distanceTo(bedPos) < 2.2
    ) {

      return {
        type: 'bed',
        position: bedPos
      };
    }
  }


  if (
    room === 'home' &&
    World.homeToiletLocal &&
    p.distanceTo(
      World.homeToiletLocal
    ) < 2.2
  ) {

    return {
      type: 'toilet',
      position:
        World.homeToiletLocal
    };
  }


  if (
    room === 'gunshop' &&
    World.gunShopCounterLocal &&
    p.distanceTo(
      World.gunShopCounterLocal
    ) < 2.2
  ) {

    return {
      type: 'counter',
      position:
        World.gunShopCounterLocal
    };
  }


  if (
    room === 'bank' &&
    World.bankTellerLocal &&
    p.distanceTo(
      World.bankTellerLocal
    ) < 2.2
  ) {

    return {
      type: 'teller',
      position:
        World.bankTellerLocal
    };
  }


  if (
    room === 'prison' &&
    Prison &&
    Prison.sentenced
  ) {

    return {
      type: 'jailed'
    };
  }


  return best;
}


/* =========================================================
   INTERIOR ACTIONS
   ========================================================= */

function beginSeatAction(item) {

  const object =
    item.object || item.ref;

  const sit =
    item.sitPosition ||
    item.position ||
    object?.position;

  if (!sit) return;

  Player.interiorAction = {
    type: 'seat',
    object,
    position: sit
  };

  if (object?.userData) {
    object.userData.inUse = true;
  }

  Player.camera.position.set(
    sit.x,
    sit.y ?? Player.camera.position.y,
    sit.z
  );

  Player.camera.lookAt(
    sit.x,
    sit.y ?? Player.camera.position.y,
    sit.z - 1
  );
}


function useTV(item) {

  const object =
    item.object || item.ref;

  if (!object) return;

  const data =
    object.userData || {};

  if (typeof data.toggle === 'function') {

    data.toggle();

    Player.interiorAction = {
      type: 'tv',
      object
    };

    return;
  }

  if (data.screen) {

    data.on =
      data.on === undefined
        ? true
        : !data.on;

    if (data.onMaterial) {
      data.screen.material =
        data.onMaterial;
    }

    if (data.offMaterial) {
      data.screen.material =
        data.on
          ? data.onMaterial
          : data.offMaterial;
    }

    if (data.screenLight) {
      data.screenLight.visible =
        !!data.on;
    }
  }
}


function useInteriorObject(item) {

  if (!item) return;

  const type =
    item.type ||
    item.object?.userData?.type;


  if (
    type === 'chair' ||
    type === 'sofa' ||
    type === 'restaurantChair' ||
    type === 'seat'
  ) {

    beginSeatAction(item);

    return;
  }


  if (type === 'tv') {

    useTV(item);

    return;
  }


  if (type === 'bed') {

    const meta =
      World.interiorMeta?.[
        World.activeInterior
      ];

    if (
      meta &&
      meta.sleep === false
    ) {
      return;
    }

    if (
      typeof Vitals !== 'undefined' &&
      Vitals.sleep
    ) {
      Vitals.sleep();
    }

    return;
  }


  if (type === 'toilet') {

    if (
      typeof Vitals !== 'undefined' &&
      Vitals.useToilet
    ) {
      Vitals.useToilet();
    }

    return;
  }


  if (
    type === 'kitchen' ||
    type === 'stove' ||
    type === 'sink'
  ) {

    if (
      typeof item.onUse === 'function'
    ) {
      item.onUse();
    }

    if (
      item.itemId &&
      typeof Economy !== 'undefined' &&
      typeof Economy.useItem === 'function'
    ) {
      Economy.useItem(
        item.itemId
      );
    }

    return;
  }


  if (
    type === 'counter' ||
    type === 'bank' ||
    type === 'teller'
  ) {

    if (
      World.activeInterior ===
      'gunshop'
    ) {

      UI.openShop('gunshop');

    } else if (
      World.activeInterior ===
      'bank'
    ) {

      UI.openShop('bank');

    } else if (
      World.activeInterior === 'pharmacy'
    ) {

      Jobs.msg('💊 Pharmacist: "Welcome! What can I get you today?"');
      UI.openShop('pharmacy');

    } else if (
      World.activeInterior === 'supermarket'
    ) {

      Jobs.msg('🛒 Cashier: "Hello! Anything else?"');
      UI.openShop('supermarket');
    }

    return;
  }


  if (
    type === 'table' ||
    type === 'restaurantTable'
  ) {

    if (
      typeof item.onUse ===
      'function'
    ) {
      item.onUse();
    }

    return;
  }


  if (
    typeof item.onUse ===
    'function'
  ) {

    item.onUse();
  }
}


/* =========================================================
   OUTDOOR INTERACTION
   ========================================================= */

function findInteractable(p) {

  if (
    Player.mode === 'drive'
  ) {

    return {
      type: 'exitCar',
      dist: 0
    };
  }


  let best = null;
  let bestD = 3.2;


  const car =
    Vehicles.nearbyDrivable(p);

  if (car) {

    const d =
      p.distanceTo(
        car.mesh.position
      );

    if (d < bestD) {

      bestD = d;

      best = {
        type: 'car',
        ref: car
      };
    }
  }


  for (const e of World.entrances) {

    const d =
      p.distanceTo(e.pos);

    if (d < bestD) {

      bestD = d;

      best = {
        type: 'door',
        ref: e
      };
    }
  }


  for (const s of World.shops) {

    const d =
      p.distanceTo(s.pos);

    if (d < bestD) {

      bestD = d;

      best = {
        type: 'shop',
        ref: s
      };
    }
  }


  for (const n of NPC_DEFS) {

    const npc =
      World.keyNpcs[n.id];

    if (!npc || !npc.mesh.visible) continue;

    const d =
      p.distanceTo(
        npc.mesh.position
      );

    if (d < bestD) {

      bestD = d;

      best = {
        type: 'keyNpc',
        ref: n,
        npc
      };
    }
  }


  const pooled =
    NPCPool.nearest(
      p,
      bestD
    );

  if (pooled) {

    best = {
      type: 'pooledNpc',
      ref: pooled
    };
  }


  return best;
}


/* =========================================================
   MAIN INTERACTION
   ========================================================= */

Player.interact = function() {

  if (
    document.querySelector(
      '.panel.open'
    ) ||
    UI.dom.menu.style.display !==
      'none' ||
    $('pPhone').classList.contains(
      'open'
    )
  ) {
    return;
  }


  if (Player.interiorAction) {

    Player.stopInteriorAction();

    return;
  }


  if (World.activeInterior) {

    const hit =
      getInteriorInteractable(
        Player.camera.position
      );


    if (hit) {

      useInteriorObject(hit);

      return;
    }


    if (
      typeof World.exitInterior ===
      'function'
    ) {

      World.exitInterior(
        Player.camera,
        outsidePos
      );

      setDriveButtonsVisible(
        false
      );
    }

    return;
  }


  const hit =
    findInteractable(
      Player.camera.position
    );

  if (!hit) return;


  if (
    hit.type ===
    'exitCar'
  ) {

    Player.mode =
      'walk';

    carVel.speed = 0;
    carVel.steer = 0;

    Player.camera.position.set(
      World.playerCar.position.x + 2,
      1.7,
      World.playerCar.position.z
    );

    setDriveButtonsVisible(
      false
    );

    if (!IS_TOUCH) {
      UI.dom.crosshair.style.display =
        'block';
    }

    Audio.stopEngine();

    Weapons.refreshHUD();

    return;
  }


  if (
    hit.type ===
    'car'
  ) {

    Vehicles.switchTo(
      hit.ref.mesh,
      hit.ref.registered
    );

    Player.mode =
      'drive';

    carVel.speed = 0;
    carVel.steer = 0;

    if (!IS_TOUCH) {
      try { Player.controls.unlock(); } catch (e) {}
    }

    UI.dom.crosshair.style.display =
      'none';

    setDriveButtonsVisible(
      true
    );

    /*
      Put the camera behind the car
      immediately when entering it.
    */

    updateDriveCamera();

    Weapons.refreshHUD();

    return;
  }


  if (
    hit.type ===
    'door'
  ) {

    World.enterInterior(
      hit.ref.id,
      Player.camera,
      outsidePos
    );

    return;
  }


  if (
    hit.type ===
    'shop'
  ) {

    UI.openShop(
      hit.ref.id
    );

    return;
  }


  if (
    hit.type ===
    'keyNpc'
  ) {

    UI.openRelationship(
      hit.ref.id
    );

    return;
  }


  if (
    hit.type ===
    'pooledNpc'
  ) {

    NPCPool.greet(
      hit.ref
    );

    return;
  }
};


/* =========================================================
   INTERIOR MOVEMENT
   ========================================================= */

function updateInteriorWalk(dt) {

  let fx = 0;
  let fz = 0;


  if (IS_TOUCH) {

    fx =
      touch.joyVec.x;

    fz =
      touch.joyVec.y;

    Player.camera.rotation.order =
      'YXZ';

    Player.camera.rotation.y =
      touch.yaw;

    Player.camera.rotation.x =
      touch.pitch;

  } else {

    if (move.f) fz -= 1;
    if (move.b) fz += 1;
    if (move.l) fx -= 1;
    if (move.r) fx += 1;
  }


  if (Player.interiorAction) {

    const action =
      Player.interiorAction;

    if (
      action.position
    ) {

      Player.camera.position.x =
        action.position.x;

      Player.camera.position.z =
        action.position.z;
    }

    return;
  }


  const len =
    Math.hypot(
      fx,
      fz
    );


  if (len > 0.05) {

    const speed = 5;

    const v =
      new THREE.Vector3(
        fx / len,
        0,
        fz / len
      ).multiplyScalar(
        speed * dt
      );


    if (IS_TOUCH) {

      const yaw =
        Player.camera.rotation.y;

      const forward =
        new THREE.Vector3(
          -Math.sin(yaw),
          0,
          -Math.cos(yaw)
        ).multiplyScalar(
          -v.z
        );

      const right =
        new THREE.Vector3(
          Math.cos(yaw),
          0,
          -Math.sin(yaw)
        ).multiplyScalar(
          v.x
        );

      Player.camera.position
        .add(forward)
        .add(right);

    } else {

      Player.controls.moveRight(
        v.x
      );

      Player.controls.moveForward(
        -v.z
      );
    }

    Audio.footstep(false);
  }


  const room =
    World.interiors?.[
      World.activeInterior
    ];

  const width =
    room?.userData?.width ||
    10;

  const depth =
    room?.userData?.depth ||
    10;

  const boundX =
    Math.max(
      1,
      width / 2 - 1.0
    );

  const boundZ =
    Math.max(
      1,
      depth / 2 - 1.0
    );


  Player.camera.position.x =
    Math.max(
      -boundX,
      Math.min(
        boundX,
        Player.camera.position.x
      )
    );


  Player.camera.position.z =
    Math.max(
      -boundZ,
      Math.min(
        boundZ,
        Player.camera.position.z
      )
    );


  Player.camera.position.y =
    room?.userData?.eyeY ||
    49.2;
}


/* =========================================================
   DRIVE CAMERA
   ========================================================= */

function updateDriveCamera() {

  if (
    !World.playerCar ||
    !Player.camera
  ) {
    return;
  }


  const car =
    World.playerCar;


  /*
    IMPORTANT:
    In World.makeCar:
      +Z = FRONT
      -Z = REAR

    Therefore the camera must stay
    behind the car at -Z.
  */

  const behind =
    new THREE.Vector3(
      0,
      2.8,
      -6.5
    ).applyAxisAngle(
      new THREE.Vector3(
        0,
        1,
        0
      ),
      car.rotation.y
    );


  Player.camera.position
    .copy(car.position)
    .add(behind);


  /*
    Look toward the front of the car,
    not toward its rear or center.
  */

  const forward =
    new THREE.Vector3(
      0,
      0,
      1
    ).applyAxisAngle(
      new THREE.Vector3(
        0,
        1,
        0
      ),
      car.rotation.y
    );


  const lookTarget =
    car.position.clone()
      .add(
        forward.multiplyScalar(4)
      );


  lookTarget.y += 1.0;


  Player.camera.lookAt(
    lookTarget
  );
}


/* =========================================================
   DRIVE PHYSICS
   ========================================================= */

function updateDrive(dt) {

  if (!World.playerCar) {
    return;
  }


  const car =
    World.playerCar;

  const CS = CarStats.get(car);

  const wantGas =
    IS_TOUCH
      ? touch.gas
      : move.f;


  const wantBrake =
    IS_TOUCH
      ? touch.brake
      : move.b;


  const wantL =
    IS_TOUCH
      ? touch.steerL
      : move.l;


  const wantR =
    IS_TOUCH
      ? touch.steerR
      : move.r;


  /*
    -----------------------------------------
    SPEED
    -----------------------------------------

    Gas:
      accelerate forward.

    Brake:
      if moving forward -> brake to zero.
      if stopped -> reverse.
      if already reversing -> accelerate reverse.

    This gives the requested:
      TOP    = GAS
      BOTTOM = BRAKE / REVERSE
  */


  if (
    Police.checkpointActive
  ) {

    carVel.speed *=
      Math.pow(
        0.82,
        dt * 60
      );

  } else if (wantGas && !wantBrake) {

    /*
      If currently reversing,
      gas first brakes the reverse speed.
      Once zero is reached, it goes forward.
    */

    if (carVel.speed < 0) {

      carVel.speed =
        Math.min(
          0,
          carVel.speed +
          dt * 12
        );

    } else {

      carVel.speed =
        Math.min(
          carVel.speed +
          dt * CS.acc,
          CS.top
        );
    }

  } else if (wantBrake && !wantGas) {

    /*
      Forward -> brake.
      Stopped -> reverse.
      Reverse -> stronger reverse acceleration.
    */

    if (carVel.speed > 0) {

      carVel.speed =
        Math.max(
          0,
          carVel.speed -
          dt * (CS.acc * 1.7)
        );

    } else {

      carVel.speed =
        Math.max(
          carVel.speed -
          dt * (CS.acc * 0.75),
          -CS.top * 0.5
        );
    }

  } else {

    /*
      Natural rolling friction.
    */

    const friction =
      Math.pow(
        0.94,
        dt * 60
      );

    carVel.speed *=
      friction;


    if (
      Math.abs(carVel.speed) < 0.015
    ) {
      carVel.speed = 0;
    }
  }


  /*
    -----------------------------------------
    STEERING
    -----------------------------------------
  */

  let steerInput = 0;

if (wantL) {
  steerInput += 1;
}

if (wantR) {
  steerInput -= 1;
}

if (steerInput !== 0) {

  /*
    Steering becomes stronger with speed.
    Reverse steering is automatically inverted
    so the car behaves naturally while reversing.
  */

  const direction =
    carVel.speed >= 0
      ? 1
      : -1;

  const steerSpeed =
    Math.min(
      1,
      Math.abs(carVel.speed) / 4
    );

  carVel.steer +=
    steerInput *
    dt *
    3.2 * CS.handling *
    Math.max(
      0.25,
      steerSpeed
    ) *
    direction;

  carVel.steer =
    Math.max(
      -1,
      Math.min(
        1,
        carVel.steer
      )
    );

} else {

  carVel.steer *=
    Math.pow(
      0.78,
      dt * 60
    );

  if (
    Math.abs(carVel.steer) < 0.01
  ) {
    carVel.steer = 0;
  }
}

  /*
    -----------------------------------------
    CAR ROTATION
    -----------------------------------------
  */

  const speedFactor =
    Math.min(
      1,
      Math.abs(carVel.speed) / 5
    );


  car.rotation.y +=
    carVel.steer *
    dt *
    1.45 * CS.handling *
    speedFactor;


  /*
    -----------------------------------------
    MOVEMENT
    -----------------------------------------

    World.makeCar uses:
      +Z = front
      -Z = rear

    Therefore:
      forward = +Z
      reverse = -Z
  */

  const forward =
    new THREE.Vector3(
      0,
      0,
      1
    ).applyAxisAngle(
      new THREE.Vector3(
        0,
        1,
        0
      ),
      car.rotation.y
    );


  car.position.add(
    forward.multiplyScalar(
      carVel.speed * dt
    )
  );


  /*
    -----------------------------------------
    COLLISION
    -----------------------------------------
  */

  World.resolveCollision(
    car.position,
    1.0
  );


  /*
    -----------------------------------------
    CAMERA
    -----------------------------------------
  */

  updateDriveCamera();


  /*
    -----------------------------------------
    POLICE / DRIVING SCHOOL / AUDIO
    -----------------------------------------
  */

  Police.maybeTrigger(
    car.position,
    dt
  );


  DrivingSchool.checkProgress(
    car.position
  );


  Audio.engine(
    carVel.speed
  );

  Speedo.update(carVel.speed);
}


/* =========================================================
   UPDATE
   ========================================================= */


/* =========================================================
   CAR STATS (each model drives differently)
   ========================================================= */

const CarStats = {
  base: {
    sedan:     { top: 16, acc: 8.0, handling: 1.00 },
    hatchback: { top: 15, acc: 9.5, handling: 1.20 },
    suv:       { top: 15, acc: 7.0, handling: 0.90 },
    pickup:    { top: 14, acc: 6.5, handling: 0.85 },
    truck:     { top: 11, acc: 4.5, handling: 0.65 },
    tractor:   { top: 7,  acc: 3.5, handling: 0.75 },
    police:    { top: 20, acc: 10,  handling: 1.15 }
  },
  cache: new WeakMap(),
  get(mesh) {
    if (!mesh) return this.base.sedan;
    let s = this.cache.get(mesh);
    if (s) return s;
    const ud = mesh.userData || {};
    const b = this.base[ud.carType] || this.base.sedan;
    const id = String(ud.modelId || ud.carType || 'x');
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    const f1 = 0.88 + ((h % 97) / 97) * 0.26;
    const f2 = 0.9 + (((h >> 7) % 89) / 89) * 0.22;
    const f3 = 0.92 + (((h >> 13) % 83) / 83) * 0.16;
    s = { top: b.top * f1, acc: b.acc * f2, handling: b.handling * f3 };
    this.cache.set(mesh, s);
    return s;
  }
};


/* =========================================================
   SPEEDOMETER
   ========================================================= */

const Speedo = {
  el: null,
  update(speed) {
    if (!this.el) {
      this.el = $('speedo');
      if (!this.el) return;
    }
    this.el.style.display = 'block';
    this.el.textContent = Math.round(Math.abs(speed) * 3.6 * 1.6) + ' km/h';
  },
  hide() {
    if (!this.el) this.el = $('speedo');
    if (this.el) this.el.style.display = 'none';
    Radio.showButton(false);
  }
};


/* =========================================================
   YOUTUBE RADIO
   ========================================================= */

const _tc = () => { const b = $('testCancel'); if (b && !b._w) { b._w = true; b.onclick = () => DrivingTest.finish(false, 'Test cancelled.'); } };
setTimeout(function w(){ if ($('testCancel')) _tc(); else setTimeout(w,400); },400);

const Radio = {
  frame: null,
  playing: false,
  parse(url) {
    url = String(url || '').trim();
    let m = url.match(/[?&]list=([\w-]+)/);
    const list = m ? m[1] : null;
    m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
    const id = m ? m[1] : null;
    if (!id && !list) return null;
    return { id, list };
  },
  cmd(fn) {
    if (!this.frame || !this.frame.contentWindow) return;
    this.frame.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: fn, args: '' }), '*'
    );
  },
  play(url) {
    const v = this.parse(url);
    const st = $('radioStatus');
    if (!v) {
      if (st) st.textContent = 'Invalid YouTube link';
      return;
    }
    if (this.frame) this.frame.remove();
    const f = document.createElement('iframe');
    let src = 'https://www.youtube.com/embed/' + (v.id || '') +
      '?autoplay=1&enablejsapi=1&playsinline=1';
    if (v.list) src += '&listType=playlist&list=' + v.list;
    f.src = src;
    f.allow = 'autoplay; encrypted-media';
    f.style.cssText = 'width:100%;height:150px;border:0;border-radius:8px;margin-top:8px';
    $('radioPlayer').appendChild(f);
    this.frame = f;
    this.playing = true;
    if (st) st.textContent = '▶ Playing';
    this.setPauseLabel();
  },
  toggle() {
    if (!this.frame) return;
    this.cmd(this.playing ? 'pauseVideo' : 'playVideo');
    this.playing = !this.playing;
    const st = $('radioStatus');
    if (st) st.textContent = this.playing ? '▶ Playing' : '⏸ Paused';
    this.setPauseLabel();
  },
  setPauseLabel() {
    const b = $('radioPause');
    if (b) b.textContent = this.playing ? '⏸ Pause' : '▶ Play';
  },
  stop() {
    if (this.frame) { this.frame.remove(); this.frame = null; }
    this.playing = false;
    const st = $('radioStatus');
    if (st) st.textContent = 'Radio off';
  },
  showButton(v) {
    const b = $('radioBtn');
    if (b) b.style.display = v ? 'block' : 'none';
    if (!v) {
      const pn = $('radioPanel');
      if (pn) pn.style.display = 'none';
    }
  },
  init() {
    const b = $('radioBtn');
    if (!b || b._wired) return;
    b._wired = true;
    const pn = $('radioPanel');
    b.onclick = () => { pn.style.display = pn.style.display === 'block' ? 'none' : 'block'; };
    $('radioPlay').onclick = () => this.play($('radioUrl').value);
    $('radioPause').onclick = () => this.toggle();
    $('radioStop').onclick = () => this.stop();
    $('radioClose').onclick = () => { pn.style.display = 'none'; };
  }
};


Player.update = function(dt) {

  if (Player.suspended) {
    return;
  }


  DrivingTest.update(dt);

  if (Player.mode === 'drive') {
    if (!Radio._shown) {
      Radio._shown = true;
      Radio.init();
      Radio.showButton(true);
    }
  } else if (Radio._shown) {
    Radio._shown = false;
    Speedo.hide();
  }


  /*
    Interior movement
  */

  if (World.activeInterior) {

    updateInteriorWalk(dt);

    return;
  }


  /* -----------------------------------------
     WALK
     ----------------------------------------- */

  if (
    Player.mode ===
    'walk'
  ) {

    let fx = 0;
    let fz = 0;


    if (IS_TOUCH) {

      fx =
        touch.joyVec.x;

      fz =
        touch.joyVec.y;

      Player.camera.rotation.order =
        'YXZ';

      Player.camera.rotation.y =
        touch.yaw;

      Player.camera.rotation.x =
        touch.pitch;

    } else {

      if (move.f) fz -= 1;
      if (move.b) fz += 1;
      if (move.l) fx -= 1;
      if (move.r) fx += 1;
    }


    const len =
      Math.hypot(
        fx,
        fz
      );


    if (len > 0.05) {

      const sprint =
        (
          IS_TOUCH
            ? touch.sprint
            : move.sprint
        )
          ? 1.7
          : 1;


      const speed =
        6 *
        Vitals.speedFactor() *
        sprint;


      const v =
        new THREE.Vector3(
          fx / len,
          0,
          fz / len
        ).multiplyScalar(
          speed * dt
        );


      if (IS_TOUCH) {

        const yaw =
          Player.camera.rotation.y;

        const forward =
          new THREE.Vector3(
            -Math.sin(yaw),
            0,
            -Math.cos(yaw)
          ).multiplyScalar(
            -v.z
          );

        const right =
          new THREE.Vector3(
            Math.cos(yaw),
            0,
            -Math.sin(yaw)
          ).multiplyScalar(
            v.x
          );

        Player.camera.position
          .add(forward)
          .add(right);

      } else {

        Player.controls.moveRight(
          v.x
        );

        Player.controls.moveForward(
          -v.z
        );
      }


      Audio.footstep(
        sprint > 1
      );
    }


    Player.camera.position.y =
      1.7;


    World.resolveCollision(
      Player.camera.position,
      0.4
    );

    return;
  }


  /* -----------------------------------------
     DRIVE
     ----------------------------------------- */

  updateDrive(dt);
};


/* =========================================================
   PROMPT
   ========================================================= */

Player.updatePrompt =
  function() {

    const d =
      UI.dom;


    if (!d || !d.prompt) {
      return;
    }


    /* -----------------------------------------
       Interior
       ----------------------------------------- */

    if (World.activeInterior) {

      if (Player.interiorAction) {

        d.prompt.textContent =
          'E: Stand Up';

        d.prompt.style.display =
          'block';

        return;
      }


      const hit =
        getInteriorInteractable(
          Player.camera.position
        );


      if (hit) {

        const type =
          hit.type;


        const labels = {

          sleep:
            'E: Sleep',

          bed:
            'E: Sleep',

          toilet:
            'E: Use Bathroom',

          chair:
            'E: Sit',

          sofa:
            'E: Sit',

          restaurantChair:
            'E: Sit',

          seat:
            'E: Sit',

          tv:
            'E: Watch TV',

          kitchen:
            'E: Use Kitchen',

          stove:
            'E: Cook',

          sink:
            'E: Use Sink',

          counter:
            'E: Browse',

          teller:
            'E: Banking',

          table:
            'E: Use Table',

          restaurantTable:
            'E: Use Table',

          jailed:
            'E: Pay Bail $' +
            (
              Prison?.bailCost ??
              0
            ) +
            ' (' +
            Math.ceil(
              Prison?.timer ?? 0
            ) +
            's left)'
        };


        if (!labels[type] && hit.label && type !== 'door') {
          labels[type] = 'E: ' + hit.label;
        }

        if (labels[type]) {

          d.prompt.textContent =
            labels[type];

          d.prompt.style.display =
            'block';

          return;
        }
      }


      d.prompt.textContent =
        t('exitBld');

      d.prompt.style.display =
        'block';

      return;
    }


    /* -----------------------------------------
       Outside
       ----------------------------------------- */

    const hit =
      findInteractable(
        Player.camera.position
      );


    if (!hit) {

      d.prompt.style.display =
        'none';

      return;
    }


    const labelFor = {

      exitCar:
        () => t('exitCar'),

      car:
        () => t('enterCar'),

      door:
        () => {

          const locked =
            hit.ref.ownable &&
            !(
              Player.properties &&
              Player.properties.includes(
                hit.ref.id
              )
            );

          return locked
            ? (
              '🔒 ' +
              hit.ref.name +
              ' (not owned — buy via Phone)'
            )
            : (
              t('enterBld') +
              ' — ' +
              hit.ref.name
            );
        },

      shop:
        () =>
          'E: ' +
          hit.ref.name,

      keyNpc:
        () =>
          'E: Talk to ' +
          hit.ref.name,

      pooledNpc:
        () =>
          'E: Greet'
    };


    if (
      labelFor[hit.type]
    ) {

      d.prompt.textContent =
        labelFor[
          hit.type
        ]();

      d.prompt.style.display =
        'block';

    } else {

      d.prompt.style.display =
        'none';
    }
  };


/* =========================================================
   END
   ========================================================= */
