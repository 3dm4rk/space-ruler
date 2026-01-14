// =========================
// CARD BATTLER (WORKING)
// =========================

// --- Card definitions ---
const CARDS = [
  // ORIGINAL 3
  {
    id: "3dm4rk",
    name: "3dm4rk",
    img: "cards/3dm4rk.png",
    atk: 3, def: 2, hp: 5,
    skillName: "Freeze Time",
    skillDesc: "Skip the enemy's next turn (cooldown 2 turns).",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      foe.frozen = 1;
      me.cooldown = 2;
      return { ok: true, msg: `${me.name} freezes time! Enemy loses their next turn.` };
    }
  },
  {
    id: "spacePatron",
    name: "Space Patron",
    img: "cards/space-patrol.png",
    atk: 1, def: 1, hp: 3,
    skillName: "Arrest Beam",
    skillDesc: "Stun the enemy (enemy deals -2 damage next attack). (cooldown 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      foe.stunned = 1;
      me.cooldown = 2;
      return { ok: true, msg: `${me.name} uses Arrest Beam! Enemy is stunned.` };
    }
  },
  {
    id: "luckyCat",
    name: "Lucky Cat",
    img: "cards/lucky-cat.png",
    atk: 2, def: 2, hp: 4,
    skillName: "Lucky Charm",
    skillDesc: "Heal 2 HP and gain +1 Shield. (cooldown 2)",
    skill: (me) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      me.hp = Math.min(me.maxHp, me.hp + 2);
      me.shield = Math.min(6, me.shield + 1);
      me.cooldown = 2;
      return { ok: true, msg: `${me.name} uses Lucky Charm! +2 HP, +1 Shield.` };
    }
  },

  // ✅ NEW 7 CARDS
  {
    id: "cosmicGod",
    name: "Cosmic God",
    img: "cards/cosmic-god.png",
    atk: 10, def: 10, hp: 15,
    skillName: "Time Reboot",
    skillDesc: "Fully restore HP and remove Frozen/Stunned. (cooldown 3)",
    skill: (me) => {
      if (me.cooldown > 0) return { ok:false, msg:`Skill is on cooldown (${me.cooldown} turns).` };
      me.hp = me.maxHp;
      me.frozen = 0;
      me.stunned = 0;
      me.cooldown = 3;
      return { ok:true, msg:`${me.name} uses Time Reboot! Full restore!` };
    }
  },
  {
    id: "daysi",
    name: "Daysi",
    img: "cards/daysi.png",
    atk: 5, def: 0, hp: 1,
    skillName: "Rocket Rush",
    skillDesc: "Next attack deals +3 damage. (cooldown 2)",
    skill: (me) => {
      if (me.cooldown > 0) return { ok:false, msg:`Skill is on cooldown (${me.cooldown} turns).` };
      me.boost = 1;
      me.cooldown = 2;
      return { ok:true, msg:`${me.name} uses Rocket Rush! Next attack +3 dmg.` };
    }
  },
  {
    id: "patrickDestroyer",
    name: "Patrick the Destroyer",
    img: "cards/patrick-the-destroyer.png",
    atk: 4, def: 3, hp: 1,
    skillName: "Dual Slash",
    skillDesc: "Hit twice for 1 damage each (ignores Shield). (cooldown 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok:false, msg:`Skill is on cooldown (${me.cooldown} turns).` };
      foe.hp = Math.max(0, foe.hp - 1);
      foe.hp = Math.max(0, foe.hp - 1);
      me.cooldown = 2;
      return { ok:true, msg:`${me.name} uses Dual Slash! 2 hits ignoring Shield.` };
    }
  },
  {
    id: "spaceSkeletonPirate",
    name: "Space Skeleton Pirate",
    img: "cards/space-skeleton-pirate.png",
    atk: 3, def: 0, hp: 2,
    skillName: "Plasma Plunder",
    skillDesc: "Steal 1 Shield from enemy. (cooldown 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok:false, msg:`Skill is on cooldown (${me.cooldown} turns).` };
      if (foe.shield > 0) {
        foe.shield = Math.max(0, foe.shield - 1);
        me.shield = Math.min(6, me.shield + 1);
        me.cooldown = 2;
        return { ok:true, msg:`${me.name} steals 1 Shield!` };
      }
      me.cooldown = 2;
      return { ok:true, msg:`${me.name} tried to steal Shield... but enemy has none!` };
    }
  },
  {
    id: "tremo",
    name: "Tremo",
    img: "cards/tremo.png",
    atk: 8, def: 1, hp: 2,
    skillName: "Time Rewind",
    skillDesc: "Heal +3 HP and gain +1 Shield. (cooldown 2)",
    skill: (me) => {
      if (me.cooldown > 0) return { ok:false, msg:`Skill is on cooldown (${me.cooldown} turns).` };
      me.hp = Math.min(me.maxHp, me.hp + 3);
      me.shield = Math.min(6, me.shield + 1);
      me.cooldown = 2;
      return { ok:true, msg:`${me.name} rewinds time! +3 HP, +1 Shield.` };
    }
  },
  {
    id: "angelo",
    name: "Angelo",
    img: "cards/angelo.png",
    atk: 5, def: 5, hp: 5,
    skillName: "Divine Guard",
    skillDesc: "Gain +2 Shield (max 6). (cooldown 2)",
    skill: (me) => {
      if (me.cooldown > 0) return { ok:false, msg:`Skill is on cooldown (${me.cooldown} turns).` };
      me.shield = Math.min(6, me.shield + 2);
      me.cooldown = 2;
      return { ok:true, msg:`${me.name} uses Divine Guard! +2 Shield.` };
    }
  },
  {
    id: "baltrio",
    name: "Baltrio",
    img: "cards/baltrio.png",
    atk: 4, def: 4, hp: 2,
    skillName: "Void Burst",
    skillDesc: "Deal 2 damage and Stun enemy. (cooldown 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok:false, msg:`Skill is on cooldown (${me.cooldown} turns).` };
      foe.hp = Math.max(0, foe.hp - 2);
      foe.stunned = 1;
      me.cooldown = 2;
      return { ok:true, msg:`${me.name} casts Void Burst! 2 dmg + Stun.` };
    }
  }
];

// --- Game State ---
const state = {
  phase: "pick",     // pick | battle | over
  turn: "player",    // player | enemy
  round: 1,
  player: null,
  enemy: null
};

// --- Helpers ---
const $ = (id) => document.getElementById(id);

function showView(view) {
  const ids = ["home", "gallery", "setup", "game"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === view) ? "block" : "none";
  });
}

function cloneCard(card) {
  return {
    id: card.id,
    name: card.name,
    img: card.img,
    atk: card.atk,
    def: card.def,
    maxHp: card.hp,
    hp: card.hp,
    shield: card.def,
    cooldown: 0,
    frozen: 0,
    stunned: 0,
    boost: 0,
    passiveEnabled: false,
    passiveChance: 0.35,
    base: card
  };
}

function log(msg, cls="") {
  const el = document.createElement("p");
  if (cls) el.className = cls;
  el.textContent = msg;
  $("log").appendChild(el);
  $("log").scrollTop = $("log").scrollHeight;
}

function dmgCalc(attacker, defender) {
  const rng = Math.floor(Math.random() * 2); // 0 or 1
  const shieldBlock = Math.floor(defender.shield / 2);
  let dmg = attacker.atk + rng - shieldBlock;
  dmg = Math.max(1, dmg);

  // boost from some skills (Daysi)
  if (attacker.boost > 0) {
    dmg += 3;
    attacker.boost = 0;
  }

  // stun makes attacker weaker next attack
  if (attacker.stunned > 0) {
    dmg = Math.max(1, dmg - 2);
  }
  return dmg;
}

function applyDamage(defender, dmg) {
  defender.hp = Math.max(0, defender.hp - dmg);
  defender.shield = Math.max(0, defender.shield - 1);
}

function tickStatuses(f) {
  if (f.cooldown > 0) f.cooldown -= 1;
  if (f.frozen > 0) f.frozen -= 1;
  if (f.stunned > 0) f.stunned -= 1;
}

function tryEnemyPassive() {
  const e = state.enemy;
  const p = state.player;
  if (!e || !p) return;
  if (!e.passiveEnabled || state.phase !== "battle") return;

  const roll = Math.random();
  if (roll > e.passiveChance) {
    log(`Round ${state.round}: ${e.name}'s passive did not trigger.`, "warn");
    return;
  }

  // Passive only for original 3 (you can expand later)
  if (e.id === "3dm4rk") {
    p.frozen = 1;
    log(`Round ${state.round}: ${e.name}'s passive triggers — Time Freeze! You lose your next turn.`, "bad");
  } else if (e.id === "spacePatron") {
    p.stunned = 1;
    log(`Round ${state.round}: ${e.name}'s passive triggers — Arrest Beam! Your next attack is weaker.`, "bad");
  } else if (e.id === "luckyCat") {
    e.hp = Math.min(e.maxHp, e.hp + 2);
    e.shield = Math.min(6, e.shield + 1);
    log(`Round ${state.round}: ${e.name}'s passive triggers — Lucky Charm! Enemy heals +2 HP and gains +1 Shield.`, "bad");
  }

  updateUI();
}

function updateUI() {
  const p = state.player, e = state.enemy;

  $("turnTag").textContent = `Turn: ${state.turn === "player" ? "Player" : "Enemy"}`;
  $("roundTag").textContent = `Round: ${state.round}`;
  $("enemyPassiveTag").textContent = `Enemy Passive: ${Math.round((state.enemy?.passiveChance ?? 0.35) * 100)}%`;

  $("pName").textContent = p.name;
  $("pImg").src = p.img;
  $("pSkillTag").textContent = `${p.base.skillName}`;

  $("eName").textContent = e.name;
  $("eImg").src = e.img;
  $("eSkillTag").textContent = `${e.base.skillName}`;

  $("pHP").textContent = `${p.hp}/${p.maxHp}`;
  $("pATK").textContent = p.atk;
  $("pDEF").textContent = p.def;
  $("pShield").textContent = p.shield;

  $("eHP").textContent = `${e.hp}/${e.maxHp}`;
  $("eATK").textContent = e.atk;
  $("eDEF").textContent = e.def;
  $("eShield").textContent = e.shield;

  $("pHpBar").style.width = `${Math.round((p.hp / p.maxHp) * 100)}%`;
  $("eHpBar").style.width = `${Math.round((e.hp / e.maxHp) * 100)}%`;

  $("pShieldBar").style.width = `${Math.round((p.shield / 6) * 100)}%`;
  $("eShieldBar").style.width = `${Math.round((e.shield / 6) * 100)}%`;

  $("pStatus").textContent =
    (p.frozen ? "Frozen" : "") +
    (p.stunned ? (p.frozen ? ", " : "") + "Stunned" : "") +
    (!p.frozen && !p.stunned ? "None" : "") +
    (p.cooldown ? ` • Skill CD: ${p.cooldown}` : "");

  $("eStatus").textContent =
    (e.frozen ? "Frozen" : "") +
    (e.stunned ? (e.frozen ? ", " : "") + "Stunned" : "") +
    (!e.frozen && !e.stunned ? "None" : "") +
    (e.cooldown ? ` • Skill CD: ${e.cooldown}` : "");

  const playerTurn = state.turn === "player" && state.phase === "battle";
  $("btnAttack").disabled = !playerTurn;
  $("btnSkill").disabled = !playerTurn;
  $("btnEnd").disabled = !playerTurn;

  if (state.phase === "over") {
    $("btnAttack").disabled = true;
    $("btnSkill").disabled = true;
    $("btnEnd").disabled = true;
  }
}

function checkWin() {
  const p = state.player, e = state.enemy;
  if (p.hp <= 0 || e.hp <= 0) {
    state.phase = "over";
    if (p.hp <= 0 && e.hp <= 0) log("It's a draw!", "warn");
    else if (e.hp <= 0) log("You win! 🎉", "good");
    else log("You lose! 💀", "bad");
    updateUI();
    return true;
  }
  return false;
}

function nextTurn() {
  if (state.phase !== "battle") return;

  if (state.turn === "player") tickStatuses(state.player);
  else tickStatuses(state.enemy);

  state.turn = state.turn === "player" ? "enemy" : "player";
  updateUI();

  if (state.turn === "player") {
    state.round += 1;
    tryEnemyPassive();
  }

  if (state.turn === "enemy") {
    setTimeout(enemyAI, 450);
  }
}

function enemyAI() {
  if (state.phase !== "battle") return;

  const e = state.enemy, p = state.player;

  if (e.frozen > 0) {
    log(`${e.name} is frozen and skips the turn!`, "warn");
    nextTurn();
    return;
  }

  const dmg = dmgCalc(e, p);
  applyDamage(p, dmg);
  log(`${e.name} attacks for ${dmg} damage!`, "bad");

  if (!checkWin()) nextTurn();
}

// --- Player actions ---
function playerAttack() {
  const p = state.player, e = state.enemy;

  if (p.frozen > 0) {
    log(`${p.name} is frozen and cannot act!`, "warn");
    nextTurn();
    return;
  }

  const dmg = dmgCalc(p, e);
  applyDamage(e, dmg);
  log(`${p.name} attacks for ${dmg} damage!`, "good");

  if (!checkWin()) nextTurn();
}

function playerSkill() {
  const p = state.player, e = state.enemy;
  const res = p.base.skill(p, e, state);

  if (!res.ok) {
    log(res.msg, "warn");
    return;
  }

  log(res.msg, "good");
  if (!checkWin()) nextTurn();
}

function playerEndTurn() {
  log("You ended your turn.", "warn");
  nextTurn();
}

// --- Setup / Picking ---
function renderPick() {
  const grid = $("pickGrid");
  grid.innerHTML = "";

  CARDS.forEach(card => {
    const div = document.createElement("div");
    div.className = "cardPick";
    div.innerHTML = `
      <img src="${card.img}" alt="${card.name}" />
      <div class="row space" style="margin-top:10px;">
        <strong>${card.name}</strong>
        <span class="tag">ATK ${card.atk} • DEF ${card.def} • HP ${card.hp}</span>
      </div>
      <div class="muted" style="margin-top:6px;">
        <b>${card.skillName}:</b> ${card.skillDesc}
      </div>
    `;
    div.onclick = () => startGame(card.id);
    grid.appendChild(div);
  });
}

function renderGallery() {
  const grid = $("galleryGrid");
  if (!grid) return;
  grid.innerHTML = "";

  CARDS.forEach(card => {
    const div = document.createElement("div");
    div.className = "cardPick";
    div.innerHTML = `
      <img src="${card.img}" alt="${card.name}" />
      <div class="row space" style="margin-top:10px;">
        <strong>${card.name}</strong>
        <span class="tag">ATK ${card.atk} • DEF ${card.def} • HP ${card.hp}</span>
      </div>
      <div class="muted" style="margin-top:6px;">
        <b>${card.skillName}:</b> ${card.skillDesc}
      </div>
      <div class="muted tiny" style="margin-top:8px;">
        <b>Enemy passive:</b> This same ability can trigger automatically each round when this card is the enemy.
      </div>
    `;
    grid.appendChild(div);
  });
}

function startGame(playerCardId) {
  const playerBase = CARDS.find(c => c.id === playerCardId);
  const pool = CARDS.filter(c => c.id !== playerCardId);
  const enemyBase = pool[Math.floor(Math.random() * pool.length)];

  state.player = cloneCard(playerBase);
  state.enemy = cloneCard(enemyBase);

  state.enemy.passiveEnabled = true;

  state.phase = "battle";
  state.turn = "player";
  state.round = 1;

  showView("game");
  $("log").innerHTML = "";
  log(`You picked ${state.player.name}. Enemy is ${state.enemy.name}.`, "warn");

  tryEnemyPassive();
  updateUI();
}

function resetAll() {
  state.phase = "pick";
  state.turn = "player";
  state.round = 1;
  state.player = null;
  state.enemy = null;

  renderPick();
  showView("setup");
}

// --- Bind buttons ---
$("btnAttack").addEventListener("click", playerAttack);
$("btnSkill").addEventListener("click", playerSkill);
$("btnEnd").addEventListener("click", playerEndTurn);
$("btnReset").addEventListener("click", resetAll);

// Navigation safe binding
const safeOn = (id, fn) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", fn);
};

safeOn("btnBattleNow", () => { resetAll(); });
safeOn("btnOpenGallery", () => { renderGallery(); showView("gallery"); });

safeOn("btnBackHomeFromGallery", () => { showView("home"); });
safeOn("btnGalleryToBattle", () => { resetAll(); });

safeOn("btnBackHomeFromSetup", () => { showView("home"); });
safeOn("btnSetupGallery", () => { renderGallery(); showView("gallery"); });

safeOn("btnExitToHome", () => { showView("home"); });

// init
renderPick();
renderGallery();
showView("home");
