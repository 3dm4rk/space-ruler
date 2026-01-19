// =========================
// Cosmic Card Wars (SURVIVAL + GOLD + SHOP + RELICS + AI + HIT FX + SFX)
// =========================


const GAME_VERSION = "single-relic-equip-v4";
console.log("Loaded game.js", GAME_VERSION);

// Unique id for each spawned card instance (prevents double on-death triggers)
let __CARD_UID = 1;

// =========================
// PROFILE / RANKS (save on device)
// =========================
const PROFILE_KEY = "cb_profile_v1";

// Rank ladder (XP thresholds are inclusive minimums)
const RANKS = [
  { name: "Rookie",   xp: 0 },
  { name: "Bronze",   xp: 100 },
  { name: "Silver",   xp: 600 },
  { name: "Gold",     xp: 1000 },
  { name: "Platinum", xp: 2000 },
  { name: "Diamond",  xp: 3500 },
  { name: "Master",   xp: 6000 },
  // NOTE: Legend is intentionally a big milestone.
  { name: "Legend",   xp: 11000 },
];

// Avatar + Frame cosmetics unlocked by rank
const AVATARS = [
  { id: "spark",   icon: "✨", unlockRank: "Rookie" },
  { id: "flame",   icon: "🔥", unlockRank: "Bronze" },
  { id: "snow",    icon: "❄️", unlockRank: "Silver" },
  { id: "storm",   icon: "⚡", unlockRank: "Gold" },
  { id: "leaf",    icon: "🍃", unlockRank: "Platinum" },
  { id: "skull",   icon: "💀", unlockRank: "Diamond" },
  { id: "crown",   icon: "👑", unlockRank: "Master" },
  { id: "legend",  icon: "🌟", unlockRank: "Legend" },
];

const FRAMES = [
  { id: "default",  label: "Default",  className: "",             unlockRank: "Rookie" },
  { id: "bronze",   label: "Bronze",   className: "frameBronze",  unlockRank: "Bronze" },
  { id: "silver",   label: "Silver",   className: "frameSilver",  unlockRank: "Silver" },
  { id: "gold",     label: "Gold",     className: "frameGold",    unlockRank: "Gold" },
  { id: "platinum", label: "Platinum", className: "framePlatinum",unlockRank: "Platinum" },
  { id: "diamond",  label: "Diamond",  className: "frameDiamond", unlockRank: "Diamond" },
  { id: "master",   label: "Master",   className: "frameMaster",  unlockRank: "Master" },
  { id: "legend",   label: "Legend",   className: "frameLegend",  unlockRank: "Legend" },
];

function rankIndexByName(name) {
  const n = String(name || "").toLowerCase();
  const i = RANKS.findIndex(r => r.name.toLowerCase() === n);
  return i >= 0 ? i : 0;
}

function getRankIndexForXp(xp) {
  const x = Number(xp || 0) || 0;
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (x >= RANKS[i].xp) idx = i;
  }
  return idx;
}

function getRankName() {
  return RANKS[Math.max(0, Math.min(RANKS.length - 1, Number(state.profileRankIndex || 0) || 0))].name;
}

function nextRankInfo() {
  const i = Number(state.profileRankIndex || 0) || 0;
  if (i >= RANKS.length - 1) return null;
  return RANKS[i + 1];
}

function ensureProfileDefaults() {
  if (!state.profile) state.profile = {};
  const p = state.profile;
  if (typeof p.name !== "string") p.name = "";
  if (!Number.isFinite(Number(p.xp))) p.xp = 0;
  if (!Number.isFinite(Number(p.wins))) p.wins = 0;
  if (!Number.isFinite(Number(p.losses))) p.losses = 0;
  if (!Number.isFinite(Number(p.highStage))) p.highStage = 0;
  if (typeof p.avatarId !== "string") p.avatarId = "spark";
  if (typeof p.frameId !== "string") p.frameId = "default";
  if (p.diabloUnlocked !== true) p.diabloUnlocked = false;
  // Mirror into top-level cached fields used by UI helpers
  state.profileXp = p.xp;
  state.profileRankIndex = getRankIndexForXp(p.xp);
  state.profileName = p.name;
}

// =========================
// HELPERS (Shield / Armor rules)
// =========================
function canGainArmor(f) {
  return !(f && f.noArmorGain && f.noArmorGain > 0);
}
function gainShield(f, amount) {
  if (!f || amount <= 0) return 0;
  if (!canGainArmor(f)) return 0; // Time Lock blocks armor gain
  const cap = getShieldCap(f);
  const before = f.shield;
  f.shield = Math.min(cap, f.shield + amount);
  // ✅ Keep DEF and Shield the same (requested). DEF is treated as the live defense value.
  f.def = f.shield;
  return f.shield - before;
}

// ✅ Reboot Seal: blocks healing
function canHeal(f) {
  return !(f && f.rebootSeal && f.rebootSeal > 0);
}

// =========================
// 🎲 RNG helper
// Used by abilities that roll random damage (e.g., Ray Bill 100–300).
// If this is missing, clicking "Use Skill" can throw ReferenceError and appear to do nothing.
// =========================
function randInt(min, max) {
  const a = Number(min);
  const b = Number(max);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 0;
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}



// =========================
// ✅ REAL-TIME SKILL COOLDOWNS (for redeemed legendaries)
// =========================
function isSkillReady(f) {
  if (!f) return false;
  // If this fighter uses real-time cooldowns, use skillReadyAt
  if (f.skillReadyAt && f.skillReadyAt > Date.now()) return false;
  return (f.cooldown || 0) <= 0;
}

function setSkillCooldown(f, ms) {
  if (!f) return;
  f.skillReadyAt = Date.now() + ms;
}

function formatSkillCd(f) {
  if (!f || !f.skillReadyAt) return "0s";
  const ms = Math.max(0, f.skillReadyAt - Date.now());
  const s = Math.ceil(ms / 1000);
  if (s >= 60) {
    const m = Math.ceil(s / 60);
    return `${m}m`;
  }
  return `${s}s`;
}

// =========================
// 🧪 POTION HELPERS (global 10-turn cooldown)
// =========================
const POTION_COOLDOWN_TURNS = 10;

function isPotionReady() {
  return (Number(state.potionCooldownTurns || 0) || 0) <= 0;
}

function formatPotionCd() {
  const t = Number(state.potionCooldownTurns || 0) || 0;
  return t > 0 ? `${t} turns` : "Ready";
}

function setPotionCooldown(turns = 10) {
  state.potionCooldownTurns = POTION_COOLDOWN_TURNS;
  saveProgress();
}

// =========================
// ✅ SILENCE STATUS
// =========================
function isSilenced(f) {
  return !!(f && f.silenced && f.silenced > 0);
}

// =========================
// ✅ LEGENDARY PASSIVE: YROL doubles stats when hit by SKILL damage (5 min CD)
// =========================
function tryYrolPassive(defender, opts) {
  if (!defender || defender.id !== "yrol") return;
  if (!opts || opts.source !== "skill") return;

  // Internal passive cooldown (5 minutes)
  const now = Date.now();
  if (defender.passiveCdUntil && defender.passiveCdUntil > now) return;

  // Double core stats (ATK / Shield / Life) without full-healing
  defender.atk *= 2;

  // Life: double max HP and also double current HP (capped)
  const oldHp = defender.hp;
  defender.maxHp *= 2;
  defender.hp = Math.min(defender.maxHp, oldHp * 2);

  // Shield: double current shield but respect cap
  defender.shield = Math.min(getShieldCap(defender), defender.shield * 2);

  defender.passiveCdUntil = now + 5 * 60 * 1000;

  log(`⭐ Yrol's passive triggers! Hit by an ability → stats doubled! (5 min CD)`, "good");
  floatingDamage(defender === state.player ? "player" : "enemy", "⭐ x2", "good");
  updateUI();
}


// =========================
// 🌌 SECRET PASSIVE: COSMO (Gods Vision)
// Passive: Whenever Cosmo Secret is attacked, reflect the incoming damage back to the attacker,
// and convert the received damage into Life + Armor for Cosmo.
// =========================
function tryCosmoGodsVision(defender, attacker, dmg, opts) {
  if (!defender || defender.id !== "cosmoSecret") return;
  if (!attacker) return;

  const incoming = Math.max(0, Number(dmg || 0) || 0);
  if (incoming <= 0) return;

  // Prevent loops / self-reflect
  if (opts && opts._cosmoReflect === true) return;

  // Convert damage into Life + Armor
  const healBlocked = !canHeal(defender);
  if (!healBlocked) defender.hp = Math.min(defender.maxHp, defender.hp + incoming);

  // Gain armor (respects cap / Time Lock)
  gainShield(defender, incoming);

  // Reflect back as TRUE damage so armor does not absorb reflection
  applyDamage(attacker, incoming, {
    silent: true,
    source: "passive",
    damageType: "true",
    attackerName: defender.name,
    attacker: defender,
    _cosmoReflect: true
  });

  log(`🌌 Gods Vision triggers! ${defender.name} reflects ${incoming} damage back to ${attacker.name}.`, "good");
  floatingDamage(defender === state.player ? "player" : "enemy", `↩️ +${incoming}`, "good");
  floatingDamage(attacker === state.player ? "player" : "enemy", `-${incoming}`, "bad");
  updateUI();
}



// =========================
// 🎰 LUCKY LEGENDARY PASSIVE: Entity
// On defeating an enemy with an ABILITY (skill), permanently gain +6 ATK, +5 Armor, +5 Max HP (+5 heal, capped). (CD 3)
// =========================
function triggerRelicbornTitanOnKill(attacker, defender, opts) {
  // Passive: when an enemy dies (killed by Entity), permanently gain stats.
  // Cooldown: once every 3 turns.
  if (!attacker || attacker.id !== "relicbornTitan") return;
  if (!defender || Number(defender.hp) > 0) return;

  // ✅ IMPORTANT: Only trigger on ABILITY (skill) kills.
  // Normal attacks should NEVER grant stat gains (fixes occasional double-stat bug on attack kills).
  const src = String((opts && opts.source) || "attack").toLowerCase();
  if (src !== "skill") return;

  // Require an explicit attacker so poison/ambient damage doesn't grant buffs.
  if (opts && opts.attacker && opts.attacker !== attacker) return;

  // ✅ Prevent double-buffing the same kill (some flows can touch death twice)
  const killUid = Number(defender.uid || 0) || 0;
  if (defender._titanKillProcessed === true) return;
  if (killUid && attacker._titanLastKillUid === killUid) return;
  defender._titanKillProcessed = true;
  if (killUid) attacker._titanLastKillUid = killUid;

  attacker.titanKillCd = Number(attacker.titanKillCd || 0) || 0;
  if (attacker.titanKillCd > 0) return;

  // Permanent stat growth
  attacker.atk = Math.max(0, Number(attacker.atk || 0)) + 6;
  attacker.shieldCap = Math.max(0, Number(attacker.shieldCap || attacker.shield || attacker.def || 0)) + 5;

  // Health: increase max HP and heal +5 (capped)
  attacker.maxHp = Math.max(1, Number(attacker.maxHp || 1)) + 5;
  attacker.hp = Math.min(attacker.maxHp, Math.max(0, Number(attacker.hp || 0)) + 5);

  // Armor: also grant +5 current armor (shield), respecting cap
  attacker.shield = Math.min(getShieldCap(attacker), Math.max(0, Number(attacker.shield || 0)) + 5);

  // Keep DEF (displayed armor) in sync with current shield
  attacker.def = attacker.shield;

  attacker.titanKillCd = 3;

  log(`🌟 ${attacker.name} absorbs the fallen! +6 DMG • +5 Armor • +5 Life. (CD 3)`, "good");
  floatingDamage(attacker === state.player ? "player" : "enemy", "+STATS", "good");
  updateUI();
}
// =========================
// BASE PLAYABLE CARDS
// =========================
const BASE_CARDS = [
  {
    id: "3dm4rk",
    name: "3dm4rk",
    img: "cards/3dm4rk.png",
    atk: 3,
    def: 2,
    hp: 5,
    skillName: "Freeze Time",
    skillDesc: "Skip the enemy's next turn, deal damage equal to (enemy Armor - enemy HP), gain +2 Armor, and heal +3 HP. (cooldown 2 turns).",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      // Skip enemy turn
      foe.frozen = 1;

      // Deal (enemy Armor - enemy HP) as skill damage (can't be negative)
      const dmg = Math.max(0, (foe.shield || 0) - (foe.hp || 0));
      if (dmg > 0) applyDamage(foe, dmg, { silent: true, source: "skill" });

      // Gain +2 Armor
      const gained = gainShield(me, 2);

      // Heal +3 HP
      const healed = canHeal(me) ? (me.hp = Math.min(me.maxHp, me.hp + 3), 3) : 0;

      me.cooldown = 3;

      const healNote = canHeal(me) ? `+3 HP` : `healing blocked`;
      return { ok: true, msg: `${me.name} freezes time! Enemy loses their next turn. Damage: ${dmg}. +${gained} Armor, ${healNote}.` };
    }
  },
  {
    id: "spacePatron",
    name: "Space Patron",
    img: "cards/space-patrol.png",
    atk: 1,
    def: 1,
    hp: 3,
    skillName: "Arrest Beam",
    skillDesc: "Stun the enemy (enemy deals -2 damage next attack). (cooldown 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      foe.stunned = 1;
      me.cooldown = 3;
      return { ok: true, msg: `${me.name} uses Arrest Beam! Enemy is stunned.` };
    }
  },
  {
    id: "luckyCat",
    name: "Lucky Cat",
    img: "cards/lucky-cat.png",
    atk: 2,
    def: 2,
    hp: 4,
    skillName: "Lucky Charm",
    skillDesc: "Heal 2 HP and gain +1 Armor. (cooldown 2)",
    skill: (me) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      if (!canHeal(me)) return { ok: false, msg: `Reboot Seal blocks healing! (${me.rebootSeal} turns)` };

      me.hp = Math.min(me.maxHp, me.hp + 2);
      const gained = gainShield(me, 1);
      me.cooldown = 3;
      return { ok: true, msg: `${me.name} uses Lucky Charm! +2 HP, +${gained} Armor.` };
    }
  },

  // NEW 7 pack
  {
    id: "cosmicGod",
    name: "Cosmic God",
    img: "cards/cosmic-god.png",
    atk: 10,
    def: 10,
    hp: 15,
    skillName: "Time Reboot",
    skillDesc: "Fully restore HP and remove Frozen/Stunned. (cooldown 3)",
    skill: (me) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      if (!canHeal(me)) return { ok: false, msg: `Reboot Seal blocks Time Reboot! (${me.rebootSeal} turns)` };

      me.hp = me.maxHp;
      me.frozen = 0;
      me.stunned = 0;
      me.cooldown = 3;
      return { ok: true, msg: `${me.name} uses Time Reboot! Full restore!` };
    }
  },
  {
    id: "daysi",
    name: "Daysi",
    img: "cards/daysi.png",
    atk: 5,
    def: 0,
    hp: 1,
    skillName: "Rocket Rush",
    skillDesc: "Next attack deals +3 damage. (cooldown 2)",
    skill: (me) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      me.boost = 1;
      me.cooldown = 3;
      return { ok: true, msg: `${me.name} uses Rocket Rush! Next attack +3 dmg.` };
    }
  },
  {
    id: "patrickDestroyer",
    name: "Patrick the Destroyer",
    img: "cards/patrick-the-destroyer.png",
    atk: 4,
    def: 3,
    hp: 1,
    skillName: "Dual Slash",
    skillDesc: "Hit twice for 1 damage each (armor absorbs first). (cooldown 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      applyDamage(foe, 1, { silent: true, source: "skill", });
      applyDamage(foe, 1, { silent: true, source: "skill", });
      me.cooldown = 3;
      return { ok: true, msg: `${me.name} uses Dual Slash! 2 hits.` };
    }
  },
  {
    id: "spaceSkeletonPirate",
    name: "Space Skeleton Pirate",
    img: "cards/space-skeleton-pirate.png",
    atk: 3,
    def: 0,
    hp: 2,
    skillName: "Plasma Plunder",
    skillDesc: "Steal 1 Armor from enemy. (cooldown 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      if (foe.shield > 0) {
        foe.shield = Math.max(0, foe.shield - 1);
        const gained = gainShield(me, 1);
        me.cooldown = 3;
        updateUI();
        return { ok: true, msg: `${me.name} steals 1 Armor! (+${gained} to you)` };
      }

      me.cooldown = 3;
      return { ok: true, msg: `${me.name} tried to steal Armor... but enemy has none!` };
    }
  },
  {
  id: "tremo",
  name: "Tremo",
  img: "cards/tremo.png",
  atk: 8,
  def: 1,
  hp: 2,
  skillName: "Time Rewind",
  skillDesc: "Heal +4 HP, gain +6 Armor, and deal 9 damage. (cooldown 2)",
  skill: (me, foe) => {
    if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

    // Heal (blocked by Reboot Seal)
    const healBlocked = !canHeal(me);
    if (!healBlocked) me.hp = Math.min(me.maxHp, me.hp + 4);

    // Armor (respects Time Lock + shield cap)
    const gained = gainShield(me, 6);

    // Ability damage only (armor absorbs first)
    if (foe && Number(foe.hp) > 0) {
      applyDamage(foe, 9, { silent: true, source: "skill" });
    }

    me.cooldown = 3;

    return {
      ok: true,
      msg: healBlocked
        ? `${me.name} rewinds time! Healing was blocked, +${gained} Armor, and deals 9 damage.`
        : `${me.name} rewinds time! +4 HP, +${gained} Armor, and deals 9 damage.`
    };
  }
},
  {
    id: "angelo",
    name: "Angelo",
    img: "cards/angelo.png",
    atk: 5,
    def: 5,
    hp: 5,
    skillName: "Divine Guard",
    skillDesc: "Gain +2 Armor. (cooldown 2)",
    skill: (me) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      const gained = gainShield(me, 2);
      me.cooldown = 3;
      return { ok: true, msg: `${me.name} uses Divine Guard! +${gained} Armor.` };
    }
  },
  {
    id: "baltrio",
    name: "Baltrio",
    img: "cards/baltrio.png",
    atk: 4,
    def: 4,
    hp: 2,
    skillName: "Void Burst",
    skillDesc: "Deal 2 damage and Stun enemy. (cooldown 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      applyDamage(foe, 2, { silent: true, source: "skill", });
      foe.stunned = 1;
      me.cooldown = 3;
      return { ok: true, msg: `${me.name} casts Void Burst! 2 dmg + Stun.` };
    }
  }
];


// REMOVE_FREE_3DM4RK_TREMO
// Make 3dm4rk + Tremo shop-only (not free starters)
(() => {
  try {
    const ids = new Set(["3dm4rk", "tremo"]);
    for (let i = (BASE_CARDS || []).length - 1; i >= 0; i--) {
      if (ids.has(BASE_CARDS[i].id)) BASE_CARDS.splice(i, 1);
    }
  } catch (e) {}
})();

// =========================
// BUYABLE/UNLOCKABLE CARDS (SHOP)
// After purchase -> playable + appears in Pick, Gallery, Enemy pool
// =========================
const UNLOCKABLE_CARD_DEFS = {


  // ✅ Requested: shop-only starters
  "3dm4rk": {
    id: "3dm4rk",
    name: "3dm4rk",
    img: "cards/3dm4rk.png",
    atk: 3,
    def: 2,
    hp: 5,
    skillName: "Freeze Time",
    skillDesc: "Skip the enemy's next turn, deal damage equal to (enemy Armor - enemy HP), gain +2 Armor, and heal +3 HP. (cooldown 2 turns).",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      foe.frozen = 1;
      const dmg = Math.max(0, (foe.shield || 0) - (foe.hp || 0));
      if (dmg > 0) applyDamage(foe, dmg, { silent: true, source: "skill" });
      const gained = gainShield(me, 2);
      const healBlocked = !canHeal(me);
      if (!healBlocked) me.hp = Math.min(me.maxHp, me.hp + 3);
      me.cooldown = 3;
      return { ok: true, msg: healBlocked ? `${me.name} freezes time! Enemy loses their next turn. Damage: ${dmg}. +${gained} Armor, healing blocked.` : `${me.name} freezes time! Enemy loses their next turn. Damage: ${dmg}. +${gained} Armor, +3 HP.` };
    }
  },
  tremo: {
    id: "tremo",
    name: "Tremo",
    img: "cards/tremo.png",
    atk: 8,
    def: 1,
    hp: 2,
    skillName: "Time Rewind",
    skillDesc: "Heal +4 HP, gain +6 Armor, and deal 9 damage. (cooldown 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      const healBlocked = !canHeal(me);
      if (!healBlocked) me.hp = Math.min(me.maxHp, me.hp + 4);
      const gained = gainShield(me, 6);
      if (foe && Number(foe.hp) > 0) applyDamage(foe, 9, { silent: true, source: "skill" });
      me.cooldown = 3;
      return { ok: true, msg: healBlocked ? `${me.name} rewinds time! Healing was blocked, +${gained} Armor, and deals 9 damage.` : `${me.name} rewinds time! +4 HP, +${gained} Armor, and deals 9 damage.` };
    }
  },
  nebulaGunslinger: {
    id: "nebulaGunslinger",
    name: "Nebula Gunslinger",
    img: "cards/nebula-gunslinger.png",
    atk: 6,
    def: 1,
    hp: 4,
    skillName: "Ricochet Shot",
    skillDesc: "Deal 2 damage to enemy twice (armor absorbs first). (CD 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      applyDamage(foe, 2, { silent: true, source: "skill", });
      applyDamage(foe, 2, { silent: true, source: "skill", });
      me.cooldown = 3;
      return { ok: true, msg: `${me.name} uses Ricochet Shot! 2 hits.` };
    }
  },

  solarPriestessSeraph: {
    id: "solarPriestessSeraph",
    name: "Solar Priestess Seraph",
    img: "cards/celestial-priestess.png",
    atk: 2,
    def: 2,
    hp: 8,
    skillName: "Radiant Blessing",
    skillDesc: "Heal +5 Life and gain +3 Armor. If below 70% Life: heal +6 instead. (CD 2)",
    skill: (me) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      if (!canHeal(me)) return { ok: false, msg: `Reboot Seal blocks healing! (${me.rebootSeal} turns)` };

      const below70 = me.hp <= Math.floor(me.maxHp * 0.70);
      const healAmt = below70 ? 6 : 5;

      me.hp = Math.min(me.maxHp, me.hp + healAmt);
      const gained = gainShield(me, 3);

      me.cooldown = 3;
      return { ok: true, msg: `${me.name} uses Radiant Blessing! +${healAmt} HP, +${gained} Armor.` };
    }
  },

  nebulaBladeDancer: {
    id: "nebulaBladeDancer",
    name: "Space Duelist",
    img: "cards/space-duelist.png",
    atk: 4,
    def: 1,
    hp: 5,
    skillName: "Starstep Combo",
    skillDesc: "Heal 5 HP, gain +5 Armor, then deal 3 damage three times. If enemy armor hits 0, deal +4 bonus damage. (CD 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      // Heal +5
      if (canHeal(me)) me.hp = Math.min(me.maxHp, me.hp + 5);

      // Gain +5 Armor (respect cap / Time Lock)
      const gained = gainShield(me, 5);

      // Deal 3 damage three times
      applyDamage(foe, 3, { silent: true, source: "skill", });
      applyDamage(foe, 3, { silent: true, source: "skill", });
      applyDamage(foe, 3, { silent: true, source: "skill", });

      // Bonus if enemy armor becomes 0
      if (foe.hp > 0 && foe.shield === 0) {
        applyDamage(foe, 4, { silent: true, source: "skill", });
        me.cooldown = 3;
        return { ok: true, msg: `${me.name} uses Starstep Combo! Healed 5, +${gained} Armor, 3 hits + bonus strike!` };
      }

      me.cooldown = 3;
      return { ok: true, msg: `${me.name} uses Starstep Combo! Healed 5, +${gained} Armor, 3 hits.` };
    }
  },

  voidChronomancer: {
    id: "voidChronomancer",
    name: "Void Chronomancer",
    img: "cards/void-chronomancer.png",
    atk: 5,
    def: 2,
    hp: 6,
    skillName: "Temporal Collapse",
    skillDesc: "Deal 6 damage, heal 4 HP, remove all enemy armor, apply Time Lock (enemy can't gain armor for 2 turns). (CD 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      // Damage
      applyDamage(foe, 6, { silent: true, source: "skill", });

      // Heal
      let healed = 0;
      if (canHeal(me)) {
        const before = me.hp;
        me.hp = Math.min(me.maxHp, me.hp + 4);
        healed = me.hp - before;
      }

      // Remove all enemy armor
      const removed = foe.shield;
      foe.shield = 0;

      // Time Lock (2 turns)
      foe.noArmorGain = Math.max(foe.noArmorGain || 0, 2);

      me.cooldown = 3;
      updateUI();
      return { ok: true, msg: `${me.name} collapses time! 6 dmg, healed ${healed}, removed ${removed} armor, Time Lock (2 turns).` };
    }
  },

  // ✅ NEW: Starbreaker Null King (ANTI COSMIC GOD)
  starbreakerNullKing: {
    id: "starbreakerNullKing",
    name: "Starbreaker Null King",
    img: "cards/start-breaker-null-king.png",
    atk: 6,
    def: 4,
    hp: 10,
    skillName: "Reality Lock",
    skillDesc: "Deal 30 damage, remove ALL enemy armor, apply Reboot Seal (1 turns) — enemy cannot heal. (CD 3)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      applyDamage(foe, 30, { silent: true, source: "skill", });

      const removed = foe.shield;
      foe.shield = 0;

      foe.rebootSeal = Math.max(foe.rebootSeal || 0, 2);

      me.cooldown = 1;
      updateUI();
      return {
        ok: true,
        msg: `${me.name} uses Reality Lock! 30 dmg, removed ${removed} armor, Reboot Seal (1 turns).`
      };
    }
  },

novaEmpress: {
  id: "novaEmpress",
  name: "Nova Empress",
  img: "cards/nova-express.png",
  atk: 10,
  def: 6,
  hp: 9,
  skillName: "Supernova",
  skillDesc: "Deal 8 damage. If this defeats the enemy, heal 5 HP. (CD 3)",
  skill: (me, foe) => {
    if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
    const foeHpBefore = foe.hp;
    applyDamage(foe, 8, { silent: true, source: "skill", });
    if (foeHpBefore > 0 && foe.hp <= 0) me.hp = Math.min(me.maxHp, me.hp + 5);
    me.cooldown = 3;
    updateUI();
    return { ok: true, msg: `${me.name} unleashes Supernova!` };
  }
},

voidSamurai: {
  id: "voidSamurai",
  name: "Void Samurai",
  img: "cards/void-samorai.png",
  atk: 8,
  def: 7,
  hp: 7,
  skillName: "Void Counter",
  skillDesc: "Gain 4 armor and deal 6 damage. (CD 2)",
  skill: (me, foe) => {
    if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
    const gained = gainShield(me, 4);
    applyDamage(foe, 6, { silent: true, source: "skill", attackerName: me.name, damageType: "physical" });
    me.cooldown = 3;
    updateUI();
    return { ok: true, msg: `${me.name} uses Void Counter! +${gained} armor, 6 damage.` };
  }
},

astroWitch: {
  id: "astroWitch",
  name: "Astro Witch",
  img: "cards/astrowitch.png",
  atk: 15,
  def: 1,
  hp: 3,
  skillName: "Astral Surge",
  skillDesc: "Deal 15 true damage (ignores armor). (CD 3)",
  skill: (me, foe) => {
    if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

    const dmg = 15;
    applyDamage(foe, dmg, { silent: true, source: "skill", damageType: "true", attackerName: me.name });

    me.cooldown = 3;
    updateUI();
    return { ok: true, msg: `${me.name} casts Astral Surge! ${dmg} true damage.` };
  }
}


,

  // ✅ REDEEM LEGENDARIES
  yrol: {
    id: "yrol",
    name: "Yrol",
    img: "cards/yrol.png",
    atk: 15,
    def: 10,
    hp: 12,
    skillName: "Overclock Catalyst",
    skillDesc: "Passive: If Yrol takes damage from an enemy skill, Yrol doubles ATK/Shield/Max HP once every 5 minutes. (5 min internal CD)",
    // Passive is handled via onReceiveDamage hook below
    skill: (me, foe) => {
      // Optional active skill placeholder (no-op); still respects 5 min cooldown if used in future
      return { ok: false, msg: "Yrol's power is passive. (Triggers when hit by an ability.)" };
    },
    legendaryPassive: true
  },

  abarskie: {
    id: "abarskie",
    name: "Abarskie",
    img: "cards/abarskie.png",
    atk: 15,
    def: 10,
    hp: 12,
    skillName: "Null Hymn",
    skillDesc: "Silence enemy (no skill) for 2 turns and deal damage based on enemy HP+Shield (40%) + enemy current ATK + HP + DEF (stackable every cast). Cooldown: 2 turns.",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      // Silence enemy for 2 turns
      foe.silenced = Math.max(foe.silenced || 0, 2);

      // Base damage: 40% of enemy current HP + Shield
      const total = (foe.hp || 0) + (foe.shield || 0);
      const baseDmg = Math.max(1, Math.ceil(total * 0.40));

      // Extra bonus damage based on enemy current stats (recalculated each cast)
      const bonusLife = Math.max(0, Number(foe.hp || 0) || 0);
      const bonusDef  = Math.max(0, Number(foe.shield || 0) || 0);
      const bonusAtk  = Math.max(0, Number(foe.atk || 0) || 0);

      const dmg = baseDmg + bonusLife + bonusDef + bonusAtk;

      // ✅ STACKING BUFF (requested): Abarskie gains the enemy's current stats each cast
      // This makes the "stackable every cast" part visible on Abarskie's card.
      // +Damage/ATK
      me.atk = Math.max(0, Number(me.atk || 0) || 0) + bonusAtk;

      // +Life/HP (increase max HP and also heal that amount, capped)
      me.maxHp = Math.max(1, Number(me.maxHp || 1) || 1) + bonusLife;
      me.hp = Math.min(me.maxHp, Math.max(0, Number(me.hp || 0) || 0) + bonusLife);

      // +Defense/Armor (increase shield cap and current shield, then sync DEF)
      me.shieldCap = Math.max(0, Number(me.shieldCap || me.shield || me.def || 0) || 0) + bonusDef;
      me.shield = Math.min(getShieldCap(me), Math.max(0, Number(me.shield || 0) || 0) + bonusDef);
      me.def = me.shield;

      // Mark as skill damage (for passives like Yrol)
      applyDamage(foe, dmg, { silent: true, source: "skill", attacker: me, attackerName: me.name });

      // Cooldown: 2 turns (this game uses +1 convention: CD 2 -> set to 3)
      me.cooldown = 3;

      updateUI();
      return {
        ok: true,
        msg: `${me.name} uses Null Hymn! Enemy is Silenced (2 turns) and takes ${dmg} damage. ` +
             `Abarskie absorbs power: +${bonusAtk} DMG, +${bonusLife} Life, +${bonusDef} DEF.`
      };
    }
  },

  // =========================
  // ✅ NEW CARDS (SHOP UPDATE)
  // =========================

  // 🎰 Lucky Draw Legendary
  relicbornTitan: {
    id: "relicbornTitan",
    name: "Entity",
    img: "cards/entity.png",
    atk: 6,
    def: 5,
    hp: 5,
    // ✅ Mission-gated enemy card (do not show/spawn until unlocked)
    secret: true,
    skillName: "Armor Break Roulette",
    skillDesc: "Remove ALL enemy armor, then 50% chance to deal 25 damage, otherwise 5 damage. (CD 1) Passive: On ability kill, permanently gain +6 DMG, +5 Armor, +5 Life (CD 3).",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      const removed = foe.shield || 0;
      foe.shield = 0;

      const big = Math.random() < 0.5;
      const dmg = big ? 25 : 5;
      applyDamage(foe, dmg, { silent: true, source: "skill", attacker: me, attackerName: me.name });

      me.cooldown = 1;
      updateUI();
      return { ok: true, msg: `${me.name} shatters armor (-${removed}) and rolls ${big ? "CRITICAL" : "Normal"}! ${dmg} damage.` };
    }
  },


  drNemesis: {
    id: "drNemesis",
    name: "Dr. Nemesis",
    img: "cards/dr-nemesis.png",
    atk: 10,
    def: 5,
    hp: 8,
    skillName: "Scientific Calculation",
    skillDesc: "Apply poison each round equal to 50% of enemy ATK, and apply a debuff each round: -5 ATK and -5 Armor. Effects stop when the enemy dies. (CD 3)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      // Poison: 50% of enemy ATK each round (until death)
      foe.poisonRounds = Math.max(foe.poisonRounds || 0, 999);
      foe.poisonPct = 0.50;       // 50% of ATK
      foe.poisonFlat = 0;

      // Debuff: every round, -5 ATK and -5 Armor (until death)
      foe.debuffRounds = Math.max(foe.debuffRounds || 0, 999);
      foe.debuffAtk = 5;
      foe.debuffShield = 5;

      me.cooldown = 3;
      updateUI();
      return { ok: true, msg: `${me.name} uses Scientific Calculation! Enemy is poisoned and weakened every round until they die.` };
    }
  },

  hollyChild: {
    id: "hollyChild",
    name: "Holly Child",
    img: "cards/holly-child.png",
    atk: 15,
    def: 10,
    hp: 3,
    skillName: "Enhancer",
    skillDesc: "Deal 5 poison damage to the enemy every round until the enemy dies. (CD 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      foe.poisonRounds = Math.max(foe.poisonRounds || 0, 999);
      foe.poisonPct = 0;
      foe.poisonFlat = 5;

      me.cooldown = 3;
      updateUI();
      return { ok: true, msg: `${me.name} uses Enhancer! Enemy will take 5 poison damage every round until they die.` };
    }
  },

  ohtensahorse: {
    id: "ohtensahorse",
    name: "Otehnsahorse",
    img: "cards/ohtensahorse.png",
    atk: 5,
    def: 4,
    hp: 7,
    skillName: "Sausage Beam",
    skillDesc: "50% chance to blast 25 damage, otherwise 5 damage. (CD 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      const big = Math.random() < 0.5;
      const dmg = big ? 25 : 5;

      applyDamage(foe, dmg, { silent: true, source: "skill" });

      me.cooldown = 3;
      updateUI();
      return { ok: true, msg: `${me.name} fires Sausage Beam! ${big ? "CRITICAL" : "Normal"} blast for ${dmg} damage.` };
    }
  },

  spidigong: {
    id: "spidigong",
    name: "Spidigong",
    img: "cards/spidigong.png",
    atk: 25,
    def: 5,
    hp: 5,
    skillName: "Tukhang",
    skillDesc: "60% chance to stun the enemy for 2 rounds. While stunned, they cannot attack or use skills. (CD 3)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      const ok = Math.random() < 0.60;
      if (ok) {
        foe.stun2Rounds = Math.max(foe.stun2Rounds || 0, 2);
        me.cooldown = 3;
        updateUI();
        return { ok: true, msg: `${me.name} uses Tukhang! Enemy is stunned and cannot act for 2 rounds.` };
      }

      me.cooldown = 3;
      updateUI();
      return { ok: true, msg: `${me.name} uses Tukhang... but it failed to stun.` };
    }
  },



  // LIMITED EDITION (secret) - unlocked via 50 win streak
  cosmoSecret: {
    id: "cosmoSecret",
    name: "Cosmo Secret",
    img: "cards/cosmo-secret.png",
    atk: 50,
    def: 40,
    hp: 100,
    secret: true,
    skillName: "Gods Vision",
    skillDesc: "Passive: Whenever someone attacks this card, it reflects the damage back to them. Damage received is converted into Life + Armor for Cosmo.",
    skill: (me, foe) => {
      return { ok: false, msg: "Gods Vision is passive. (Triggers when attacked.)" };
    }
  },

  
  // ⚡ OMEN REWARD (not buyable) — revealed after defeating Cosmo Secret

  // ⚡ OMEN REWARD (not buyable) — revealed after defeating Cosmo Secret
  rayBill: {
    id: "rayBill",
    name: "Ray Bill",
    img: "cards/ray-bill.png",
    atk: 8,
    def: 8,
    hp: 5,
    secret: true,
    skillName: "Summon Thor's Ungodly Power",
    skillDesc: "Throws random 100–300 burst TRUE magic damage (penetrates armor). Converts generated damage into Damage + HP + Armor (NOT stackable). (Cooldown: 5 turns)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      const roll = randInt(100, 300);

      // TRUE magic damage: bypass armor
      applyDamage(foe, roll, {
        silent: true,
        source: "skill",
        damageType: "true",
        attacker: me,
        attackerName: me.name
      });

      // ✅ NON-STACKABLE CONVERT:
      // The rolled number becomes Ray Bill's bonus Damage/HP/Armor for this battle,
      // but it does NOT accumulate across multiple casts.
      // We keep original stats once, then re-apply from that baseline each cast.
      if (me._rbBaseAtk == null) {
        me._rbBaseAtk = Number(me.atk || 0) || 0;
        me._rbBaseMaxHp = Number(me.maxHp || 1) || 1;
        me._rbBaseShield = Number(me.shield || 0) || 0;
        me._rbBaseShieldCap = Number(me.shieldCap || me._rbBaseShield || 0) || 0;
      }

      // Damage becomes (base + roll) — NOT stackable (overwrites previous roll bonus)
      me.atk = me._rbBaseAtk + roll;

      // HP becomes (base + roll) — NOT stackable (overwrites previous roll bonus)
      const healBlocked = !canHeal(me);
      me.maxHp = me._rbBaseMaxHp + roll;
      if (!healBlocked) {
        // convert into life: set to full new max HP
        me.hp = me.maxHp;
      } else {
        // still clamp current HP to new max
        me.hp = Math.min(me.maxHp, Number(me.hp || 0) || 0);
      }

      // Armor/DEF becomes (base + roll) — NOT stackable, and must scale with roll.
      // IMPORTANT: Ray Bill's conversion should show the rolled number on DEF.
      // Some effects (e.g., Time Lock) block "armor gain" via gainShield();
      // but Ray Bill's skill SETS armor directly (non-stackable overwrite), so we
      // still apply it even if canGainArmor() is false.
      const armorBlocked = !canGainArmor(me);
      const before = Number(me.shield || 0) || 0;

      // Ensure the cap can display the full rolled armor amount (otherwise UI may clamp to 6/8).
      me.shieldCap = me._rbBaseShieldCap + roll;
      me.shield = me._rbBaseShield + roll;
      me.def = me.shield; // UI reads DEF from f.def

      const gained = Math.max(0, me.shield - before);

      me.cooldown = 5;
      updateUI();

      return {
        ok: true,
        msg: `⚡ ${me.name} summons Thor's ungodly power! ${roll} TRUE damage. Damage set to ${me.atk}. ` +
             `${healBlocked ? "Healing blocked" : `HP set to ${me.hp}/${me.maxHp}`}. ` +
             `Armor/DEF set to ${me.shield}${armorBlocked ? " (ignored Time Lock)" : ""}.`
      };
    }
  },


  diablo: {
    id: "diablo",
    name: "Diablo",
    img: "cards/diablo.png",
    atk: 2,
    def: 5,
    hp: 8,
    secret: true,
    skillName: "Hellfire Ascension",
    skillDesc: "Deal 12 damage, gain +4 Armor, and heal +7 HP. (CD 3)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      applyDamage(foe, 12, { silent: true, source: "skill" });
      const gained = gainShield(me, 4);
      const healBlocked = !canHeal(me);
      if (!healBlocked) me.hp = Math.min(me.maxHp, me.hp + 7);
      me.cooldown = 3;
      return { ok: true, msg: healBlocked ? `${me.name} unleashes Hellfire! 12 dmg, +${gained} Armor, healing blocked.` : `${me.name} unleashes Hellfire! 12 dmg, +${gained} Armor, +7 HP.` };
    }
  },

  // 🕳️ MISSION 4 REWARD (not buyable) — revealed after defeating Entity
  antiMatter: {
    id: "antiMatter",
    name: "Anti-Matter",
    img: "cards/anti-matter.png",
    atk: 12,
    def: 10,
    hp: 20,
    secret: true,
    skillName: "Genesis Collapse",
    skillDesc: "Generate random 50–2000 TRUE magic damage (penetrates armor). Convert the generated number into Life + Armor (NOT stackable). (Cooldown: 15 turns)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      const roll = randInt(50, 2000);

      // TRUE magic damage: bypass armor
      applyDamage(foe, roll, {
        silent: true,
        source: "skill",
        damageType: "true",
        attacker: me,
        attackerName: me.name
      });

      // ✅ NON-STACKABLE CONVERT:
      // The rolled number becomes Anti-Matter's bonus Life/Armor for this battle,
      // but it does NOT accumulate across multiple casts.
      if (me._amBaseMaxHp == null) {
        me._amBaseMaxHp = Number(me.maxHp || 1) || 1;
        me._amBaseShield = Number(me.shield || 0) || 0;
        me._amBaseShieldCap = Number(me.shieldCap || me._amBaseShield || 0) || 0;
      }

      // Life becomes (base + roll)
      const healBlocked = !canHeal(me);
      me.maxHp = me._amBaseMaxHp + roll;
      if (!healBlocked) {
        me.hp = me.maxHp;
      } else {
        me.hp = Math.min(me.maxHp, Number(me.hp || 0) || 0);
      }

      // Armor/DEF becomes (base + roll) — set directly so it still works under Time Lock
      const armorBlocked = !canGainArmor(me);
      me.shieldCap = me._amBaseShieldCap + roll;
      me.shield = me._amBaseShield + roll;
      me.def = me.shield;

      // 15-turn cooldown → set to 16 (same convention: CD 2 uses 3)
      me.cooldown = 16;
      updateUI();

      return {
        ok: true,
        msg: `🕳️ ${me.name} collapses genesis! ${roll} TRUE damage. ` +
             `${healBlocked ? "Healing blocked" : `HP set to ${me.hp}/${me.maxHp}`}. ` +
             `Armor/DEF set to ${me.shield}${armorBlocked ? " (ignored Time Lock)" : ""}.`
      };
    }
  },

  // 🐉 MISSION 5 TARGET (Enemy-only)
  // NOTE: Actual stats are randomized per spawn via buildAwakenedMonster().
  awakenedMonster: {
    id: "awakenedMonster",
    name: "Awakened Monster",
    img: "cards/am.png",
    atk: 1200,
    def: 1200,
    hp: 1200,
    secret: true,
    enemyOnly: true,
    skillName: "Abyss Awakening",
    skillDesc: "Generate random 200–2000 damage. Convert the generated number into Life + Defense (not stackable). (CD 3)",
    skill: (me, foe) => {
      if ((me.cooldown || 0) > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      const roll = randInt(200, 2000);
      applyDamage(foe, roll, { silent: true, source: "skill", attacker: me, attackerName: me.name });

      // NON-STACKABLE convert (same style as Anti-Matter):
      if (me._awBaseMaxHp == null) {
        me._awBaseMaxHp = Number(me.maxHp || 1) || 1;
        me._awBaseShield = Number(me.shield || 0) || 0;
        me._awBaseShieldCap = Number(me.shieldCap || me._awBaseShield || 0) || 0;
      }

      const healBlocked = !canHeal(me);
      me.maxHp = me._awBaseMaxHp + roll;
      if (!healBlocked) {
        me.hp = me.maxHp;
      } else {
        me.hp = Math.min(me.maxHp, Number(me.hp || 0) || 0);
      }

      const armorBlocked = !canGainArmor(me);
      me.shieldCap = me._awBaseShieldCap + roll;
      me.shield = me._awBaseShield + roll;
      me.def = me.shield;

      me.cooldown = 4;
      updateUI();

      return {
        ok: true,
        msg: `👿 ${me.name} awakens: ${roll} damage. ` +
             `${healBlocked ? "Healing blocked" : `HP set to ${me.hp}/${me.maxHp}`}. ` +
             `Defense set to ${me.shield}${armorBlocked ? " (Time Lock blocked armor gain)" : ""}.`
      };
    }
  },
};

// 👑 STORY BOSS (not in gallery pool; spawned directly)
const OMNI_BOSS_ID = "omniGod";

// 🐉 Mission 5 boss builder (randomized stats per spawn)
function buildAwakenedMonster() {
  const hp = randInt(300, 2000);
  const atk = randInt(300, 2000);
  const def = randInt(300, 2000);

  // Start from the definition (keeps skill/lore text consistent)
  const base = (UNLOCKABLE_CARD_DEFS && UNLOCKABLE_CARD_DEFS.awakenedMonster)
    ? UNLOCKABLE_CARD_DEFS.awakenedMonster
    : { id: "awakenedMonster", name: "Awakened Monster", img: "cards/am.png" };

  return {
    ...base,
    atk,
    def,
    hp
  };
}

function buildOmniBoss() {
  const hp = randInt(1000, 5000);
  const atk = randInt(1000, 5000);
  const def = randInt(1000, 5000);
  return {
    id: OMNI_BOSS_ID,
    name: "Omni",
    img: "cards/omni.png",
    atk,
    def,
    hp,
    skillName: "Gods Justice",
    skillDesc: "Random 500–5000 TRUE damage (penetrates armor directly to life). (CD 3)",
    cooldownTurns: 3,
    skill: (me, foe) => {
      if ((me.cooldown || 0) > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      const roll = randInt(500, 5000);
      applyDamage(foe, roll, {
        silent: true,
        source: "skill",
        damageType: "true",
        attacker: me,
        attackerName: me.name
      });
      me.cooldown = 4;
      return { ok: true, msg: `⚖️ Gods Justice strikes for ${roll} TRUE damage.` };
    }
  };
}

// =========================
// 🎯 MISSION GATES (visibility + unlock flow)
// Mission 1: 50 win streak -> unlocks Cosmo Secret (owned)
// Mission 2: defeat Cosmo Secret -> unlocks Ray Bill (owned) + unlocks Diablo (enemy + gallery)
// Mission 3: defeat Diablo -> unlocks Mission 4 (Entity battle)
// Mission 4: defeat Entity -> unlocks Awakened Monster (enemy-only boss)
// Mission 5: defeat Awakened Monster -> unlocks Anti-Matter (owned)
// Mission 6: defeat Anti-Matter -> unlocks Boss Fight (Story Mode)
// =========================
function isMission1Complete() {
  return !!(state && state.owned && state.owned["cosmoSecret"]);
}

function isMission2Complete() {
  return !!(state && state.missions && state.missions.cosmoRevelationDefeated);
}

function isMission3Complete() {
  return !!(state && state.missions && state.missions.diabloDefeated);
}

function isMission4Complete() {
  return !!(state && state.missions && state.missions.entityDefeated);
}

function ensureMissionUnlockDefaults() {
  if (!state.missions) state.missions = {};
  const m = state.missions;

  // These flags control whether secret enemy cards are visible/spawnable.
  if (m.diabloUnlocked !== true) m.diabloUnlocked = false;
  if (m.entityUnlocked !== true) m.entityUnlocked = false;
  if (m.entityDefeated !== true) m.entityDefeated = false;
  if (m.antiMatterUnlocked !== true) m.antiMatterUnlocked = false;
  if (m.antiMatterDefeated !== true) m.antiMatterDefeated = false;
  if (m.awakenMonsterDefeated !== true) m.awakenMonsterDefeated = false;
  if (m.godOfAllGodsModalShown !== true) m.godOfAllGodsModalShown = false;

  // ✅ Backfill mission unlocks for older saves / edge cases.
  // Mission 2 complete → Diablo becomes visible/spawnable.
  if (isMission2Complete()) m.diabloUnlocked = true;

  // Mission 3 complete → Entity becomes visible/spawnable (Mission 4 target).
  // NOTE: Do NOT require Entity to be defeated to make it spawnable, otherwise Mission 4 can never start.
  if (isMission3Complete()) m.entityUnlocked = true;
}

const SHOP_CARDS = [

  // ✅ Requested: make these buyable (no longer free)
  {
    id: "3dm4rk",
    name: "3dm4rk",
    img: "cards/3dm4rk.png",
    price: 1000,
    desc: "Damage: 3 • Armor: 2 • Life: 5 • Ability: Freeze Time (CD 2) — Skip enemy turn, deal (enemy Armor - enemy HP), gain +2 Armor, heal +3 HP.",
    playable: true
  },
  {
    id: "tremo",
    name: "Tremo",
    img: "cards/tremo.png",
    price: 1000,
    desc: "Damage: 8 • Armor: 1 • Life: 2 • Ability: Time Rewind (CD 2) — Heal +4 HP, gain +6 Armor, deal 9 damage.",
    playable: true
  },

{
  id: "novaEmpress",
  name: "Nova Empress",
  img: "cards/nova-express.png",
  price: 950,
  desc: "Damage: 10 • Armor: 6 • Life: 9 • Ability: Supernova (CD 3) — Deal 8 damage. If it defeats the enemy, heal 5 HP.",
  playable: true
},
{
  id: "voidSamurai",
  name: "Void Samurai",
  img: "cards/void-samorai.png",
  price: 1290,
  desc: "Damage: 8 • Armor: 7 • Life: 7 • Ability: Void Counter (CD 2) — Gain 4 armor and deal 6 damage.",
  playable: true
},
{
  id: "astroWitch",
  name: "Astro Witch",
  img: "cards/astrowitch.png",
  price: 1800,
  desc: "Damage: 15 • Armor: 1 • Life: 3 • Ability: Astral Surge (CD 3) — Deal 10 true damage (ignores armor).",
  playable: true
},


  {
    id: "nebulaGunslinger",
    name: "Nebula Gunslinger",
    img: "cards/nebula-gunslinger.png",
    price: 500,
    desc: "Damage: 6 • Armor: 1 • Life: 4 • Ability: Ricochet Shot (CD 2) — Deal 2 damage twice (armor absorbs first).",
    playable: true
  },
  {
    id: "solarPriestessSeraph",
    name: "Solar Priestess Seraph",
    img: "cards/celestial-priestess.png",
    price: 650,
    desc: "Damage: 2 • Armor: 2 • Life: 8 • Ability: Radiant Blessing (CD 2) — Heal +3 & +2 Armor. If below 50%: heal +5.",
    playable: true
  },
  {
    id: "nebulaBladeDancer",
    name: "Nebula Blade Dancer",
    img: "cards/space-duelist.png",
    price: 700,
    desc: "Damage: 4 • Armor: 1 • Life: 5 • Ability: Starstep Combo (CD 2) — Deal 2 damage x3. If enemy armor hits 0: +2 bonus dmg.",
    playable: true
  },
  {
    id: "voidChronomancer",
    name: "Void Chronomancer",
    img: "cards/void-chronomancer.png",
    price: 850,
    desc: "Damage: 5 • Armor: 2 • Life: 6 • Ability: Temporal Collapse (CD 3) — Deal 3 dmg, remove all enemy armor, Time Lock (2 turns).",
    playable: true
  },

  // ✅ NEW SHOP ITEM
  {
    id: "starbreakerNullKing",
    name: "Starbreaker Null King",
    img: "cards/start-breaker-null-king.png",
    price: 5000,
    desc: "Damage: 6 • Armor: 4 • Life: 10 • Ability: Reality Lock (CD 3) — Deal 4 dmg, remove ALL enemy armor, apply Reboot Seal (2 turns): enemy cannot heal.",
    playable: true
  }
,
  // ✅ NEW SHOP ITEMS (Update)
  {
    id: "drNemesis",
    name: "Dr. Nemesis",
    img: "cards/dr-nemesis.png",
    price: 15000,
    desc: "Damage: 10 • Armor: 5 • Life: 8 • Ability: Scientific Calculation (CD 3) — Poison enemy each round for 50% of their ATK, and apply a debuff each round: -5 ATK and -5 Armor (until enemy dies).",
    playable: true
  },
  {
    id: "hollyChild",
    name: "Holly Child",
    img: "cards/holly-child.png",
    price: 3000,
    desc: "Damage: 15 • Armor: 10 • Life: 3 • Ability: Enhancer (CD 2) — Deal 5 poison damage to enemy every round (until enemy dies).",
    playable: true
  },
  {
    id: "ohtensahorse",
    name: "Otehnsahorse",
    img: "cards/ohtensahorse.png",
    price: 85000,
    desc: "Damage: 5 • Armor: 4 • Life: 7 • Ability: Sausage Beam (CD 2) — 50% chance to blast 25 damage, otherwise 5 damage.",
    playable: true
  },
  {
    id: "spidigong",
    name: "Spidigong",
    img: "cards/spidigong.png",
    price: 25000,
    desc: "Damage: 25 • Armor: 5 • Life: 5 • Ability: Tukhang (CD 3) — 60% chance to stun enemy for 2 rounds (enemy cannot attack or use skills).",
    playable: true
  }

];

// =========================
// CARD LORE (Gallery)
// =========================
const CARD_LORE = {
  "3dm4rk": "A time-hacker who learned to freeze battles by stealing seconds from the void.",
  "spacePatron": "An interstellar peacekeeper—half cop, half cosmic beacon—who arrests criminals with pure light.",
  "luckyCat": "A wandering charm-spirit that follows gold trails and turns misfortune into opportunity.",
  "cosmicGod": "An ancient godform sealed beyond the stars; when it awakens, reality rewinds to its favor.",
  "cosmoSecret": "Cosmo carries forbidden star-sigils—coordinates to the throne of the *God of All Gods*. When the pantheons go to war, those sigils decide who survives the reset.",
  "rayBill": "Ray Bill was a nameless drifter until he found a broken shard of thunder sealed inside a dying star. The shard didn’t grant him lightning—it granted him a debt. Every time he calls the storm, the heavens remember, and the sky opens like a wound. He walks ahead of wars, carrying a prophecy in his bones: when the God of All Gods rises, only thunder can drown the final hymn.",
  "daysi": "A fearless rocket courier who wins fights the same way she wins races: faster than fear.",
  "patrickDestroyer": "A duelist raised in asteroid mines—quiet, brutal, and famous for never needing a second chance.",
  "spaceSkeletonPirate": "A pirate crew’s last survivor, reanimated by plasma—still hungry for stolen armor.",
  "tremo": "A chrononaut who rewinds timelines until the outcome feels ‘right’—even if it breaks the rules.",
  "angelo": "A divine sentinel who shields allies with faith-forged armor.",
  "baltrio": "A void-born twin-soul condensed into one body—its burst leaves only silence.",

  "nebulaGunslinger": "A bounty hunter from the nebula frontier; every shot ricochets like a grudge.",
  "solarPriestessSeraph": "High priestess of the Sunforge—her blessing mends flesh and hardens light into armor.",
  "nebulaBladeDancer": "A starstep duelist who fights like a comet—heal, guard, then strike in dazzling rhythm.",
  "voidChronomancer": "A scholar of collapsing moments; he erases armor as if it never existed.",
  "starbreakerNullKing": "A king without a throne—he locks reality itself, sealing healing and shattering defenses.",
  "novaEmpress": "Ruler of the Supernova Court; her wrath burns worlds, her victories restore her crown.",
  "voidSamurai": "A warrior who learned to parry the void—countering with armor and a single decisive cut.",
  "astroWitch": "A witch who reads constellations like spells—her astral surge ignores all protection.",

  "yrol": "A legendary overclocker who evolves under pressure—each ability strike can awaken a new form.",
  "abarskie": "A choir of null-sound given shape; its hymn silences powers and turns enemies’ strength against them.",

  "relicbornTitan": "An Entity forged from broken relics—it spins fate like a roulette wheel and calls it justice.",
  "diablo": "Born in the Furnace Below, Diablo devours fallen souls to stoke his infernal core. Each victory feeds the flames—each defeat leaves only ash and a whisper that he will return.",
  "antiMatter": "When Entity fell, the veil tore—revealing the Gods of All Gods and their cleansing intention: deletion of all lifeforms. Anti‑Matter awakened as creation’s refusal, rolling voidfire numbers that become impossible life and armor.",
  "drNemesis": "A ruthless scientist who treats battle like an equation—poison and debuffs, repeated until solved.",
  "hollyChild": "A fragile miracle with a toxic gift—her blessing is poison that never stops.",
  "ohtensahorse": "A prankster beast of the outer rim—its beam is either a joke… or a catastrophe.",
  "spidigong": "A feared enforcer whose ‘Tukhang’ leaves opponents frozen in panic, unable to act."
};


// =========================
// RELICS (buyable)
// =========================
const RELICS = [
  { id: "spikedArmor", name: "Spiked Armor", price: 60, desc: "When you take damage, reflect 1 damage back." },
  { id: "vampireFang", name: "Vampire Fang", price: 75, desc: "Whenever you attack, heal 1 HP (up to max)." },
  { id: "luckyCoin", name: "Lucky Coin", price: 90, desc: "+5 extra gold every victory." },
  { id: "reinforcedPlating", name: "Reinforced Plating", price: 110, desc: "Your shield cap increases from 6 → 8." },
  { id: "adrenalSurge", name: "Adrenal Surge", price: 95, desc: "Below 50% HP, your attacks deal +1 damage." },
  { id: "fieldMedic", name: "Field Medic", price: 85, desc: "At the start of every stage, heal 1 HP." },

  // =========================
  // ✅ OP RELICS (shop)
  // =========================
  { id: "bloodcoreSigil", name: "Bloodcore Sigil", price: 5000, desc: "Lifesteal: heal 15% of damage you deal." },
  { id: "chronoRune", name: "Chrono Rune", price: 4500, desc: "20% chance your normal attack hits twice." },
  { id: "goldenHeart", name: "Golden Heart", price: 4000, desc: "+5 gold every turn. +10% Max HP at the start of every stage." },
  { id: "titanPlate", name: "Titan Plate", price: 3500, desc: "Reduce all incoming damage by 2 (flat)." },
  { id: "voidMirror", name: "Void Mirror", price: 4200, desc: "Reflect 25% of damage you take back to the enemy." },
  { id: "phoenixEmber", name: "Phoenix Ember", price: 6000, desc: "Once per battle: when you would die, revive at 30% HP." }
];

// =========================
// 🧪 POTIONS (shop + in-battle use)
// =========================
// NOTE: Prices are intentionally high (as requested) and are saved in your account inventory.
const POTIONS = [
  {
    id: "potionGodsUltimate",
    name: "God's Ultimate",
    price: 40000,
    desc: "Silences enemy for 2 rounds, removes enemy defense, deals 80–500 random damage, then gains HP/DEF/MAX HP equal to damage. (CD 2 turns)",
    effect: "godsUltimate",
    cooldownTurns: 2
  },

  {
    id: "potionHealth",
    name: "Potion of Health",
    price: 10000,
    desc: "Fully restores your HP. (Potion cooldown: 10 turns)",
    effect: "hp"
  },
  {
    id: "potionArmor",
    name: "Potion of Armor",
    price: 12000,
    desc: "Fully restores your armor/defense. (Potion cooldown: 10 turns)",
    effect: "armor"
  },
  {
    id: "potionEndurance",
    name: "Potion of Endurance",
    price: 18000,
    desc: "Reduces your ability cooldown by 1. (Potion cooldown: 10 turns)",
    effect: "endurance"
  },
  {
    id: "potionTwilight",
    name: "Potion of Twilight",
    price: 25000,
    desc: "Fully restores your HP and armor. (Potion cooldown: 10 turns)",
    effect: "twilight"
  },
  {
    id: "potionGalacticWanderer",
    name: "Potion of Halactic Wonderer",
    price: 500000,
    desc: "Fully restores HP + armor and reduces ability cooldown by 1. (Potion cooldown: 10 turns)",
    effect: "galactic"
  }
];

// (old real-time potion cooldown removed)
// const POTION_COOLDOWN_MS = 3 * 60 * 1000;

// =========================
// 🎰 LUCKY DRAW (Gacha)
// =========================
const LUCKY_DRAW = {
  singleCost: 2000,
  fiveCost: 10000,
  // ✅ Requested: Lucky Draw rewards
  // - 1% chance: Card (Entity)
  // - 99% chance: Gold (random 1–100)
  legendaryChance: 0.01,
  cardChance: 0.00,
  relicChance: 0.00,
  goldChance: 0.99
};

// --- Storage keys ---
const GOLD_KEY = "cb_gold";
const OWNED_KEY = "cb_owned";
const RELIC_OWNED_KEY = "cb_owned_relics";
const RELIC_EQUIPPED_KEY = "cb_equipped_relic";

// --- Potions ---
const POTION_OWNED_KEY = "cb_owned_potions_v1";
// ✅ Turn-based global potion cooldown (10 turns)
const POTION_COOLDOWN_KEY = "cb_potion_cd_turns_v1";

// --- Lucky Draw ---
const LUCKY_ENTITY_OWNED_KEY = "cb_lucky_entity_owned";
const LUCKY_HISTORY_KEY = "cb_lucky_history";

// --- Win Streak (milestones) ---
const STREAK_KEY = "cb_win_streak_v2";

// --- Card Upgrades ---
const CARD_UPGRADES_KEY = "cb_card_upgrades_v1";

// --- Missions ---
const MISSION_KEY = "cb_missions_v1";

// --- Redeem Codes ---
// Stores a map of redeemed codes so the same code can't be claimed twice.
const REDEEMED_CODES_KEY = "cb_redeemed_codes_v1";



// --- Game State ---
// =========================
// SAFE STORAGE (prevents crashes when localStorage is blocked, e.g. some file:// or privacy modes)
// =========================
const __STORAGE__ = (() => {
  try {
    const s = window.localStorage;
    const k = "__ccw_test__";
    s.setItem(k, "1");
    s.removeItem(k);
    return s;
  } catch (e) {
    return null;
  }
})();

function storageGet(key, fallback = null) {
  if (!__STORAGE__) return fallback;
  try {
    const v = __STORAGE__.getItem(key);
    return (v === null || v === undefined) ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

function storageSet(key, value) {
  if (!__STORAGE__) return;
  try { __STORAGE__.setItem(key, value); } catch (e) {}
}


const state = {
  phase: "pick",
  turn: "player",
  round: 1,
  stage: 1,
  gold: 0,
  owned: {},

  // ✅ Missions (text only on Home)
  missions: {
    totalDefeats: 0,
    cosmoRevelationDefeated: false,
    diabloUnlocked: false,
    diabloDefeated: false,
    entityUnlocked: false,
    entityDefeated: false,
    antiMatterUnlocked: false,
    antiMatterModalShown: false,
    antiMatterDefeated: false,
    awakenMonsterDefeated: false,
    godOfAllGodsModalShown: false,
  },

  // Story/Boss flow
  pendingBoss: null,
  storyBossFight: false,
  stageLabel: "",
  _awakenedSpawnedThisRun: false,
  ownedRelics: {},
  relics: [],
  equippedRelicId: null,

  // Potions: inventory counts + global potion cooldown (turn-based)
  ownedPotions: {},
  potionCooldownTurns: 0,

  luckyEntityOwned: false,
  winStreak: 0,
  bestStreak: 0,
  cardUpgrades: {},
  player: null,
  enemy: null,
  // One-time omen popup when Cosmo Secret is defeated
  rayBillOmenShown: false,
  // Last damage/ability line that affected the PLAYER (shown on defeat)
  lastHitSummary: "",
  lastAction: "",
  cosmoOmenShown: false
};

const $ = (id) => document.getElementById(id);

// =========================
// IMAGE FALLBACKS
// =========================
// If a card image file is missing, show an inline placeholder instead of a broken icon.
window.__cardPlaceholder = function (name = "Card") {
  const safe = String(name || "Card").slice(0, 26);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1f2a44"/>
      <stop offset="1" stop-color="#3a235a"/>
    </linearGradient>
  </defs>
  <rect x="18" y="18" width="364" height="564" rx="28" fill="url(#g)" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>
  <text x="200" y="310" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto" font-size="26" fill="rgba(255,255,255,0.92)">
    ${safe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}
  </text>
  <text x="200" y="350" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto" font-size="14" fill="rgba(255,255,255,0.60)">
    (art coming soon)
  </text>
</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
};



// =========================
// ☠️ COSMO OMEN MODAL (Ray Bill reveal)
// Triggered when the player defeats Cosmo Secret.
// =========================
function showCosmoOmenModal() {
  // ✅ Only show this reveal once (persisted).
  // Otherwise players would see it every time they defeat Cosmo Secret again.
  if (state && state.cosmoOmenShown) return;
  if (document.getElementById("cosmoOmenOverlay")) return;

  try {
    state.cosmoOmenShown = true;
    saveProgress();
  } catch (e) {}

  const overlay = document.createElement("div");
  overlay.className = "modalOverlay";
  overlay.id = "cosmoOmenOverlay";

  const box = document.createElement("div");
  box.className = "modalBox omenModalBox";

  const header = document.createElement("div");
  header.className = "modalHeader";

  const title = document.createElement("div");
  title.className = "modalTitle";
  title.textContent = "⚔️ The End is Near";

  const pill = document.createElement("div");
  pill.className = "modalPill";
  pill.textContent = "OMEN REVEALED";

  header.appendChild(title);
  header.appendChild(pill);

  const body = document.createElement("div");
  body.className = "modalBody";

  const p = document.createElement("p");
  p.className = "modalText";
  p.innerHTML = "<b>The end is near</b> — and war is about to begin.";

  const card = {
    name: "Ray Bill",
    img: "cards/ray-bill.png",
    atk: 8,
    def: 8,
    hp: 5,
    skillName: "Summon Thor's Ungodly Power",
    skillDesc: "Throws random 100–300 burst TRUE magic damage (penetrates armor). Converts generated damage into HP + Armor. (Cooldown: 5 turns)",
    lore: "Ray Bill was a nameless drifter until he found a broken shard of thunder sealed inside a dying star. The shard didn’t grant him lightning—it granted him a debt. Every time he calls the storm, the heavens remember, and the sky opens like a wound. He walks ahead of wars, carrying a prophecy in his bones: when the God of All Gods rises, only thunder can drown the final hymn."
  };

  const wrap = document.createElement("div");
  wrap.className = "omenCardWrap";

  const img = document.createElement("img");
  img.className = "omenCardImg";
  img.src = card.img;
  img.alt = card.name;
  img.onerror = function () {
    this.onerror = null;
    this.src = window.__cardPlaceholder(card.name);
  };

  const stats = document.createElement("div");
  stats.className = "modalStats";
  stats.innerHTML = `
    <div class="modalStat"><div class="modalStatLabel">Damage</div><div class="modalStatValue">${card.atk}</div></div>
    <div class="modalStat"><div class="modalStatLabel">Defense</div><div class="modalStatValue">${card.def}</div></div>
    <div class="modalStat"><div class="modalStatLabel">Life</div><div class="modalStatValue">${card.hp}</div></div>
    <div class="modalStat"><div class="modalStatLabel">Ability</div><div class="modalStatValue" style="font-size:14px;line-height:1.2;">${card.skillName}</div></div>
  `;

  const hint = document.createElement("div");
  hint.className = "modalHint";
  hint.textContent = "⚡ 100–300 TRUE magic • 5-turn cooldown • converts damage → HP + Armor";

  const lore = document.createElement("div");
  lore.className = "omenLore";
  lore.textContent = card.lore;

  wrap.appendChild(img);
  wrap.appendChild(stats);
  wrap.appendChild(hint);
  wrap.appendChild(lore);

  body.appendChild(p);
  body.appendChild(wrap);

  const actions = document.createElement("div");
  actions.className = "modalActions single omenActions";

  const btn = document.createElement("button");
  btn.className = "btn btnPrimary";
  btn.textContent = "Prepare";
  btn.addEventListener("click", () => {
    // ✅ Unlock Ray Bill permanently
    if (!state.owned) state.owned = {};
    state.owned["rayBill"] = true;
    state.rayBillOmenShown = true;
    try { saveProgress(); } catch(e) {}
    // Refresh UI so Ray Bill is usable immediately
    try { if (typeof renderPick === "function") renderPick(); } catch(e) {}
    try { if (typeof renderGallery === "function") renderGallery(); } catch(e) {}
    try { if (typeof renderShopCards === "function") renderShopCards(); } catch(e) {}
    try { if (typeof log === "function") log("⚡ Ray Bill unlocked! Go to Setup/Pick to use him.", "good"); } catch(e) {}
    overlay.remove();
  });
actions.appendChild(btn);

  box.appendChild(header);
  box.appendChild(body);
  box.appendChild(actions);
  overlay.appendChild(box);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}

// =========================
// 🕳️ ANTI-MATTER AWAKENED MODAL (Mission 5 reward)
// Triggered when the player defeats the Awakened Monster.
// =========================
function showAntiMatterAwakenedModal() {
  if (document.getElementById("antiMatterOmenOverlay")) return;

  // Mission 5 reward: unlock Anti-Matter as a usable card (one-time).
  ensureMissionUnlockDefaults();
  if (!state.owned) state.owned = {};
  state.owned["antiMatter"] = true;
  state.missions.antiMatterUnlocked = true;
  state.missions.antiMatterModalShown = true;
  try { saveProgress(); } catch (e) {}

  const overlay = document.createElement("div");
  overlay.className = "modalOverlay";
  overlay.id = "antiMatterOmenOverlay";

  const box = document.createElement("div");
  box.className = "modalBox omenModalBox";

  const header = document.createElement("div");
  header.className = "modalHeader";

  const title = document.createElement("div");
  title.className = "modalTitle";
  title.textContent = "🕳️ Anti-Matter Unlocked";

  const pill = document.createElement("div");
  pill.className = "modalPill";
  pill.textContent = "MISSION 5 CLEARED";

  header.appendChild(title);
  header.appendChild(pill);

  const body = document.createElement("div");
  body.className = "modalBody";

  const p = document.createElement("p");
  p.className = "modalText";
  p.innerHTML = "<b>You defeated the Awakened Monster.</b> Anti-Matter has been unlocked as a playable card.";

  const card = {
    name: "Anti-Matter",
    img: "cards/anti-matter.png",
    atk: 12,
    def: 10,
    hp: 20,
    skillName: "Genesis Collapse",
    skillDesc: "Generate random 50–2000 TRUE magic damage (penetrates armor). Convert the generated number into Life + Armor (not stackable). (CD 15)",
    lore:
      "When Entity fell, the veil tore—revealing the Gods of All Gods. Their ‘cleansing intention’ was not mercy, but deletion: a command that would remove every lifeform from the ledger of existence. In that silent decree, Anti‑Matter awakened. It is not a weapon… it is the universe’s refusal. Each time it casts, it rolls a number written in voidfire—then turns that verdict into impossible life and armor, as if daring creation to survive its own apocalypse."
  };

  const wrap = document.createElement("div");
  wrap.className = "omenCardWrap";

  const img = document.createElement("img");
  img.className = "omenCardImg";
  img.src = card.img;
  img.alt = card.name;
  img.onerror = function () {
    this.onerror = null;
    this.src = window.__cardPlaceholder(card.name);
  };

  const stats = document.createElement("div");
  stats.className = "modalStats";
  stats.innerHTML = `
    <div class="modalStat"><div class="modalStatLabel">Damage</div><div class="modalStatValue">${card.atk}</div></div>
    <div class="modalStat"><div class="modalStatLabel">Defense</div><div class="modalStatValue">${card.def}</div></div>
    <div class="modalStat"><div class="modalStatLabel">Life</div><div class="modalStatValue">${card.hp}</div></div>
    <div class="modalStat"><div class="modalStatLabel">Ability</div><div class="modalStatValue" style="font-size:14px;line-height:1.2;">${card.skillName}</div></div>
  `;

  const hint = document.createElement("div");
  hint.className = "modalHint";
  hint.textContent = "🕳️ 50–2000 TRUE magic • ignores armor • converts roll → Life + Armor • 15-turn cooldown";

  const lore = document.createElement("div");
  lore.className = "omenLore";
  lore.textContent = card.lore;

  wrap.appendChild(img);
  wrap.appendChild(stats);

  const btnRow = document.createElement("div");
  btnRow.className = "modalActions";

  const btn = document.createElement("button");
  btn.className = "btn";
  btn.textContent = "Continue";
  btn.onclick = () => {
    // Refresh views (so it appears immediately)
    try { if (typeof renderPick === "function") renderPick(); } catch (e) {}
    try { if (typeof renderGallery === "function") renderGallery(); } catch (e) {}
    try { if (typeof renderShopCards === "function") renderShopCards(); } catch (e) {}
    try { if (state.currentView === "home") updateMissionText(); } catch (e) {}

    const ov = document.getElementById("antiMatterOmenOverlay");
    if (ov) ov.remove();
  };

  btnRow.appendChild(btn);

  body.appendChild(p);
  body.appendChild(wrap);
  body.appendChild(hint);
  body.appendChild(lore);

  box.appendChild(header);
  box.appendChild(body);
  box.appendChild(btnRow);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// =========================
// 👑 GOD OF ALL GODS AWAKENED MODAL (after Mission 6)
// =========================
function showGodOfAllGodsAwakenedModal() {
  if (document.getElementById("godOfAllGodsOverlay")) return;
  ensureMissionUnlockDefaults();
  if (!state.missions || state.missions.godOfAllGodsModalShown) return;

  state.missions.godOfAllGodsModalShown = true;
  try { saveProgress(); } catch(e) {}

  const overlay = document.createElement("div");
  overlay.className = "modalOverlay";
  overlay.id = "godOfAllGodsOverlay";

  const box = document.createElement("div");
  box.className = "modalBox omenModalBox";

  box.innerHTML = `
    <div class="modalHeader">
      <div>
        <div class="modalTitle">👑 The God of All Gods has awakened</div>
        <div class="modalPill">MISSION 5 CLEARED</div>
      </div>
    </div>
    <div class="modalBody">
      <p class="modalText">
        <b>The God of all gods is already awakened</b>—and ready to erase the entire existing universe.
        <br/><br/>
        It’s your time now.
        <br/><br/>
        Go to <b>Story Mode</b> and click <b>Fight Boss Now</b>.
        <br/>
        (It becomes clickable only when Mission 6 is completed.)
      </p>

      <div class="omenLore" style="white-space:pre-wrap;">
The portal is not a door.
It is a verdict.

Anti‑Matter doesn’t beg.
It <i>refuses</i>.

And somewhere beyond the stars…
Omni has opened his eyes.
      </div>
    </div>
    <div class="modalActions">
      <button class="btn btnPrimary" id="btnGoStoryBoss">📜 Go to Story Mode</button>
      <button class="btn btnGhost" id="btnCloseGodBoss">Close</button>
    </div>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const close = () => { try { overlay.remove(); } catch(e){} };
  const btnClose = box.querySelector("#btnCloseGodBoss");
  const btnGo = box.querySelector("#btnGoStoryBoss");
  if (btnClose) btnClose.addEventListener("click", close);
  if (btnGo) btnGo.addEventListener("click", () => {
    close();
    try { openStoryMode(); } catch(e) { try { showView("story"); } catch(_e){} }
  });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
}

// =========================
// ✅ SOUND SYSTEM
// =========================
let soundUnlocked = false;

function playSfx(id, vol = 0.75) {
  const a = document.getElementById(id);
  if (!a) return;
  try {
    a.volume = vol;
    a.currentTime = 0;
    a.play();
  } catch (e) {}
}

function unlockSound() {
  if (soundUnlocked) return;
  soundUnlocked = true;

  const ids = ["sfxClick", "sfxAttack", "sfxSkill", "sfxEnd", "sfxWin", "sfxLose", "sfxBuy", "sfxDraw", "sfxJackpot"];
  ids.forEach((id) => {
    const a = document.getElementById(id);
    if (!a) return;
    try {
      a.volume = 0;
      a.play().then(() => {
        a.pause();
        a.currentTime = 0;
        a.volume = 0.75;
      }).catch(()=>{});
    } catch (e) {}
  });
}
document.addEventListener("click", unlockSound, { once: true });

// =========================
// RELIC HELPERS
// =========================
function hasRelic(id) {
  // Robust: treat equippedRelicId as the single source of truth
  return String(state.equippedRelicId || "") === String(id);
}
function getShieldCap(f) {
  const base = hasRelic("reinforcedPlating") ? 8 : 6;
  const personal = f ? Number(f.shieldCap || 0) : 0;
  return Math.max(base, Number.isFinite(personal) ? personal : 0);
}

function equipRelic(id) {
  if (!id) return;

  // ✅ Only 1 relic can be equipped at a time
  state.equippedRelicId = id;
  state.relics = [id];

  // Clamp shields if cap changed
  if (state.player) {
    state.player.shield = Math.min(getShieldCap(state.player), state.player.shield);
    state.player.def = state.player.shield;
  }
  if (state.enemy) {
    state.enemy.shield = Math.min(getShieldCap(state.enemy), state.enemy.shield);
    state.enemy.def = state.enemy.shield;
  }

  saveProgress();
  updateUI();

  // ✅ Update shop UI instantly (no page refresh)
  // Only rerender if the Shop view exists and is currently visible.
  const shopView = document.getElementById("shop");
  if (shopView && shopView.style.display !== "none") {
    renderShopRelics();
  }
}

// =========================
// SHOP TABS + RENDER
// =========================
function setShopTab(tab) {
  const relicWrap = $("shopRelicsWrap");
  const cardWrap = $("shopCardsWrap");
  const potionWrap = $("shopPotionsWrap");
  const luckyWrap = $("shopLuckyWrap");
  const bRelics = $("tabShopRelics");
  const bCards = $("tabShopCards");
  const bPotions = $("tabShopPotions");
  const bLucky = $("tabShopLucky");

  // If shop UI isn't present yet, just bail safely.
  if (!relicWrap || !cardWrap || !potionWrap || !luckyWrap || !bRelics || !bCards || !bPotions || !bLucky) return;

  if (tab === "relics") {
    relicWrap.style.display = "block";
    cardWrap.style.display = "none";
    potionWrap.style.display = "none";
    luckyWrap.style.display = "none";
    bRelics.classList.add("tabActive");
    bCards.classList.remove("tabActive");
    bPotions.classList.remove("tabActive");
    bLucky.classList.remove("tabActive");
    // Make sure list is fresh.
    renderShopRelics();
  } else if (tab === "cards") {
    relicWrap.style.display = "none";
    cardWrap.style.display = "block";
    potionWrap.style.display = "none";
    luckyWrap.style.display = "none";
    bRelics.classList.remove("tabActive");
    bCards.classList.add("tabActive");
    bPotions.classList.remove("tabActive");
    bLucky.classList.remove("tabActive");
    renderShopCards();
  } else if (tab === "potions") {
    relicWrap.style.display = "none";
    cardWrap.style.display = "none";
    potionWrap.style.display = "block";
    luckyWrap.style.display = "none";
    bRelics.classList.remove("tabActive");
    bCards.classList.remove("tabActive");
    bPotions.classList.add("tabActive");
    bLucky.classList.remove("tabActive");
    renderShopPotions();
  } else {
    // lucky
    relicWrap.style.display = "none";
    cardWrap.style.display = "none";
    potionWrap.style.display = "none";
    luckyWrap.style.display = "block";
    bRelics.classList.remove("tabActive");
    bCards.classList.remove("tabActive");
    bPotions.classList.remove("tabActive");
    bLucky.classList.add("tabActive");
    if (typeof renderLuckyDraw === "function") renderLuckyDraw();
  }
}

// =========================
// SHOP (Cards)
// =========================

function buyUpcomingCard(id) {
  const pool = (typeof getShopCardsPool === "function") ? getShopCardsPool() : [];
  const c = (pool || []).find((x) => String(x.id) === String(id));
  if (!c) return;

  const price = Math.max(0, Number(c.price || 0) || 0) || 2500;
  if (state.owned && state.owned[id]) return;
  if (state.gold < price) return;

  state.gold -= price;
  if (!state.owned) state.owned = {};
  state.owned[id] = true;

  saveProgress();
  updateGoldUI();
  renderShopCards();
  playSfx("sfxBuy", 0.85);

  alert(`Purchased: ${c.name || id} ✅\n(Owned for later)`);
}


function renderShopCards() {
  const grid = $("shopGrid");
  if (!grid) return;

  const pool = (typeof getShopCardsPool === "function") ? getShopCardsPool() : [];
  if (!pool || !pool.length) {
    grid.innerHTML = `<div class="muted">No upcoming cards configured yet.</div>`;
    return;
  }

  // Clear + render cards
  grid.innerHTML = "";
  pool.forEach((c) => {
    const id = String(c.id);
    const owned = !!(state.owned && state.owned[id]);
    const price = Math.max(0, Number(c.price || 0) || 0) || 2500; // fallback price
    const canBuy = !owned && state.gold >= price;

    const name = c.name || id;
    const imgSrc = c.img || c.image || "";
    const statsLine = (Number.isFinite(Number(c.atk)) && Number.isFinite(Number(c.def)) && Number.isFinite(Number(c.hp)))
      ? `ATK ${c.atk} • DEF ${c.def} • HP ${c.hp}`
      : (c.stats || "");

    const abilityName = c.skillName || c.abilityName || "Ability";
    const abilityDesc = c.skillDesc || c.ability || c.desc || "Upcoming card (buy to own it for later).";

    const div = document.createElement("div");
    div.className = "shopItem";
    div.innerHTML = `
      <div class="shopItemTop">
        <div>
          <h3 class="shopName">🃏 ${name}</h3>
          <div class="shopMeta">
            <span class="badge">Price: ${price} Gold</span>
            <span class="badge ${owned ? "badgeOwned" : ""}">${owned ? "Owned" : "Not owned"}</span>
            ${statsLine ? `<span class="badge">${statsLine}</span>` : ""}
          </div>
        </div>
      </div>
      <div class="shopCardMedia">
        <img class="shopCardImg" src="${imgSrc}" alt="${name}" loading="lazy" />
      </div>
      <div class="shopAbility">
        <div class="shopAbilityName">✨ ${abilityName}</div>
        <div class="shopDesc">${abilityDesc}</div>
      </div>
      <div class="shopActions">
        <button class="btn btnPrimary" ${canBuy ? "" : "disabled"} data-card-buy-id="${id}">
          ${owned ? "Owned" : (canBuy ? "Buy" : "Not Enough Gold")}
        </button>
      </div>
    `;

    // Robust image fallback (prevents broken shop cards)
    const img = div.querySelector("img.shopCardImg");
    if (img) {
      img.onerror = () => {
        img.onerror = null;
        try {
          img.src = window.__cardPlaceholder ? window.__cardPlaceholder(name) : "";
        } catch (e) {
          img.src = "";
        }
      };
    }

    grid.appendChild(div);
  });

  // Bind buys
  grid.querySelectorAll("button[data-card-buy-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      playSfx("sfxClick", 0.45);
      const id = btn.getAttribute("data-card-buy-id");
      if (!id) return;
      buyUpcomingCard(id);
    });
  });
}

function buyShopCard(id) {
  const item = (SHOP_CARDS || []).find((c) => c.id === id);
  if (!item) return;
  if (state.owned[id]) return;
  if (state.gold < item.price) return;

  state.gold -= item.price;
  state.owned[id] = true;

  saveProgress();
  updateGoldUI();
  renderShopCards();
  // Make it immediately visible in Gallery/Setup.
  if (typeof renderPick === "function") renderPick();
  if (typeof renderGallery === "function") renderGallery();

  alert(`Purchased: ${item.name} ✅\nGo to Battle/Setup to pick it!`);
}


// =========================
// SHOP (Upcoming Cards)
// =========================
function getShopCardIdSet() {
  // Used by Secrets upgrade modal to know what cards are purchasable in the shop.
  try {
    const pool = getShopCardsPool();
    return new Set((pool || []).map((c) => String(c && c.id || "")).filter(Boolean));
  } catch (e) {
    return new Set();
  }
}

function getShopCardsPool() {
  // The shop should only show the explicitly buyable cards.
  // (Avoids mission/secret cards accidentally appearing with missing price.)
  const defs = (typeof UNLOCKABLE_CARD_DEFS !== "undefined" && UNLOCKABLE_CARD_DEFS) ? UNLOCKABLE_CARD_DEFS : {};
  const shop = Array.isArray(SHOP_CARDS) ? SHOP_CARDS : [];

  // Merge SHOP_CARDS pricing with the canonical card definitions so the shop can show
  // image + stats + skill name/description.
  return shop
    .map((s) => {
      const base = defs[String(s && s.id || "")] || {};
      return {
        ...base,
        ...(s || {}),
        id: String(s && s.id || base.id || ""),
        name: s?.name || base?.name,
        img: s?.img || base?.img,
        price: Number(s?.price ?? base?.price ?? 0) || 0,
      };
    })
    .filter((c) => c && c.id);
}

// =========================
// SHOP (Relics)
// =========================
function renderShopRelics() {
  const grid = $("shopRelicGrid");
  if (!grid) return;
  grid.innerHTML = "";

  // Enforce single equipped relic.
  if (Array.isArray(state.relics) && state.relics.length > 1) state.relics = [state.relics[0]];
  if (!state.equippedRelicId && Array.isArray(state.relics) && state.relics.length === 1) {
    state.equippedRelicId = state.relics[0];
  }

  (RELICS || []).forEach((r) => {
    const owned = !!state.ownedRelics[r.id];
    const equipped = String(state.equippedRelicId || "") === String(r.id);
    const canBuy = state.gold >= r.price;

    let btnText = "";
    let btnDisabled = false;
    let action = "";

    if (!owned) {
      btnText = canBuy ? "Buy & Equip" : "Not Enough Gold";
      btnDisabled = !canBuy;
      action = "buy";
    } else if (equipped) {
      btnText = "✅ Equipped";
      btnDisabled = true;
      action = "none";
    } else {
      btnText = "Equip";
      btnDisabled = false;
      action = "equip";
    }

    const div = document.createElement("div");
    div.className = "shopItem";
    div.innerHTML = `
      <div class="shopItemTop">
        <div>
          <h3 class="shopName">🪬 ${r.name}</h3>
          <div class="shopMeta">
            <span class="badge">Price: ${r.price} Gold</span>
            ${equipped ? `<span class="badge badgeEquipped">Equipped</span>` : (owned ? `<span class="badge badgeOwned">Owned</span>` : `<span class="badge">Relic</span>`)}
          </div>
        </div>
      </div>
      <p class="shopDesc">${r.desc}</p>
      <div class="shopActions">
        <button class="btn btnPrimary" ${btnDisabled ? "disabled" : ""} data-relic-action="${action}" data-relic-id="${r.id}">${btnText}</button>
      </div>
    `;
    grid.appendChild(div);
  });

  grid.querySelectorAll("button[data-relic-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      playSfx("sfxClick", 0.45);
      const id = btn.getAttribute("data-relic-id");
      const action = btn.getAttribute("data-relic-action");
      if (!id || !action) return;
      if (action === "buy") buyRelic(id);
      if (action === "equip") equipRelic(id);
    });
  });
}

function buyRelic(id) {
  const r = (RELICS || []).find((x) => x.id === id);
  if (!r) return;

  if (state.ownedRelics[id]) {
    equipRelic(id);
    return;
  }
  if (state.gold < r.price) return;

  state.gold -= r.price;
  state.ownedRelics[id] = true;
  equipRelic(id);

  saveProgress();
  updateGoldUI();
  renderShopRelics();
  playSfx("sfxBuy", 0.85);

  if (state.phase === "battle") {
    if (typeof log === "function") log(`🪬 Purchased & equipped relic: ${r.name}`, "good");
  }

  alert(`Purchased & Equipped: ${r.name} ✅`);
}

// =========================
// SHOP (Potions)
// =========================
function getPotionCount(id) {
  return Math.max(0, Number((state.ownedPotions || {})[id] || 0) || 0);
}

function addPotion(id, qty = 1) {
  const q = Math.max(1, Number(qty || 1) || 1);
  if (!state.ownedPotions) state.ownedPotions = {};
  state.ownedPotions[id] = getPotionCount(id) + q;
  saveProgress();
}

function buyPotion(id) {
  const p = (POTIONS || []).find((x) => x.id === id);
  if (!p) return;
  if (state.gold < p.price) return;

  state.gold -= p.price;
  addPotion(id, 1);
  updateGoldUI();
  renderShopPotions();
  playSfx("sfxBuy", 0.85);

  if (state.phase === "battle") {
    if (typeof log === "function") log(`🧪 Purchased potion: ${p.name}`, "good");
  }

  alert(`Purchased: ${p.name} ✅\nYou can use it in battle (🧪 Use Potion).`);
}

function renderShopPotions() {
  const grid = $("shopPotionGrid");
  if (!grid) return;
  grid.innerHTML = "";

  (POTIONS || []).forEach((p) => {
    const ownedQty = getPotionCount(p.id);
    const canBuy = state.gold >= p.price;

    const div = document.createElement("div");
    div.className = "shopItem";
    div.innerHTML = `
      <div class="shopItemTop">
        <div>
          <h3 class="shopName">🧪 ${p.name}</h3>
          <div class="shopMeta">
            <span class="badge">Price: ${p.price} Gold</span>
            <span class="badge ${ownedQty > 0 ? "badgeOwned" : ""}">${ownedQty > 0 ? `Owned: ${ownedQty}` : "Not owned"}</span>
          </div>
        </div>
      </div>
      <p class="shopDesc">${p.desc}</p>
      <div class="shopActions">
        <button class="btn btnPrimary" ${canBuy ? "" : "disabled"} data-potion-buy-id="${p.id}">${canBuy ? "Buy" : "Not Enough Gold"}</button>
      </div>
    `;
    grid.appendChild(div);
  });

  grid.querySelectorAll("button[data-potion-buy-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      playSfx("sfxClick", 0.45);
      const id = btn.getAttribute("data-potion-buy-id");
      if (!id) return;
      buyPotion(id);
    });
  });
}

function renderShop() {
  renderShopRelics();
  renderShopCards();
  renderShopPotions();
}

// Keep Redeem Code button from crashing if this feature isn't wired yet.
function redeemCodeFlow() {
  // Offline redeem system (local-only).
  // Add/modify codes here:
  const REDEEM_CODES = {
    // Redeem legendaries (examples)
    "YROL": { type: "card", id: "yrol" },
    "ABARSKIE": { type: "card", id: "abarskie" },

    // ✅ Alias codes (requested)
    "IAMYROL": { type: "card", id: "yrol" },
    "IAMABARCA": { type: "card", id: "abarskie" },
  };

  const raw = prompt("Enter redeem code:")
  if (raw == null) return; // cancelled
  const code = String(raw || "").trim();
  if (!code) {
    alert("Please enter a code.");
    return;
  }

  // Normalize: remove spaces and hyphens, uppercase.
  const norm = code.toUpperCase().replace(/[\s-]+/g, "");

  // Load redeemed map
  let redeemed = {};
  try { redeemed = JSON.parse(storageGet(REDEEMED_CODES_KEY) || "{}") || {}; }
  catch { redeemed = {}; }

  if (redeemed[norm]) {
    // Show premium reveal again (feels good), but do not re-grant.
    const prev = redeemed[norm] || {};
    if (prev.type === "card" && prev.id && UNLOCKABLE_CARD_DEFS && UNLOCKABLE_CARD_DEFS[prev.id]) {
      showRedeemRevealModal(prev.id, norm, true);
      return;
    }
    alert("Code already redeemed ✅");
    return;
  }

  // Allow both exact keys AND normalized keys in REDEEM_CODES
  const direct = REDEEM_CODES[code.toUpperCase()] || REDEEM_CODES[norm];

  // Extra fallback: if the player enters a card id directly (case-insensitive), accept it.
  // Example: "yrol" or "ABARSKIE".
  const asId = String(norm || "").toLowerCase();
  const idFallback = (UNLOCKABLE_CARD_DEFS && UNLOCKABLE_CARD_DEFS[asId]) ? { type: "card", id: asId } : null;

  const reward = direct || idFallback || null;

  if (!reward) {
    alert("Invalid code ❌");
    return;
  }

  if (reward.type === "card") {
    const cardId = reward.id;
    if (!cardId || !UNLOCKABLE_CARD_DEFS || !UNLOCKABLE_CARD_DEFS[cardId]) {
      alert("This code reward is not configured correctly.");
      return;
    }

    if (state.owned && state.owned[cardId]) {
      // If the player already owns it, still mark the code as redeemed (prevents repeats)
      redeemed[norm] = { type: "card", id: cardId, at: Date.now(), alreadyOwned: true };
      storageSet(REDEEMED_CODES_KEY, JSON.stringify(redeemed));
      // Show premium modal instead of only alert
      showRedeemRevealModal(cardId, norm, true);
      return;
    }

    state.owned[cardId] = true;
    redeemed[norm] = { type: "card", id: cardId, at: Date.now() };
    storageSet(REDEEMED_CODES_KEY, JSON.stringify(redeemed));

    saveProgress();

    // Refresh UI wherever the user is
    if (typeof renderPick === "function") renderPick();
    if (typeof renderGallery === "function") renderGallery();
    if (typeof renderShopCards === "function") renderShopCards();
    if (typeof updateGoldUI === "function") updateGoldUI();

    const nm = UNLOCKABLE_CARD_DEFS[cardId].name;
    // Premium modal reveal (image + ability + cool FX)
    showRedeemRevealModal(cardId, norm, false);
    return;
  }

  alert("Unknown reward type.");
}

// =========================
// 🎁 REDEEM REVEAL MODAL (cool FX + claim button)
// =========================
function closeRedeemRevealModal() {
  const modal = document.getElementById("redeemRevealModal");
  if (modal) modal.style.display = "none";
}

// =========================
// 🌌 COSMO REVELATION UNLOCK MODAL
// =========================
function closeCosmoRevealModal() {
  const modal = document.getElementById("cosmoRevealModal");
  if (modal) modal.style.display = "none";
}

function showCosmoRevealModal() {
  const modal = document.getElementById("cosmoRevealModal");
  if (!modal) {
    // Fallback (if HTML was removed)
    alert("🌌 COSMO REVELATION\n\nA forbidden page of the cosmos has been revealed…");
    return;
  }

  const card = (typeof findCardById === "function") ? findCardById("cosmoSecret") : (CARDS?.cosmoSecret || null);
  const img = document.getElementById("cosmoRevealImg");
  const lore = document.getElementById("cosmoRevealLore");
  const txt = document.getElementById("cosmoRevealText");

  if (img) {
    img.src = card?.img || "cards/cosmo-secret.png";
    img.alt = card?.name || "Cosmo Secret";
    img.onerror = () => { img.onerror = null; img.src = window.__cardPlaceholder(card?.name || "Cosmo Secret"); };
  }

  if (txt) {
    txt.textContent = "You unlocked a secret card… but the universe just noticed you.";
  }

  if (lore) {
    lore.textContent =
`Cosmo's "secret" isn't a power… it's a memory that was never meant to return.

Long before the arenas, Cosmo witnessed the first divine betrayal: the lesser gods forged thrones out of stolen stars.
Now the sky is cracking again.

Soon, the *God of All Gods* will rise — not to rule… but to reset creation.
When the Pantheons march, every god will be forced to kneel, or be erased.

Cosmo carries the only map through the coming storm: the hidden sigils that bind the gods.
Cosmo is not just a fighter. Cosmo is a KEY.
And now… the key is in your hands.`;
  }

  modal.style.display = "flex";
}

function showRedeemRevealModal(cardId, code, alreadyOwned) {
  const modal = document.getElementById("redeemRevealModal");
  const def = (UNLOCKABLE_CARD_DEFS && UNLOCKABLE_CARD_DEFS[cardId]) ? UNLOCKABLE_CARD_DEFS[cardId] : null;

  // If modal isn't present yet, keep old behavior as fallback
  if (!modal || !def) {
    const nm = def?.name || cardId;
    alert(alreadyOwned ? `You already own ${nm} ✅` : `Redeemed ✅\nUnlocked: ${nm}\n\nGo to Battle/Setup to pick it!`);
    return;
  }

  const title = document.getElementById("redeemRevealTitle");
  const pill = document.getElementById("redeemRevealPill");
  const text = document.getElementById("redeemRevealText");
  const img = document.getElementById("redeemRevealImg");
  const name = document.getElementById("redeemRevealName");
  const stats = document.getElementById("redeemRevealStats");
  const abName = document.getElementById("redeemRevealAbilityName");
  const abDesc = document.getElementById("redeemRevealAbilityDesc");
  const codeLine = document.getElementById("redeemRevealCodeLine");

  if (title) title.textContent = alreadyOwned ? "✅ Code Redeemed (Already Owned)" : "🎁 Code Redeemed!";
  if (pill) pill.textContent = (def.legendaryPassive || def.legendaryCooldownMs) ? "Legendary" : "Unlocked";
  if (text) text.textContent = alreadyOwned
    ? "You already owned this card — but the code is now claimed on this device ✅"
    : "New card unlocked! Go to Setup to use it.";

  if (img) {
    img.src = def.img || "";
    img.alt = def.name || "Card";
    img.onerror = () => { img.onerror = null; img.src = window.__cardPlaceholder(def.name || "Card"); };
  }
  if (name) name.textContent = def.name || "Unlocked Card";
  if (stats) stats.textContent = `ATK ${def.atk} • DEF ${def.def} • HP ${def.hp}`;
  if (abName) abName.textContent = def.skillName || "Ability";
  if (abDesc) abDesc.textContent = def.skillDesc || "";
  if (codeLine) codeLine.textContent = `Code: ${String(code || "").toUpperCase()}`;

  // Show modal
  modal.style.display = "flex";

  // SFX + sparks
  if (typeof playSfx === "function") playSfx("sfxJackpot", 0.7);
  const box = modal.querySelector(".redeemRevealBox") || modal.querySelector(".modalBox");
  if (box) spawnRedeemSparks(box, 18);
}

function spawnRedeemSparks(rootEl, count) {
  if (!rootEl) return;
  rootEl.querySelectorAll(".redeemSpark").forEach(n => n.remove());

  const c = Math.max(8, Math.min(26, Number(count || 18) || 18));
  for (let i = 0; i < c; i++) {
    const s = document.createElement("div");
    s.className = "redeemSpark";

    const angle = Math.random() * Math.PI * 2;
    const dist = 140 + Math.random() * 170;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;

    s.style.setProperty("--dx", `${dx.toFixed(1)}px`);
    s.style.setProperty("--dy", `${dy.toFixed(1)}px`);
    s.style.left = `${50 + (Math.random() * 10 - 5)}%`;
    s.style.top  = `${40 + (Math.random() * 10 - 5)}%`;
    s.style.animationDelay = `${(Math.random() * 90) | 0}ms`;

    rootEl.appendChild(s);
    setTimeout(() => s.remove(), 1100);
  }
}

// =========================
// CARD POOL (BASE + UNLOCKED)
// =========================
function getAllCards() {
  const unlocked = Object.keys(state.owned || {})
    .filter((id) => state.owned[id] && UNLOCKABLE_CARD_DEFS[id])
    .map((id) => UNLOCKABLE_CARD_DEFS[id]);

  const map = new Map();
  [...BASE_CARDS, ...unlocked].forEach((c) => map.set(c.id, c));

  // Enemy-only cards should never be selectable/usable by the player.
  // ✅ Also hard-gate Diablo: it should only be usable once the player reaches Legend rank.
  // (Prevents old saves / edge cases from showing Diablo early.)
  return Array.from(map.values()).filter((c) => {
    if (!c) return false;
    if (c.enemyOnly) return false;
    if (c.id === "diablo") return !!state.diabloUnlocked;
    return true;
  });
}

// =========================
// GALLERY CARD POOL (show ALL cards, even locked/unowned)
// =========================
function getGalleryCards() {
  const allUnlockables = Object.keys(UNLOCKABLE_CARD_DEFS || {}).map((id) => UNLOCKABLE_CARD_DEFS[id]).filter(Boolean);
  const map = new Map();
  [...BASE_CARDS, ...allUnlockables].forEach((c) => map.set(c.id, c));

  // ✅ Hide secret cards until they are actually unlocked by missions.
  // This also gates which enemies can spawn because spawnNextEnemy() uses this pool.
  ensureMissionUnlockDefaults();
  return Array.from(map.values()).filter((c) => {
    if (!c) return false;
    if (!c.secret) return true;

    // ✅ HARD RULE (requested):
    // - Entity (relicbornTitan) must NOT appear in Missions 1-3 at all.
    // - The Entity card should ONLY be seen when Mission 4 battle actually starts.
    // This pool powers BOTH Gallery rendering and random enemy spawning.
    // So we keep Entity (and Awakened Monster) out of this pool entirely and
    // force-spawn them only in their mission battle logic.
    if (c.id === "relicbornTitan" || c.id === "awakenedMonster") return false;

    // ✅ Hard safety gate: While Mission 1 is still active, NEVER show late-game secret enemies.
    // This prevents gallery/battle from leaking Entity/Awakened Monster due to corrupted mission flags
    // or old saves.
    const mission1Active = !isMission1Complete();
    if (mission1Active && (c.id === "relicbornTitan" || c.id === "awakenedMonster")) return false;

    // ✅ Mission-gated cards must NOT appear in Gallery/Battle unless their mission gate is satisfied.
    // Even if a player somehow owns the card early (old saves / lucky edge cases), keep it hidden
    // until the correct mission unlock flag is set.
    const owned = !!(state.owned && state.owned[c.id]);

    // Mission-locked enemies / rewards
    if (c.id === "cosmoSecret") {
      // Mission 1 reward: Cosmo Secret only appears once unlocked via 50 win streak.
      return isMission1Complete();
    }
    if (c.id === "rayBill") {
      // Mission 2 reward: only visible after defeating Cosmo Secret (and actually owning it).
      return owned && isMission2Complete();
    }
    if (c.id === "diablo") {
      // ✅ Legend reward: Diablo is ONLY visible/spawnable after reaching Legend rank.
      return !!state.diabloUnlocked;
    }
    // (Entity removed from gallery/spawn pool above — force-spawned in Mission 4 battle instead.)
    if (c.id === "antiMatter") {
      // Mission 5 reward: only visible after defeating the Awakened Monster.
      return !!(state.missions && state.missions.antiMatterUnlocked);
    }
    // (Awakened Monster removed from gallery/spawn pool above — force-spawned in Mission 5 battle instead.)

    // Default for other secret cards: hidden until owned.
    return owned;
  });
}

function findCardById(id) {
  const all = getGalleryCards();
  return all.find((c) => c.id === id) || null;
}

// =========================
// PROGRESS
// =========================
function loadProgress() {
  const g = parseInt(storageGet(GOLD_KEY) || "0", 10);
  state.gold = Number.isFinite(g) ? g : 0;

  try { state.owned = JSON.parse(storageGet(OWNED_KEY) || "{}") || {}; }
  catch { state.owned = {}; }

  // ---- Missions ----
  try {
    const raw = storageGet(MISSION_KEY);
    const m = raw ? (JSON.parse(raw) || {}) : {};
    if (!state.missions) state.missions = {};
    state.missions.totalDefeats = Math.max(0, Number(m.totalDefeats || state.missions.totalDefeats || 0) || 0);
    state.missions.cosmoRevelationDefeated = !!(m.cosmoRevelationDefeated ?? state.missions.cosmoRevelationDefeated);
    state.missions.diabloUnlocked = !!(m.diabloUnlocked ?? state.missions.diabloUnlocked);
    state.missions.diabloDefeated = !!(m.diabloDefeated ?? state.missions.diabloDefeated);
    state.missions.entityUnlocked = !!(m.entityUnlocked ?? state.missions.entityUnlocked);
    state.missions.entityDefeated = !!(m.entityDefeated ?? state.missions.entityDefeated);
    state.missions.antiMatterUnlocked = !!(m.antiMatterUnlocked ?? state.missions.antiMatterUnlocked);
    state.missions.antiMatterModalShown = !!(m.antiMatterModalShown ?? state.missions.antiMatterModalShown);
    state.missions.antiMatterDefeated = !!(m.antiMatterDefeated ?? state.missions.antiMatterDefeated);
    state.missions.awakenMonsterDefeated = !!(m.awakenMonsterDefeated ?? state.missions.awakenMonsterDefeated);
    state.missions.godOfAllGodsModalShown = !!(m.godOfAllGodsModalShown ?? state.missions.godOfAllGodsModalShown);

    // ✅ One-time reveals (stored alongside missions)
    state.rayBillOmenShown = !!(m.rayBillOmenShown ?? state.rayBillOmenShown);
    state.cosmoOmenShown = !!(m.cosmoOmenShown ?? state.cosmoOmenShown);
  } catch {
    // keep defaults
  }

  // ---- Relics (owned + equipped) ----
  let ownedRaw;
  try { ownedRaw = JSON.parse(storageGet(RELIC_OWNED_KEY) || "{}") || {}; }
  catch { ownedRaw = {}; }

  // ✅ Migration support:
  // - old saves might store owned relics as an array: ["a","b"]
  // - or as an object map: {a:true,b:true}
  if (Array.isArray(ownedRaw)) {
    state.ownedRelics = { };
    for (const id of ownedRaw) state.ownedRelics[id] = true;
  } else {
    state.ownedRelics = ownedRaw;
  }

  // ✅ Load equipped relic (only 1)
  const equippedRaw = (storageGet(RELIC_EQUIPPED_KEY) || "").trim();

  // Migration: if someone accidentally saved a JSON array in the equipped key
  let equipped = equippedRaw;
  if (equippedRaw.startsWith("[") && equippedRaw.endsWith("]")) {
    try {
      const arr = JSON.parse(equippedRaw);
      if (Array.isArray(arr) && arr.length) equipped = String(arr[0] || "").trim();
    } catch {}
  }

  state.equippedRelicId = equipped || null;

  // Fallback: if equipped not set but player owns relic(s), equip the first owned
  if (!state.equippedRelicId) {
    const firstOwned = Object.keys(state.ownedRelics).find((id) => state.ownedRelics[id]);
    state.equippedRelicId = firstOwned || null;
  }

  // Final sanity: if equipped relic is not actually owned anymore, clear it
  if (state.equippedRelicId && !state.ownedRelics[state.equippedRelicId]) {
    state.equippedRelicId = null;
  }

  // ---- Potions (owned inventory + cooldown) ----
  try {
    const raw = storageGet(POTION_OWNED_KEY);
    const obj = raw ? (JSON.parse(raw) || {}) : {};
    // migration: allow array => {id:1}
    if (Array.isArray(obj)) {
      state.ownedPotions = {};
      for (const id of obj) state.ownedPotions[String(id)] = (state.ownedPotions[String(id)] || 0) + 1;
    } else {
      state.ownedPotions = obj;
    }
  } catch {
    state.ownedPotions = {};
  }

  try {
    const t = Number(storageGet(POTION_COOLDOWN_KEY) || "0") || 0;
    state.potionCooldownTurns = Math.max(0, Number.isFinite(t) ? t : 0);
  } catch {
    state.potionCooldownTurns = Math.max(0, Number(turns || 0) || 0);
  }

  // ---- Lucky Draw ----
  try {
    state.luckyEntityOwned = (storageGet(LUCKY_ENTITY_OWNED_KEY) || "") === "1";
  } catch {
    state.luckyEntityOwned = false;
  }

  try {
    const raw = storageGet(LUCKY_HISTORY_KEY);
    state.luckyHistory = raw ? (JSON.parse(raw) || []) : [];
  } catch {
    state.luckyHistory = [];
  }


  // ---- Win Streak ----
  try {
    const raw = storageGet(STREAK_KEY);
    const s = raw ? (JSON.parse(raw) || {}) : {};
    state.winStreak = Number(s.winStreak || 0) || 0;
    state.bestStreak = Number(s.bestStreak || 0) || 0;
  } catch {
    state.winStreak = 0;
    state.bestStreak = 0;
  }
  state.relics = state.equippedRelicId ? [state.equippedRelicId] : [];


  // ---- Card Upgrades ----
  try {
    const raw = storageGet(CARD_UPGRADES_KEY);
    state.cardUpgrades = raw ? (JSON.parse(raw) || {}) : {};
  } catch {
    state.cardUpgrades = {};
  }

  // ---- Profile / Rank / Cosmetics ----
  try {
    const raw = storageGet(PROFILE_KEY);
    const p = raw ? (JSON.parse(raw) || {}) : {};
    state.profileName = String(p.profileName || p.name || "").slice(0, 18);
    state.profileXp = Math.max(0, Number(p.profileXp ?? p.xp ?? 0) || 0);
    state.profileWins = Math.max(0, Number(p.profileWins ?? p.wins ?? 0) || 0);
    state.profileLosses = Math.max(0, Number(p.profileLosses ?? p.losses ?? 0) || 0);
    state.highStage = Math.max(0, Number(p.highStage ?? 0) || 0);
    state.avatarId = String(p.avatarId || "spark");
    state.frameId = String(p.frameId || "default");
    state.diabloUnlocked = !!p.diabloUnlocked;
    state.diabloClaimed = !!p.diabloClaimed;
  } catch {
    state.profileName = "";
    state.profileXp = 0;
    state.profileWins = 0;
    state.profileLosses = 0;
    state.highStage = 0;
    state.avatarId = "spark";
    state.frameId = "default";
    state.diabloUnlocked = false;
    state.diabloClaimed = false;
  }

  // Backfill legacy bestStreak into profile stats
  if (!Number.isFinite(Number(state.bestStreak))) state.bestStreak = 0;
}


function saveProgress() {
  storageSet(GOLD_KEY, String(state.gold));
  storageSet(OWNED_KEY, JSON.stringify(state.owned));
  // ✅ Persist one-time reveal flags together with mission progress.
  storageSet(MISSION_KEY, JSON.stringify({
    ...(state.missions || {}),
    rayBillOmenShown: !!state.rayBillOmenShown,
    cosmoOmenShown: !!state.cosmoOmenShown,
  }));
  storageSet(RELIC_OWNED_KEY, JSON.stringify(state.ownedRelics));
  storageSet(RELIC_EQUIPPED_KEY, state.equippedRelicId || "");
  storageSet(POTION_OWNED_KEY, JSON.stringify(state.ownedPotions || {}));
  storageSet(POTION_COOLDOWN_KEY, String(Math.max(0, Number(state.potionCooldownTurns || 0) || 0)));
  storageSet(LUCKY_HISTORY_KEY, JSON.stringify(state.luckyHistory || []));
  storageSet(STREAK_KEY, JSON.stringify({ winStreak: Number(state.winStreak || 0), bestStreak: Number(state.bestStreak || 0) }));
  storageSet(CARD_UPGRADES_KEY, JSON.stringify(state.cardUpgrades || {}));
storageSet(LUCKY_ENTITY_OWNED_KEY, state.luckyEntityOwned ? "1" : "0");

  // Profile
  storageSet(PROFILE_KEY, JSON.stringify({
    profileName: String(state.profileName || "").slice(0, 18),
    profileXp: Math.max(0, Number(state.profileXp || 0) || 0),
    profileWins: Math.max(0, Number(state.profileWins || 0) || 0),
    profileLosses: Math.max(0, Number(state.profileLosses || 0) || 0),
    highStage: Math.max(0, Number(state.highStage || 0) || 0),
    avatarId: String(state.avatarId || "spark"),
    frameId: String(state.frameId || "default"),
    diabloUnlocked: !!state.diabloUnlocked,
    diabloClaimed: !!state.diabloClaimed,
  }));
}


// Shared unlock helper (used by both omen modal implementations).
function unlockRayBill() {
  if (!state.owned) state.owned = {};
  state.owned["rayBill"] = true;
  state.rayBillOmenShown = true;

  try { saveProgress(); } catch (e) {}

  // Refresh UI so Ray Bill becomes selectable/visible immediately.
  try { if (typeof renderPick === "function") renderPick(); } catch (e) {}
  try { if (typeof renderGallery === "function") renderGallery(); } catch (e) {}
  try { if (typeof renderShopCards === "function") renderShopCards(); } catch (e) {}
  try { if (typeof log === "function") log("⚡ Ray Bill unlocked! Go to Setup/Pick to use him.", "good"); } catch (e) {}
}


// =========================
// PROFILE / RANK HELPERS
// =========================
const RANK_THEMES = {
  Rookie:   { glow: "rankGlowRookie",   badge: "rankBadgeRookie",   flare: "rankFlareRookie" },
  Bronze:   { glow: "rankGlowBronze",   badge: "rankBadgeBronze",   flare: "rankFlareBronze" },
  Silver:   { glow: "rankGlowSilver",   badge: "rankBadgeSilver",   flare: "rankFlareSilver" },
  Gold:     { glow: "rankGlowGold",     badge: "rankBadgeGold",     flare: "rankFlareGold" },
  Platinum: { glow: "rankGlowPlatinum", badge: "rankBadgePlatinum", flare: "rankFlarePlatinum" },
  Diamond:  { glow: "rankGlowDiamond",  badge: "rankBadgeDiamond",  flare: "rankFlareDiamond" },
  Master:   { glow: "rankGlowMaster",   badge: "rankBadgeMaster",   flare: "rankFlareMaster" },
  Legend:   { glow: "rankGlowLegend",   badge: "rankBadgeLegend",   flare: "rankFlareLegend" },
};

function applyRankTheme(el, rankName, kind) {
  if (!el) return;
  const rn = (rankName && RANK_THEMES[rankName]) ? rankName : 'Rookie';
  const theme = RANK_THEMES[rn];
  // clear old theme classes
  Object.values(RANK_THEMES).forEach(t => {
    if (t.badge) el.classList.remove(t.badge);
    if (t.glow)  el.classList.remove(t.glow);
    if (t.flare) el.classList.remove(t.flare);
  });
  const cls = theme[kind];
  if (cls) el.classList.add(cls);
  el.dataset.rank = rn;
}

function getRankIndexFromXp(xp) {
  const val = Math.max(0, Number(xp || 0) || 0);
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (val >= RANKS[i].xp) idx = i;
  }
  return idx;
}

function getRankNameFromXp(xp) {
  return (RANKS[getRankIndexFromXp(xp)] || RANKS[0]).name;
}

function rankIndexByName(name) {
  const n = String(name || "").trim().toLowerCase();
  const i = RANKS.findIndex(r => String(r.name).toLowerCase() === n);
  return i >= 0 ? i : 0;
}

// Some milestones should never be "taken away" even if we rebalance thresholds later.
// If the player already unlocked the Legend reward, we treat them as at least Legend for UI + cosmetics.
function getEffectiveRankIndex() {
  let idx = getRankIndexFromXp(state.profileXp);
  if (state && state.diabloUnlocked) idx = Math.max(idx, rankIndexByName("Legend"));
  return idx;
}

function isRankAtLeast(rankName) {
  return getEffectiveRankIndex() >= rankIndexByName(rankName);
}

function getNextRankInfo() {
  const idx = getEffectiveRankIndex();
  const next = RANKS[idx + 1] || null;
  const cur = RANKS[idx] || RANKS[0];
  return { cur, next, idx };
}

function applyCosmeticsToBattleUI() {
  // Avatar
  const a = AVATARS.find(x => x.id === state.avatarId) || AVATARS[0];
  const avatarEl = document.getElementById("profileAvatar");
  if (avatarEl) avatarEl.textContent = a.icon;

  // Frame (applies to player's imgFrame)
  const pFrame = document.getElementById("pFrame");
  if (pFrame) {
    // safety: ensure this wrapper always behaves like a frame even if HTML was edited
    if (!pFrame.classList.contains("imgFrame")) pFrame.classList.add("imgFrame");
    // remove any prior frame classes
    const allFrameClasses = FRAMES.map(f => f.className).filter(Boolean);
    allFrameClasses.forEach(cls => pFrame.classList.remove(cls));
    const f = FRAMES.find(x => x.id === state.frameId) || FRAMES[0];
    if (f.className) pFrame.classList.add(f.className);
  }
}

let _profilePrevView = "home";

function openProfile(fromView) {
  _profilePrevView = fromView || _profilePrevView || "home";
  renderProfileUI();
  showView("profile");
}

function renderProfileUI() {
  // name
  const nameInput = document.getElementById("profileNameInput");
  if (nameInput) nameInput.value = state.profileName || "";

  // rank
  const xp = Math.max(0, Number(state.profileXp || 0) || 0);
  const { cur, next } = getNextRankInfo();
  const rankName = cur.name;

  const pillRank = document.getElementById("profileRankPill");
  if (pillRank) pillRank.textContent = `Rank: ${rankName}`;

  const pillXp = document.getElementById("profileXpPill");
  if (pillXp) pillXp.textContent = `XP: ${xp}`;

  const badge = document.getElementById("rankBadge");
  if (badge) { badge.textContent = rankName; applyRankTheme(badge, rankName, "badge"); }

  // progress bar
  const label = document.getElementById("rankProgressLabel");
  const nums = document.getElementById("rankProgressNums");
  const fill = document.getElementById("rankBarFill");
  if (fill) applyRankTheme(fill, rankName, "glow");
  if (next) {
    const start = cur.xp;
    const end = next.xp;
    const curInBand = Math.max(0, xp - start);
    const band = Math.max(1, end - start);
    const pct = Math.max(0, Math.min(1, curInBand / band));
    if (label) label.textContent = `Next rank: ${next.name}`;
    if (nums) nums.textContent = `${xp} / ${end}`;
    if (fill) fill.style.width = `${Math.round(pct * 100)}%`;
    if (fill) applyRankTheme(fill, rankName, "glow");
  } else {
    if (label) label.textContent = `Max rank achieved`;
    if (nums) nums.textContent = `${xp} / ${xp}`;
    if (fill) fill.style.width = `100%`;
    if (fill) applyRankTheme(fill, rankName, "glow");
  }

  // 🏆 Legend reward (Diablo)
  const lrText = document.getElementById("legendRewardText");
  const lrImg = document.getElementById("legendRewardImg");
  const lrBox = document.getElementById("legendRewardBox");
  if (lrBox) {
    // keep the box visible always, but update the message based on unlock
    if (state && state.diabloUnlocked) {
      if (lrText) lrText.innerHTML = `Unlocked: <b>Diablo</b> is now available in your cards.`;
      if (lrImg) lrImg.style.display = "block";
      lrBox.setAttribute("data-unlocked", "1");
    } else {
      if (lrText) lrText.innerHTML = `Reach <b>Legend</b> rank to unlock <b>Diablo</b>.`;
      if (lrImg) lrImg.style.display = "none";
      lrBox.setAttribute("data-unlocked", "0");
    }
  }

  // stats
  const winsEl = document.getElementById("statWins");
  const lossesEl = document.getElementById("statLosses");
  const bestEl = document.getElementById("statBestStreak");
  const highStageEl = document.getElementById("statHighStage");
  if (winsEl) winsEl.textContent = String(state.profileWins || 0);
  if (lossesEl) lossesEl.textContent = String(state.profileLosses || 0);
  if (bestEl) bestEl.textContent = String(state.bestStreak || 0);
  if (highStageEl) highStageEl.textContent = String(state.highStage || 0);

  // relic
  const relicEl = document.getElementById("profileRelic");
  if (relicEl) {
    const rid = state.equippedRelicId;
    const r = (RELICS || []).find(x => x.id === rid);
    relicEl.textContent = r ? r.name : "None";
  }

  renderCosmeticsGrids();
  applyCosmeticsToBattleUI();
}

function renderCosmeticsGrids() {
  const avatarGrid = document.getElementById("avatarGrid");
  const frameGrid = document.getElementById("frameGrid");

  if (avatarGrid) {
    avatarGrid.innerHTML = "";
    AVATARS.forEach((a) => {
      const unlocked = isRankAtLeast(a.unlockRank);
      const btn = document.createElement("button");
      btn.className = `cosItem ${unlocked ? "" : "locked"} ${state.avatarId === a.id ? "selected" : ""}`;
      btn.innerHTML = `<div class="cosIcon">${a.icon}</div><div class="cosLabel">${a.unlockRank}</div>`;
      btn.title = unlocked ? "Select" : `Locked • Rank ${a.unlockRank}`;
      btn.addEventListener("click", () => {
        if (!unlocked) return;
        state.avatarId = a.id;
        saveProgress();
        renderProfileUI();
      });
      avatarGrid.appendChild(btn);
    });
  }

  if (frameGrid) {
    frameGrid.innerHTML = "";
    FRAMES.forEach((f) => {
      const unlocked = isRankAtLeast(f.unlockRank);
      const btn = document.createElement("button");
      btn.className = `cosItem ${unlocked ? "" : "locked"} ${state.frameId === f.id ? "selected" : ""}`;
      const swatchClass = f.className ? `cosFrameSwatch ${f.className}` : "frameDefaultSwatch";
      btn.innerHTML = `<div class="${swatchClass}"></div><div class="cosLabel">${f.unlockRank}</div>`;
      btn.title = unlocked ? "Select" : `Locked • Rank ${f.unlockRank}`;
      btn.addEventListener("click", () => {
        if (!unlocked) return;
        state.frameId = f.id;
        saveProgress();
        renderProfileUI();
      });
      frameGrid.appendChild(btn);
    });
  }
}

function showRankUpOverlay(oldRank, newRank, unlockLines) {
  const overlay = document.getElementById("rankUpOverlay");
  if (!overlay) return;
  // theme the whole overlay based on new rank
  applyRankTheme(overlay, newRank, "flare");
  const sub = document.getElementById("rankUpSub");
  const badge = document.getElementById("rankUpBadge");
  const unlocks = document.getElementById("rankUpUnlocks");

  if (sub) sub.textContent = `${oldRank} → ${newRank}`;
  if (badge) { badge.textContent = newRank; applyRankTheme(badge, newRank, "badge"); }

  if (unlocks) {
    unlocks.innerHTML = (unlockLines || []).map(t => `<div class="rankUnlockLine">${t}</div>`).join("") || `<div class="rankUnlockLine">New cosmetics may have unlocked ✨</div>`;
  }

  overlay.style.display = "flex";
  applyRankTheme(overlay, newRank, "flare");
  overlay.classList.remove("rankUpShow");
  void overlay.offsetWidth;
  overlay.classList.add("rankUpShow");
  playSfx("sfxJackpot", 0.6);
  setTimeout(() => { overlay.style.display = "none"; overlay.classList.remove("rankUpShow"); }, 2400);
}

function maybeHandleRankChange(prevXp, reasonLabel) {
  const before = getRankIndexFromXp(prevXp);
  const after = getRankIndexFromXp(state.profileXp);
  if (after <= before) return;

  const oldRank = RANKS[before]?.name || "Rookie";
  const newRank = RANKS[after]?.name || "Rookie";

  // Collect unlock lines for this new rank
  const unlockedAvatars = AVATARS.filter(a => a.unlockRank === newRank).map(a => `Avatar unlocked: ${a.icon}`);
  const unlockedFrames = FRAMES.filter(f => f.unlockRank === newRank && f.id !== "default").map(f => `Frame unlocked: ${f.label}`);
  const lines = [...unlockedAvatars, ...unlockedFrames];

  showRankUpOverlay(oldRank, newRank, lines);
  log(`🏅 Rank Up! ${oldRank} → ${newRank}${reasonLabel ? ` (${reasonLabel})` : ""}`, "good");

  // Legend reward
  if (newRank === "Legend") {
    unlockDiabloLegendReward();
  }

  saveProgress();
}

function addProfileXp(amount, reasonLabel) {
  const add = Math.max(0, Number(amount || 0) || 0);
  if (add <= 0) return;
  const prev = Number(state.profileXp || 0) || 0;
  state.profileXp = prev + add;
  maybeHandleRankChange(prev, reasonLabel);
  // If profile screen is open, live-refresh the rank UI
  try { if (state.currentView === "profile") renderProfileUI(); } catch(e) {}
  saveProgress();
}

function unlockDiabloLegendReward() {
  if (state.diabloUnlocked) return;
  state.diabloUnlocked = true;
  state.diabloClaimed = true; // auto-claimed

  state.owned = state.owned || {};
  state.owned.diablo = true;

  // Big moment in UI
  showDiabloLegendRewardFX();
  // Extra clear message for the player (requested)
  showToast("✨ New card unlocked — check your cards now!", "good");
  try { floatingDamage("player", "NEW CARD UNLOCKED!", "good"); } catch(e) {}
  try { log("✨ New card unlocked — check your cards now!", "good"); } catch(e) {}
  saveProgress();
}

function showDiabloLegendRewardFX() {
  // Reuse RankUp overlay (already styled) but make it a "Legend Reward" reveal.
  const overlay = document.getElementById("rankUpOverlay");
  if (!overlay) {
    alert("🔥 LEGEND REWARD! You unlocked Diablo!");
    return;
  }
  const sub = document.getElementById("rankUpSub");
  const badge = document.getElementById("rankUpBadge");
  const unlocks = document.getElementById("rankUpUnlocks");

  if (sub) sub.textContent = `🔥 LEGEND REWARD UNLOCKED`;
  if (badge) badge.textContent = `DIABLO`;
  if (unlocks) {
    unlocks.innerHTML = `
      <div class="rankUnlockLine" style="margin-bottom:10px;">You have claimed the exclusive card:</div>
      <div class="rankUnlockLine" style="font-weight:900;letter-spacing:.3px;">🔥 Diablo</div>
      <div class="rankUnlockLine" style="opacity:.9;">2 DMG • 5 DEF • 8 LIFE</div>
      <div class="rankUnlockLine" style="opacity:.9;">Ability: 12 DMG + 4 Armor + 7 Life</div>
      <div style="margin-top:10px;display:flex;justify-content:center;">
        <img src="cards/diablo.png" alt="Diablo" style="width:140px;height:140px;object-fit:cover;border-radius:16px;box-shadow:0 0 40px rgba(255,90,0,.25),0 0 90px rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.15);" />
      </div>
    `;
  }

  overlay.style.display = "flex";
  playSfx("sfxJackpot", 0.8);
  playSfx("sfxWin", 0.65);
  setTimeout(() => { overlay.style.display = "none"; }, 3600);

  log("🔥 LEGEND REWARD: Diablo unlocked and added to your collection!", "good");
}

function updateGoldUI() {
  const goldStr = `Gold: ${state.gold}`;
  if ($("goldTag")) $("goldTag").textContent = goldStr;
  if ($("homeGoldTag")) $("homeGoldTag").textContent = goldStr;
  if ($("shopGoldTag")) $("shopGoldTag").textContent = goldStr;
}

function addGold(amount) {
  state.gold += amount;
  saveProgress();
  updateGoldUI();
}



// =========================
// ⬆️ CARD UPGRADES
// =========================
const CARD_UPGRADE_MAX_LEVEL = 5;

function getCardLevel(cardId) {
  const id = String(cardId || "");
  const lvl = Number((state.cardUpgrades || {})[id] || 0) || 0;
  return Math.max(0, Math.min(CARD_UPGRADE_MAX_LEVEL, lvl));
}

function getUpgradeCost(cardId) {
  const lvl = getCardLevel(cardId);

  // costs per next upgrade level
  const costs = [20000, 40000, 60000, 80000, 100000];
  return costs[lvl] || 0; // lvl=0 -> cost to reach lvl1
}
function getUpgradedStats(cardDef) {
  const lvl = getCardLevel(cardDef && cardDef.id);

  const atk0 = Number(cardDef && cardDef.atk) || 0;
  const def0 = Number(cardDef && cardDef.def) || 0;
  const hp0  = Number(cardDef && cardDef.hp)  || 0;

  // total bonus by level (cumulative)
  const bonusTable = {
    0: { atk: 0,  def: 0,  hp: 0  },
    1: { atk: 5,  def: 5,  hp: 5  },   // 20k
    2: { atk: 10, def: 10, hp: 10 },   // 40k
    3: { atk: 12, def: 12, hp: 12 },   // 60k
    4: { atk: 15, def: 15, hp: 15 },   // 80k
    5: { atk: 20, def: 20, hp: 20 },   // 100k
  };

  const b = bonusTable[lvl] || bonusTable[0];

  return {
    atk: atk0 + b.atk,
    def: def0 + b.def,
    hp: hp0 + b.hp,
    level: lvl
  };
}

function canUpgradeCard(cardId) {
  return getCardLevel(cardId) < CARD_UPGRADE_MAX_LEVEL;
}

function isCardUsableByPlayer(cardId) {
  const id = String(cardId || "");
  // ✅ Hard gate Diablo: only usable after reaching Legend (diabloUnlocked).
  if (id === "diablo" && !state?.diabloUnlocked) return false;
  // ✅ Hard gate Entity: even if obtained early (Lucky Draw / old save),
  // it must not be usable/visible until Mission 4 is completed.
  if (id === "relicbornTitan" && !isMission4Complete()) return false;
  // base cards are always usable; unlockables require ownership
  const isBase = (BASE_CARDS || []).some((c) => c.id === id);
  const isOwnedUnlock = !!(state.owned && state.owned[id] && UNLOCKABLE_CARD_DEFS && UNLOCKABLE_CARD_DEFS[id]);
  return isBase || isOwnedUnlock;
}

function upgradeCard(cardId) {
  const id = String(cardId || "");
  if (!isCardUsableByPlayer(id)) {
    alert("You can only upgrade cards you can use (base cards or owned unlocks)." );
    return;
  }

  const lvl = getCardLevel(id);
  if (lvl >= CARD_UPGRADE_MAX_LEVEL) return;

  const cost = getUpgradeCost(id);
  if (state.gold < cost) {
    alert(`Not enough gold. Upgrade cost: ${cost}`);
    return;
  }

  state.gold -= cost;
  state.cardUpgrades = state.cardUpgrades || {};
  state.cardUpgrades[id] = lvl + 1;

  saveProgress();
  updateGoldUI();

  // Refresh UIs that display stats
  if (typeof renderShopCards === "function") renderShopCards();
  if (typeof renderPick === "function") renderPick();
  if (typeof renderGallery === "function") renderGallery();

  playSfx("sfxBuy", 0.7);

  const card = findCardById(id);
  alert(`Upgraded ${card ? card.name : id} to Lv${lvl + 1}!`);
}

// =========================
// 🤫 SECRETS: non-shop card upgrades (Profile)
// =========================

function getShopCardIdSet() {
  const ids = new Set();
  try {
    (SHOP_CARDS || []).forEach((c) => { if (c && c.id) ids.add(String(c.id)); });
  } catch (e) {}
  return ids;
}

// Only show the specific "secret" cards the user requested.
// They appear ONLY if owned/unlocked, and they must NOT be purchasable in the Shop.
const SECRETS_ONLY_CARD_IDS = ["relicbornTitan", "diablo", "yrol", "abarskie", "cosmoSecret"]; // Entity, Diablo, Yrol, Abarskie, Cosmo-Secret

// =========================
// ⚔️ 1v1 QUICK DUEL (Profile)
// - Player picks ANY usable card
// - Enemy is random from a small "boss" pool (only if visible/unlocked in Gallery or Battle)
// =========================

// Requested enemy pool (when unlocked/visible):
// Cosmic God, Tremo, Starbreaker Null King, Entity, Cosmic Revelation (Cosmo Secret), Diablo
const DUEL_ENEMY_CANDIDATE_IDS = [
  "cosmicGod",
  "tremo",
  "starbreakerNullKing",
  "relicbornTitan",
  "cosmoSecret",
  "diablo",
];

function getDuelEnemyPool(playerId) {
  const all = getGalleryCards();
  const pid = String(playerId || "");
  // only include enemies that are currently visible/unlocked (gallery cards), and not the player's card
  const pool = all.filter((c) => c && DUEL_ENEMY_CANDIDATE_IDS.includes(String(c.id)) && String(c.id) !== pid);
  // Fallback: if nothing is available (e.g., none unlocked yet), just use normal pool
  return pool.length ? pool : all.filter((c) => c && String(c.id) !== pid);
}

function openDuelModal() {
  if (document.getElementById("duelOverlay")) return;

  const overlay = document.createElement("div");
  overlay.className = "modalOverlay";
  overlay.id = "duelOverlay";

  const box = document.createElement("div");
  box.className = "modalBox";

  box.innerHTML = `
    <div class="modalHeader">
      <div class="modalTitle">⚔️ 1v1 Quick Duel</div>
      <div class="modalPill">Pick your fighter</div>
    </div>
    <div class="modalBody">
      <p class="modalText">Choose a card you own/use. You will fight a <b>random boss</b> from the unlocked pool (Cosmic God, Tremo, Starbreaker Null, Entity, Cosmo Secret, Diablo).</p>
	      <div class="duelPickScroll" aria-label="Choose your fighter">
	        <div id="duelPickGrid" class="grid" style="margin-top:0;"></div>
	      </div>
    </div>
    <div class="modalActions single">
      <button class="btn btnGhost" id="btnDuelClose">Close</button>
    </div>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const grid = box.querySelector("#duelPickGrid");
  const cards = (getGalleryCards() || [])
    .filter((c) => c && isCardUsableByPlayer(c.id))
    // keep existing restrictions: enemy-only cards cannot be selected
    .filter((c) => c && c.id !== "cosmicGod" && c.id !== "antiMatter")
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

  cards.forEach((c) => {
    const up = (typeof getUpgradedStats === "function") ? getUpgradedStats(c) : { atk: c.atk, def: c.def, hp: c.hp, level: 0 };

    const tile = document.createElement("div");
    tile.className = "cardPick";
    // ✅ Mobile scroll-friendly: allow swipe/scroll without accidentally selecting a card.
    // We only treat it as a "tap" if the pointer didn't move beyond a small threshold.
    tile.style.touchAction = "pan-y";
    const safeName = String(c.name || "Card");
    tile.innerHTML = `
      <img src="${c.img}" alt="${safeName}" onerror="this.onerror=null;this.src=window.__cardPlaceholder('${safeName.replace(/'/g, "\\'")}')" />
      <div style="margin-top:10px;font-weight:1000;letter-spacing:.2px;">${safeName}${up.level ? ` <span class='pill' style='margin-left:6px;'>Lv${up.level}</span>` : ""}</div>
      <div class="muted" style="margin-top:6px;font-weight:900;">ATK ${up.atk} • DEF ${up.def} • HP ${up.hp}</div>
      <div class="muted" style="margin-top:6px;">${c.skillName}</div>
    `;
    // Tap-vs-scroll guard
    let _downX = 0, _downY = 0, _moved = false;
    tile.addEventListener("pointerdown", (e) => {
      _moved = false;
      _downX = e.clientX;
      _downY = e.clientY;
      // capture so we still get pointerup even if finger drifts
      try { tile.setPointerCapture(e.pointerId); } catch (_) {}
    }, { passive: true });
    tile.addEventListener("pointermove", (e) => {
      const dx = Math.abs(e.clientX - _downX);
      const dy = Math.abs(e.clientY - _downY);
      if (dx > 10 || dy > 10) _moved = true;
    }, { passive: true });
    tile.addEventListener("pointerup", (e) => {
      // If the user was scrolling/swiping, don't select.
      if (_moved) return;
      playSfx("sfxClick", 0.35);
      closeDuelModal();
      startDuelGame(c.id);
    });
    tile.addEventListener("pointercancel", () => { _moved = true; });
    grid.appendChild(tile);
  });

  const closeBtn = box.querySelector("#btnDuelClose");
  if (closeBtn) closeBtn.addEventListener("click", () => { playSfx("sfxClick", 0.25); closeDuelModal(); });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeDuelModal();
  });
}

function closeDuelModal() {
  const el = document.getElementById("duelOverlay");
  if (el) el.remove();
}

function startDuelGame(playerCardId) {
  // Keep the same safety rules as startGame
  if (playerCardId === "cosmicGod") {
    alert("Cosmic God is sealed by the Gods and cannot be selected. (Enemy-only card)");
    return;
  }
  if (playerCardId === "antiMatter") {
    alert("Anti-Matter is awakened, but it is ENEMY-only and cannot be selected.");
    return;
  }

  state.duelMode = true;
  state.stage = 1;
  state.relics = state.equippedRelicId ? [state.equippedRelicId] : [];

  // Per-run boss spawn guards
  state._entitySpawnedThisRun = false;
  state._awakenedSpawnedThisRun = false;

  const playerBase = findCardById(playerCardId);
  const pool = getDuelEnemyPool(playerCardId);
  const enemyBase = pool[Math.floor(Math.random() * pool.length)];

  state.player = cloneCard(playerBase);
  state.enemy = cloneCard(enemyBase);
  state.enemy.passiveEnabled = true;
  state.enemy.aiType = pickEnemyAI();

  state.player.shield = Math.min(getShieldCap(state.player), state.player.shield);
  state.player.def = state.player.shield;

  state.phase = "battle";
  state.turn = "player";
  state.round = 1;

  // Potions cooldown resets per match
  state.potionCooldownTurns = 0;
  saveProgress();

  showView("game");
  resetCardVisuals();
  $("log").innerHTML = "";

  log(`⚔️ 1v1 Duel: You picked ${state.player.name}. Enemy is ${state.enemy.name}.`, "warn");
  log(`🧠 Enemy AI: ${state.enemy.aiType}`, "warn");
  tryEnemyPassive();
  updateUI();
}

function isSecretCardOwned(cardId) {
  const id = String(cardId || "");
  if (!id) return false;

  // Entity (Lucky Draw legendary)
  if (id === "relicbornTitan") return !!(state?.luckyEntityOwned || state?.owned?.relicbornTitan);
  // ✅ Diablo is ONLY owned/visible when the Legend unlock flag is true.
  if (id === "diablo") return !!state?.diabloUnlocked;

  // Default: check owned map
  return !!state?.owned?.[id];
}

function getSecretsOwnedNonShopCardsForUpgrade() {
  const shopIds = getShopCardIdSet();
  const all = (typeof getAllCards === "function") ? getAllCards() : [];
  const byId = new Map((all || []).filter(Boolean).map((c) => [String(c.id), c]));

  return SECRETS_ONLY_CARD_IDS
    .filter((id) => byId.has(id))
    .filter((id) => isSecretCardOwned(id))
    .map((id) => byId.get(id))
    .filter((c) => c && c.id && !shopIds.has(String(c.id)));
}

function openSecretsModal() {
  const modal = document.getElementById("secretsModal");
  const list = document.getElementById("secretsList");
  const hint = document.getElementById("secretsHint");
  if (!modal || !list) return;

  const cards = getSecretsOwnedNonShopCardsForUpgrade();
  if (!cards.length) {
    list.innerHTML = `<div class="muted">No secret cards owned yet.</div>`;
    if (hint) hint.textContent = "";
    modal.style.display = "flex";
    return;
  }

  list.innerHTML = cards.map((c) => {
    const st = getUpgradedStats(c);
    const lvl = st.level;
    const cost = getUpgradeCost(c.id);
    const atMax = lvl >= CARD_UPGRADE_MAX_LEVEL;
    const canPay = state.gold >= cost;

    const badge = lvl > 0
      ? `<span class="badge badgeOwned">Lv ${lvl}</span>`
      : `<span class="badge">Lv 0</span>`;

    const btn = atMax
      ? `<button class="btn" disabled>MAX</button>`
      : `<button class="btn btnPrimary" ${canPay ? "" : "disabled"} data-secret-upgrade-id="${c.id}">Upgrade (${cost}g)</button>`;

    return `
      <div class="secretsRow">
        <div class="secretsLeft">
          <div class="secretsTitleLine">
            <b>${c.name}</b>
            ${badge}
            <span class="pill">Damage ${st.atk} • Armor ${st.def} • Life ${st.hp}</span>
          </div>
          <div class="secretsMeta">Not purchasable in Shop</div>
        </div>
        <div style="flex:0 0 auto;">${btn}</div>
      </div>
    `;
  }).join("");

  // Wire buttons
  list.querySelectorAll("button[data-secret-upgrade-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-secret-upgrade-id");
      if (!id) return;
      upgradeCard(id);
      // Re-render so gold + new level reflect immediately.
      openSecretsModal();
    });
  });

  if (hint) hint.textContent = "";
  modal.style.display = "flex";
}

function closeSecretsModal() {
  const modal = document.getElementById("secretsModal");
  if (modal) modal.style.display = "none";
}

function renderUpgradeSection(parent) {
  if (!parent) return;

  const section = document.createElement("div");
  section.className = "shopItem";

  const usable = getAllCards();
  usable.sort((a, b) => a.name.localeCompare(b.name));

  const rows = usable.map((c) => {
    const st = getUpgradedStats(c);
    const lvl = st.level;
    const cost = getUpgradeCost(c.id);
    const atMax = lvl >= CARD_UPGRADE_MAX_LEVEL;
    const canPay = state.gold >= cost;

    const badge = lvl > 0 ? `<span class="badge badgeOwned">Lv ${lvl}</span>` : `<span class="badge">Lv 0</span>`;
    const btn = atMax
      ? `<button class="btn" disabled>MAX</button>`
      : `<button class="btn btnPrimary" ${canPay ? "" : "disabled"} data-upgrade-id="${c.id}">Upgrade (${cost}g)</button>`;

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid rgba(255,255,255,0.10);">
        <div style="min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <b>${c.name}</b>
            ${badge}
            <span class="pill">Damage ${st.atk} • Armor ${st.def} • Life ${st.hp}</span>
          </div>
        </div>
        <div style="flex:0 0 auto;">${btn}</div>
      </div>
    `;
  }).join("");

  section.innerHTML = `
    <div class="shopItemTop">
      <div>
        <h3 class="shopName">⬆️ Card Upgrades</h3>
        <div class="shopMeta">
          <span class="badge">Max Level: ${CARD_UPGRADE_MAX_LEVEL}</span>
          <span class="badge">+1 DMG / Lv • +2 Life / Lv • +1 Armor every 2 Lv</span>
        </div>
      </div>
    </div>
    <p class="shopDesc">Upgrade your usable cards using gold. Upgrades apply in battle.</p>
    <div>${rows || "<div class=\"muted\">No cards available.</div>"}</div>
  `;

  parent.appendChild(section);

  section.querySelectorAll("button[data-upgrade-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-upgrade-id");
      if (!id) return;
      upgradeCard(id);
    });
  });
}


// =========================
// ✅ WIN STREAK MILESTONES
// =========================
const SECRET_STREAK_CARD_ID = "cosmoSecret";

function updateStreakUI() {
  const s = Number(state.winStreak || 0) || 0;
  const b = Number(state.bestStreak || 0) || 0;
  const el = document.getElementById("streakTag");
  if (el) {
    el.textContent = `Streak: ${s}`;
    el.title = `Best streak: ${b}`;
  }
}

function resetWinStreak() {
  state.winStreak = 0;
  saveProgress();
  updateStreakUI();
}

function unlockSecretStreakCard() {
  if (!state.owned) state.owned = {};
  if (state.owned[SECRET_STREAK_CARD_ID]) return false;

  state.owned[SECRET_STREAK_CARD_ID] = true;
  saveProgress();

  log(`🎁 LIMITED EDITION UNLOCKED: Cosmo Secret`, "good");
  playSfx("sfxJackpot", 0.9);
  // 🌌 New: cinematic reveal modal + lore
  showCosmoRevealModal();
  return true;
}

function applyWinStreakMilestones() {
  const s = Number(state.winStreak || 0) || 0;
  let bonus = 0;

  // 50 streak: secret card (limited edition)
  if (s > 0 && s % 50 === 0) {
    const unlocked = unlockSecretStreakCard();
    if (!unlocked) {
      // If already owned (repeat 50 streak), reward some gold instead
      bonus += 250;
      log(`🎁 50 streak reward repeated → +250 gold (already owned secret).`, "good");
    }
  }

  // 30 streak: special message + 500 gold (dominates 10/20 bonuses)
  if (s > 0 && s % 30 === 0) {
    bonus += 500;
    log(`🌌 You almost unlock the secrets of Cosmo... (+500 gold)`, "good");
    alert("🌌 YOU ALMOST UNLOCK THE SECRETS OF COSMO...\n\nReward: +500 gold");
  } else {
    // 10 / 20 streak rewards
    if (s > 0 && s % 20 === 0) bonus += 100;
    else if (s > 0 && s % 10 === 0) bonus += 50;
  }

  if (bonus > 0) {
    addGold(bonus);
    floatingDamage("player", `+${bonus}g`, "good");
    log(`🔥 Win streak bonus! Streak ${s} → +${bonus} gold.`, "good");
  }
}

function bumpWinStreakOnWin() {
  state.winStreak = Number(state.winStreak || 0) + 1;
  state.bestStreak = Math.max(Number(state.bestStreak || 0), Number(state.winStreak || 0));
  saveProgress();
  updateStreakUI();
  applyWinStreakMilestones();
}

// =========================
// 🎯 MISSIONS (Home text only)
// =========================
function updateMissionText() {
  const box = document.getElementById("missionText");
  if (!box) return;

  if (!state.missions) state.missions = {};
  if (!state.owned) state.owned = {};

  const total = Math.max(0, Number(state.missions.totalDefeats || 0) || 0);
  const hasCosmo = !!state.owned["cosmoSecret"];
  const hasRayBill = !!state.owned["rayBill"];

  let mainLine = "";
  let subLine = "";

  if (!hasCosmo) {
    // Mission 1 is intentionally a "straight" streak challenge.
    // Do not show a numeric counter on the Home card.
    mainLine = "Mission 1: Defeat 50 cards straight to reveal the Revelation.";
    subLine = "Status: Keep your streak alive — losing resets the path.";
  } else if (!hasRayBill) {
    mainLine = "Mission 2: Defeat Cosmo Revelation to unlock Ray Bill.";
    subLine = state.missions.cosmoRevelationDefeated
      ? "Status: Cosmo Revelation defeated ✅ (Ray Bill unlock may appear)."
      : "Status: Not defeated yet.";
  } else if (!state.missions.diabloDefeated) {
    mainLine = "Mission 3: Defeat Diablo.";
    subLine = "Status: Not defeated yet.";
  } else if (!state.missions.entityDefeated) {
    mainLine = "Mission 4: Defeat Entity itself to proceed to Mission 5.";
    subLine = "Status: Not defeated yet.";
  } else if (!state.missions.awakenMonsterDefeated) {
    mainLine = "Mission 5: Defeat the Awakened Monster.";
    subLine = "Status: Not defeated yet. (Defeat it to unlock Anti-Matter)";
  } else if (!state.missions.antiMatterDefeated) {
    mainLine = "Mission 6: Defeat the Anti-Matter card to unlock the Boss Fight.";
    subLine = "Status: Anti-Matter not defeated yet. (Defeat it to open the portal)";
  } else {
    mainLine = "All Missions Cleared: The portal to Omni is open.";
    subLine = "Status: Mission 6 complete ✅ (Boss Fight unlocked ✅)";
  }

  box.innerHTML = `🎯 <b>MISSIONS</b>: ${mainLine}<span class="mutedLine">${subLine}</span>`;
}

function showView(view) {
  state.currentView = view;
  const ids = ["home", "gallery", "story", "setup", "game", "shop", "profile"];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === view ? "block" : "none";
  });
  updateGoldUI();
  if (view === "home") updateMissionText();
}

// =========================
// 📜 STORY MODE (Home button)
// =========================
const STORY_PROGRESS_KEY = "cb_story_progress_v1";

let __storyIndex = 0;
let __storyTyping = false;
let __storyTypeTimer = null;
let __storyFullText = "";
let __storyTyped = 0;

// ✅ Longer + hyped story about the Revelation
const STORY_PAGES = [
  {
    title: "Prologue: The First Draw",
    body:
`Before the first card was drawn, there was only Silence — a void that refused to end.

Then a single spark broke the dark: COSMO.
Not a star… not a god… but a WILL.
And that will dared nothingness to become a universe.`
  },
  {
    title: "Cosmo’s Law",
    body:
`Cosmo carved a law into reality:

\"All power must be earned — in the Arena.\"

So the universe learned to fight.
Not for gold.
Not for land.
For GLORY.`
  },
  {
    title: "Glory: The Currency of Creation",
    body:
`Glory is not a trophy… it’s a force.

It hardens into armor.
It sharpens into damage.
It stitches broken timelines.

And when enough Glory is gathered… it can rewrite fate itself.`
  },
  {
    title: "The Seven Realms",
    body:
`To keep balance, Cosmo forged seven realms — each guarding a piece of the universal flame.

But realms are not peaceful.
They are hungry.

And hunger always asks the same question:
\"Why should YOU hold the power… and not us?\"`
  },
  {
    title: "When Arenas Became Wars",
    body:
`At first, battles were sport.

Then champions rose.
Crowds screamed.
Relics awakened.

Soon the arenas stopped being games… and became WAR ZONES.
Because every victory created Glory… and every Glory created ambition.`
  },
  {
    title: "Relics That Whisper",
    body:
`Ancient relics don’t just empower fighters… they whisper.

\"Take one more win.\"
\"Climb one more stage.\"
\"Break one more enemy.\"

They promise immortality.
But they never mention the price.`
  },
  {
    title: "The Fracture",
    body:
`Somewhere beyond the visible stars, a crack formed in the sky.

Time began to skip.
Armor stopped obeying the rules.
Healers felt their blessings fail.

It wasn’t a bug.
It was a WARNING.`
  },
  {
    title: "The Secret Card",
    body:
`A secret card drifted between realms like a forbidden comet.

Not sold.
Not gifted.
Earned only by obsession.

Those who unlocked it heard the same words in their bones:
\"THE REVELATION IS REAL.\"`
  },
  {
    title: "COSMO REVELATION",
    body:
`The Revelation is not a prophecy.
It’s a countdown.

When the last seal breaks, every realm will unleash its final boss.
The sky will split into a thousand battles.
And Glory will rain like meteors.

Only one champion will stand at the end.`
  },
  {
    title: "The God of All Gods",
    body:
`Above every throne… beyond every cosmic god… there is ONE.

The God of All Gods.

It does not hunt worlds.
It judges them.
And when it wakes… it will look into the Arena and decide what deserves to exist.`
  },
  {
    title: "Why Everyone Fights",
    body:
`Every fighter wants Glory.
But not for the same reason.

Some want to protect their realm.
Some want to erase their past.
Some want to rewrite the rules.

And some… just want to watch the universe burn in applause.`
  },
  {
    title: "The Challenger",
    body:
`Cosmo was never running from the war.
Cosmo was building a CHALLENGER.

You.

Your wins are not just numbers.
They are signals.

Every victory tells the universe:
\"I am coming for the throne.\"`
  },
  {
    title: "Final Warning",
    body:
`When the bosses arrive, there will be no easy battles.
No safe turns.

Only strategy.
Only nerves.
Only Glory.

And when the God of All Gods finally descends… it won’t ask if you’re ready.

It will ask what you’re worth.`
  },
  {
    title: "⚔️ Boss Battle (Coming Soon)",
    body:
`You reached the edge of the story.

Next: Boss fights… realm champions… and the GOD OF ALL GODS.

COMING SOON.

Until then… keep climbing.
Keep winning.
Keep building your Glory.`
  },
];

function loadStoryProgress() {
  try {
    const raw = storageGet(STORY_PROGRESS_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(STORY_PAGES.length - 1, Math.floor(n)));
  } catch (e) {
    return 0;
  }
}

function saveStoryProgress() {
  try { storageSet(STORY_PROGRESS_KEY, String(__storyIndex)); } catch (e) {}
}

function storyStopTyping() {
  if (__storyTypeTimer) {
    try { clearInterval(__storyTypeTimer); } catch (e) {}
    __storyTypeTimer = null;
  }
  __storyTyping = false;
  const body = document.getElementById("storyBody");
  if (body) body.classList.remove("typing");
}

function storyFinishTyping() {
  storyStopTyping();
  const body = document.getElementById("storyBody");
  if (body) body.textContent = __storyFullText || "";
  __storyTyped = (__storyFullText || "").length;
}

function storyTypeText(text) {
  storyStopTyping();
  __storyFullText = String(text || "");
  __storyTyped = 0;
  __storyTyping = true;

  const body = document.getElementById("storyBody");
  if (!body) return;
  body.textContent = "";
  body.classList.add("typing");

  // Slightly cinematic typing speed; newlines pause longer.
  __storyTypeTimer = setInterval(() => {
    if (!__storyTyping) return;
    if (__storyTyped >= __storyFullText.length) {
      storyStopTyping();
      return;
    }
    const ch = __storyFullText.charAt(__storyTyped);
    __storyTyped += 1;
    body.textContent += ch;
  }, 14);
}

function openStoryMode() {
  __storyIndex = loadStoryProgress();
  renderStoryPage(true);
  showView("story");

  // replay intro animation
  const card = document.getElementById("storyCard");
  if (card) {
    card.classList.remove("storyIntro");
    // force reflow so animation can replay
    void card.offsetWidth;
    card.classList.add("storyIntro");
  }
}

function renderStoryPage(animateTyping = false) {
  const p = STORY_PAGES[Math.max(0, Math.min(STORY_PAGES.length - 1, __storyIndex))];
  const pill = document.getElementById("storyPagePill");
  const title = document.getElementById("storyTitle");
  const body = document.getElementById("storyBody");
  const boss = document.getElementById("storyBossWrap");
  const bossSub = document.getElementById("storyBossSub");
  const fightBtn = document.getElementById("btnFightBossNow");

  if (pill) pill.textContent = `Page ${__storyIndex + 1} / ${STORY_PAGES.length}`;
  if (title) title.textContent = p?.title || "";

  const text = p?.body || "";
  if (body) {
    if (animateTyping) storyTypeText(text);
    else body.textContent = text;
  }

  const prev = document.getElementById("btnStoryPrev");
  const next = document.getElementById("btnStoryNext");
  if (prev) prev.disabled = __storyIndex <= 0;

  if (next) {
    const atEnd = __storyIndex >= STORY_PAGES.length - 1;
    next.textContent = atEnd ? "⚔️ Coming Soon" : "Next ➡️";
  }

  // Boss preview portal only on final page
  if (boss) {
    boss.style.display = (__storyIndex >= STORY_PAGES.length - 1) ? "block" : "none";
  }

  // Boss unlock gate: Mission 6 must be cleared
  if (__storyIndex >= STORY_PAGES.length - 1) {
    const unlocked = !!(state && state.missions && state.missions.antiMatterDefeated);
    if (fightBtn) fightBtn.disabled = !unlocked;
    if (bossSub) bossSub.textContent = unlocked
      ? "The portal is open. Omni is waiting."
      : "Complete Mission 6 to unlock";
  }

  saveStoryProgress();
}

function storyPrev() {
  if (__storyTyping) { storyFinishTyping(); return; }
  __storyIndex = Math.max(0, __storyIndex - 1);
  renderStoryPage(true);
}

function storyNext() {
  if (__storyTyping) { storyFinishTyping(); return; }

  if (__storyIndex >= STORY_PAGES.length - 1) {
    // Final page: stay here. The boss button becomes available once Mission 6 is cleared.
    try { renderStoryPage(false); } catch(e) {}
    return;
  }
  __storyIndex = Math.min(STORY_PAGES.length - 1, __storyIndex + 1);
  renderStoryPage(true);
}

// =========================
// FIGHTER
// =========================
function cloneCard(card) {
  const st = (typeof getUpgradedStats === 'function') ? getUpgradedStats(card) : { atk: card.atk, def: card.def, hp: card.hp, level: 0 };
  return {
    uid: (__CARD_UID++),
    id: card.id,
    name: card.name,
    img: card.img,
    atk: st.atk,
    def: st.def,
    maxHp: st.hp,
    hp: st.hp,
    shield: st.def,
    shieldCap: st.def,
    cooldown: 0,
    titanKillCd: 0,
    frozen: 0,
    stunned: 0,
    boost: 0,
    noArmorGain: 0,
    rebootSeal: 0, // ✅ NEW
    silenced: 0,
    // ✅ NEW: Poison / Debuff / Strong Stun
    poisonRounds: 0,
    poisonPct: 0,
    poisonFlat: 0,
    debuffRounds: 0,
    debuffAtk: 0,
    debuffShield: 0,
    stun2Rounds: 0,

    skillReadyAt: 0,
    passiveCdUntil: 0,
    passiveEnabled: false,
    passiveChance: 0.35,
    aiType: "Aggressive",
    base: card
  };
}

function log(msg, cls = "") {
  const el = document.createElement("p");
  if (cls) el.className = cls;
  el.textContent = msg;
  $("log").appendChild(el);
  $("log").scrollTop = $("log").scrollHeight;
}

// =========================
// TOAST (top message)
// =========================
function showToast(msg, kind = "info") {
  if (!msg) return;
  // Kill previous toast if present
  const prev = document.getElementById("toastTop");
  if (prev) prev.remove();

  const t = document.createElement("div");
  t.id = "toastTop";
  t.className = `toastTop ${kind}`;
  t.textContent = msg;
  document.body.appendChild(t);
  // restart animation
  void t.offsetWidth;
  t.classList.add("show");

  setTimeout(() => {
    t.classList.remove("show");
    t.classList.add("hide");
    setTimeout(() => { try { t.remove(); } catch(e){} }, 260);
  }, 1600);
}

// =========================
// HIT FX
// =========================
function pulseHit(target) {
  const arena = $("arenaCard");
  const card = target === "player" ? $("playerCard") : $("enemyCard");
  if (!arena || !card) return;

  arena.classList.remove("shake");
  card.classList.remove("hitFlash");
  void arena.offsetWidth; void card.offsetWidth;

  arena.classList.add("shake");
  card.classList.add("hitFlash");
}

function floatingDamage(target, text, cls) {
  const frame = target === "player" ? $("pFrame") : $("eFrame");
  if (!frame) return;

  const el = document.createElement("div");
  el.className = `floatingDmg ${cls || ""}`;
  el.textContent = text;
  frame.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

// ✅ ATTACK PROJECTILE FX
function ensureFxLayer() {
  let layer = document.getElementById("fxLayer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "fxLayer";
    // layer is styled in CSS to be fixed + pointer-events none
    document.body.appendChild(layer);
  }
  return layer;
}
function centerOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
function spawnAttackFx(from, to) {
  const layer = ensureFxLayer();
  if (!layer) return;

  const a = from === "player" ? document.getElementById("playerCard") : document.getElementById("enemyCard");
  const b = to === "player" ? document.getElementById("playerCard") : document.getElementById("enemyCard");
  if (!a || !b) return;

  const A = centerOf(a);
  const B = centerOf(b);

  const lr = layer.getBoundingClientRect();
  const sx = A.x - lr.left;
  const sy = A.y - lr.top;
  const tx = B.x - lr.left;
  const ty = B.y - lr.top;

  const dx = tx - sx;
  const dy = ty - sy;
  const rot = Math.atan2(dy, dx) * (180 / Math.PI);

  const fx = document.createElement("div");
  fx.className = "attackFx";

  fx.style.setProperty("--sx", `${sx}px`);
  fx.style.setProperty("--sy", `${sy}px`);
  fx.style.setProperty("--tx", `${tx}px`);
  fx.style.setProperty("--ty", `${ty}px`);
  fx.style.setProperty("--rot", `${rot}deg`);

  fx.style.animation = `flySlash 220ms ease-out forwards`;
  layer.appendChild(fx);

  setTimeout(() => fx.remove(), 260);
}

// 🔥 REVIVE FX (Phoenix Ember)
function spawnReviveFx(target, big = true) {
  const layer = ensureFxLayer();
  const card = target === "player" ? document.getElementById("playerCard") : document.getElementById("enemyCard");
  if (!layer || !card) return;

  const A = centerOf(card);
  const lr = layer.getBoundingClientRect();
  const x = A.x - lr.left;
  const y = A.y - lr.top;

  // Ring + sparks
  const fx = document.createElement("div");
  fx.className = "reviveFx" + (big ? " reviveFxBig" : "");
  fx.style.left = `${x}px`;
  fx.style.top = `${y}px`;
  layer.appendChild(fx);

  // Ember shockwave
  const emb = document.createElement("div");
  emb.className = "reviveEmbers";
  emb.style.left = `${x}px`;
  emb.style.top = `${y}px`;
  layer.appendChild(emb);

  setTimeout(() => { try { fx.remove(); } catch(e){} }, 1200);
  setTimeout(() => { try { emb.remove(); } catch(e){} }, 1200);
}

function cardReviveFlip(target) {
  const card = target === "player" ? document.getElementById("playerCard") : document.getElementById("enemyCard");
  if (!card) return;

  // Ensure the revive animation only plays when a revive actually happens,
  // and that it always starts from a "dead" visual state (so it doesn't snap).
  card.classList.remove("dieFlip", "revivePulse", "reviveFlip");

  // Force the starting pose to match the end of dieFlip (rotateY 180, grayscale, dim)
  card.style.transform = "rotateY(180deg) scale(.98)";
  card.style.opacity = ".35";
  card.style.filter = "grayscale(1)";

  void card.offsetWidth;
  card.classList.add("revivePulse", "reviveFlip");

  setTimeout(() => {
    try {
      card.classList.remove("revivePulse", "reviveFlip");
      // Clean any inline styles we applied to stage the animation.
      card.style.transform = "";
      card.style.opacity = "";
      card.style.filter = "";
    } catch(e){}
  }, 900);
}


// ✅ DIE FLIP FX
function cardDieFlip(who) {
  const card = who === "player" ? document.getElementById("playerCard") : document.getElementById("enemyCard");
  if (!card) return;

  // clear other animation classes so die animation always shows
  card.classList.remove(
    "hitFlash",
    "attackLeft",
    "attackRight",
    "recoilLeft",
    "recoilRight",
    "defendBump"
  );

  // reset animation if reused
  card.classList.remove("dieFlip");
  void card.offsetWidth;
  card.classList.add("dieFlip");
}
// ✅ RESET CARD VISUAL STATE (fix: gray/flipped next enemy)
function resetCardVisuals() {
  const pEl = document.getElementById("playerCard");
  const eEl = document.getElementById("enemyCard");

  [pEl, eEl].forEach((el) => {
    if (!el) return;

    // remove death flip + any lingering impact classes
    el.classList.remove(
      "dieFlip",
      "revivePulse",
      "reviveFlip",
      "hitFlash",
      "attackLeft",
      "attackRight",
      "recoilLeft",
      "recoilRight",
      "defendBump"
    );

    // hard reset visual properties in case animation 'forwards' left them stuck
    el.style.transform = "";
    el.style.opacity = "";
    el.style.filter = "";

    // force reflow so the browser fully applies the reset
    void el.offsetWidth;
  });
}


// =========================
// DAMAGE
// =========================
function dmgCalc(attacker) {
  const rng = Math.floor(Math.random() * 2);
  let dmg = attacker.atk + rng;

  if (hasRelic("adrenalSurge") && attacker === state.player && state.player) {
    if (state.player.hp <= Math.ceil(state.player.maxHp * 0.5)) dmg += 1;
  }

  if (attacker.boost > 0) { dmg += 3; attacker.boost = 0; }
  if (attacker.stunned > 0) dmg = Math.max(1, dmg - 2);

  return Math.max(1, dmg);
}

// ✅ Damage rules (always enforced here)
// - PHYSICAL (default): must hit Armor first; if Armor > 0, damage ONLY reduces Armor (no HP overflow on the same hit).
// - TRUE: ignores Armor completely and hits HP directly.
function applyDamage(defender, dmg, opts = {}) {
  // ✅ HARDEN: prevent NaN/undefined HP/Shield from breaking combat logic
  dmg = Number(dmg);
  if (!Number.isFinite(dmg)) dmg = 0;

  defender.hp = Number(defender.hp);
  if (!Number.isFinite(defender.hp)) defender.hp = 0;

  defender.shield = Number(defender.shield);
  if (!Number.isFinite(defender.shield)) defender.shield = 0;

  const damageType = (opts.damageType || "physical").toLowerCase();
  const source = (opts.source || "attack").toLowerCase();

  // ✅ OP Relic: Titan Plate (flat damage reduction)
  // Only the player can equip relics, so apply when the PLAYER is being hit.
  if (defender === state.player && hasRelic("titanPlate") && dmg > 0) {
    dmg = Math.max(0, dmg - 2);
  }

  // Best-effort attacker name (for Last Hit Summary)
  const inferredAttacker = opts.attackerName || opts.attacker?.name || (defender === state.player ? state.enemy?.name : state.player?.name) || "Unknown";

  let absorbed = 0;
  let hpLoss = 0;

  if (dmg <= 0) {
    // nothing
  } else if (damageType === "true") {
    // TRUE damage ignores armor
    hpLoss = Math.min(defender.hp, dmg);
    defender.hp = Math.max(0, defender.hp - hpLoss);
  } else {
    // PHYSICAL damage (default)
    if (defender.shield > 0) {
      absorbed = Math.min(defender.shield, dmg);
      defender.shield = Math.max(0, defender.shield - absorbed);
      // Keep DEF and Shield in sync
      defender.def = defender.shield;
      // ✅ no HP overflow in the same hit
      hpLoss = 0;
    } else {
      hpLoss = Math.min(defender.hp, dmg);
      defender.hp = Math.max(0, defender.hp - hpLoss);
    }
  }

  // ✅ Keep DEF and Shield in sync (even when no shield was present)
  defender.def = Number(defender.shield || 0);

  // How much damage actually landed this hit (armor + HP)
  const actualTaken = Math.max(0, Number(absorbed || 0) + Number(hpLoss || 0));

  const who = defender === state.player ? "player" : "enemy";
  pulseHit(who);

  // Damage floaters (clear feedback)
  if (damageType === "true") {
    if (hpLoss > 0) floatingDamage(who, `-${hpLoss}✨`, "bad");
  } else {
    if (absorbed > 0) floatingDamage(who, `-${absorbed}🛡️`, "warn");
    else if (hpLoss > 0) floatingDamage(who, `-${hpLoss}❤️`, "bad");
  }

  // ✅ Legendary passive checks (e.g., Yrol)
  tryYrolPassive(defender, opts || {});

  // ✅ Secret passive: Cosmo Secret (Gods Vision)
  // Trigger using the *actual* damage taken (Armor absorbed + HP loss). This makes the
  // passive reliable with armor/no-overflow rules and any damage reductions.
  try {
    if (actualTaken > 0) {
      tryCosmoGodsVision(defender, opts.attacker || null, actualTaken, opts || {});
    }
  } catch (e) {
    // Never let a passive break combat
  }

  // Combat log detail
  if (!opts.silent && dmg > 0) {
    if (damageType === "true") {
      log(`✨ TRUE damage ignores armor → ${defender.name} takes ${hpLoss} HP.`, "warn");
    } else if (absorbed > 0) {
      log(`🛡️ Defense absorbs ${absorbed}. (No HP overflow this hit.)`, "warn");
    } else {
      log(`❤️ ${defender.name} takes ${hpLoss} HP.`, "warn");
    }
  }

  // ✅ Always show CLEAR ability damage when ENEMY skills hit the PLAYER (even if the skill uses silent damage)
  // This avoids confusion on death: the player will always see the exact ability damage breakdown.
  if (defender === state.player && source === "skill" && dmg > 0) {
    const typeLabel = damageType === "true" ? "TRUE (ignores armor)" : "PHYSICAL";
    const parts = [];
    if (absorbed > 0) parts.push(`-${absorbed} Armor`);
    if (hpLoss > 0) parts.push(`-${hpLoss} HP`);
    if (!parts.length) parts.push("no effect");

    // Only log if the attacker isn't the player themself (prevents weird edge-cases like self-damage)
    const attackerIsEnemy = inferredAttacker && state.enemy && inferredAttacker === state.enemy.name;
    if (attackerIsEnemy) {
      log(`💥 Enemy ability damage (${typeLabel}): ${parts.join(", ")}.`, "bad");
    }
  }

  // ✅ Last hit summary (only track for PLAYER so defeat is clear)
  if (defender === state.player && dmg > 0) {
    const srcLabel = source === "skill" ? "Ability" : "Attack";
    const typeLabel = damageType === "true" ? "TRUE (ignores armor)" : "PHYSICAL";
    const parts = [];
    if (absorbed > 0) parts.push(`-${absorbed} Armor`);
    if (hpLoss > 0) parts.push(`-${hpLoss} HP`);
    if (!parts.length) parts.push("no effect");
    state.lastHitSummary = `${inferredAttacker} ${srcLabel} • ${typeLabel} • ${parts.join(", ")}`;
  }

  // ✅ OP Relic: Phoenix Ember (revive once per battle at 30% HP)
  // Only trigger on an actual *death* from this hit (i.e., damage landed), and only while in battle.
  // Trigger AFTER damage is applied, before any win/lose checks happen in callers.
  if (
    state.phase === "battle" &&
    actualTaken > 0 &&
    defender === state.player &&
    hasRelic("phoenixEmber") &&
    Number(defender.hp) <= 0 &&
    !defender.phoenixUsed
  ) {
    defender.phoenixUsed = true;
    defender.hp = Math.max(1, Math.ceil(Number(defender.maxHp || 1) * 0.30));

    // ✨ Make the revive feel epic (FX should ONLY happen when the revive actually triggers)
    try { spawnReviveFx("player", true); } catch (e) {}
    try { cardReviveFlip("player"); } catch (e) {}

    log(`🔥 Phoenix Ember ignites! You revive at ${defender.hp} HP.`, "good");
    floatingDamage("player", `🔥 +${defender.hp}`, "good");
  }

  // Post-hit effects

  // ✅ OP Relic: Void Mirror (reflect 25% of damage taken)
  if (defender === state.player && hasRelic("voidMirror") && actualTaken > 0 && state.enemy && Number(state.enemy.hp) > 0) {
    const reflect = Math.max(1, Math.ceil(actualTaken * 0.25));
    applyDamage(state.enemy, reflect, { silent: true, source: "skill", damageType: "true", attacker: state.player, attackerName: state.player?.name || "Player" });
    log(`🪞 Void Mirror reflects ${reflect} damage!`, "good");
    floatingDamage("enemy", `-${reflect}`, "warn");
  }

  // ✅ OP Relic: Bloodcore Sigil (15% lifesteal on damage dealt)
  if (hasRelic("bloodcoreSigil") && opts.attacker === state.player && defender === state.enemy) {
    const dealt = Math.max(0, Number(absorbed || 0) + Number(hpLoss || 0));
    if (dealt > 0) {
      const leeched = Math.max(1, Math.ceil(dealt * 0.15));
      const healed = heal(state.player, leeched);
      if (healed > 0) {
        log(`🩸 Bloodcore Sigil lifesteals +${healed} HP.`, "good");
        floatingDamage("player", `+${healed}`, "good");
      } else {
        log(`🩸 Bloodcore Sigil tried to lifesteal, but Reboot Seal blocked it!`, "warn");
      }
    }
  }

  // Entity passive on enemy death
  try { triggerRelicbornTitanOnKill(opts.attacker || null, defender, opts || {}); } catch (e) {}

  // ✅ Reflect relic: Spiked Armor
  if (defender === state.player && hasRelic("spikedArmor") && actualTaken > 0 && state.enemy && Number(state.enemy.hp) > 0) {
    applyDamage(state.enemy, 1, { silent: true, source: "skill", damageType: "true", attackerName: defender.name });
    log(`🪬 Spiked Armor reflects 1 damage!`, "good");
    floatingDamage("enemy", "-1", "warn");
  }

  updateUI();
}

function heal(fighter, amount) {
  if (!fighter || amount <= 0) return 0;
  if (!canHeal(fighter)) return 0; // ✅ blocked by Reboot Seal
  const before = fighter.hp;
  fighter.hp = Math.min(fighter.maxHp, fighter.hp + amount);
  updateUI();
  return fighter.hp - before;
}

function tickStatuses(f) {
  if (!f) return;

  // ✅ existing timers
  if (f.cooldown > 0) f.cooldown -= 1;
  if (f.titanKillCd > 0) f.titanKillCd -= 1;
  if (f.frozen > 0) f.frozen -= 1;
  if (f.stunned > 0) f.stunned -= 1;
  if (f.noArmorGain > 0) f.noArmorGain -= 1;
  if (f.rebootSeal > 0) f.rebootSeal -= 1;
  if (f.silenced > 0) f.silenced -= 1;

  // ✅ NEW: Strong stun (cannot attack/skill)
  if (f.stun2Rounds > 0) f.stun2Rounds -= 1;

  // ✅ NEW: Poison tick (percent of ATK + flat)
  if (f.poisonRounds > 0) {
    const pct = Number(f.poisonPct || 0);
    const flat = Number(f.poisonFlat || 0);
    const pctDmg = Math.ceil((Number(f.atk || 0)) * pct);
    const total = Math.max(0, pctDmg + Math.ceil(flat));

    if (total > 0 && Number(f.hp) > 0) {
      applyDamage(f, total, { silent: true, source: "skill", attackerName: "Poison", damageType: "true" });
      log(`☠️ ${f.name} takes ${total} poison damage!`, "warn");
    }

    f.poisonRounds -= 1;

    // clear when finished
    if (f.poisonRounds <= 0) {
      f.poisonPct = 0;
      f.poisonFlat = 0;
    }
  }

  // ✅ NEW: Debuff tick (-ATK, -Armor) each round
  if (f.debuffRounds > 0) {
    const dAtk = Number(f.debuffAtk || 0);
    const dSh = Number(f.debuffShield || 0);

    if (dAtk > 0) f.atk = Math.max(0, Number(f.atk || 0) - dAtk);
    if (dSh > 0) {
      f.shield = Math.max(0, Number(f.shield || 0) - dSh);
      // Keep DEF and Shield in sync
      f.def = f.shield;
    }

    log(`📉 ${f.name} suffers debuff (-${dAtk} ATK, -${dSh} Armor)!`, "warn");

    f.debuffRounds -= 1;

    if (f.debuffRounds <= 0) {
      f.debuffAtk = 0;
      f.debuffShield = 0;
    }
  }
}

// =========================
// ENEMY PASSIVE
// =========================
function tryEnemyPassive() {
  const e = state.enemy;
  const p = state.player;
  if (!e || !p) return;
  if (!e.passiveEnabled || state.phase !== "battle") return;

  const roll = Math.random();
  if (roll > e.passiveChance) {
    log(`Stage ${state.stage} • Round ${state.round}: ${e.name}'s passive did not trigger.`, "warn");
    return;
  }

  if (e.id === "3dm4rk") {
    p.frozen = 1;
    log(`Stage ${state.stage} • Round ${state.round}: ${e.name}'s passive — Time Freeze! You lose your next turn.`, "bad");
  } else if (e.id === "spacePatron") {
    p.stunned = 1;
    log(`Stage ${state.stage} • Round ${state.round}: ${e.name}'s passive — Arrest Beam! Your next attack is weaker.`, "bad");
  } else if (e.id === "luckyCat") {
    if (!canHeal(e)) {
      log(`Stage ${state.stage} • Round ${state.round}: ${e.name}'s passive tried to heal, but Reboot Seal blocked it!`, "warn");
    } else {
      e.hp = Math.min(e.maxHp, e.hp + 2);
      const gained = gainShield(e, 1);
      log(`Stage ${state.stage} • Round ${state.round}: ${e.name}'s passive — Lucky Charm! Enemy heals +2 HP and gains +${gained} Armor.`, "bad");
    }
  }
  else if (e.id === "tremo") {
  // Same effect as Time Rewind (auto each round if passive triggers)
  const healBlocked = !canHeal(e);
  if (!healBlocked) {
    e.hp = Math.min(e.maxHp, e.hp + 4);
  } else {
    log(`Stage ${state.stage} • Round ${state.round}: ${e.name}'s passive tried to heal, but Reboot Seal blocked it!`, "warn");
  }

  const gained = gainShield(e, 6);

  // Deal 9 damage to player (armor absorbs first)
  applyDamage(p, 9, { silent: true, source: "skill" });

  log(`Stage ${state.stage} • Round ${state.round}: ${e.name}'s passive — Time Rewind! Enemy ${healBlocked ? "couldn't heal" : "heals +4 HP"}, gains +${gained} Armor, and deals 9 damage.`, "bad");
}

  updateUI();
}


// =========================
// ENEMY AI
// =========================
const AI_TYPES = ["Aggressive", "Defensive", "Trickster"];
function pickEnemyAI() { return AI_TYPES[Math.floor(Math.random() * AI_TYPES.length)]; }

function enemyDecideAction() {
  const e = state.enemy;
  const skillReady = isSkillReady(e) && !isSilenced(e);

  if (e.aiType === "Trickster" && Math.random() < 0.25) return { type: "end" };

  if (e.aiType === "Defensive") {
    const low = e.hp <= Math.ceil(e.maxHp * 0.5);
    const lowShield = e.shield <= 1;
    if (skillReady && (low || lowShield || Math.random() < 0.65)) return { type: "skill" };
    return { type: "attack" };
  }

  if (e.aiType === "Aggressive") {
    if (skillReady && Math.random() < 0.25) return { type: "skill" };
    return { type: "attack" };
  }

  if (skillReady && Math.random() < 0.40) return { type: "skill" };
  return { type: "attack" };
}

// =========================
// MODAL
// =========================
function openModal({ title, text, stageLabel, hint, goldReward, mode }) {
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setText("resultTitle", title);
  setText("resultText", text);
  setText("resultStage", stageLabel);
  setText("modalHint", hint || "");

  // NOTE: Some builds remove the old reward/HP/shield fields from the modal.
  // Keep these assignments safe so the modal never crashes.
  setText("modalHP", `${state.player.hp}/${state.player.maxHp}`);
  setText("modalShield", `${state.player.shield}`);
  setText("modalGoldReward", goldReward != null ? `+${goldReward}` : "+0");
  setText("modalGoldTotal", `${state.gold}`);

  // For defeat/victory handling: we keep btnNextEnemy as the primary action button.
  const btnNext = document.getElementById("btnNextEnemy");
  if (btnNext) btnNext.style.display = (mode === "hideNext") ? "none" : "inline-block";

  const modal = document.getElementById("resultModal");
  if (modal) modal.style.display = "flex";
}

// =========================
// 🌩️ Omen Reveal: Ray Bill (shown when Cosmo Secret is defeated)
// =========================
const RAY_BILL_CARD = {
  id: "rayBill",
  name: "Ray Bill",
  img: "cards/ray-bill.png",
  atk: 8,
  def: 8,
  hp: 5,
  skillName: "Summon Thor's Ungodly Power",
  skillDesc: "Throw a random 100–300 burst of PURE magic (TRUE) damage that ignores armor. Ray Bill also converts that damage into HP + Armor. (Cooldown 5 turns).",
  cooldownTurns: 5,
  lore:
`Born under a storm that never ended, Ray Bill was raised in the ruins of a fallen pantheon.
He is not a god—he is the debt collector of gods.

When the old thrones shattered, Ray Bill stole a fragment of the Thunder-Sigil, a relic said to answer only to the wrath of the worthy.
Now he walks the edge of worlds, listening for the next divine lie to crack the sky.

Cosmo’s fall is his signal.
The heavens are trembling.
And Ray Bill is coming… to make every false god pay.`
};

function ensureRayBillOmenModal() {
  if (document.getElementById("rayBillOmenOverlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "rayBillOmenOverlay";
  overlay.className = "modalOverlay";
  overlay.style.display = "none";

  const box = document.createElement("div");
  box.className = "modalBox cosmoRevealBox omenModalBox";

  // Use existing modal styles (modalOverlay/modalBox + cosmoRevealHero)
  box.innerHTML = `
    <div class="modalHeader">
      <div>
        <div class="modalTitle">⚠️ The end is near…</div>
        <div class="modalPill">WAR INCOMING</div>
      </div>
      <button class="btn btnGhost" id="btnCloseRayBill">✖</button>
    </div>
    <div class="modalBody">
      <p class="modalText">The end is near and war is about to begin.</p>

      <div class="cosmoRevealHero">
        <div class="cosmoCardFrame">
          <img src="${RAY_BILL_CARD.img}" alt="${RAY_BILL_CARD.name}"
               onerror="this.onerror=null;this.src=window.__cardPlaceholder('${RAY_BILL_CARD.name.replace(/'/g,"\\'")}')"/>
        </div>

        <div class="cosmoRevealLore">
<b>${RAY_BILL_CARD.name}</b>
Damage: ${RAY_BILL_CARD.atk}
Def: ${RAY_BILL_CARD.def}
Life: ${RAY_BILL_CARD.hp}

Ability: ${RAY_BILL_CARD.skillName} (CD ${RAY_BILL_CARD.cooldownTurns})
${RAY_BILL_CARD.skillDesc}

Lore:
${RAY_BILL_CARD.lore}
        </div>
      </div>
    </div>
    <div class="modalActions single">
      <button class="btn btnPrimary big" id="btnAcknowledgeRayBill">⚔️ Prepare</button>
    </div>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const close = () => {
    overlay.style.display = "none";
  };

  const btnX = box.querySelector("#btnCloseRayBill");
  const btnOk = box.querySelector("#btnAcknowledgeRayBill");
  if (btnX) btnX.addEventListener("click", close);
  if (btnOk) btnOk.addEventListener("click", close);

  // click outside closes
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  if (btnOk) btnOk.addEventListener("click", () => {
    unlockRayBill();
    close();
  });
}


function showRayBillOmenModal() {
  ensureRayBillOmenModal();
  const overlay = document.getElementById("rayBillOmenOverlay");
  if (!overlay) return;
  overlay.style.display = "flex";
}

function closeModal() { const m = document.getElementById("resultModal"); if (m) m.style.display = "none"; }

// =========================
// BATTLE FLOW
// =========================
function setBossArenaMode(on) {
  const arena = document.getElementById("arenaCard");
  if (!arena) return;
  if (on) arena.classList.add("arenaBossMode");
  else arena.classList.remove("arenaBossMode");
}

function spawnNextEnemy() {
  // Story boss fights do not spawn random next enemies
  if (state.storyBossFight) return;
  const all = getGalleryCards();
  const playerId = state.player.id;

  // ✅ 1v1 Duel mode: keep enemies within the requested boss pool (when visible/unlocked)
  let pool = state.duelMode ? getDuelEnemyPool(playerId) : (all || []).filter((c) => c && c.id !== playerId);

  // ✅ Mission 1 should NEVER be polluted by late-game bosses.
  // Players can reach Legend (unlock Diablo) before completing Mission 1's 50-win streak.
  // In that case, we must NOT allow Entity / Awakened Monster to show up during the Mission 1 run.
  const mission1Active = (typeof isMission1Complete === "function") ? !isMission1Complete() : false;

  // ✅ Mission 1 (Stage 1) should also be a clean start.
  // Even if later missions are already unlocked (Legend/Diablo cleared),
  // NEVER spawn Entity or Awakened Monster on Stage 1.
  const isStage1 = (Number(state.stage || 0) || 0) <= 1;

  // Filter out late-game bosses when Mission 1 is still in progress OR on Stage 1.
  if (mission1Active || isStage1) {
    pool = (pool || []).filter((c) => c && c.id !== "relicbornTitan" && c.id !== "awakenedMonster");
  }
  // Safety: never allow an empty enemy pool (prevents rare "undefined enemy" bugs)
  if (!pool.length) pool = (BASE_CARDS || []).filter((c) => c && c.id !== playerId);
  // ✅ Mission bosses: force-spawn certain enemies once per run when their mission is active.
  let enemyBase = pool[Math.floor(Math.random() * pool.length)];
  try {
    ensureMissionUnlockDefaults();

    // Mission 4 target: Entity spawns once per run ONLY while Mission 4 is active.
    // (Mission 4 is active when Diablo is defeated but Entity is not.)
    const wantsEntity = !!(
      state.missions &&
      // ✅ Entity must NOT appear in Missions 1–3, even if Diablo was fought early.
      isMission1Complete() &&
      isMission2Complete() &&
      isMission3Complete() &&
      !isMission4Complete() &&
      (state.missions.entityUnlocked || state.missions.entityDefeated) &&
      !state.missions.entityDefeated
    );
    if (!mission1Active && !isStage1 && !state.duelMode && wantsEntity && !state._entitySpawnedThisRun) {
      enemyBase = findCardById("relicbornTitan") || (UNLOCKABLE_CARD_DEFS && UNLOCKABLE_CARD_DEFS.relicbornTitan) || enemyBase;
      state._entitySpawnedThisRun = true;
    }

    // Mission 5 boss: Awakened Monster spawns once per run ONLY while Mission 5 is active.
    const wantsAwakened = !!(
      state.missions &&
      // ✅ Awakened Monster must not appear before Mission 5.
      isMission1Complete() &&
      isMission2Complete() &&
      isMission3Complete() &&
      isMission4Complete() &&
      state.missions.entityDefeated &&
      !state.missions.awakenMonsterDefeated
    );
    if (!mission1Active && !isStage1 && !state.duelMode && wantsAwakened && !state._awakenedSpawnedThisRun) {
      enemyBase = buildAwakenedMonster();
      state._awakenedSpawnedThisRun = true;
    }
  } catch(e) {}

  state.enemy = cloneCard(enemyBase);
  state.enemy.passiveEnabled = true;
  state.enemy.aiType = pickEnemyAI();

  
  resetCardVisuals();

  // ✅ Reset once-per-battle relic triggers
  if (state.player) state.player.phoenixUsed = false;

  // ✅ OP Relic: Golden Heart (+10% Max HP each stage)
  if (state.player && hasRelic("goldenHeart")) {
    const curMax = Math.max(1, Number(state.player.maxHp || 1));
    const inc = Math.max(1, Math.ceil(curMax * 0.10));
    state.player.maxHp = curMax + inc;
    state.player.hp = Math.min(state.player.maxHp, Number(state.player.hp || 0) + inc);
    log(`💛 Golden Heart empowers you at stage start: +${inc} Max HP.`, "good");
    floatingDamage("player", `+${inc} MaxHP`, "good");
  }

if (hasRelic("fieldMedic")) {
    const healed = heal(state.player, 1);
    if (healed > 0) {
      log(`🪬 Field Medic heals you +1 HP at stage start.`, "good");
      floatingDamage("player", "+1", "good");
    } else {
      log(`🪬 Field Medic tried to heal, but Reboot Seal blocked it!`, "warn");
    }
  }

  state.player.frozen = 0;
  state.player.stunned = 0;
  state.player.boost = 0;
  state.player.noArmorGain = 0;
  // keep rebootSeal as-is (if player is sealed, it should remain)

  state.turn = "player";
  state.round = 1;
  state.phase = "battle";

  $("log").innerHTML = "";
  // Reset last hit summary each stage so defeat shows the most recent cause clearly
  state.lastHitSummary = "";
  log(`🔥 Stage ${state.stage}: Enemy is ${state.enemy.name}.`, "warn");
  log(`🧠 Enemy AI: ${state.enemy.aiType}`, "warn");

  tryEnemyPassive();
  updateUI();
}


function statusMain(f) {
  if (!f) return "None";
  if (f.frozen > 0) return "Frozen";
  if (f.stun2Rounds > 0) return "Stunned";
  if (f.stunned > 0) return "Stunned(-2)";
  if (isSilenced(f)) return "Silenced";
  return "None";
}

function statusOngoing(f) {
  if (!f) return "";
  const parts = [];
  if ((f.poisonRounds || 0) > 0) parts.push("Poison");
  if ((f.debuffRounds || 0) > 0) parts.push("Debuff");
  return parts.length ? ` • ${parts.join(", ")}` : "";
}

function updateUI() {
  const p = state.player, e = state.enemy;
  if (!p || !e) return;

  // ✅ Battle side-panel: always show current Rank + XP (replaces the old "Quick Guide" tips).
  try {
    const xp = Math.max(0, Number(state.profileXp || 0) || 0);
    const { cur } = getNextRankInfo();
    const rankName = (cur && cur.name) ? cur.name : getRankNameFromXp(xp);
    const br = document.getElementById("battleRankPill");
    if (br) br.textContent = `Rank: ${rankName}`;
    const bx = document.getElementById("battleXpPill");
    if (bx) bx.textContent = `XP: ${xp}`;
  } catch (e) {}

  // ✅ Keep the legacy DEF field synced with current shield/armor so the UI shows one consistent Defense value.
  p.def = Number(p.shield || 0);
  e.def = Number(e.shield || 0);

  $("turnTag").textContent = `Turn: ${state.turn === "player" ? "Player" : "Enemy"}`;
  $("roundTag").textContent = `Round: ${state.round}`;
  const stLabel = (state.stageLabel ? String(state.stageLabel) : String(state.stage));
  $("stageTag").textContent = `Stage: ${stLabel}`;
  $("enemyPassiveTag").textContent = `Enemy Passive: ${Math.round((state.enemy?.passiveChance ?? 0.35) * 100)}%`;
  $("enemyAiTag").textContent = `Enemy AI: ${state.enemy.aiType}`;
  updateGoldUI();

  $("pName").textContent = p.name;
  $("pImg").src = p.img;
  $("pSkillTag").textContent = `${p.base.skillName}`;

  // Ability info tooltip (hover the "i" icon)
  const pInfo = $("pInfo");
  if (pInfo) {
    const cd = (p.cooldown || 0) > 0 ? `Cooldown: ${p.cooldown} turn(s)` : "Ready";
    pInfo.title = `${p.base.skillName}: ${p.base.skillDesc}\n${cd}`;
  }

  $("eName").textContent = e.name;
  $("eImg").src = e.img;
  $("eSkillTag").textContent = `${e.base.skillName}`;

  const eInfo = $("eInfo");
  if (eInfo) {
    const cd = (e.cooldown || 0) > 0 ? `Cooldown: ${e.cooldown} turn(s)` : "Ready";
    eInfo.title = `${e.base.skillName}: ${e.base.skillDesc}\n${cd}`;
  }

  $("pHP").textContent = `${p.hp}/${p.maxHp}`;
  $("pATK").textContent = p.atk;
  $("pDEF").textContent = p.def;
  $("pShield").textContent = p.def;

  $("eHP").textContent = `${e.hp}/${e.maxHp}`;
  $("eATK").textContent = e.atk;
  $("eDEF").textContent = e.def;
  $("eShield").textContent = e.def;

  $("pHpBar").style.width = `${Math.round((p.hp / p.maxHp) * 100)}%`;
  $("eHpBar").style.width = `${Math.round((e.hp / e.maxHp) * 100)}%`;

  $("pShieldBar").style.width = `${Math.round((p.shield / getShieldCap(p)) * 100)}%`;
  $("eShieldBar").style.width = `${Math.round((e.shield / getShieldCap(e)) * 100)}%`;

  const pLock = p.noArmorGain > 0 ? ` • Time Lock: ${p.noArmorGain}` : "";
  const eLock = e.noArmorGain > 0 ? ` • Time Lock: ${e.noArmorGain}` : "";

  const pSeal = p.rebootSeal > 0 ? ` • Reboot Seal: ${p.rebootSeal}` : "";
  const eSeal = e.rebootSeal > 0 ? ` • Reboot Seal: ${e.rebootSeal}` : "";

  $("pStatus").textContent =
    (statusMain(p) + statusOngoing(p)) +
    ((p.skillReadyAt && p.skillReadyAt > Date.now()) ? ` • Skill CD: ${formatSkillCd(p)}` : (p.cooldown ? ` • Skill CD: ${p.cooldown}` : "")) +
    pLock + pSeal;

  $("eStatus").textContent =
    (statusMain(e) + statusOngoing(e)) +
    ((e.skillReadyAt && e.skillReadyAt > Date.now()) ? ` • Skill CD: ${formatSkillCd(e)}` : (e.cooldown ? ` • Skill CD: ${e.cooldown}` : "")) +
    eLock + eSeal;

  const playerTurn = state.turn === "player" && state.phase === "battle";
  $("btnAttack").disabled = !playerTurn;
  $("btnSkill").disabled = !playerTurn;
  $("btnEnd").disabled = !playerTurn;

  // Potion button (global 3-minute cooldown, requires inventory)
  const bp = $("btnPotion");
  if (bp) {
    const hasAny = Object.values(state.ownedPotions || {}).some((n) => (Number(n || 0) || 0) > 0);
    const ready = isPotionReady();

    // ✅ Keep hover tooltip working even while on cooldown.
    // Some browsers don't show tooltips on disabled buttons, so only disable when
    // it's not the player's turn or the player has no potions.
    bp.disabled = !playerTurn || !hasAny;

    const invCount = hasAny
      ? Object.values(state.ownedPotions || {}).reduce((a, b) => a + (Number(b || 0) || 0), 0)
      : 0;

    bp.textContent = !hasAny
      ? "🧪 Use Potion (0)"
      : (ready ? `🧪 Use Potion (${invCount})` : `🧪 Potion CD: ${formatPotionCd()}`);

    // ✅ Always show remaining cooldown turns on hover (even when ready)
    bp.title = !hasAny
      ? "Buy potions in the Shop\nPotion cooldown: Ready"
      : `Potions in inventory: ${invCount}\nPotion cooldown: ${formatPotionCd()}`;
  }
}

function checkWin() {
  const p = state.player, e = state.enemy;

  // ✅ HARDEN: if any path produced NaN HP, treat as 0 so deaths resolve
  if (!Number.isFinite(Number(p.hp))) p.hp = 0;
  if (e && !Number.isFinite(Number(e.hp))) e.hp = 0;

  // LOSE -> flip, then show Defeat modal (Go Home)
  if (p.hp <= 0) {

    // Profile stats
    state.profileLosses = Math.max(0, Number(state.profileLosses || 0) || 0) + 1;
    state.highStage = Math.max(Number(state.highStage || 0) || 0, Number(state.stage || 0) || 0);
    addProfileXp(12 + Math.floor((Number(state.stage || 0) || 0) * 1.5), "Defeat");

    resetWinStreak();
    cardDieFlip("player");
    state.phase = "over";
    updateUI();
    playSfx("sfxLose", 0.9);

    // After the death flip + a short delay so the last damage/ability effects are visible
    setTimeout(() => {
      if (state.storyBossFight) {
        // Reset boss arena on defeat
        state.storyBossFight = false;
        state.stageLabel = "";
        setBossArenaMode(false);
      }
      state.modalAction = "home";
      const btnNext = $("btnNextEnemy");
      if (btnNext) btnNext.textContent = "🏠 Go Home";
      openModal({
        title: "💀 Defeat",
        text: state.stage >= 900 ? "Omni erased your name from the ledger of existence." : `You died at Stage ${state.stage}.`,
        stageLabel: state.stage >= 900 ? "BOSS" : `Stage ${state.stage}`,
        hint: `Last hit: ${state.lastHitSummary || "Unknown"}.  Check the battle log above to see what killed you, then go home or restart.`,
        goldReward: 0,
        mode: "defeat"
      });
    }, 2200);

    return true;
  }

  // WIN -> flip enemy, then reward gold (no modal) and spawn next enemy
  if (e.hp <= 0) {

    cardDieFlip("enemy");
    state.phase = "over";
    updateUI();
    playSfx("sfxWin", 0.85);

    // Special resolution for Story Boss
    if (state.storyBossFight && e && e.id === OMNI_BOSS_ID) {
      setTimeout(() => {
        // Cinematic ending
        state.storyBossFight = false;
        state.stageLabel = "";
        setBossArenaMode(false);

        const reward = 5000;
        addGold(reward);
        log(`🌟 THE VERDICT BREAKS! +${reward} gold.`, "good");
        confettiBurst(120);

        state.modalAction = "omni";
        const btnNext = $("btnNextEnemy");
        if (btnNext) btnNext.textContent = "📜 Back to Story";
        const btnPlay = $("btnPlayAgain");
        if (btnPlay) btnPlay.textContent = "🏠 Go Home";
        openModal({
          title: "👑 Omni Defeated",
          text: "The God of All Gods falls—reality breathes again.\n\nFor now... the universe survives.",
          stageLabel: "BOSS",
          hint: "You can replay the fight anytime from Story Mode. Your Glory is now a signal across realms.",
          goldReward: reward,
          mode: "defeat" // reuse modal layout
        });
      }, 2200);
      return true;
    }

    const reward = 50 + Math.floor(state.stage * 18);

    // after death flip (0.55s) + 1s delay
    setTimeout(() => {
      // =========================
      // 🎯 Missions progress
      // =========================
      if (!state.missions) state.missions = {};
      ensureMissionUnlockDefaults();
      state.missions.totalDefeats = Math.max(0, Number(state.missions.totalDefeats || 0) || 0) + 1;

      // Mission 1 reward (Cosmo Secret) is handled by the *win streak* system:
      // - Must be 50 straight wins (loss resets)
      // - Only shows the Cosmo Revelation modal the first time it is unlocked
      // See: applyWinStreakMilestones() -> unlockSecretStreakCard().

      // Mission 2: Defeat Cosmo Revelation
      if (e && e.id === "cosmoSecret") {
        state.missions.cosmoRevelationDefeated = true;
        // Unlock Diablo ...
        state.missions.diabloUnlocked = true;
      }
      // Mission 3: Defeat Diablo
      if (e && e.id === "diablo") {
        state.missions.diabloDefeated = true;
        // Unlock Entity after Mission 3
        state.missions.entityUnlocked = true;
      }
      // Mission 4: Defeat Entity (relicbornTitan)
      // IMPORTANT: Mission 4 is only "active" after Mission 3 is complete (Diablo defeated).
      // If Entity is defeated early (via dev tools/edge cases), do NOT grant Mission 4 rewards.
      if (e && e.id === "relicbornTitan" && isMission3Complete() && state.missions.entityUnlocked) {
        state.missions.entityDefeated = true;

        // ✅ Reward: unlock the Entity card for the player.
        // (Still hard-gated for use until Mission 4 is complete via isCardUsableByPlayer().)
        if (!state.owned) state.owned = {};
        state.owned.relicbornTitan = true;
        log(`🎁 UNLOCKED: Entity card added to your collection!`, "good");
      }

      // Mission 5: Defeat the Awakened Monster
      if (e && e.id === "awakenedMonster" && state.missions.entityDefeated) {
        state.missions.awakenMonsterDefeated = true;
      }

      // Mission 6: Defeat Anti-Matter (unlocks the Boss Fight)
      if (e && e.id === "antiMatter" && state.missions.antiMatterUnlocked) {
        state.missions.antiMatterDefeated = true;
      }

      // 👑 After Mission 6: reveal the God of All Gods story + unlock boss button
      if (state.missions.antiMatterDefeated && !state.missions.godOfAllGodsModalShown) {
        try { saveProgress(); } catch(e) {}
        try { showGodOfAllGodsAwakenedModal(); } catch(e) {}
      }

      try { saveProgress(); } catch(e) {}
      try { if (state.currentView === "home") updateMissionText(); } catch(e) {}

      // 🕳️ Mission 5 reward: Anti-Matter (ONE-TIME popup + unlock)
      // Trigger when the Awakened Monster is defeated.
      if (e && e.id === "awakenedMonster") {
        const m1 = isMission1Complete();
        const m2 = isMission2Complete();
        const m3 = isMission3Complete();
        const m4 = isMission4Complete();
        if (m1 && m2 && m3 && m4 && state.missions.awakenMonsterDefeated && !state.missions.antiMatterModalShown) {
          try { showAntiMatterAwakenedModal(); } catch (e) {}
        }
      }

      // 🌩️ Secret omen: defeating Cosmo Secret reveals Ray Bill
      if (e && e.id === "cosmoSecret" && !state.rayBillOmenShown) {
        state.rayBillOmenShown = true;
        try { saveProgress(); } catch (e) {}
        showRayBillOmenModal();
      }

      // Profile stats
      state.profileWins = Math.max(0, Number(state.profileWins || 0) || 0) + 1;
      state.highStage = Math.max(Number(state.highStage || 0) || 0, Number(state.stage || 0) || 0);
      addProfileXp(35 + Math.floor((Number(state.stage || 0) || 0) * 4), "Victory");

      addGold(reward);
      floatingDamage("player", `+${reward}g`, "good");
      log(`🏆 Victory! +${reward} gold.`, "good");

      // ✅ Win streak milestones (10/20/30/50)
      bumpWinStreakOnWin();

      state.stage += 1;
      spawnNextEnemy();
    }, 2200);

    return true;
  }

  return false;
}

function nextTurn() {
  if (state.phase !== "battle") return;

  if (state.turn === "player") tickStatuses(state.player);
  else tickStatuses(state.enemy);

  // ✅ Status effects (poison/debuff) can kill — resolve win/lose immediately
  if (checkWin()) return;

  state.turn = state.turn === "player" ? "enemy" : "player";

  // ✅ Potion cooldown is turn-based (counts down on every PLAYER turn start)
  if (state.turn === "player") {
    state.potionCooldownTurns = Math.max(0, Number(state.potionCooldownTurns || 0) || 0);
    if (state.potionCooldownTurns > 0) {
      state.potionCooldownTurns -= 1;
      saveProgress();
    }
  }

  // ✅ OP Relic: Golden Heart (+5 gold every turn)
  // Trigger when a new PLAYER turn starts.
  if (state.turn === "player" && hasRelic("goldenHeart")) {
    state.gold = Number(state.gold || 0) + 5;
    log(`💛 Golden Heart generates +5 gold.`, "good");
    updateGoldUI();
    saveProgress();
  }

  updateUI();

  if (state.turn === "player") {
    state.round += 1;
    tryEnemyPassive();
  }

  if (state.turn === "enemy") setTimeout(enemyAI, 420);
}

function enemyAI() {
  if (state.phase !== "battle") return;

  const e = state.enemy, p = state.player;

  if (e.frozen > 0) {
    log(`${e.name} is frozen and skips the turn!`, "warn");
    nextTurn();
    return;
  }

  if (e.stun2Rounds > 0) {
    log(`${e.name} is stunned and cannot attack or use skill! (${e.stun2Rounds} rounds left)`, "warn");
    nextTurn();
    return;
  }

  const action = enemyDecideAction();

  if (action.type === "end") {
    log(`${e.name} ends turn to troll...`, "warn");
    nextTurn();
    return;
  }

  if (action.type === "skill") {
    if (isSilenced(e)) {
      log(`${e.name} is Silenced and cannot use a skill!`, "warn");
    } else {
      const res = e.base.skill(e, p, state);
      if (res && res.ok) {
        log(`✨ Enemy uses skill: ${res.msg}`, "bad");
        playSfx("sfxSkill", 0.75);
        updateUI();
        // ✅ If the skill ended the fight, stop here. Otherwise continue to the normal attack.
        if (checkWin()) return;
      } else if (res && res.ok === false) {
        log(`✨ Enemy tried skill: ${res.msg}`, "warn");
      }
    }
  }

  const dmg = dmgCalc(e);
  log(`${e.name} attacks for ${dmg} damage!`, "bad");
  playSfx("sfxAttack", 0.75);

  spawnAttackFx("enemy", "player");
  applyDamage(p, dmg, { source: "attack", damageType: "physical", attacker: e, attackerName: e.name });

  if (!checkWin()) nextTurn();
}

// =========================
// PLAYER ACTIONS
// =========================
function playerAttack() {
  state.lastAction = "attack";
  const p = state.player, e = state.enemy;
  if (p.frozen > 0) {
    log(`${p.name} is frozen and cannot act!`, "warn");
    nextTurn();
    return;
  }

  if (p.stun2Rounds > 0) {
    log(`${p.name} is stunned and cannot act! (${p.stun2Rounds} rounds left)`, "warn");
    nextTurn();
    return;
  }

  playSfx("sfxAttack", 0.8);

  const dmg = dmgCalc(p);
  log(`${p.name} attacks for ${dmg} damage!`, "good");

  spawnAttackFx("player", "enemy");
  applyDamage(e, dmg, { source: "attack", damageType: "physical", attacker: p, attackerName: p.name });

  if (hasRelic("vampireFang")) {
    const healed = heal(p, 1);
    if (healed > 0) {
      log(`🪬 Vampire Fang heals you +1 HP.`, "good");
      floatingDamage("player", "+1", "good");
    } else {
      log(`🪬 Vampire Fang tried to heal, but Reboot Seal blocked it!`, "warn");
    }
  }

  // ✅ OP Relic: Chrono Rune (20% chance to attack twice)
  if (hasRelic("chronoRune") && e && Number(e.hp) > 0 && Math.random() < 0.20) {
    const dmg2 = dmgCalc(p);
    log(`⏳ Chrono Rune triggers! Extra attack for ${dmg2} damage!`, "good");
    spawnAttackFx("player", "enemy");
    applyDamage(e, dmg2, { source: "attack", damageType: "physical", attacker: p, attackerName: p.name });

    // Vampire Fang triggers on each attack
    if (hasRelic("vampireFang")) {
      const healed2 = heal(p, 1);
      if (healed2 > 0) {
        log(`🪬 Vampire Fang heals you +1 HP.`, "good");
        floatingDamage("player", "+1", "good");
      } else {
        log(`🪬 Vampire Fang tried to heal, but Reboot Seal blocked it!`, "warn");
      }
    }
  }

  if (!checkWin()) nextTurn();
}

function playerSkill() {
  state.lastAction = "skill";
  const p = state.player, e = state.enemy;
  if (p.frozen > 0) {
    log(`${p.name} is frozen and cannot act!`, "warn");
    nextTurn();
    return;
  }
  if (p.stun2Rounds > 0) {
    log(`${p.name} is stunned and cannot use a skill! (${p.stun2Rounds} rounds left)`, "warn");
    nextTurn();
    return;
  }
  if (isSilenced(p)) { log(`${p.name} is Silenced and cannot use a skill!`, "warn"); return; }
  const res = p.base.skill(p, e, state);
  if (!res.ok) { log(res.msg, "warn"); return; }

  playSfx("sfxSkill", 0.8);
  log(res.msg, "good");

  updateUI();
  if (!checkWin()) nextTurn();
}

function playerEndTurn() {
  playSfx("sfxEnd", 0.65);
  log("You ended your turn.", "warn");
  nextTurn();
}

// =========================
// 🧪 POTION USE (in-battle)
// =========================
function reduceAbilityCooldownByOne(f) {
  if (!f) return;
  // Turn-based cooldown
  f.cooldown = Math.max(0, Number(f.cooldown || 0) || 0);
  if (f.cooldown > 0) f.cooldown -= 1;

  // Real-time cooldown (redeemed legendaries)
  if (f.skillReadyAt && f.skillReadyAt > Date.now()) {
    f.skillReadyAt = Math.max(Date.now(), f.skillReadyAt - 60 * 1000);
  }
}

function applyPotionEffect(potion) {
  const p = state.player;
  if (!p || !potion) return;

  const cap = getShieldCap(p);
  const eff = String(potion.effect || "");

  if (eff === "hp" || eff === "twilight" || eff === "galactic") {
    p.hp = p.maxHp;
  }
  if (eff === "armor" || eff === "twilight" || eff === "galactic") {
    p.shield = cap;
    p.def = p.shield;
  }
  if (eff === "endurance" || eff === "galactic") {
    reduceAbilityCooldownByOne(p);
  }

  // ✅ NEW: God's Ultimate (special combat potion)
  if (eff === "godsUltimate") {
    const e = state.enemy;
    if (!e) return;

    // Silence enemy ability for 2 rounds
    e.silencedRounds = Math.max(Number(e.silencedRounds || 0) || 0, 2);

    // Remove all enemy defense now
    e.shield = 0;
    e.def = 0;

    // Deal random damage (80–500)
    const dmg = 80 + Math.floor(Math.random() * (500 - 80 + 1));

    // Apply TRUE damage (ignores armor)
    applyDamage(e, dmg, { silent: true, source: "skill", damageType: "true" });

    // Convert damage into HP + Defense + Max HP for player
    const gain = Math.max(0, Number(dmg || 0) || 0);

    p.maxHp = Math.max(1, Number(p.maxHp || 1) || 1) + gain;
    p.hp = Math.min(p.maxHp, (Number(p.hp || 0) || 0) + gain);

    // Defense uses shield/def fields
    p.shield = Math.min(getShieldCap(p), (Number(p.shield || 0) || 0) + gain);
    p.def = p.shield;

    if (typeof log === "function") {
      log(`🧪 God's Ultimate activated! Enemy silenced (2 rounds), armor shattered, took ${dmg} TRUE damage. You gained +${gain} HP/+${gain} DEF/+${gain} Max HP.`, "good");
    }
  }

}

function consumePotion(id) {
  const cur = getPotionCount(id);
  if (cur <= 0) return false;
  state.ownedPotions[id] = cur - 1;
  if (state.ownedPotions[id] <= 0) delete state.ownedPotions[id];
  saveProgress();
  return true;
}

function usePotionFlow() {
  // ✅ Upgraded UX: use a proper modal picker instead of alert()/prompt().
  // (Alerts feel cheap on mobile and interrupt the flow.)
  if (state.phase !== "battle") {
    try { showToast("🧪 You can only use potions during battle.", "warn"); } catch (e) {}
    return;
  }
  if (state.turn !== "player") {
    try { showToast("⏳ Potions can only be used on your turn.", "warn"); } catch (e) {}
    return;
  }

  const available = (POTIONS || []).filter((x) => getPotionCount(x.id) > 0);
  if (!available.length) {
    try { showToast("No potions in inventory — buy some in Shop → 🧪 Potions.", "warn"); } catch (e) {}
    return;
  }
  if (!isPotionReady()) {
    try { showToast(`Potion cooldown: ${formatPotionCd()}`, "warn"); } catch (e) {}
    return;
  }

  openPotionUseModal(available);
}

// =========================
// 🧪 POTION MODAL (in-battle)
// =========================
function closePotionUseModal() {
  const el = document.getElementById("potionUseOverlay");
  if (el) el.remove();
}

function openPotionUseModal(availablePotions) {
  closePotionUseModal();

  const overlay = document.createElement("div");
  overlay.className = "modalOverlay";
  overlay.id = "potionUseOverlay";

  const box = document.createElement("div");
  box.className = "modalBox potionModalBox";

  const header = document.createElement("div");
  header.className = "modalHeader";

  const titleWrap = document.createElement("div");
  const title = document.createElement("div");
  title.className = "modalTitle";
  title.textContent = "🧪 Use a Potion";

  const pill = document.createElement("div");
  pill.className = "modalPill";
  pill.textContent = `Available: ${availablePotions.length}`;

  titleWrap.appendChild(title);
  titleWrap.appendChild(pill);

  const closeBtn = document.createElement("button");
  closeBtn.className = "btn btnSoft";
  closeBtn.textContent = "✖";
  closeBtn.addEventListener("click", () => {
    try { playSfx("sfxClick", 0.35); } catch(e) {}
    closePotionUseModal();
  });

  header.appendChild(titleWrap);
  header.appendChild(closeBtn);

  const body = document.createElement("div");
  body.className = "modalBody";

  const tip = document.createElement("p");
  tip.className = "modalText";
  tip.innerHTML = "Choose one potion to consume. <b>Potions are global-cooldown</b> after use.";

  const list = document.createElement("div");
  list.className = "potionChoices";

  (availablePotions || []).forEach((p) => {
    const count = getPotionCount(p.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "potionChoice";

    const left = document.createElement("div");
    left.className = "potionChoiceLeft";
    left.innerHTML = `
      <div class="potionChoiceName">${p.name} <span class="pill" style="margin-left:8px;">x${count}</span></div>
      <div class="potionChoiceDesc">${p.desc || ""}</div>
    `;

    const right = document.createElement("div");
    right.className = "potionChoiceRight";
    right.textContent = `Use`;

    btn.appendChild(left);
    btn.appendChild(right);

    btn.addEventListener("click", () => {
      // Safety re-check (inventory/turn can change via edge cases)
      if (state.phase !== "battle" || state.turn !== "player") {
        try { showToast("You can only use potions on your turn (in battle).", "warn"); } catch (e) {}
        closePotionUseModal();
        return;
      }
      if (!isPotionReady()) {
        try { showToast(`Potion cooldown: ${formatPotionCd()}`, "warn"); } catch (e) {}
        closePotionUseModal();
        return;
      }
      if (!consumePotion(p.id)) {
        try { showToast("That potion is no longer available.", "warn"); } catch (e) {}
        closePotionUseModal();
        return;
      }

      applyPotionEffect(p);
      setPotionCooldown(p.cooldownTurns || 10);

      // feedback
      try { playSfx("sfxSkill", 0.55); } catch(e) {}
      try { if (typeof log === "function") log(`🧪 You used ${p.name}!`, "good"); } catch(e) {}
      try { if (typeof floatingDamage === "function") floatingDamage("player", "🧪", "good"); } catch(e) {}

      closePotionUseModal();
      updateUI();
    });

    list.appendChild(btn);
  });

  body.appendChild(tip);
  body.appendChild(list);

  const actions = document.createElement("div");
  actions.className = "modalActions single";

  const cancel = document.createElement("button");
  cancel.className = "btn btnGhost";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => {
    try { playSfx("sfxClick", 0.35); } catch(e) {}
    closePotionUseModal();
  });
  actions.appendChild(cancel);

  box.appendChild(header);
  box.appendChild(body);
  box.appendChild(actions);
  overlay.appendChild(box);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePotionUseModal();
  });

  document.body.appendChild(overlay);
}

// =========================
// PICK / GALLERY
// =========================
function renderPick() {
  const grid = $("pickGrid");
  if (!grid) return;
  grid.innerHTML = "";

  // Only show cards that the player is currently allowed to use.
  // This prevents mission-gated/secret cards (e.g., Entity) from leaking into
  // the Battle pick screen before the required mission is completed.
  const all = (getAllCards() || []).filter((c) => c && isCardUsableByPlayer(c.id));

  all.forEach((card) => {
    const div = document.createElement("div");
    const st = (typeof getUpgradedStats === 'function') ? getUpgradedStats(card) : { atk: card.atk, def: card.def, hp: card.hp, level: 0 };

    const isForbiddenPick = card.id === "cosmicGod"; // ✅ Cosmic God cannot be picked by player
    div.className = "cardPick" + (isForbiddenPick ? " disabledPick" : "");
    div.innerHTML = `
      <img src="${card.img}" alt="${card.name}" />
      <div class="titleRow" style="margin-top:10px;">
        <strong>${card.name}${st.level>0 ? ` Lv${st.level}` : ""}${isForbiddenPick ? " 🔒" : ""}</strong>
        <span class="pill">Damage ${st.atk} • Armor ${st.def} • Life ${st.hp}</span>
      </div>
      <div class="muted" style="margin-top:6px;">
        <b>${card.skillName}:</b> ${card.skillDesc}
      </div>
      ${card.id === "cosmicGod" ? `<div class="muted" style="margin-top:8px;"><b>Note:</b> Sealed by Gods (Enemy-only).</div>` : ``}
      ${isForbiddenPick ? `<div class="muted" style="margin-top:8px;"><b>Note:</b> Sealed by Gods (Enemy-only).</div>` : ``}
    `;

    if (!isForbiddenPick) {
      div.onclick = () => {
        playSfx("sfxClick", 0.45);
        startGame(card.id);
      };
    }
    grid.appendChild(div);
  });
}

function renderGallery() {
  const grid = $("galleryGrid");
  if (!grid) return;
  grid.innerHTML = "";

  // ✅ Gallery should show ALL cards (base + all shop/redeem defs), even if locked/unowned
  const all = getGalleryCards();

  all.forEach((card) => {
    const div = document.createElement("div");
    const st = (typeof getUpgradedStats === 'function') ? getUpgradedStats(card) : { atk: card.atk, def: card.def, hp: card.hp, level: 0 };

    div.className = "cardPick";


    const enemyOnly = !!card.enemyOnly;
    const lockTag = enemyOnly ? " 🔒" : "";

    div.innerHTML = `
      <img src="${card.img}" alt="${card.name}" />
      <div class="titleRow" style="margin-top:10px;">
        <strong>${card.name}${st.level>0 ? ` Lv${st.level}` : ""}${lockTag}</strong>
        <span class="pill">Damage ${st.atk} • Armor ${st.def} • Life ${st.hp}</span>
      </div>
      <div class="muted" style="margin-top:6px;">
        <b>${card.skillName}:</b> ${card.skillDesc}
      </div>

      ${enemyOnly ? `<div class="muted" style="margin-top:8px;"><b>Note:</b> Enemy-only.</div>` : ``}

      <div class="muted" style="margin-top:8px;">
        <b>Enemy passive:</b> Can trigger automatically each round if this card is the enemy.
      </div>
    `;


    // ℹ️ Lore tooltip (hover the "i" icon)
    const titleRow = div.querySelector('.titleRow');
    const strong = titleRow ? titleRow.querySelector('strong') : null;
    if (strong) {
      const wrap = document.createElement('span');
      wrap.className = 'infoWrap';

      const icon = document.createElement('span');
      icon.className = 'infoIcon';
      icon.textContent = 'i';
      icon.setAttribute('role', 'button');
      icon.setAttribute('tabindex', '0');
      icon.setAttribute('aria-label', `Lore: ${card.name}`);

      const tip = document.createElement('span');
      tip.className = 'loreTooltip';
      tip.textContent = CARD_LORE[card.id] || `No lore available yet for ${card.name}.`;

      // Hover (desktop) is handled in CSS.
      // Click / Enter (mobile + keyboard) toggles the tooltip.
      const toggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        wrap.classList.toggle('showLore');
      };
      icon.addEventListener('click', toggle);
      icon.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') toggle(e);
      });

      wrap.appendChild(icon);
      wrap.appendChild(tip);

      // Place the icon right beside the name
      strong.appendChild(wrap);
    }

    grid.appendChild(div);
  });
}



// =========================
// 🎰 LUCKY DRAW
// =========================
function renderLuckyDraw() {
  const results = $("luckyResults");
  if (!results) return;

  const items = Array.isArray(state.luckyHistory) ? state.luckyHistory : [];
  if (!items.length) {
    results.innerHTML = `<div class="muted">No draws yet. Try your luck ✨</div>`;
    return;
  }

  results.innerHTML = items.slice(-10).reverse().map((r) => {
    const rarity = r.rarity ? ` ${r.rarity}` : "";
    const title = r.title || "Reward";
    const desc = r.desc || "";
    const icon = r.icon || "✨";
    return `
      <div class="luckyResultItem${rarity}">
        <div class="luckyResultLeft">${icon}</div>
        <div>
          <div class="luckyResultTitle"><b>${title}</b></div>
          <div class="muted" style="margin-top:4px;">${desc}</div>
        </div>
      </div>`;
  }).join("");
}

function pickRandomFrom(arr) {
  if (!Array.isArray(arr) || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)] || null;
}

function rollLuckyReward() {
  const r = Math.random();

  // ✅ 1%: Card (Entity)
  // Mission-gated: ONLY allow this drop after Mission 3 (Diablo defeated) unlocks Entity.
  // Otherwise, treat it as a normal gold roll so missions stay consistent.
  const entityDropAllowed = !!(state && state.missions && (state.missions.entityUnlocked || state.missions.entityDefeated) && isMission3Complete());
  if (r < LUCKY_DRAW.legendaryChance && entityDropAllowed) {
    return {
      type: "card",
      id: "relicbornTitan",
      title: "CARD — Entity",
      icon: "🌟",
      rarity: "legendary",
      desc: "Unlocked: Entity (1% drop)."
    };
  }

  // ✅ 99%: Gold reward (1–100)
  const gold = Math.floor(Math.random() * 100) + 1; // 1–100
  return {
    type: "gold",
    amount: gold,
    title: `Gold +${gold}`,
    icon: "🪙",
    rarity: "common",
    desc: "Gold reward (1–100)."
  };
}

function playLuckySpinFx() {
  const wheel = $("luckyWheel");
  const machine = $("luckyMachine");
  if (wheel) {
    wheel.classList.remove("spinning");
    void wheel.offsetWidth;
    wheel.classList.add("spinning");
  }
  if (machine) {
    machine.classList.remove("pulse");
    void machine.offsetWidth;
    machine.classList.add("pulse");
  }
  playSfx("sfxDraw", 0.85);
}

// 🎉 Confetti burst (used for legendary)
function confettiBurst(intensity = 70) {
  const host = document.createElement("div");
  host.className = "confettiHost";
  document.body.appendChild(host);

  const count = Math.max(30, Math.min(140, Math.floor(intensity)));
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "confettiPiece";

    // Random color without hardcoding a single theme
    const hue = Math.floor(Math.random() * 360);
    p.style.background = `hsl(${hue} 90% 60%)`;

    const left = Math.random() * 100;
    const x = (Math.random() * 260 - 130).toFixed(1) + "px";
    const t = (1200 + Math.random() * 900).toFixed(0) + "ms";
    const d = (Math.random() * 220).toFixed(0) + "ms";

    p.style.left = left + "vw";
    p.style.top = (-10 - Math.random() * 20) + "px";
    p.style.setProperty("--x", x);
    p.style.setProperty("--t", t);
    p.style.setProperty("--d", d);
    host.appendChild(p);
  }

  // Cleanup
  setTimeout(() => {
    try { host.remove(); } catch (e) {}
  }, 2400);
}

function setLuckyModalProgress(idx, total) {
  const prog = $("luckyProgress");
  const pill = $("luckyProgressPill");
  const text = $("luckyProgressText");
  const strip = $("luckyMultiStrip");

  const isMulti = total > 1;
  if (prog) prog.style.display = isMulti ? "flex" : "none";
  if (strip) strip.style.display = isMulti ? "grid" : "none";

  if (!isMulti) return;

  if (pill) pill.textContent = `${idx + 1} / ${total}`;
  if (text) text.textContent = "Multi draw";

  if (strip) {
    const list = Array.isArray(state.luckyPendingRewards) ? state.luckyPendingRewards : [];
    const revealed = Math.max(0, Math.min(total, idx)); // already-claimed
    const cur = list[idx];
    strip.innerHTML = "";
    for (let i = 0; i < total; i++) {
      const mini = document.createElement("div");
      mini.className = "luckyMini";

      const isRevealed = i < revealed;
      const isCurrent = i === idx;

      const r = isRevealed ? list[i] : (isCurrent ? cur : null);
      if (isRevealed || isCurrent) {
        mini.classList.add("revealed");
        if (r?.rarity === "legendary") mini.classList.add("legendary");
        mini.innerHTML = `<div class="luckyMiniIcon">${r?.icon || "✨"}</div>`;
      } else {
        mini.innerHTML = `<div class="luckyMiniIcon">❓</div>`;
      }

      strip.appendChild(mini);
    }
  }
}

function openLuckyModal(payload) {
  const modal = $("luckyModal");
  if (!modal) return;

  const title = $("luckyModalTitle");
  const pill = $("luckyModalPill");
  const hint = $("luckyModalHint");
  const card = $("luckyCardReveal");
  const name = $("luckyRewardName");
  const rarityEl = $("luckyRewardRarity");
  const body = $("luckyRewardBody");
  const strip = $("luckyMultiStrip");
  const prog = $("luckyProgress");
  const claimBtn = $("btnLuckyClaim");

  const isMulti = Array.isArray(payload);
  const rewards = isMulti ? payload : [payload];

  // Track pending mode so Claim behaves correctly.
  state.luckyPendingMode = isMulti ? "multi" : "single";
  state.luckyPendingRewards = rewards;
  state.luckyPendingIndex = 0;

  if (prog) prog.style.display = "none";

  if (!isMulti) {
    const reward = rewards[0] || null;

    if (title) title.textContent = reward?.title || "🎰 Lucky Draw";
    if (pill) pill.textContent = reward?.rarity ? reward.rarity.toUpperCase() : "REWARD";

    if (name) name.textContent = reward?.title || "Reward";
    if (rarityEl) rarityEl.textContent = reward?.rarity ? reward.rarity.toUpperCase() : "COMMON";

    if (body) {
      body.innerHTML = `
        <div class="luckyBigIcon">${reward?.icon || "✨"}</div>
        <div class="luckyBigText">${reward?.title || "Reward"}</div>
        <div class="muted" style="margin-top:8px;">${reward?.desc || ""}</div>
      `;
    }

    if (strip) strip.style.display = "none";
    if (card) {
      card.style.display = "block";
      card.classList.remove("flipIn", "legendaryBurst");
      void card.offsetWidth;
      card.classList.add("flipIn");
      if (reward?.rarity === "legendary") card.classList.add("legendaryBurst");
    }

    if (hint) hint.textContent = "Tap Claim to add it to your account.";
    if (claimBtn) claimBtn.textContent = "✨ Claim";

    modal.style.display = "flex";

    // Jackpot sound for legendary
    if (reward?.rarity === "legendary") {
      playSfx("sfxJackpot", 0.95);
      const box = modal.querySelector(".modalBox");
      if (box) {
        box.classList.remove("luckyShake");
        void box.offsetWidth;
        box.classList.add("luckyShake");
      }
      confettiBurst(80);
    }

    return;
  }

  // ===== Multi draw (5x) =====
  if (title) title.textContent = "🎰 Lucky Draw — 5x";
  if (pill) pill.textContent = "RESULTS";
  if (hint) hint.textContent = "Tap Claim All to add all rewards to your account.";
  if (claimBtn) claimBtn.textContent = "✨ Claim All";

  if (card) card.style.display = "none";
  if (strip) {
    strip.style.display = "grid";
    strip.innerHTML = rewards.map((r) => {
      const isLeg = r?.rarity === "legendary";
      let imgHtml = "";
      if (r?.type === "card" && typeof findCardById === "function") {
        const def = findCardById(r.id);
        if (def?.img) imgHtml = `<img class="luckyMultiImg" src="${def.img}" alt="${def.name || "Card"}" />`;
      }
      return `
        <div class="luckyMultiCard${isLeg ? " legendary" : ""}">
          <div class="luckyMultiTop">
            <div class="luckyMultiIcon">${r?.icon || "✨"}</div>
            <div class="pill luckyMultiRarity">${(r?.rarity || "common").toUpperCase()}</div>
          </div>
          ${imgHtml}
          <div class="luckyMultiTitle">${r?.title || "Reward"}</div>
          <div class="muted luckyMultiDesc">${r?.desc || ""}</div>
        </div>
      `;
    }).join("");
  }

  modal.style.display = "flex";

  // Juice if any legendary in the 5
  if (rewards.some((r) => r?.rarity === "legendary")) {
    playSfx("sfxJackpot", 0.95);
    const box = modal.querySelector(".modalBox");
    if (box) {
      box.classList.remove("luckyShake");
      void box.offsetWidth;
      box.classList.add("luckyShake");
    }
    confettiBurst(110);
  }
}

function closeLuckyModal() {
  const modal = $("luckyModal");
  if (modal) modal.style.display = "none";
}

function applyLuckyReward(reward) {
  if (!reward) return;

  if (reward.type === "gold") {
    addGold(reward.amount || 0);
  } else if (reward.type === "relic") {
    // Grant relic + auto-equip
    state.ownedRelics[reward.id] = true;
    equipRelic(reward.id);
    saveProgress();
    updateGoldUI();
    renderShopRelics();
  } else if (reward.type === "card") {
    state.owned[reward.id] = true;
    saveProgress();
    updateGoldUI();
    renderShopCards();
    renderPick();
    renderGallery();
  }

  // Record history
  state.luckyHistory = Array.isArray(state.luckyHistory) ? state.luckyHistory : [];
  state.luckyHistory.push(reward);
  saveProgress();
  renderLuckyDraw();
}

function doLuckyDraw(count) {
  const n = (count === 5) ? 5 : 1;
  const cost = (n === 5) ? LUCKY_DRAW.fiveCost : LUCKY_DRAW.singleCost;

  if (state.gold < cost) {
    alert(`Not enough gold. Need ${cost} gold.`);
    return;
  }

  // Spend
  state.gold -= cost;
  saveProgress();
  updateGoldUI();

  // Disable buttons briefly to avoid double-spend
  const b1 = $("btnLuckySingle");
  const b5 = $("btnLuckyFive");
  if (b1) b1.disabled = true;
  if (b5) b5.disabled = true;

  // Roll rewards now
  state.luckyPendingRewards = [];
  state.luckyPendingIndex = 0;
  for (let i = 0; i < n; i++) state.luckyPendingRewards.push(rollLuckyReward());

  playLuckySpinFx();

  // Longer spin for 5x
  const spinMs = (n === 5) ? 1050 : 650;

  // Delay reveal for drama
  setTimeout(() => {
    const first = state.luckyPendingRewards[0];
    if (n === 5) openLuckyModal(state.luckyPendingRewards);
    else openLuckyModal(first);
    if (b1) b1.disabled = false;
    if (b5) b5.disabled = false;
  }, spinMs);
}

function claimLuckyRewards() {
  const list = Array.isArray(state.luckyPendingRewards) ? state.luckyPendingRewards : [];
  const mode = String(state.luckyPendingMode || "single");

  if (!list.length) {
    closeLuckyModal();
    return;
  }

  if (mode === "multi") {
    list.forEach(applyLuckyReward);
  } else {
    applyLuckyReward(list[0]);
  }

  // clear pending
  state.luckyPendingRewards = [];
  state.luckyPendingIndex = 0;
  state.luckyPendingMode = "single";

  closeLuckyModal();
}

// =========================
// START / RESET
// =========================
function startOmniBossFight(optionalPlayerCardId) {
  ensureMissionUnlockDefaults();
  if (!state.missions || !state.missions.antiMatterDefeated) {
    showToast("Complete Mission 6 (Defeat Anti-Matter) to unlock Omni.", "warn");
    return;
  }

  const pickId = optionalPlayerCardId || state.player?.id || null;
  if (!pickId) {
    // Ask the player to pick a fighter first
    state.pendingBoss = "omni";
    showToast("Pick your fighter... then the portal opens.", "info");
    try { showView("setup"); } catch(e) {}
    try { if (typeof renderPick === "function") renderPick(); } catch(e) {}
    return;
  }

  // Setup boss arena
  state.duelMode = false;
  state.storyBossFight = true;
  state.stageLabel = "BOSS";
  state.stage = 999;
  state._awakenedSpawnedThisRun = true;
  setBossArenaMode(true);

  // Relics still apply
  state.relics = state.equippedRelicId ? [state.equippedRelicId] : [];

  const playerBase = findCardById(pickId);
  state.player = cloneCard(playerBase);

  const omniBase = buildOmniBoss();
  state.enemy = cloneCard(omniBase);
  // Boss aura
  state.enemy.passiveEnabled = true;
  state.enemy.aiType = "Aggressive";

  state.player.shield = Math.min(getShieldCap(state.player), state.player.shield);
  state.player.def = state.player.shield;

  state.phase = "battle";
  state.turn = "player";
  state.round = 1;

  // Potions fresh for boss
  state.potionCooldownTurns = 0;
  try { saveProgress(); } catch(e) {}

  showView("game");
  resetCardVisuals();
  $("log").innerHTML = "";

  // 🔥 Ultimate intro scene: conversation + stakes
  const pName = state.player?.name || "Champion";
  log("🌌 The Story Mode portal tears open...", "warn");
  log("🕳️ Anti‑Matter: 'Creation does not surrender. It REFUSES.'", "good");
  log(`${pName}: 'If the universe will be erased... then I'll fight for every second of it.'`, "good");
  log("👑 Omni: 'All gods kneel. All worlds end. You are an error that learned to scream.'", "bad");
  log("⚔️ The arena rewrites itself. Stats become LAW.", "warn");
  log(`🔥 BOSS: Omni manifests — HP ${state.enemy.maxHp} • ATK ${state.enemy.atk} • DEF ${state.enemy.def}`, "warn");
  log("✨ Ability unlocked: Gods Justice — TRUE damage that pierces straight to life.", "bad");

  tryEnemyPassive();
  updateUI();
}

function startGame(playerCardId) {
  // Leaving duel mode when starting a normal run
  state.duelMode = false;

  // If a story boss fight was requested, picking a fighter should start the boss instead of a normal run.
  if (state.pendingBoss === "omni") {
    state.pendingBoss = null;
    startOmniBossFight(playerCardId);
    return;
  }
  // ✅ Prevent picking enemy-only cards as the player
  if (playerCardId === "cosmicGod") {
    alert("Cosmic God is sealed by the Gods and cannot be selected. (Enemy-only card)");
    return;
  }
  if (playerCardId === "antiMatter") {
    alert("Anti-Matter is awakened, but it is ENEMY-only and cannot be selected.");
    return;
  }

  // Normal run resets story-boss state
  state.storyBossFight = false;
  state.stageLabel = "";
  state._entitySpawnedThisRun = false;
  state._awakenedSpawnedThisRun = false;
  setBossArenaMode(false);

  state.stage = 1;
  state.relics = state.equippedRelicId ? [state.equippedRelicId] : [];

  const playerBase = findCardById(playerCardId);
  const all = getGalleryCards();
  let pool = (all || []).filter((c) => c && c.id !== playerCardId);

  // ✅ Extra safety: Stage 1 should not start versus late-game secret bosses.
  // (We force-spawn mission bosses separately, see below.)
  const mission1Active = (typeof isMission1Complete === "function") ? !isMission1Complete() : false;
  const isStage1 = true;
  if (mission1Active || isStage1) {
    pool = (pool || []).filter((c) => c && c.id !== "relicbornTitan" && c.id !== "awakenedMonster");
  }

  // Safety: never allow an empty enemy pool (prevents rare "undefined enemy" bugs)
  if (!pool.length) pool = (BASE_CARDS || []).filter((c) => c && c.id !== playerCardId);
  let enemyBase = pool[Math.floor(Math.random() * pool.length)];

  // ✅ Mission 4 start: when you enter battle for Mission 4, you must see Entity.
  // This prevents Entity from leaking into Missions 1-3, while guaranteeing the Mission 4 encounter.
  try {
    ensureMissionUnlockDefaults();
    const mission4Active = !!(
      state.missions &&
      // ✅ Mission 4 is ONLY allowed after Missions 1–3 are complete.
      // This stops Entity from leaking into Mission 1/2/3 even if Diablo was fought early.
      isMission1Complete() &&
      isMission2Complete() &&
      isMission3Complete() &&
      !isMission4Complete() &&
      (state.missions.entityUnlocked || state.missions.entityDefeated) &&
      !state.missions.entityDefeated
    );
    if (!state.duelMode && !state.storyBossFight && mission4Active) {
      enemyBase = (UNLOCKABLE_CARD_DEFS && UNLOCKABLE_CARD_DEFS.relicbornTitan) || enemyBase;
      state._entitySpawnedThisRun = true;
    }
  } catch (e) {}

  state.player = cloneCard(playerBase);
  state.enemy = cloneCard(enemyBase);
  state.enemy.passiveEnabled = true;
  state.enemy.aiType = pickEnemyAI();

  state.player.shield = Math.min(getShieldCap(state.player), state.player.shield);
  state.player.def = state.player.shield;

  state.phase = "battle";
  state.turn = "player";
  state.round = 1;

  // ✅ Potions must be usable when a new match starts
  // Turn-based cooldown shouldn't carry over from previous runs.
  state.potionCooldownTurns = 0;
  saveProgress();

  showView("game");
    resetCardVisuals();
$("log").innerHTML = "";

  log(`🔥 Stage ${state.stage}: You picked ${state.player.name}. Enemy is ${state.enemy.name}.`, "warn");
  log(`🧠 Enemy AI: ${state.enemy.aiType}`, "warn");

  if (state.relics.length) {
    const names = state.relics.map((id) => (RELICS.find((r) => r.id === id)?.name || id));
    log(`🪬 Equipped relics: ${names.join(", ")}`, "good");
  }

  tryEnemyPassive();
  updateUI();
}

function resetAll() {
  closeModal();
    resetCardVisuals();
  // Reset special modes
  state.duelMode = false;
state.phase = "pick";
  state.turn = "player";
  state.round = 1;
  state.stage = 1;
  state.player = null;
  state.enemy = null;
  renderPick();
  showView("setup");
}

// =========================
// BOOT (wire UI after DOM is ready)
// =========================
function bootGameUI() {
  /* SHOP FALLBACK BIND */
  (function(){
    const bind = (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("click", () => {
        try { playSfx("sfxClick", 0.45); } catch(e) {}
        try { showView("shop"); } catch(e) {}
        try { renderShop(); } catch(e) { console.error("renderShop failed:", e); }
        try { if (typeof setShopTab === "function") setShopTab("relics"); } catch(e) {}
      });
    };
    bind("btnHomeShop");
    bind("btnOpenShop");
    bind("btnProfileToShop");
  })();

// =========================
  // BUTTONS
  // =========================
  const safeOn = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", fn);
  };

  safeOn("btnNextEnemy", () => {
  if (state.phase !== "over") return;

  playSfx("sfxClick", 0.45);
  closeModal();

  // Defeat: go back to landing page (Home)
  if (state.modalAction === "home") {
    state.modalAction = null;
    const btnNext = $("btnNextEnemy");
    if (btnNext) btnNext.textContent = "⚔️ Next Enemy";
    // Reset the run, but land on the true Home screen (not the Battle/Setup screen)
    resetAll();
    showView("home");
    return;
  }

  // Omni victory: Back to Story
  if (state.modalAction === "omni") {
    state.modalAction = null;
    const btnNext = $("btnNextEnemy");
    if (btnNext) btnNext.textContent = "⚔️ Next Enemy";
    const btnPlay = $("btnPlayAgain");
    if (btnPlay) btnPlay.textContent = "🔄 Restart Run";
    showView("story");
    return;
  }

  // (Legacy) Shop flow
  if (state.modalAction === "shop") {
    state.modalAction = null;
    const btnNext = $("btnNextEnemy");
    if (btnNext) btnNext.textContent = "⚔️ Next Enemy";
    showView("shop");
    renderShopRelics();
    renderShopCards();
    setShopTab("relics");
    return;
  }

  // Default: proceed to next enemy
  state.stage += 1;
  spawnNextEnemy();
  });
  safeOn("btnPlayAgain", () => {
  playSfx("sfxClick", 0.45);
  // Omni victory: Go Home
  if (state.modalAction === "omni") {
    state.modalAction = null;
    const btnNext = $("btnNextEnemy");
    if (btnNext) btnNext.textContent = "⚔️ Next Enemy";
    const btnPlay = $("btnPlayAgain");
    if (btnPlay) btnPlay.textContent = "🔄 Restart Run";
    closeModal();
    resetAll();
    showView("home");
    return;
  }
  state.modalAction = null;
  const btnNext = $("btnNextEnemy");
  if (btnNext) btnNext.textContent = "⚔️ Next Enemy";
  closeModal();
  resetAll();
});

  safeOn("btnAttack", () => { playSfx("sfxClick", 0.35); playerAttack(); });
  safeOn("btnSkill", () => { playSfx("sfxClick", 0.35); playerSkill(); });
  safeOn("btnEnd", () => { playSfx("sfxClick", 0.35); playerEndTurn(); });
  safeOn("btnPotion", () => { playSfx("sfxClick", 0.35); usePotionFlow(); });
  safeOn("btnReset", () => { playSfx("sfxClick", 0.35); resetAll(); });

// Ability info (click the "i" icon to also print the description into the battle log)
  safeOn("pInfo", () => {
  playSfx("sfxClick", 0.2);
  const p = state.player;
  if (!p) return;
  const cd = (p.cooldown || 0) > 0 ? `Cooldown: ${p.cooldown} turn(s)` : "Ready";
  log(`ℹ️ ${p.name} — ${p.base.skillName}: ${p.base.skillDesc} (${cd})`, "info");
  });
  safeOn("eInfo", () => {
  playSfx("sfxClick", 0.2);
  const e = state.enemy;
  if (!e) return;
  const cd = (e.cooldown || 0) > 0 ? `Cooldown: ${e.cooldown} turn(s)` : "Ready";
  log(`ℹ️ ${e.name} — ${e.base.skillName}: ${e.base.skillDesc} (${cd})`, "info");
  });

  safeOn("btnBattleNow", () => { playSfx("sfxClick", 0.45); resetAll(); });
  safeOn("btnOpenGallery", () => { playSfx("sfxClick", 0.45); renderGallery(); showView("gallery"); });
  safeOn("btnStoryMode", () => { playSfx("sfxClick", 0.45); openStoryMode(); });
  safeOn("btnBackHomeFromGallery", () => { playSfx("sfxClick", 0.45); showView("home"); });
  safeOn("btnGalleryToBattle", () => { playSfx("sfxClick", 0.45); resetAll(); });
  safeOn("btnBackHomeFromSetup", () => { playSfx("sfxClick", 0.45); showView("home"); });
  safeOn("btnSetupGallery", () => { playSfx("sfxClick", 0.45); renderGallery(); showView("gallery"); });
  safeOn("btnExitToHome", () => { playSfx("sfxClick", 0.45); showView("home"); });

  // =========================
  // STORY MODE
  // =========================
  safeOn("btnStoryBackHome", () => { playSfx("sfxClick", 0.35); showView("home"); });
  safeOn("btnStoryPrev", () => { playSfx("sfxClick", 0.25); storyPrev(); });
  safeOn("btnStoryNext", () => { playSfx("sfxClick", 0.25); storyNext(); });
  safeOn("btnFightBossNow", () => {
    playSfx("sfxClick", 0.55);
    startOmniBossFight();
  });

  // =========================
  // COSMO REVELATION UNLOCK MODAL
  // =========================
  safeOn("btnCosmoGoNow", () => {
    playSfx("sfxClick", 0.35);
    closeCosmoRevealModal();
    showView("home");
  });

  safeOn("btnOpenShop", () => {
    // Open Shop even if shop rendering fails
    try { playSfx("sfxClick", 0.45); } catch(e) {}
    showView("shop");
    try { renderShop(); } catch(e) { console.error("renderShop failed:", e); }
    try { if (typeof setShopTab === "function") setShopTab("relics"); } catch(e) {}
  });
  safeOn("btnHomeShop", () => {
    // Open Shop even if shop rendering fails
    try { playSfx("sfxClick", 0.45); } catch(e) {}
    showView("shop");
    try { renderShop(); } catch(e) { console.error("renderShop failed:", e); }
    try { if (typeof setShopTab === "function") setShopTab("relics"); } catch(e) {}
  });
  safeOn("btnShopBackHome", () => { playSfx("sfxClick", 0.45); showView("home"); });

  // =========================
  // PROFILE BUTTONS
  // =========================
  safeOn("btnHomeProfile", () => { playSfx("sfxClick", 0.45); openProfile("home"); });
  safeOn("btnShopProfile", () => { playSfx("sfxClick", 0.45); openProfile("shop"); });
  safeOn("btnGameProfile", () => { playSfx("sfxClick", 0.45); openProfile("game"); });
  safeOn("btnProfileBackHome", () => { playSfx("sfxClick", 0.45); showView(_profilePrevView || "home"); });

  // ⚔️ 1v1 Quick Duel
  safeOn("btnProfile1v1", () => { playSfx("sfxClick", 0.35); openDuelModal(); });

  // 🤫 Secrets (upgrade non-shop cards)
  safeOn("btnProfileSecrets", () => { playSfx("sfxClick", 0.35); openSecretsModal(); });
  safeOn("btnSecretsClose", () => { playSfx("sfxClick", 0.25); closeSecretsModal(); });

  // Profile quick navigation
  safeOn("btnProfileToShop", () => {
    // Open Shop even if shop rendering fails
    try { playSfx("sfxClick", 0.45); } catch(e) {}
    showView("shop");
    try { renderShop(); } catch(e) { console.error("renderShop failed:", e); }
    try { if (typeof setShopTab === "function") setShopTab("relics"); } catch(e) {}
  });
  safeOn("btnProfileToBattle", () => {
    playSfx("sfxClick", 0.45);
    // If profile was opened mid-run, return to game. Otherwise start a fresh run.
    if ((_profilePrevView || "home") === "game") showView("game");
    else resetAll();
  });

  // Cosmetics section mini-nav (scroll + active state)
  safeOn("cosNavAvatar", () => {
    playSfx("sfxClick", 0.25);
    document.getElementById("avatarBlock")?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("cosNavAvatar")?.classList.add("miniTabActive");
    document.getElementById("cosNavFrame")?.classList.remove("miniTabActive");
  });
  safeOn("cosNavFrame", () => {
    playSfx("sfxClick", 0.25);
    document.getElementById("frameBlock")?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("cosNavFrame")?.classList.add("miniTabActive");
    document.getElementById("cosNavAvatar")?.classList.remove("miniTabActive");
  });
  safeOn("btnSaveProfileName", () => {
    playSfx("sfxBuy", 0.55);
    const inp = document.getElementById("profileNameInput");
    state.profileName = inp ? String(inp.value || "").slice(0, 18) : String(state.profileName || "");
    saveProgress();
    renderProfileUI();
    log(`👤 Profile updated${state.profileName ? `: ${state.profileName}` : ""}.`, "good");
  });

  safeOn("btnRedeemCode", () => { playSfx("sfxClick", 0.45); redeemCodeFlow(); });

  // Redeem reveal modal buttons (claim/close)
  safeOn("btnRedeemRevealClaim", () => { playSfx("sfxClick", 0.35); closeRedeemRevealModal(); });
  safeOn("btnRedeemRevealClose", () => { playSfx("sfxClick", 0.25); closeRedeemRevealModal(); });

  // 🌌 Cosmo revelation modal
  safeOn("btnCosmoGoNow", () => {
    playSfx("sfxClick", 0.35);
    closeCosmoRevealModal();
    showView("home");
  });

  // 📜 Story mode navigation
  safeOn("btnStoryBackHome", () => { playSfx("sfxClick", 0.35); showView("home"); });
  safeOn("btnStoryPrev", () => { playSfx("sfxClick", 0.25); storyPrev(); });
  safeOn("btnStoryNext", () => { playSfx("sfxClick", 0.35); storyNext(); });
  safeOn("btnFightBossNow", () => { playSfx("sfxClick", 0.55); startOmniBossFight(); });

  // Click outside closes redeem reveal
  const redeemRevealModal = document.getElementById("redeemRevealModal");
  if (redeemRevealModal) {
    redeemRevealModal.addEventListener("click", (e) => {
      if (e.target === redeemRevealModal) closeRedeemRevealModal();
    });
  }

  // ESC closes redeem reveal if open
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const m = document.getElementById("redeemRevealModal");
    if (m && m.style.display !== "none") closeRedeemRevealModal();
  });
  safeOn("btnShopToBattle", () => { playSfx("sfxClick", 0.45); resetAll(); });

  safeOn("tabShopRelics", () => { playSfx("sfxClick", 0.35); setShopTab("relics"); });
  safeOn("tabShopCards", () => { playSfx("sfxClick", 0.35); setShopTab("cards"); });
  safeOn("tabShopPotions", () => { playSfx("sfxClick", 0.35); setShopTab("potions"); });
  safeOn("tabShopPotions", () => { playSfx("sfxClick", 0.35); setShopTab("potions"); });



  // Lucky Draw buttons
  safeOn("btnLuckySingle", () => { playSfx("sfxClick", 0.45); doLuckyDraw(1); });
  safeOn("btnLuckyFive", () => { playSfx("sfxClick", 0.45); doLuckyDraw(5); });
  safeOn("btnLuckyClaim", () => { playSfx("sfxBuy", 0.65); claimLuckyRewards(); });
  safeOn("btnLuckyClose", () => { playSfx("sfxClick", 0.35); closeLuckyModal(); });

  safeOn("tabShopLucky", () => { playSfx("sfxClick", 0.35); setShopTab("lucky"); });

// Close any open lore tooltips when clicking elsewhere.
// (We ignore clicks on the info button/tooltip itself.)
function closeAllLoreTooltips(e) {
  if (e && (e.target.closest('.infoWrap') || e.target.closest('.infoBtn'))) return;
  document.querySelectorAll('.infoWrap.showLore').forEach((w) => w.classList.remove('showLore'));
}

  document.addEventListener('click', closeAllLoreTooltips);
  // =========================
  // INIT
  // =========================
  loadProgress();
  updateGoldUI();
  renderPick();
  renderGallery();
  renderShop();
  setShopTab("relics");
  // apply cosmetics once UI exists
  applyCosmeticsToBattleUI();

  // If someone already has Legend XP in their save, make sure the Diablo reward exists.
  if (getRankNameFromXp(state.profileXp) === "Legend" && !state.diabloUnlocked) {
    unlockDiabloLegendReward();
  }
  showView("home");
}

// Ensure UI is wired even if the script tag is moved (e.g., into <head>).
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootGameUI);
} else {
  bootGameUI();
}


// =========================
// 📖 HOW TO PLAY (Tutorial)
// =========================
let tutorialStepIndex = 0;

const TUTORIAL_STEPS = [
  {
    title: "Welcome to the Arena",
    text: "Choose a fighter card, then survive an endless chain of enemies. Your Life and Armor carry over between stages — so every decision matters."
  },
  {
    title: "Before You Fight",
    text: "From Home, tap Battle → Setup/Pick to choose your champion. Each card shows Damage (ATK), Armor (DEF), Life (HP), and an Ability."
  },
  {
    title: "Turns & Actions",
    text: "On your turn you can: Attack, use your Ability, use a Potion, then End Turn. Enemies act on their turn automatically."
  },
  {
    title: "Armor vs Life (Important)",
    text: "Armor blocks damage first. If Armor is above 0, a hit reduces Armor ONLY (no HP overflow on the same hit). Some effects deal TRUE damage that ignores Armor."
  },
  {
    title: "Abilities & Effects",
    text: "Each card has 1 signature Ability. Abilities can heal, break armor, stun/freeze, poison, silence, or boost stats. Read each card’s Ability text — it’s the main win condition."
  },
  {
    title: "Cooldowns",
    text: "After you use an Ability it goes on cooldown (turn-based). Some legendary effects may also use real-time cooldown timers — both are shown in battle."
  },
  {
    title: "Potions",
    text: "Potions are used during battle (your turn only). After using one, all potions share a global cooldown. Stock up in Shop → 🧪 Potions."
  },
  {
    title: "Relics",
    text: "Relics are powerful passive items (lifesteal, reflect, revive, extra gold, etc.). You can equip only ONE relic at a time — choose based on your build."
  },
  {
    title: "Gold, Shop & Upgrades",
    text: "Win battles to earn Gold. Spend it in Shop to buy cards, potions, relics, and upgrades. Upgrades improve a card’s stats across runs."
  },
  {
    title: "Modes & Progress",
    text: "Endless Battle is the core loop. Profile has 1v1 Quick Duel. Story Mode reveals lore and missions — secret cards unlock when you clear milestones."
  }
];

function closeTutorial() {
  const el = document.getElementById("tutorialModal");
  if (el) el.remove();
}

function renderTutorialStep() {
  const step = TUTORIAL_STEPS[tutorialStepIndex];
  const titleEl = document.getElementById("tutorialTitle");
  const bodyEl = document.getElementById("tutorialBodyText");
  const stepEl = document.getElementById("tutorialStepCount");

  if (titleEl) titleEl.textContent = step.title;
  if (bodyEl) bodyEl.textContent = step.text;
  if (stepEl) stepEl.textContent = `Step ${tutorialStepIndex + 1} / ${TUTORIAL_STEPS.length}`;

  const prevBtn = document.getElementById("tutorialPrev");
  const nextBtn = document.getElementById("tutorialNext");

  if (prevBtn) prevBtn.disabled = tutorialStepIndex === 0;
  if (nextBtn) nextBtn.textContent = tutorialStepIndex === TUTORIAL_STEPS.length - 1 ? "Finish ✅" : "Next ➜";
}

function openTutorial() {
  closeTutorial();
  tutorialStepIndex = 0;

  const wrap = document.createElement("div");
  wrap.id = "tutorialModal";
  wrap.className = "modalOverlay";

  wrap.innerHTML = `
    <div class="modalBox">
      <div class="modalHeader">
        <div>
          <div class="modalTitle">📖 How to Play</div>
          <div class="modalPill" id="tutorialStepCount">Step 1 / ${TUTORIAL_STEPS.length}</div>
        </div>
        <button class="btn btnSoft" id="tutorialClose">✖</button>
      </div>

      <div class="modalBody">
        <div class="tutorialSteps">
          <div class="tutorialStep">
            <h4 id="tutorialTitle"></h4>
            <p id="tutorialBodyText"></p>
          </div>
        </div>

        <div class="tutorialNav">
          <button class="btn btnSoft" id="tutorialPrev">⬅ Back</button>
          <button class="btn btnPrimary" id="tutorialNext">Next ➜</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(wrap);

  document.getElementById("tutorialClose").onclick = closeTutorial;

  document.getElementById("tutorialPrev").onclick = () => {
    if (tutorialStepIndex > 0) tutorialStepIndex--;
    renderTutorialStep();
  };

  document.getElementById("tutorialNext").onclick = () => {
    if (tutorialStepIndex < TUTORIAL_STEPS.length - 1) {
      tutorialStepIndex++;
      renderTutorialStep();
    } else {
      closeTutorial();
    }
  };

  // close when clicking outside
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) closeTutorial();
  });

  renderTutorialStep();
}

// Hook button
document.addEventListener("DOMContentLoaded", () => {
  // Support multiple buttons across screens.
  // (HTML uses a class; keep the old id selector as a fallback for older copies.)
  document.querySelectorAll(".btnHowToPlay, #btnHowToPlay").forEach((btn) => {
    btn.addEventListener("click", () => {
      try { playSfx("sfxClick", 0.45); } catch(e) {}
      openTutorial();
    });
  });
});
