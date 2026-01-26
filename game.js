// =========================
// Cosmic Card Wars (SURVIVAL + GOLD + SHOP + RELICS + AI + HIT FX + SFX)
// =========================

// Bump this whenever you add a new entry to PATCH_NOTES (used for the 🆕 badge).
const GAME_VERSION = "no-combat-feed-freeze-fix-v8";

// =========================
// ⚡ PERFORMANCE MODE (mobile-friendly, keeps features)
// =========================
// Auto-detect low-power devices (mostly mobile / low RAM / reduced-motion) and
// soften heavy visual effects + throttle UI renders so the game stays smooth.
const PERF_STORAGE_KEY = "perfMode"; // "auto" | "high" | "low"
function getPerfMode() {
  try { return String(localStorage.getItem(PERF_STORAGE_KEY) || "auto"); } catch (e) { return "auto"; }
}
function setPerfMode(mode) {
  try { localStorage.setItem(PERF_STORAGE_KEY, String(mode || "auto")); } catch (e) {}
  applyPerfModeToBody();
}
function isLikelyLowPowerDevice() {
  let reduce = false;
  try { reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  const ua = (navigator && navigator.userAgent) ? navigator.userAgent : "";
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (navigator && "maxTouchPoints" in navigator && navigator.maxTouchPoints > 1);
  const cores = Number(navigator && navigator.hardwareConcurrency) || 0;
  const mem = Number(navigator && navigator.deviceMemory) || 0; // not supported on iOS; OK
  // Heuristic: mobile + (<=4 cores OR <=4GB RAM) OR reduced-motion
  return !!(reduce || (isMobile && ((cores && cores <= 4) || (mem && mem <= 4))));
}
function isPerfLow() {
  const mode = getPerfMode();
  if (mode === "low") return true;
  if (mode === "high") return false;
  return isLikelyLowPowerDevice();
}
function applyPerfModeToBody() {
  try {
    const low = isPerfLow();
    document.body.classList.toggle("perfLow", !!low);
    document.body.classList.toggle("perfHigh", !low);
  } catch (e) {}
}
// Apply immediately
try { applyPerfModeToBody(); } catch (e) {}
console.log("Loaded game.js", GAME_VERSION);

// =========================
// 🃏 CARD RARITY
// =========================
// Default rarity is Common if a card id is not listed here.
const CARD_RARITY = {
  // Common
  spacePatron: "Common",
  luckyCat: "Common",
  daysi: "Common",
  patrickDestroyer: "Common",
  spaceSkeletonPirate: "Common",
  angelo: "Common",

  // Rare
  baltrio: "Rare",
  nebulaGunslinger: "Rare",
  solarPriestessSeraph: "Rare", // Celestial Priestess
  novaEmpress: "Rare",          // Nova Express
  drNemesis: "Rare",
  ohtensahorse: "Rare",

  // Epic
  "3dm4rk": "Epic",
  tremo: "Epic",
  eyJiEs: "Epic",
  hollyChild: "Epic",
  spidigong: "Epic",
  diablo: "Epic",

  // Mythical
  halaka: "Mythical",
  nebulaBladeDancer: "Mythical", // Space Duelist
  voidChronomancer: "Mythical",
  starbreakerNullKing: "Mythical",
  voidSamurai: "Mythical",
  astroWitch: "Mythical",

  // Legendary
  yrol: "Legendary",
  abarskie: "Legendary",
  siyokou: "Legendary",
  zukinimato: "Legendary",

  // Cosmic
  cosmoSecret: "Cosmic",
  rayBill: "Cosmic",
  antiMatter: "Cosmic",
  awakenedMonster: "Cosmic",
  omni: "Cosmic",

  // Redeem-only
  roque: "Epic",
};

const RARITY_ORDER = ["Common","Rare","Epic","Mythical","Legendary","Cosmic"];

function getCardRarity(id) {
  const key = String(id || "").trim();
  const r = CARD_RARITY[key];
  return r || "Common";
}

function rarityClass(r) {
  const v = String(r || "Common").toLowerCase();
  if (v === "rare") return "rare";
  if (v === "epic") return "epic";
  if (v === "mythical") return "mythical";
  if (v === "legendary") return "legendary";
  if (v === "cosmic") return "cosmic";
  return "common";
}

function rarityCssClass(r) {
  const v = String(r || "Common");
  const key = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
  return `rarity${key}`;
}
function applyRarityPill(el, rarity) {
  if (!el) return;
  const r = String(rarity || "Common");
  const key = r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
  el.textContent = r;
  el.classList.remove("rarityCommon","rarityRare","rarityEpic","rarityMythical","rarityLegendary","rarityCosmic");
  el.classList.add(`rarity${key}`);
}

function applyRarityFrame(el, rarity) {
  if (!el) return;
  const r = String(rarity || "Common");
  const cls = rarityClass(r);
  el.classList.add("rarityFrame");
  el.classList.remove("common","rare","epic","mythical","legendary","cosmic");
  el.classList.add(cls);
}

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

// Skins + Auras (cosmetics unlocked by rank)
const SKINS = [
  { id: "default", label: "Default", className: "", unlockRank: "Rookie" },
  { id: "neon",    label: "Neon",    className: "skinNeon",   unlockRank: "Bronze" },
  { id: "shadow",  label: "Shadow",  className: "skinShadow", unlockRank: "Silver" },
  { id: "golden",  label: "Golden",  className: "skinGolden", unlockRank: "Gold" },
  { id: "galaxy",  label: "Galaxy",  className: "skinGalaxy", unlockRank: "Platinum" },
  { id: "cosmic",  label: "Cosmic",  className: "skinCosmic", unlockRank: "Legend" },
];

const AURAS = [
  { id: "none",   label: "None",   className: "",         unlockRank: "Rookie" },
  { id: "blue",   label: "Blue",   className: "auraBlue", unlockRank: "Bronze" },
  { id: "purple", label: "Purple", className: "auraPurple", unlockRank: "Silver" },
  { id: "gold",   label: "Gold",   className: "auraGold", unlockRank: "Gold" },
  { id: "void",   label: "Void",   className: "auraVoid", unlockRank: "Diamond" },
  { id: "god",    label: "God",    className: "auraGod",  unlockRank: "Legend" },
];

// 🎮 Arena Backgrounds (cosmetics unlocked by rank)
const BACKGROUNDS = [
  { id: "nebula",    label: "Nebula Rift",     url: "bg/nebula.jpg",    unlockRank: "Rookie" },
  { id: "asteroids", label: "Asteroid Belt",   url: "bg/asteroids.jpg", unlockRank: "Bronze" },
  { id: "frost",     label: "Frozen Stars",    url: "bg/frost.jpg",     unlockRank: "Silver" },
  { id: "eclipse",   label: "Eclipse Throne",  url: "bg/eclipse.jpg",   unlockRank: "Gold" },
  { id: "void",      label: "Void Gate",       url: "bg/void.jpg",      unlockRank: "Diamond" },
  { id: "godrealm",  label: "God Realm Arena", url: "bg/godrealm.jpg",  unlockRank: "Legend" },
];

function getBackgroundDef(id) {
  const key = String(id || "").trim();
  return BACKGROUNDS.find(b => b.id === key) || BACKGROUNDS[0];
}


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
  if (typeof p.skinId !== "string") p.skinId = "default";
  if (typeof p.auraId !== "string") p.auraId = "none";
  if (typeof p.backgroundId !== "string") p.backgroundId = "nebula";
  if (p.diabloUnlocked !== true) p.diabloUnlocked = false;
  // Mirror into top-level cached fields used by UI helpers
  state.profileXp = p.xp;
  state.profileRankIndex = getRankIndexForXp(p.xp);
  state.profileName = p.name;
  state.skinId = p.skinId;
  state.auraId = p.auraId;
  state.backgroundId = p.backgroundId;
}


// =========================
// HELPERS (Shield / Armor rules)
// =========================
function canGainArmor(f) {
  return !(f && f.noArmorGain && f.noArmorGain > 0);
}
function gainShield(f, amount, opts = {}) {
  if (!f || amount <= 0) return 0;
  if (!canGainArmor(f)) return 0; // Time Lock blocks armor gain

  // Void Collapse: global armor gain reduction (anti-infinite fight)
  if (state && state.phase === "battle" && state.voidCollapse && Number(state.voidCollapse.armorMult || 1) < 1) {
    amount = Math.floor(amount * Number(state.voidCollapse.armorMult || 1));
    if (amount <= 0) return 0;
  }

  // 😵 Fatigue: skills & passives weaken in endless rounds
  amount = applyFatigueMultiplier(amount, (opts && opts.source) ? opts.source : "skill");
  if (amount <= 0) return 0;

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
// ❤️ Healing helper (supports Hell Brand + heal triggers)
// =========================
function healUnit(target, amount, opts = {}) {
  if (!target) return 0;
  amount = Number(amount);
  if (!Number.isFinite(amount) || amount <= 0) return 0;

  // Reboot Seal blocks healing completely
  if (!canHeal(target)) return 0;

  // Hell Brand: healing reduced by 50%
  if (target.hellBrand && target.hellBrand > 0) {
    amount = Math.floor(amount * 0.5);
  }

  // 🌌 Void Collapse: global healing reduction (anti-infinite fight)
  // Applies to ALL healing (player + enemy) in any battle mode (Run, Boss, 1v1 Duel).
  if (state && state.phase === "battle" && state.voidCollapse && Number(state.voidCollapse.healMult || 1) < 1) {
    amount = Math.floor(amount * Number(state.voidCollapse.healMult || 1));
  }

  // 😵 Fatigue: skills & passives weaken in endless rounds
  amount = applyFatigueMultiplier(amount, opts.source);

  if (amount <= 0) return 0;

  const before = Number(target.hp || 0) || 0;
  const maxHp = Math.max(1, Number(target.maxHp || target.hp || 1)) || 1;

  target.hp = Math.min(maxHp, before + amount);
  const healed = Math.max(0, Number(target.hp || 0) - before);

  // Hell Brand: whenever the branded unit heals, they take 5 TRUE damage
  if (healed > 0 && target.hellBrand && target.hellBrand > 0 && !opts._hellBrandRecoil) {
    const srcName = target.hellBrandSource || "Hell Brand";
    applyDamage(target, 5, { source: "status", damageType: "true", attackerName: srcName, _hellBrandRecoil: true });
    log(`🔥 Hell Brand punishes healing! ${target.name} takes 5 TRUE damage.`, "warn");
  }

  return healed;
}

// =========================
// 🌌 Sudden Death: Void Collapse (Rounds 15 / 20 / 25)
// - Round 15+: Healing -30%
// - Round 20+: Healing -60%, Armor gain -50%
// - Round 25+: Arena deals TRUE damage every turn
// =========================
function showArenaAlert(message, tone = "void") {
  // Big, unmistakable overlay (works in every screen/mode)
  const overlay = $("arenaOverlay");
  const back = $("arenaOverlayBack");

  // Fallback small banner (older UI)
  const small = $("arenaAlert");

  const text = String(message || "").trim();
  if (!text) return;

  // Compose with a subtle subline depending on tier
  let sub = "";
  if (tone === "void") sub = "Round 15 — Healing weakened";
  if (tone === "void2") sub = "Round 20 — Healing crippled & armor gain halved";
  if (tone === "void3") sub = "Round 25 — TRUE damage each turn";

  if (overlay) {
    overlay.innerHTML = `${escapeHtml(text)}${sub ? `<span class="sub">${escapeHtml(sub)}</span>` : ""}`;

    overlay.classList.remove("show", "void", "void2", "void3");
    overlay.classList.add(tone);

    if (back) back.classList.add("show");
    // Trigger reflow to restart animation if spammed
    void overlay.offsetWidth;
    overlay.classList.add("show");

    // Screen flash tint
    document.body.classList.remove("voidFlash1", "voidFlash2", "voidFlash3");
    if (tone === "void") document.body.classList.add("voidFlash1");
    if (tone === "void2") document.body.classList.add("voidFlash2");
    if (tone === "void3") document.body.classList.add("voidFlash3");

    // Auto-hide after a few seconds
    clearTimeout(overlay._hideT);
    overlay._hideT = setTimeout(() => {
      overlay.classList.remove("show");
      if (back) back.classList.remove("show");
      document.body.classList.remove("voidFlash1", "voidFlash2", "voidFlash3");
    }, 2600);
  }

  if (small) {
    small.textContent = text;
    small.classList.remove("show", "void", "void2", "void3");
    small.classList.add("show", tone);
    clearTimeout(small._hideT);
    small._hideT = setTimeout(() => small.classList.remove("show"), 2600);
  }

  // Always log too (for history)
  log(text, "warn");
}

function applyVoidCollapseRoundStart() {
  if (state.phase !== "battle") return;
  state.voidCollapse = state.voidCollapse || { level: 0, healMult: 1, armorMult: 1, truePerTurn: 0 };

  // Trigger milestones EXACTLY at these rounds (start of round)
  if (state.round === 15 && state.voidCollapse.level < 1) {
    state.voidCollapse.level = 1;
    state.voidCollapse.healMult = 0.7;  // -30%
    showArenaAlert("🌌 VOID COLLAPSE I — Healing weakened (-30%)!", "void");
    log("🌌 VOID COLLAPSE I — Healing weakened (-30%).", "warn");
  }

  if (state.round === 20 && state.voidCollapse.level < 2) {
    state.voidCollapse.level = 2;
    state.voidCollapse.healMult = 0.4;  // -60%
    state.voidCollapse.armorMult = 0.5; // -50%
    showArenaAlert("🕳️ VOID COLLAPSE II — Healing crippled (-60%), Armor gain halved (-50%)!", "void2");
    log("🕳️ VOID COLLAPSE II — Healing -60%, Armor gain -50%.", "warn");
  }

  if (state.round === 25 && state.voidCollapse.level < 3) {
    state.voidCollapse.level = 3;
    state.voidCollapse.truePerTurn = 8; // TRUE damage every turn
    showArenaAlert("💥 VOID COLLAPSE III — The arena devours you! TRUE damage every turn!", "void3");
    log("💥 VOID COLLAPSE III — Arena deals TRUE damage every turn.", "warn");
  }
}

// =========================
// 😵 FATIGUE (Endless War Penalty)
// Round 25+ gradually weakens SKILLS + PASSIVES until they fizzle out.
// Applies in ANY battle mode because it keys off state.round + state.phase.
// =========================
function fatigueFactor() {
  if (!state || state.phase !== "battle") return 1;
  const r = Number(state.round || 1) || 1;
  if (r < 25) return 1;
  // Round 25 => 0.9, 26 => 0.8 ... Round 34+ => 0.0
  const f = 1 - 0.1 * (r - 24);
  return Math.max(0, Math.min(1, f));
}

function fatigueTier() {
  const f = fatigueFactor();
  if (f >= 1) return "none";
  if (f > 0.66) return "mild";
  if (f > 0.33) return "med";
  return "severe";
}

function fatigueAppliesToSource(source) {
  source = String(source || "").toLowerCase();
  return (source === "skill" || source === "passive");
}

function applyFatigueMultiplier(value, source) {
  let v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return 0;
  if (!fatigueAppliesToSource(source)) return v;

  const f = fatigueFactor();
  if (f >= 1) return v;

  v = Math.floor(v * f);
  return Math.max(0, v);
}

function applyFatigueRoundStart() {
  if (!state || state.phase !== "battle") return;
  const r = Number(state.round || 1) || 1;
  if (r < 25) return;

  const f = fatigueFactor();
  const pct = Math.round(f * 100);

  // ⚡ One-time warning when Endless War starts
  if (r === 25 && !state._fatigueWarned) {
    state._fatigueWarned = true;
    playFatigueWarning(0.24);
    // tiny shake so it feels like the arena "notices" the endless war
    screenShakeArena(8, 280);
    floatingDamage("player", "⚡ ENDLESS WAR!", "fatigue");
    floatingDamage("enemy",  "⚡ ENDLESS WAR!", "fatigue");
    log(`⚡ Endless War begins (Round 25). Fatigue will start draining ability power.`, "warn");
  }

  // ✅ Cool floating message on BOTH cards (same style as damage popups)
  if (pct > 0) {
    floatingDamage("player", `😵 FATIGUE ${pct}%`, "fatigue");
    floatingDamage("enemy",  `😵 FATIGUE ${pct}%`, "fatigue");
    log(`😵 Endless War Penalty: fatigue reduces skills & passives to ${pct}% power.`, "warn");
  } else {
    floatingDamage("player", `🛑 EXHAUSTED!`, "fatigue");
    floatingDamage("enemy",  `🛑 EXHAUSTED!`, "fatigue");
    log(`🛑 Endless War Penalty: skills & passives have collapsed — they fizzle out now.`, "bad");

    // 🔥 One-time OVERLOAD hit when fatigue reaches 0%
    if (!state._fatigueOverload) {
      state._fatigueOverload = true;
      screenShakeArena(14, 540);
      floatingDamage("player", "🔥 FATIGUE OVERLOAD", "fatigue");
      floatingDamage("enemy",  "🔥 FATIGUE OVERLOAD", "fatigue");
      playFatigueWarning(0.28);
    }
  }

  // Also apply visual "tired" effect on the card frames
  applyFatigueCardVisuals();
}

function applyFatigueCardVisuals() {
  const tier = fatigueTier();
  const exhausted = fatigueFactor() <= 0;
  const pc = document.getElementById("playerCard");
  const ec = document.getElementById("enemyCard");

  if (pc) pc.classList.remove("fatigue-mild", "fatigue-med", "fatigue-severe", "fatigue-exhausted");
  if (ec) ec.classList.remove("fatigue-mild", "fatigue-med", "fatigue-severe", "fatigue-exhausted");

  if (tier !== "none") {
    if (pc) pc.classList.add(`fatigue-${tier}`);
    if (ec) ec.classList.add(`fatigue-${tier}`);
  }

  // 💢 Cracked aura overlay when fully exhausted
  if (exhausted) {
    if (pc) pc.classList.add("fatigue-exhausted");
    if (ec) ec.classList.add("fatigue-exhausted");
  }
}

// Called at the START of each turn (after turn swaps)
function applyVoidTurnStartDamage(unit) {
  if (state.phase !== "battle") return;
  const vc = state.voidCollapse;
  if (!vc || (vc.truePerTurn || 0) <= 0) return;
  if (!unit || unit.hp <= 0) return;

  applyDamage(unit, vc.truePerTurn, { source: "void", damageType: "true", attackerName: "Void Collapse" });
  log(`💀 Void Collapse hits ${unit.name} for ${vc.truePerTurn} TRUE damage!`, unit === state.player ? "bad" : "good");
}

// =========================
// 🌙 Constellation Curse helper (temporary -ATK + cooldown extension)
// =========================
function applyConstellationCurse(target, rounds = 2, atkDown = 4) {
  if (!target) return;
  // If already cursed, restore previous ATK debuff so it doesn't stack permanently
  if (target.constellationCurse && target.constellationCurse > 0 && target.constellationCurseAtkDown) {
    target.atk = Math.max(0, Number(target.atk || 0) + Number(target.constellationCurseAtkDown || 0));
  }

  target.constellationCurse = Math.max(Number(target.constellationCurse || 0) || 0, Number(rounds) || 0);
  target.constellationCurseAtkDown = Number(atkDown) || 0;

  target.atk = Math.max(0, Number(target.atk || 0) - target.constellationCurseAtkDown);
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
// 🧠 Skill hover helpers
// =========================
function buildSkillHoverText(p, cdTip) {
  try {
    if (p?.base?.id === "zukinimato") return buildZukinimatoSkillHover(p, cdTip);
  } catch (e) {}
  return `${p.base.skillName}: ${p.base.skillDesc}\n${cdTip}`;
}

function buildZukinimatoSkillHover(p, cdTip) {
  const form = Math.max(1, Math.min(7, Number(p.zukiForm || 1) || 1));
  const curHp = Math.round(Number(p.hp || 0) || 0);
  const maxHp = Math.round(Number(p.maxHp || p.hp || 0) || 0);
  const curDef = Math.round(Number(p.def || p.shield || 0) || 0);
  const curAtk = Math.round(Number(p.atk || 0) || 0);

  const lines = [];
  lines.push(`Form: ${form}/7`);
  lines.push(`Current: DMG ${curAtk} • DEF ${curDef} • HP ${curHp}/${maxHp || curHp}`);

  // Current effects based on form
  if (form >= 6) {
    lines.push("");
    lines.push("Current Effects:");
    lines.push("• Basic attacks ignore armor (TRUE damage).");
    if (form === 6) {
      lines.push("• Each attack also deals 30–50 random TRUE damage.");
      lines.push("• Each attack grants +5 DEF and +5 HEALTH.");
    }
    if (form >= 7) {
      lines.push("• Passive: damage received converts into stackable healing + DMG buffs.");
    }
  }

  // Preview next form if any
  if (form < 7) {
    lines.push("");
    lines.push("Next Transformation (preview):");
    const next = form + 1;
    if (next === 2) {
      lines.push("• Replace stats → DMG 8 • DEF 9 • HEALTH 10");
      lines.push("• Image: cards/zukinimato2.png");
    } else if (next === 3) {
      lines.push("• Gain (stackable) → +3 DMG • +3 DEF • +3 HEALTH");
      lines.push("• Image: cards/zukinimato3.png");
    } else if (next === 4) {
      lines.push("• Gain (stackable) → +8 DMG");
      lines.push("• Image: cards/zukinimato4.png");
    } else if (next === 5) {
      lines.push("• Replace stats → DMG 20 • DEF 15 • LIFE 16");
      lines.push("• Image: cards/zukinimato5.png");
    } else if (next === 6) {
      lines.push("• All attacks become TRUE damage (ignore armor).");
      lines.push("• Each attack adds 30–50 random TRUE damage.");
      lines.push("• Each attack grants +5 DEF and +5 HEALTH.");
      lines.push("• Image: cards/zukinimato6.png");
    } else if (next === 7) {
      lines.push("• Replace stats → DMG 30 • DEF 25 • HEALTH 50");
      lines.push("• Passive forever: damage taken → healing + DMG buffs (stackable).");
      lines.push("• Basic attacks always TRUE damage.");
      lines.push("• Final form (no more transformations).");
      lines.push("• Image: cards/zukinimato7.png");
    }
  } else {
    lines.push("");
    lines.push("Final Form: Transformation is now passive and permanent.");
  }

  return `${p.base.skillName}: ${p.base.skillDesc}\n${cdTip}\n\n${lines.join("\n")}`;
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
  // Only trigger if the card is explicitly configured with the legendary passive.
  // (Yrol can be reworked into an active-skill card without changing its id.)
  if (!defender || defender.id !== "yrol" || defender.legendaryPassive !== true) return;
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
    hp: 7,
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
    name: "Space Patrol",
    img: "cards/space-patrol.png",
    atk: 3,
    def: 4,
    hp: 8,
    skillName: "Galactic Arrest",
    skillDesc: "Stun (1 turn), Seal skills (2 turns), and deal 3 TRUE damage. (cooldown 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      foe.stunned = 1;
      foe.silenced = Math.max(Number(foe.silenced || 0) || 0, 2);
      applyDamage(foe, 3, { source: "skill", damageType: "true", attacker: me, attackerName: me.name });
      me.cooldown = 3;
      return { ok: true, msg: `${me.name} uses Galactic Arrest! Enemy is stunned, sealed, and takes 3 TRUE damage.` };
    }
  },
  {
    id: "luckyCat",
    name: "Lucky Cat",
    img: "cards/lucky-cat.png",
    atk: 3,
    def: 3,
    hp: 7,
    skillName: "Fortune Twist",
    skillDesc: "Roll a random Fortune effect: 1-40 (+3 HP, +2 Armor), 41-80 (remove enemy armor + heal 3), 81-100 (12 TRUE dmg, heal 6, +4 Armor, -1 CD). (cooldown 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      const roll = randInt(1, 100);
      let msg = `${me.name} uses Fortune Twist! 🎲 Rolled ${roll}. `;

      if (roll <= 40) {
        const healed = healUnit(me, 3, { source: "skill", healer: me, triggerEvents: true });
        const gained = gainShield(me, 2);
        msg += `Common! Heals +${healed} HP and gains +${gained} Armor.`;
      } else if (roll <= 80) {
        foe.shield = 0;
        foe.def = foe.shield;
        const healed = healUnit(me, 3, { source: "skill", healer: me, triggerEvents: true });
        msg += `Rare! Removes all enemy Armor and heals +${healed} HP.`;
      } else {
        applyDamage(foe, 12, { source: "skill", damageType: "true", attacker: me, attackerName: me.name });
        const healed = healUnit(me, 6, { source: "skill", healer: me, triggerEvents: true });
        const gained = gainShield(me, 4);
        reduceAbilityCooldownByOne(me);
        msg += `JACKPOT! Deals 12 TRUE damage, heals +${healed}, gains +${gained} Armor, and reduces cooldown by 1.`;
      }

      me.cooldown = 3;
      return { ok: true, msg };
    }
  },

  // NEW 7 pack
  {
    id: "cosmicGod",
    name: "Cosmic God",
    img: "cards/cosmic-god.png",
    atk: 6,
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
    atk: 4,
    def: 2,
    hp: 7,
    skillName: "Overdrive Delivery",
    skillDesc: "Attack twice. Each hit ignores 1 Armor. If below 50% HP, gain Dodge (2 turn: first enemy attack misses). (cooldown 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      const belowHalf = (Number(me.hp || 0) / Math.max(1, Number(me.maxHp || me.hp || 1))) < 0.5;
      if (belowHalf) me.dodge = 2;

      const doHit = () => {
        // Ignore 1 armor for this hit (manual strip)
        if (Number(foe.shield || 0) > 0) {
          foe.shield = Math.max(0, Number(foe.shield || 0) - 1);
          foe.def = foe.shield;
        }
        const dmg = dmgCalc(me);
        applyDamage(foe, dmg, { source: "attack", damageType: "physical", attacker: me, attackerName: me.name });
      };

      doHit();
      doHit();

      me.cooldown = 3;
      return { ok: true, msg: `${me.name} uses Overdrive Delivery! Strikes twice (each hit ignores 1 Armor).${belowHalf ? " Gains Dodge (1 turn)!" : ""}` };
    }
  },
  {
    id: "patrickDestroyer",
    name: "Patrick the Destroyer",
    img: "cards/patrick-the-destroyer.png",
    atk: 3,
    def: 4,
    hp: 8,
    skillName: "Execution Protocol",
    skillDesc: "Strike 3 times (2, 2, then 6 TRUE). If enemy drops under 25% HP, gain +3 ATK permanently. (cooldown 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      applyDamage(foe, 2, { source: "skill", damageType: "physical", attacker: me, attackerName: me.name });
      applyDamage(foe, 2, { source: "skill", damageType: "physical", attacker: me, attackerName: me.name });
      applyDamage(foe, 6, { source: "skill", damageType: "true", attacker: me, attackerName: me.name });

      const pct = Number(foe.hp || 0) / Math.max(1, Number(foe.maxHp || foe.hp || 1));
      if (pct > 0 && pct < 0.25) {
        me.atk = Math.max(0, Number(me.atk || 0) + 3);
      }

      me.cooldown = 3;
      return { ok: true, msg: `${me.name} uses Execution Protocol! 3 hits (2, 2, 6 TRUE).${(pct > 0 && pct < 0.25) ? " Gains +3 ATK!" : ""}` };
    }
  },
  {
    id: "spaceSkeletonPirate",
    name: "Space Skeleton Pirate",
    img: "cards/space-skeleton-pirate.png",
    atk: 3,
    def: 2,
    hp: 7,
    skillName: "Grave Loot",
    skillDesc: "Steal 50% of enemy Armor (rounded up), deal damage equal to stolen Armor. If enemy has 0 Armor, steal 3 ATK instead. (cooldown 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      const foeShield = Math.max(0, Number(foe.shield || 0) || 0);
      if (foeShield > 0) {
        const stolen = Math.ceil(foeShield * 0.5);
        foe.shield = Math.max(0, foeShield - stolen);
        foe.def = foe.shield;

        const gained = gainShield(me, stolen);
        applyDamage(foe, stolen, { source: "skill", damageType: "physical", attacker: me, attackerName: me.name });

        me.cooldown = 3;
        return { ok: true, msg: `${me.name} uses Grave Loot! Steals ${stolen} Armor (gains +${gained}), and deals ${stolen} damage.` };
      } else {
        me.atk = Math.max(0, Number(me.atk || 0) + 3);
        me.cooldown = 3;
        return { ok: true, msg: `${me.name} uses Grave Loot! Enemy has no Armor — steals +3 ATK instead.` };
      }
    }
  },
  {
  id: "tremo",
  name: "Tremo",
  img: "cards/tremo.png",
  atk: 4,
  def: 2,
  hp: 7,
  skillName: "Time Rewind",
  skillDesc: "Heal +5 HP (stackable), gain +5 Armor (stackable), and deal 10 damage. (cooldown 2)",
  skill: (me, foe) => {
    if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

    // ✅ STACKABLE: increase max HP and shield cap so gains can grow beyond current limits
    me.maxHp = Math.max(1, Number(me.maxHp || 1) || 1) + 5;
    me.shieldCap = Math.max(0, Number(me.shieldCap || me.shield || me.def || 0) || 0) + 5;

    // Heal (blocked by Reboot Seal)
    const healBlocked = !canHeal(me);
    if (!healBlocked) me.hp = Math.min(me.maxHp, Math.max(0, Number(me.hp || 0) || 0) + 5);

    // Armor (respects Time Lock; cap is now higher due to shieldCap growth)
    const gained = gainShield(me, 5);

    // Ability damage only (armor absorbs first)
    if (foe && Number(foe.hp) > 0) {
      applyDamage(foe, 10, { silent: true, source: "skill" });
    }

    me.cooldown = 2;

    return {
      ok: true,
      msg: healBlocked
        ? `${me.name} rewinds time! Healing was blocked, +${gained} Armor, and deals 10 damage.`
        : `${me.name} rewinds time! +5 HP, +${gained} Armor, and deals 10 damage.`
    };
  }
},
  {
    id: "angelo",
    name: "Angelo",
    img: "cards/angelo.png",
    atk: 4,
    def: 1,
    hp: 9,
    skillName: "Divine Oath",
    skillDesc: "Gain +4 Armor, heal +3 HP, and gain Sanctuary for 2 turns (first skill hit is halved and reflected as TRUE). (cooldown 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      const gained = gainShield(me, 4);
      const healed = healUnit(me, 3, { source: "skill", healer: me, triggerEvents: true });
      me.sanctuary = 2;
      me.sanctuaryUsed = false;
      me.cooldown = 3;
      return { ok: true, msg: `${me.name} uses Divine Oath! +${gained} Armor, heals +${healed} HP, and gains Sanctuary (2 turns).` };
    }
  },
  {
    id: "baltrio",
    name: "Baltrio",
    img: "cards/baltrio.png",
    atk: 5,
    def: 3,
    hp: 8,
    skillName: "Void Anchor",
    skillDesc: "Deal 4 damage, remove ALL enemy Armor, and apply Void Anchor for 2 turns (no Armor gain + 2 TRUE dmg/turn). (cooldown 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      applyDamage(foe, 4, { source: "skill", damageType: "physical", attacker: me, attackerName: me.name });
      foe.shield = 0;
      foe.def = foe.shield;
      foe.noArmorGain = Math.max(Number(foe.noArmorGain || 0) || 0, 2);
      foe.voidAnchor = Math.max(Number(foe.voidAnchor || 0) || 0, 2);
      me.cooldown = 3;
      return { ok: true, msg: `${me.name} uses Void Anchor! Deals 4 damage, strips all enemy Armor, and anchors them in the void (2 turns).` };
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
    hp: 7,
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
    atk: 4,
    def: 2,
    hp: 7,
    skillName: "Time Rewind",
    skillDesc: "Heal +5 HP (stackable), gain +5 Armor (stackable), and deal 10 damage. (cooldown 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      // ✅ STACKABLE: increase max HP and shield cap so gains can grow beyond current limits
      me.maxHp = Math.max(1, Number(me.maxHp || 1) || 1) + 5;
      me.shieldCap = Math.max(0, Number(me.shieldCap || me.shield || me.def || 0) || 0) + 5;

      const healBlocked = !canHeal(me);
      if (!healBlocked) me.hp = Math.min(me.maxHp, Math.max(0, Number(me.hp || 0) || 0) + 5);

      const gained = gainShield(me, 5);
      if (foe && Number(foe.hp) > 0) applyDamage(foe, 10, { silent: true, source: "skill" });
      me.cooldown = 3;
      return { ok: true, msg: healBlocked ? `${me.name} rewinds time! Healing was blocked, +${gained} Armor, and deals 10 damage.` : `${me.name} rewinds time! +5 HP, +${gained} Armor, and deals 10 damage.` };
    }
  },
  halaka: {
    id: "halaka",
    name: "Halaka",
    img: "cards/halaka1.png",
    atk: 3,
    def: 6,
    hp: 8,

    // Passive (default form)
    // Gains +1 Armor every turn. (handled in nextTurn turn-start hook)

    skillName: "Reality Shift",
    skillDesc: "Toggle Reality Form (Assassin). In Reality Form, basic attacks deal TRUE damage equal to Halaka\'s current DMG (penetrates armor) and Halaka gains +1 Health and +1 Defense every turn. Press again to return to default. Cooldown: 2 turns.",
    skill: (me, foe) => {
      if ((me.cooldown || 0) > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      // Save baseline stats for reverting (only once)
      if (!me._halakaBase) {
        me._halakaBase = {
          maxHp: Number(me.maxHp || me.hp || 8) || 8,
          shieldCap: Number(me.shieldCap || me.shield || me.def || 6) || 6
        };
      }

      const inReality = me.halakaForm === "reality";

      if (!inReality) {
        // Enter Reality Form
        me.halakaForm = "reality";
        me.img = "cards/halaka2.png";
        me.cooldown = 3; // CD 2 turns
        return { ok: true, msg: `🗡️ ${me.name} shifts into Reality Form — an assassin awakens.` };
      } else {
        // Return to Default Form + reset to baseline stats
        me.halakaForm = "default";
        me.img = "cards/halaka1.png";

        // Reset stats to baseline
        const base = me._halakaBase || { maxHp: 8, shieldCap: 6 };
        me.maxHp = Number(base.maxHp || 8) || 8;
        me.hp = Math.min(me.maxHp, Number(me.hp || 0) || 0);

        me.shieldCap = Number(base.shieldCap || 6) || 6;
        me.shield = Math.min(me.shieldCap, Number(me.shield || 0) || 0);
        me.def = me.shield; // keep DEF and Shield aligned

        me.cooldown = 3; // CD 2 turns
        return { ok: true, msg: `🛡️ ${me.name} returns to Default Form.` };
      }
    }
  },
  nebulaGunslinger: {
    id: "nebulaGunslinger",
    name: "Nebula Gunslinger",
    img: "cards/nebula-gunslinger.png",
    atk: 6,
    def: 2,
    hp: 7,
    skillName: "Bounty Mark",
    skillDesc: "Mark enemy for 3 turns (+3 dmg from all hits; using skill causes 4 recoil). Then fire 3 shots of 2 dmg. (cooldown 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      foe.mark = Math.max(Number(foe.mark || 0) || 0, 3);

      // 3 multi-hits
      applyDamage(foe, 2, { source: "attack", damageType: "physical", attacker: me, attackerName: me.name });
      applyDamage(foe, 2, { source: "attack", damageType: "physical", attacker: me, attackerName: me.name });
      applyDamage(foe, 2, { source: "attack", damageType: "physical", attacker: me, attackerName: me.name });

      me.cooldown = 3;
      return { ok: true, msg: `${me.name} uses Bounty Mark! Enemy is Marked (3 turns), then takes 3 shots of 2 damage.` };
    }
  },

  solarPriestessSeraph: {
    id: "solarPriestessSeraph",
    name: "Celestial Priestess",
    img: "cards/celestial-priestess.png",
    atk: 3,
    def: 3,
    hp: 10,
    skillName: "Solar Ascension",
    skillDesc: "Heal +6 HP, gain +4 Armor. If healing would overflow near full HP, convert it into +2 Max HP permanently (stackable). (cooldown 2)",
    skill: (me) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      if (!canHeal(me)) return { ok: false, msg: `Reboot Seal blocks healing! (${me.rebootSeal} turns)` };

      const before = Number(me.hp || 0);
      const max = Math.max(1, Number(me.maxHp || me.hp || 1));

      // heal (with Hell Brand reduction if any)
      const healed = healUnit(me, 6, { source: "skill", healer: me, triggerEvents: true });

      const gained = gainShield(me, 4);

      // If we were already near full and heal had little/no effect, grant permanent max HP
      const nearFull = before >= (max - 2);
      if (nearFull) {
        me.maxHp = max + 2;
        me.hp = Math.min(me.maxHp, Number(me.hp || 0));
      }

      me.cooldown = 3;
      return { ok: true, msg: `${me.name} uses Solar Ascension! Heals +${healed} and gains +${gained} Armor.${nearFull ? " Overflow converts to +2 Max HP!" : ""}` };
    }
  },

  nebulaBladeDancer: {
    id: "nebulaBladeDancer",
    name: "Space Duelist",
    img: "cards/space-duelist.png",
    atk: 7,
    def: 4,
    hp: 9,
    skillName: "Starstep Parry",
    skillDesc: "Gain Parry (1 turn: reflect next attack/skill 100%), then counterattack for 6 damage. (cooldown 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      me.parry = 1;
      applyDamage(foe, 6, { source: "skill", damageType: "physical", attacker: me, attackerName: me.name });
      me.cooldown = 3;
      return { ok: true, msg: `${me.name} uses Starstep Parry! Gains Parry (1 turn) and counterattacks for 6 damage.` };
    }
  },

  voidChronomancer: {
    id: "voidChronomancer",
    name: "Void Chronomancer",
    img: "cards/void-chronomancer.png",
    atk: 5,
    def: 2,
    hp: 8,
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
    atk: 5,
    def: 4,
    hp: 10,
    skillName: "Reality Lock",
    skillDesc: "Deal 30 damage, remove ALL enemy armor, apply Reboot Seal (2 turn) — enemy cannot heal, then gain IMMUNITY (1 turn). (CD 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      applyDamage(foe, 30, { silent: true, source: "skill", });

      const removed = foe.shield;
      foe.shield = 0;

      foe.rebootSeal = Math.max(foe.rebootSeal || 0, 2);

      // ✅ Buff: Immunity (1 turn)
      me.immunity = Math.max(Number(me.immunity || 0) || 0, 2);

      me.cooldown = 2;
      updateUI();
      return {
        ok: true,
        msg: `${me.name} uses Reality Lock! 30 dmg, removed ${removed} armor, Reboot Seal (1 turn), gains IMMUNITY (1 turn).`
      };
    }
  },

novaEmpress: {
    id: "novaEmpress",
    name: "Nova Express",
    img: "cards/nova-empress.png",
    atk: 8,
    def: 6,
    hp: 10,
    skillName: "Royal Detonation",
    skillDesc: "Deal 8 damage (+6 if enemy has Armor). If enemy dies, gain Supernova Crown (heal to full, +5 max HP permanently). (cooldown 3)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      const bonus = (Number(foe.shield || 0) || 0) > 0 ? 6 : 0;
      applyDamage(foe, 8 + bonus, { source: "skill", damageType: "physical", attacker: me, attackerName: me.name });

      // If enemy died, grant crown
      if (Number(foe.hp || 0) <= 0) {
        me.supernovaCrownStacks = Math.max(0, Number(me.supernovaCrownStacks || 0) || 0) + 1;
        me.maxHp = Math.max(1, Number(me.maxHp || me.hp || 1)) + 5;
        me.hp = Math.min(me.maxHp, Number(me.maxHp) || 0); // heal to full
      }

      me.cooldown = 4;
      return { ok: true, msg: `${me.name} uses Royal Detonation! Deals ${8 + bonus} damage.${bonus ? " Bonus damage vs Armor!" : ""}${Number(foe.hp || 0) <= 0 ? " Supernova Crown triggered!" : ""}` };
    }
  },

voidSamurai: {
    id: "voidSamurai",
    name: "Void Samurai",
    img: "cards/void-samurai.png",
    atk: 9,
    def: 8,
    hp: 10,
    skillName: "Void Riposte",
    skillDesc: "Gain +4 Armor, deal 6 damage, and enter Counter Stance for 2 turns (attacks cause 3 TRUE backlash; enemy skills grant +2 Armor). (cooldown 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      const gained = gainShield(me, 4);
      applyDamage(foe, 6, { source: "skill", damageType: "physical", attacker: me, attackerName: me.name });
      me.counterStance = Math.max(Number(me.counterStance || 0) || 0, 2);
      me.cooldown = 3;
      return { ok: true, msg: `${me.name} uses Void Riposte! +${gained} Armor, deals 6 damage, and enters Counter Stance (2 turns).` };
    }
  },

astroWitch: {
    id: "astroWitch",
    name: "Astro Witch",
    img: "cards/astro-witch.png",
    atk: 8,
    def: 3,
    hp: 7,
    skillName: "Astral Rewrite",
    skillDesc: "Deal 10 TRUE damage and apply Constellation Curse for 2 turns (-4 ATK; skill cooldown +1). (cooldown 3)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      applyDamage(foe, 10, { source: "skill", damageType: "true", attacker: me, attackerName: me.name });

      applyConstellationCurse(foe, 2, 4);

      me.cooldown = 4;
      return { ok: true, msg: `${me.name} uses Astral Rewrite! Deals 10 TRUE damage and applies Constellation Curse (2 turns).` };
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
    skillName: "Lezzgoo",
    skillDesc: "Apply Reboot Seal (3 turns) — enemy can't heal. Then deal damage equal to your current damage + enemy current armor. Gain +10 Armor (stackable) and +8 HP (stackable). (CD 3)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      // Reboot Seal: blocks healing
      foe.rebootSeal = Math.max(foe.rebootSeal || 0, 3);

      // Damage scales with enemy current armor (shield) and becomes a STACKABLE +DMG buff for Yrol.
      // ✅ "Steals armor-based power": we take the foe's CURRENT armor (shield) and convert it into
      // permanent ATK for Yrol (stackable), and we also consume the foe's armor.
      const enemyArmor = Math.max(0, Number(foe.shield || 0) || 0);
      const baseBefore = Math.max(0, Number(me.atk || 0) || 0);

      // ✅ Stackable ATK growth: add (not replace) so it always grows over time.
      // This makes the increase obvious in the UI.
      me.atk = baseBefore + enemyArmor;

      // Consume the foe's armor after siphoning it (so it truly feels like a "steal").
      if (enemyArmor > 0) {
        foe.shield = Math.max(0, Number(foe.shield || 0) - enemyArmor);
        foe.def = foe.shield;
      }

      const dmg = me.atk;

      applyDamage(foe, dmg, { silent: true, source: "skill", attacker: me, attackerName: me.name });

      // +10 DEF/Armor (STACKABLE): increase shield cap so armor gain isn't limited to the original DEF cap
      me.shieldCap = Math.max(0, Number(me.shieldCap || 0) || 0) + 10;
      const gained = gainShield(me, 10);

      // +8 HP (STACKABLE): increase max HP and also increase current HP by +8 (capped at new max)
      // This is a direct max-HP growth effect and should remain stackable.
      me.maxHp = Math.max(1, Number(me.maxHp || 1) || 1) + 8;
      const hpBefore = Math.max(0, Number(me.hp || 0) || 0);
      me.hp = Math.min(me.maxHp, hpBefore + 8);
      const gainedHp = me.hp - hpBefore;

      me.cooldown = 3;
      updateUI();
      return {
        ok: true,
        msg: `${me.name} shouts LEZZGOO! Reboot Seal (3 turns) applied, dealt ${dmg} damage (base ${baseBefore} + armor ${enemyArmor}), gained +${gained} armor and +${gainedHp} HP.`
      };
    }
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

// ✅ NEW: Ey-Ji-Es (Shop)
eyJiEs: {
  id: "eyJiEs",
  name: "Ey-Ji-Es",
  img: "cards/eyjies.png",
  atk: 3,
  def: 5,
  hp: 12,
  skillName: "Cooldown Surge",
  skillDesc: "Passive: Every 2 turns, it increases the enemy’s ability cooldown by +2. Basic Attacks deal 5 TRUE damage that ignores armor every time it uses a normal attack. Bonus: Gains +1 armor every time the passive triggers.",
  skill: (me) => {
    return { ok: false, msg: "Cooldown Surge is passive. (Triggers every 2 turns.)" };
  }
},

  // 🎰 Lucky Draw Legendary
  siyokou: {
    id: "siyokou",
    name: "Siyokou",
  lore: "A wandering blade-spirit who turns pain into power—when Siyokou strikes true, even fate bleeds for you.",
    img: "cards/siyokou.png",
    atk: 10,
    def: 12,
    hp: 25,
    secret: true,
    skillName: "Critical Strike",
    skillDesc: "50% chance to do Critical damage (15–75). Heal based on generated number (stackable, can go above current life) and gain +5 DEF. (CD 2)",
    skill: (me, foe) => {
      if ((me.cooldown || 0) > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      const crit = Math.random() < 0.5;
      if (!crit) {
        // CD 1
        me.cooldown = 2;
        updateUI();
        return { ok: true, msg: `${me.name} tried Critical Strike... but it failed.` };
      }

      const roll = randInt(15, 75);

      // Deal rolled damage as SKILL damage
      applyDamage(foe, roll, { silent: true, source: "skill", attacker: me, attackerName: me.name });

      // ✅ Stackable heal ABOVE current life by increasing max HP
      const baseMax = Math.max(1, Number(me.maxHp || 1) || 1);
      me.maxHp = baseMax + roll;

      const healBlocked = !canHeal(me);
      if (!healBlocked) {
        me.hp = Math.min(me.maxHp, Math.max(0, Number(me.hp || 0) || 0) + roll);
      } else {
        // Clamp current HP to the new max if healing is blocked
        me.hp = Math.min(me.maxHp, Math.max(0, Number(me.hp || 0) || 0));
      }

      // ✅ +5 DEF (stackable): raise shield cap + add shield
      me.shieldCap = Math.max(0, Number(me.shieldCap || me.shield || me.def || 0) || 0) + 5;
      const gained = gainShield(me, 5);

      // CD 2
      me.cooldown = 2;
      updateUI();

      return {
        ok: true,
        msg: `${me.name} lands CRITICAL STRIKE! Rolled ${roll} dmg + healed ${healBlocked ? 0 : roll} HP (stackable) +${gained} DEF.`
      };
    }
  },

  // 🎰 Lucky Draw Legendary
  relicbornTitan: {
    id: "relicbornTitan",
    name: "Entity",
    img: "cards/entity.png",
    atk: 6,
    def: 5,
    hp: 35,
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
    hp: 12,
    skillName: "Scientific Calculation",
    skillDesc: "Apply poison each round equal to 50% of enemy ATK, and apply a debuff each round: -5 ATK and -5 Armor. Lasts 6 turns. (CD 3)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      // Poison: 50% of enemy ATK each round (6 turns)
      foe.poisonRounds = Math.max(foe.poisonRounds || 0, 6);
      foe.poisonPct = 0.50;       // 50% of ATK
      foe.poisonFlat = 0;

      // Debuff: every round, -5 ATK and -5 Armor (6 turns)
      foe.debuffRounds = Math.max(foe.debuffRounds || 0, 6);
      foe.debuffAtk = 5;
      foe.debuffShield = 5;

      me.cooldown = 3;
      updateUI();
      return { ok: true, msg: `${me.name} uses Scientific Calculation! Enemy is poisoned and weakened every round for 6 turns.` };
    }
  },

  hollyChild: {
    id: "hollyChild",
    name: "Holly Child",
    img: "cards/holly-child.png",
    atk: 15,
    def: 10,
    hp: 6,
    skillName: "Enhancer",
    skillDesc: "Deal 5 poison damage to the enemy every round for 6 turns. (CD 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      foe.poisonRounds = Math.max(foe.poisonRounds || 0, 6);
      foe.poisonPct = 0;
      foe.poisonFlat = 5;

      me.cooldown = 3;
      updateUI();
      return { ok: true, msg: `${me.name} uses Enhancer! Enemy will take 5 poison damage every round for 6 turns.` };
    }
  },

  ohtensahorse: {
    id: "ohtensahorse",
    name: "Otehnsahorse",
    img: "cards/ohtensahorse.png",
    atk: 5,
    def: 4,
    hp: 15,
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
    hp: 15,
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
    hp: 15,
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
      me.maxHp = (Number(me._rbBaseMaxHp) || 0) + roll;
      if (!healBlocked) {
        // convert into life: set to full new max HP
        me.hp = Math.min(me.maxHp, Number(me.maxHp) || 0);
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
    atk: 5,
    def: 6,
    hp: 12,
    skillName: "Soul Furnace",
    skillDesc: "Deal 10 damage, gain +5 Armor, and apply Hell Brand for 3 turns (enemy healing -50%; healing triggers 5 TRUE dmg). (cooldown 3)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      applyDamage(foe, 10, { source: "skill", damageType: "physical", attacker: me, attackerName: me.name });
      const gained = gainShield(me, 5);
      foe.hellBrand = Math.max(Number(foe.hellBrand || 0) || 0, 3);
      foe.hellBrandSource = me.id || me.name;
      me.cooldown = 4;
      return { ok: true, msg: `${me.name} uses Soul Furnace! Deals 10 damage, gains +${gained} Armor, and brands the enemy (3 turns).` };
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
      me.maxHp = (Number(me._amBaseMaxHp) || 0) + roll;
      if (!healBlocked) {
        me.hp = Math.min(me.maxHp, Number(me.maxHp) || 0);
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
    enemyOnly: false,
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
      me.maxHp = (Number(me._awBaseMaxHp) || 0) + roll;
      if (!healBlocked) {
        me.hp = Math.min(me.maxHp, Number(me.maxHp) || 0);
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
  // 👑 Omni (Playable after defeating Omni Boss)
  omni: {
    id: "omni",
    name: "Omni",
    img: "cards/omni.png",
    atk: 1200,
    def: 1200,
    hp: 1200,
    secret: true,
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
  },
  "zukinimato": {
    id: "zukinimato",
    name: "Zukinimato",
    lore: "Zukinimato is a legendary entity who lives on Earth, enjoying a peaceful and happy life. However, behind his calm nature, he possesses strange and unexplainable abilities that allow him to transform into powerful ultimate forms of a supreme being.",
    img: "cards/zukinimato1.png",

    atk: 2,
    def: 3,
    hp: 8,

    skillName: "Transformation",
    skillDesc: "Every use transforms into a new form. Cooldown: 2 turns (Form 1 → Form 7). In Form 7 it becomes passive and permanent.",
    skill: (me, foe) => {
      if ((me.cooldown || 0) > 0) {
        return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };
      }

      // Track form (1..7)
      me.zukiForm = Number(me.zukiForm || 1) || 1;

      // Already final form (passive)
      if (me.zukiForm >= 7) {
        return { ok: false, msg: `${me.name} is already in Ultimate God Form. Transformation is now passive.` };
      }

      // Advance to next form
      me.zukiForm += 1;

      // FORM 2 (First Activation) — replace stats
      if (me.zukiForm === 2) {
        me.atk = 8;
        me.shieldCap = 9;
        me.shield = 9;
        me.def = me.shield;

        me.maxHp = 10;
        me.hp = Math.min(me.maxHp, Number(me.hp || 0));

        me.img = "cards/zukinimato2.png";
      }

      // FORM 3 (Second Activation) — stackable +3 DMG/DEF/HEALTH
      if (me.zukiForm === 3) {
        me.atk = Math.max(0, Number(me.atk || 0)) + 3;

        me.shieldCap = Math.max(0, Number(me.shieldCap || me.shield || me.def || 0)) + 3;
        gainShield(me, 3);

        me.maxHp = Math.max(1, Number(me.maxHp || me.hp || 1)) + 3;
        if (canHeal(me)) me.hp = Math.min(me.maxHp, Number(me.hp || 0) + 3);

        me.img = "cards/zukinimato3.png";
      }

      // FORM 4 (Third Activation) — stackable +8 ATK DMG
      if (me.zukiForm === 4) {
        me.atk = Math.max(0, Number(me.atk || 0)) + 8;
        me.img = "cards/zukinimato4.png";
      }

      // FORM 5 (Fourth Activation) — replace stats
      if (me.zukiForm === 5) {
        me.atk = 20;
        me.shieldCap = 15;
        me.shield = 15;
        me.def = me.shield;

        me.maxHp = 16;
        me.hp = Math.min(me.maxHp, Number(me.hp || 0));

        me.img = "cards/zukinimato5.png";
      }

      // FORM 6 (Fifth Activation) — true damage + random true dmg + growth per attack
      if (me.zukiForm === 6) {
        me.zukiTrueAttack = true;        // basic attacks ignore armor (true damage)
        me.zukiRandomTrue = true;        // each attack deals 30–50 random true damage
        me.zukiGrowthOnAttack = true;    // each attack grants +5 DEF and +5 HEALTH
        me.img = "cards/zukinimato6.png";
      }

      // FORM 7 (Sixth Activation) — Ultimate God Form (final, passive)
      if (me.zukiForm === 7) {
        me.atk = 30;
        me.shieldCap = 25;
        me.shield = 25;
        me.def = me.shield;

        me.maxHp = 50;
        me.hp = Math.min(me.maxHp, Number(me.hp || 0));

        me.zukiUltimatePassive = true;   // damage received converts into stackable healing + damage buffs
        me.zukiTrueAttack = true;        // always true damage basic attacks
        me.img = "cards/zukinimato7.png";
      }

      // Cooldown: 2 turns (this codebase uses +1 convention)
      me.cooldown = 3;
      updateUI();

      return { ok: true, msg: `✨ ${me.name} transforms into Form ${me.zukiForm}!` };
    }
  },


  // 🎁 Redeem-only: ROQUE
  roque: {
    id: "roque",
    name: "Roque",
    img: "cards/roque.png",
    atk: 8,
    def: 26,
    hp: 25,
    skillName: "Dice Roll",
    skillDesc: "When activated, there is a 50% chance to convert Roque's current DEF into ATK for 2 turns. (cooldown 2 turns)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      // 50% chance
      if (Math.random() >= 0.5) {
        me.cooldown = 3; // cooldown 2 turns
        return { ok: true, msg: `🎲 Dice Roll failed... nothing happens.` };
      }

      // Store current DEF (shield) and convert into ATK for 2 turns
      const curDef = Math.max(0, Number(me.def || me.shield || 0) || 0);

      // If already active, don't stack — just refresh duration
      if (me.diceRollTurns > 0 && me._diceRollStoredDef) {
        me.diceRollTurns = Math.max(Number(me.diceRollTurns || 0) || 0, 2);
        me.cooldown = 3;
        return { ok: true, msg: `🎲 Loaded Dice! Dice Roll duration refreshed (2 turns).` };
      }

      me._diceRollStoredDef = curDef;
      me.diceRollTurns = 2;

      // Convert DEF -> ATK (temporarily)
      if (curDef > 0) {
        me.atk = Math.max(0, Number(me.atk || 0) || 0) + curDef;

        // Remove current armor, since it was converted
        me.shield = 0;
        me.def = 0;
      }

      me.cooldown = 3; // cooldown 2 turns
      return { ok: true, msg: `🎲 Dice Roll! 2 turns: DEF (${curDef}) converted into ATK.` };
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
// 🎯 MISSIONS (1 → 11)
// NEW Missions 1–5: onboarding/variety challenges (fast + fun)
// OLD Missions 1–6 are now Missions 6–11 (Cosmo → Omni unlock chain)
//
// Mission 1: Win your first battle
// Mission 2: Reach Stage 5 in a run
// Mission 3: Use any potion in battle
// Mission 4: Buy any relic from the shop
// Mission 5: Win a Quick Duel (Profile)
//
// Mission 6: 50 win streak -> unlocks Cosmo Secret (owned)
// Mission 7: defeat Cosmo Secret -> unlocks Ray Bill (owned) + unlocks Diablo (enemy + gallery)
// Mission 8: defeat Diablo -> unlocks Mission 9 (Entity battle)
// Mission 9: defeat Entity -> unlocks Awakened Monster (enemy-only boss)
// Mission 10: defeat Awakened Monster -> unlocks Anti-Matter (owned)
// Mission 11: defeat Anti-Matter -> unlocks Boss Fight (Story Mode)
// =========================

function isMission1Complete() {
  return !!(state && state.missions && state.missions.m1FirstWin);
}

function isMission2Complete() {
  return !!(state && state.missions && state.missions.m2ReachedStage5);
}

function isMission3Complete() {
  return !!(state && state.missions && state.missions.m3UsedPotion);
}

function isMission4Complete() {
  return !!(state && state.missions && state.missions.m4BoughtRelic);
}

function isMission5Complete() {
  return !!(state && state.missions && state.missions.m5DuelWin);
}

// OLD chain remapped to Missions 6–11
function isMission6Complete() {
  return !!(state && state.owned && state.owned["cosmoSecret"]);
}

function isMission7Complete() {
  return !!(state && state.missions && state.missions.cosmoRevelationDefeated);
}

function isMission8Complete() {
  return !!(state && state.missions && state.missions.diabloDefeated);
}

function isMission9Complete() {
  return !!(state && state.missions && state.missions.entityDefeated);
}

function isMission10Complete() {
  return !!(state && state.missions && state.missions.awakenMonsterDefeated);
}

function isMission11Complete() {
  return !!(state && state.missions && state.missions.antiMatterDefeated);
}

function ensureMissionUnlockDefaults() {
  if (!state.missions) state.missions = {};
  const m = state.missions;

  // NEW mission flags (safe defaults)
  if (m.m1FirstWin !== true) m.m1FirstWin = false;
  if (m.m2ReachedStage5 !== true) m.m2ReachedStage5 = false;
  if (m.m3UsedPotion !== true) m.m3UsedPotion = false;
  if (m.m4BoughtRelic !== true) m.m4BoughtRelic = false;
  if (m.m5DuelWin !== true) m.m5DuelWin = false;

  // These flags control whether secret enemy cards are visible/spawnable.
  if (m.diabloUnlocked !== true) m.diabloUnlocked = false;
  if (m.entityUnlocked !== true) m.entityUnlocked = false;
  if (m.entityDefeated !== true) m.entityDefeated = false;
  if (m.antiMatterUnlocked !== true) m.antiMatterUnlocked = false;
  if (m.antiMatterDefeated !== true) m.antiMatterDefeated = false;
  if (m.awakenMonsterDefeated !== true) m.awakenMonsterDefeated = false;
  if (m.godOfAllGodsModalShown !== true) m.godOfAllGodsModalShown = false;

  // ✅ Backfill unlocks for older saves / edge cases.
  // Mission 7 complete → Diablo becomes visible/spawnable.
  if (isMission7Complete()) m.diabloUnlocked = true;

  // Mission 8 complete → Entity becomes visible/spawnable (Mission 9 target).
  // NOTE: Do NOT require Entity to be defeated to make it spawnable, otherwise Mission 4 can never start.
  if (isMission8Complete()) m.entityUnlocked = true;
}

const SHOP_CARDS = [

  

{
  id: "eyJiEs",
  name: "Ey-Ji-Es",
  img: "cards/eyjies.png",
  price: 1000,
  desc: "Damage: TRUE = current DMG • Armor: 5 • Life: 12 • Passive: Every 2 turns, enemy ability cooldown +2; gain +1 Armor on trigger.",
  playable: true
},
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
    desc: "Damage: 8 • Armor: 1 • Life: 2 • Ability: Time Rewind (CD 2) — Heal +5 HP (stackable), gain +5 Armor (stackable), deal 10 damage.",
    playable: true
  },

  {
    id: "halaka",
    name: "Halaka",
    img: "cards/halaka1.png",
    price: 1000,
    desc: "Damage: 3 • Armor: 6 • Life: 8 • Passive: Gains +1 Armor every turn. Ability: Reality Shift (CD 2) — Toggle Reality Form. In Reality Form, basic attacks deal TRUE damage equal to Halaka's current DMG (penetrates armor) and Halaka gains +1 Health and +1 Defense every turn (stackable). Press again to return to default and reset to base stats.",
    playable: true
  },

{
  id: "novaEmpress",
  name: "Nova Empress",
  img: "cards/nova-empress.png",
  price: 950,
  desc: "Damage: 10 • Armor: 6 • Life: 9 • Ability: Supernova (CD 3) — Deal 8 damage. If it defeats the enemy, heal 5 HP.",
  playable: true
},
{
  id: "voidSamurai",
  name: "Void Samurai",
  img: "cards/void-samurai.png",
  price: 1290,
  desc: "Damage: 8 • Armor: 7 • Life: 7 • Ability: Void Counter (CD 2) — Gain 4 armor and deal 6 damage.",
  playable: true
},
{
  id: "astroWitch",
  name: "Astro Witch",
  img: "cards/astro-witch.png",
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
    desc: "Damage: 6 • Armor: 4 • Life: 10 • Ability: Reality Lock (CD 2) — Deal 4 dmg, remove ALL enemy armor, apply Reboot Seal (2 turns): enemy cannot heal.",
    playable: true
  }
,
  // ✅ NEW SHOP ITEMS (Update)
  {
    id: "drNemesis",
    name: "Dr. Nemesis",
    img: "cards/dr-nemesis.png",
    price: 15000,
    desc: "Damage: 10 • Armor: 5 • Life: 8 • Ability: Scientific Calculation (CD 3) — Poison enemy each round for 50% of their ATK, and apply a debuff each round: -5 ATK and -5 Armor (6 turns).",
    playable: true
  },
  {
    id: "hollyChild",
    name: "Holly Child",
    img: "cards/holly-child.png",
    price: 3000,
    desc: "Damage: 15 • Armor: 10 • Life: 3 • Ability: Enhancer (CD 2) — Deal 5 poison damage to enemy every round (6 turns).",
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
,
  {
    id: "zukinimato",
    name: "Zukinimato",
    img: "cards/zukinimato1.png",
    price: 2500,
    desc: "Damage: 2 • Armor: 3 • Life: 3 • Ability: Transformation (CD: 2) — Evolves through 7 forms and becomes permanent Ultimate God Form.",
    playable: true
  }

];

// =========================
// CARD LORE (Gallery)
// =========================
const CARD_LORE = {
  "siyokou": "A wandering blade-spirit who turns pain into power—when Siyokou strikes true, even fate bleeds for you.",
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
  "spidigong": "A feared enforcer whose ‘Tukhang’ leaves opponents frozen in panic, unable to act.",
  omni: "Omni — the God of all Gods, the feared one whose name is whispered across galaxies. Even divine beings kneel before his presence, because when Omni awakens… reality itself obeys.",
  awakenedMonster: "Awakened Monster — Omni’s pet, born from cosmic darkness and trained to hunt anything that dares challenge its master. It doesn’t roar for war… it roars for Omni.",
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
  { id: "phoenixEmber", name: "Phoenix Ember", price: 6000, desc: "Once per battle: when you would die, revive at 30% HP." },
  // NEW RELICS (Shop)
  { id: "silenceRelic", name: "Relic of Silence", price: 1000, desc: "Every 3 turns: Silence the enemy for 1 turn (they can't use abilities)." },
  { id: "sealRelic", name: "Relic of Sealing", price: 1200, desc: "Every 3 turns: Seal the enemy for 1 turn (they can't heal)." },
  { id: "armorGrowthRelic", name: "Relic of Growing Armor", price: 1500, desc: "Gain +1 Armor every turn. Stackable (each purchase adds another +1)." },

];

// =========================
// 🪬 Relic turn-start effects
// =========================
function applyEquippedRelicTurnStart() {
  if (state.phase !== "battle") return;
  const p = state.player;
  const e = state.enemy;
  if (!p || !e) return;

  // Armor Growth: every 2 turns, gain +1 Armor (shield).
// "Stackable" here means it accumulates if not consumed by damage.
const shouldProc2 = (state.round % 2) === 0;

if (shouldProc2 && hasRelic("armorGrowthRelic")) {
  gainShield(p, 1);
  log(`🪬 Relic of Growing Armor grants +1 Armor.`, "good");
}

// Every 2 turns: apply 1-turn debuffs to enemy
// Uses state.round which increments at the start of the player's turn.
const shouldProc = shouldProc2;

  if (shouldProc && hasRelic("silenceRelic")) {
    e.silenced = Math.max(e.silenced || 0, 1);
    log(`🪬 Relic of Silence triggers! Enemy is silenced for 1 turn.`, "good");
  }

  if (shouldProc && hasRelic("sealRelic")) {
    e.rebootSeal = Math.max(e.rebootSeal || 0, 1);
    log(`🪬 Relic of Sealing triggers! Enemy healing is sealed for 1 turn.`, "good");
  }
}

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
    price: 5000,
    desc: "Fully restores your armor/defense. (Potion cooldown: 10 turns)",
    effect: "armor"
  },
  {
    id: "potionEndurance",
    name: "Potion of Endurance",
    price: 8000,
    desc: "Reduces your ability cooldown by 1. (Potion cooldown: 10 turns)",
    effect: "endurance"
  },
  {
    id: "potionTwilight",
    name: "Potion of Twilight",
    price: 5000,
    desc: "Fully restores your HP and armor. (Potion cooldown: 10 turns)",
    effect: "twilight"
  },
  {
    id: "potionGalacticWanderer",
    name: "Potion of Halactic Wonderer",
    price: 10000,
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
  cardChance: 0.01,
  relicChance: 0.00,
  goldChance: 0.99
};

// --- Storage keys ---
const GOLD_KEY = "cb_gold";
const OWNED_KEY = "cb_owned";
const SETTINGS_KEY = "cb_settings_v1";
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

function isBeginnerMode() {
  return false; // Beginner Mode disabled permanently
}

function saveSettings() {
  try {
    const payload = JSON.stringify({ beginnerMode: !!(state.settings && state.settings.beginnerMode) });
    storageSet(SETTINGS_KEY, payload);
  } catch (e) {}
}

const state = {
  phase: "pick",
  turn: "player",
  round: 1,
  stage: 1,
  // ✅ Sudden Death: Void Collapse (anti-infinite fight)
  voidCollapse: { level: 0, healMult: 1, armorMult: 1, truePerTurn: 0 },
  gold: 0,
  owned: {},

  // ✅ UI/UX settings
  settings: {
    beginnerMode: true,
  },

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

// Minimal HTML escaper for safe innerHTML snippets (e.g., modal badges)
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
const setText = (id, val) => { const el = $(id); if (el) el.textContent = val; };
const setWidth = (id, val) => { const el = $(id); if (el) el.style.width = val; };

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
// 👑 GOD OF ALL GODS AWAKENED MODAL (after Mission 11)
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
        <div class="modalPill">MISSION 11 CLEARED</div>
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
        (It becomes clickable only when Mission 11 is completed.)
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

// ⚡ Fatigue Warning tone (no external mp3 needed)
let __fatigueAudioCtx = null;
function playFatigueWarning(vol = 0.22) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!__fatigueAudioCtx) __fatigueAudioCtx = new AC();
    const ctx = __fatigueAudioCtx;
    if (ctx.state === "suspended") ctx.resume().catch(()=>{});

    const now = ctx.currentTime;

    // quick "warning" double-beep with a tiny pitch glide
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(Math.max(0.001, Number(vol) || 0.22), now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    master.connect(ctx.destination);

    const mkBeep = (t0, f0, f1, dur) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(f0, t0);
      o.frequency.exponentialRampToValueAtTime(Math.max(60, f1), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(1.0, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(master);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    };

    mkBeep(now + 0.00, 740, 520, 0.14);
    mkBeep(now + 0.18, 740, 520, 0.14);
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

// How many stacks of a relic the player owns.
// Most relics are boolean (owned or not).
function getRelicStacks(id) {
  const v = state.ownedRelics ? state.ownedRelics[id] : 0;
  if (typeof v === "number") return v;
  return v ? 1 : 0;
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

  // ✅ Modern, mobile-friendly purchase modal
  openShopItemModal({
    kind: "card",
    title: `✅ Purchased: ${c.name || id}`,
    pill: `${Math.max(0, Number(c.price || 0) || 0) || 2500} Gold`,
    img: c.img || c.image || "",
    name: c.name || id,
    stats: (Number.isFinite(Number(c.atk)) && Number.isFinite(Number(c.def)) && Number.isFinite(Number(c.hp)))
      ? `ATK ${c.atk} • DEF ${c.def} • HP ${c.hp}`
      : (c.stats || ""),
    descTitle: `✨ ${c.skillName || c.abilityName || "Ability"}`,
    desc: c.skillDesc || c.ability || c.desc || "Owned for later.",
    hint: "Owned for later — go to Battle/Setup to pick it when available.",
  });
}

function renderShopCards() {
  const grid = $("shopGrid");
  if (!grid) return;

  const pool = (typeof getShopCardsPool === "function") ? getShopCardsPool() : [];
  if (!pool || !pool.length) {
    grid.innerHTML = `<div class="muted">No upcoming cards configured yet.</div>`;
    return;
  }

  // Filter / Sort by rarity (UI controls)
  const sFilter = document.getElementById("shopRarityFilter");
  const sSort = document.getElementById("shopRaritySort");
  const filterVal = sFilter ? String(sFilter.value || "All") : "All";
  const sortVal = sSort ? String(sSort.value || "default") : "default";

  let list = Array.isArray(pool) ? pool.slice() : [];
  if (filterVal && filterVal !== "All") {
    list = list.filter(c => getCardRarity(c.id) === filterVal);
  }

  const rarityRank = (id) => {
    const r = getCardRarity(id);
    const i = RARITY_ORDER.indexOf(r);
    return i >= 0 ? i : 0;
  };

  if (sortVal === "rarityDesc") {
    list.sort((a,b) => (rarityRank(b.id) - rarityRank(a.id)) || String(a.name||"").localeCompare(String(b.name||""), undefined, { sensitivity:"base" }));
  } else if (sortVal === "rarityAsc") {
    list.sort((a,b) => (rarityRank(a.id) - rarityRank(b.id)) || String(a.name||"").localeCompare(String(b.name||""), undefined, { sensitivity:"base" }));
  } else if (sortVal === "priceAsc") {
    list.sort((a,b) => (Number(a.price||2500)-Number(b.price||2500)) || String(a.name||"").localeCompare(String(b.name||""), undefined, { sensitivity:"base" }));
  } else if (sortVal === "priceDesc") {
    list.sort((a,b) => (Number(b.price||2500)-Number(a.price||2500)) || String(a.name||"").localeCompare(String(b.name||""), undefined, { sensitivity:"base" }));
  } else if (sortVal === "nameAsc") {
    list.sort((a,b) => String(a.name||"").localeCompare(String(b.name||""), undefined, { sensitivity:"base" }));
  } else {
    // default order
  }

  // Clear + render cards
  grid.innerHTML = "";
  list.forEach((c) => {
    const id = String(c.id);
    const owned = !!(state.owned && state.owned[id]);
    const price = Math.max(0, Number(c.price || 0) || 0) || 2500; // fallback price
    const canBuy = !owned && state.gold >= price;

    const name = c.name || id;
    const imgSrc = c.img || c.image || "";

    // Show upgraded stats if applicable
    const baseStatsOk = (Number.isFinite(Number(c.atk)) && Number.isFinite(Number(c.def)) && Number.isFinite(Number(c.hp)));
    const upgraded = (baseStatsOk && typeof getUpgradedStats === "function") ? getUpgradedStats({ ...c, id }) : null;

    const statsLine = baseStatsOk
      ? `ATK ${upgraded ? upgraded.atk : c.atk} • DEF ${upgraded ? upgraded.def : c.def} • HP ${upgraded ? upgraded.hp : c.hp}`
      : (c.stats || "");

    const abilityName = c.skillName || c.abilityName || "Ability";
    const abilityDesc = c.skillDesc || c.ability || c.desc || "Upcoming card (buy to own it for later).";

    // Upgrade UI (only for owned cards)
    const lvl = (typeof getCardLevel === "function") ? getCardLevel(id) : 0;
    const maxLvl = (typeof CARD_UPGRADE_MAX_LEVEL !== "undefined") ? CARD_UPGRADE_MAX_LEVEL : 5;

    const canUp = owned
      && (typeof canUpgradeCard === "function" ? canUpgradeCard(id) : (lvl < maxLvl))
      && (typeof isCardUsableByPlayer === "function" ? isCardUsableByPlayer(id) : true);

    const upCost = (canUp && typeof getUpgradeCost === "function") ? getUpgradeCost(id) : 0;
    const upAffordable = canUp && state.gold >= upCost;

    const div = document.createElement("div");
    div.className = "shopItem";
    try { applyRarityFrame(div, getCardRarity(id)); } catch(e) {}
    div.innerHTML = `
      <div class="shopItemTop">
        <div>
          <h3 class="shopName">🃏 ${name} <span class="rarityPill ${rarityCssClass(getCardRarity(id))}" style="margin-left:8px;">${getCardRarity(id)}</span></h3>
          <div class="shopMeta">
            <span class="badge">Price: ${price} Gold</span>
            <span class="badge ${owned ? "badgeOwned" : ""}">${owned ? "Owned" : "Not owned"}</span>
            <span class="upgradeBadge">Lv ${lvl}/${maxLvl}</span>
            ${statsLine ? `<span class="badge">${statsLine}</span>` : ""}
          </div>
        </div>
      </div>
      <div class="shopCardMedia">
        <img class="shopCardImg" src="${imgSrc}" alt="${name}" loading="lazy" data-card-preview-id="${id}" />
      </div>
      <div class="shopAbility">
        <div class="shopAbilityName">✨ ${abilityName}</div>
        <div class="shopDesc">${abilityDesc}</div>
      </div>
      <div class="shopActions">
        <button class="btn btnPrimary" ${canBuy ? "" : "disabled"} data-card-buy-id="${id}">
          ${owned ? "Owned" : (canBuy ? "Buy" : "Not Enough Gold")}
        </button>

        ${owned ? `
          <button class="btn btnUpgrade" ${
            (!canUp || !upAffordable) ? "disabled" : ""
          } data-card-upgrade-id="${id}">
            ${
              (!canUp)
                ? "MAX"
                : (upAffordable ? `Upgrade (${upCost}G)` : `Need ${upCost}G`)
            }
          </button>
        ` : ""}
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

  // Bind upgrades
  grid.querySelectorAll("button[data-card-upgrade-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      playSfx("sfxClick", 0.45);
      const id = btn.getAttribute("data-card-upgrade-id");
      if (!id) return;
      if (typeof upgradeCard === "function") upgradeCard(id);
    });
  });

  // Tap/click preview (especially helpful on mobile)
  grid.querySelectorAll("img[data-card-preview-id]").forEach((img) => {
    img.addEventListener("click", () => {
      const id = img.getAttribute("data-card-preview-id");
      if (!id) return;
      try {
        const pool = (typeof getShopCardsPool === "function") ? getShopCardsPool() : [];
        const c = (pool || []).find((x) => String(x.id) === String(id));
        if (!c) return;
        playSfx("sfxClick", 0.35);
        openShopItemModal({
          kind: "preview",
          title: c.name || id,
          pill: "Card Preview",
          img: c.img || c.image || "",
          name: c.name || id,
          stats: (Number.isFinite(Number(c.atk)) && Number.isFinite(Number(c.def)) && Number.isFinite(Number(c.hp)))
            ? `ATK ${c.atk} • DEF ${c.def} • HP ${c.hp}`
            : (c.stats || ""),
          descTitle: `✨ ${c.skillName || c.abilityName || "Ability"}`,
          desc: c.skillDesc || c.ability || c.desc || "",
          hint: "Tip: Buy to own it for later.",
        });
      } catch (e) {}
    });
  });
}

function buyShopCard
(id) {
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

  openShopItemModal({
    kind: "card",
    title: `✅ Purchased: ${item.name}`,
    pill: `${item.price} Gold`,
    img: item.img || item.image || "",
    name: item.name,
    stats: (Number.isFinite(Number(item.atk)) && Number.isFinite(Number(item.def)) && Number.isFinite(Number(item.hp)))
      ? `ATK ${item.atk} • DEF ${item.def} • HP ${item.hp}`
      : (item.stats || ""),
    descTitle: `✨ ${item.skillName || item.abilityName || "Ability"}`,
    desc: item.skillDesc || item.ability || item.desc || "",
    hint: "Go to Battle/Setup to pick it!",
  });
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
  
  // ✅ Hide Armor Growth Relic after purchase (it's one-time like other relics,
  // and "stackable" refers to its in-battle armor accumulation, not buying stacks)
  const __owned = state.ownedRelics || {};
  const __relicsForShop = (RELICS || []).filter(r => !(r.id === "armorGrowthRelic" && __owned[r.id]));
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
    const stacks = getRelicStacks(r.id);
    const equipped = String(state.equippedRelicId || "") === String(r.id);
    const canBuy = state.gold >= r.price;

    // armorGrowthRelic can be bought multiple times (stacks)
    const canStackBuy = r.id === "armorGrowthRelic";

    let btnText = "";
    let btnDisabled = false;
    let action = "";

    if (!owned) {
  btnText = canBuy ? "Buy & Equip" : "Not Enough Gold";
  btnDisabled = !canBuy;
  action = "buy";
} else {
  // Owned relics are purchasable once; allow equipping like other items
  btnText = equipped ? "Equipped" : "Equip";
  btnDisabled = equipped;
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

  // If already owned: just equip it (relics can be purchased once, like other items)
  if (state.ownedRelics[id]) {
    equipRelic(id);
    openShopItemModal({
      kind: "relic",
      title: `🪬 Equipped: ${r.name}`,
      pill: "Owned",
      img: r.img || "",
      name: r.name,
      stats: "Relic",
      descTitle: "Effect",
      desc: (r.desc || ""),
      hint: "Relics are auto-equipped (only 1 can be equipped at a time).",
    });
    return;
  }

  if (state.gold < r.price) return;

  state.gold -= r.price;
  state.ownedRelics[id] = true;
  equipRelic(id);

  // 🎯 Mission 4: Buy any relic
  try {
    ensureMissionUnlockDefaults();
    if (!state.missions.m4BoughtRelic) {
      state.missions.m4BoughtRelic = true;
      try { showToast("🎯 Mission 4 complete: Relic purchased!", "good"); } catch (e) {}
    }
  } catch (e) {}

  saveProgress();
  updateGoldUI();
  renderShopRelics();
  playSfx("sfxBuy", 0.85);

  if (state.phase === "battle") {
    if (typeof log === "function") log(`🪬 Purchased & equipped relic: ${r.name}`, "good");
  }

  openShopItemModal({
    kind: "relic",
    title: `🪬 Purchased & Equipped: ${r.name}`,
    pill: `${r.price} Gold`,
    img: r.img || "",
    name: r.name,
    stats: "Relic",
    descTitle: "Effect",
    desc: r.desc || "",
    hint: "Relics are auto-equipped (only 1 can be equipped at a time).",
  });
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

  openShopItemModal({
    kind: "potion",
    title: `🧪 Purchased: ${p.name}`,
    pill: `${p.price} Gold`,
    img: p.img || "",
    name: p.name,
    stats: `Owned: ${getPotionCount(p.id)}`,
    descTitle: "Effect",
    desc: p.desc || "",
    hint: "You can use it in battle (🧪 Use Potion).",
  });
}

// =========================
// SHOP PURCHASE / PREVIEW MODAL (mobile-friendly)
// =========================
function ensureShopItemModal() {
  if (document.getElementById("shopItemModal")) return;

  const overlay = document.createElement("div");
  overlay.id = "shopItemModal";
  overlay.className = "modalOverlay";
  overlay.style.display = "none";

  const box = document.createElement("div");
  box.className = "modalBox shopItemModalBox";
  box.innerHTML = `
    <div class="modalHeader">
      <div>
        <div class="modalTitle" id="shopItemModalTitle">Purchased!</div>
        <div class="modalPill" id="shopItemModalPill">—</div>
      </div>
      <button class="btn btnSoft" id="btnShopItemModalClose" aria-label="Close">✖</button>
    </div>
    <div class="modalBody">
      <div class="shopItemModalHero">
        <img class="shopItemModalImg" id="shopItemModalImg" alt="" />
        <div class="shopItemModalMeta">
          <div class="shopItemModalName" id="shopItemModalName"></div>
          <div class="shopItemModalBadges" id="shopItemModalBadges"></div>
        </div>
      </div>
      <div class="shopItemModalDesc">
        <div class="shopItemModalDescTitle" id="shopItemModalDescTitle"></div>
        <div class="shopItemModalDescText" id="shopItemModalDescText"></div>
      </div>
      <div class="modalHint" id="shopItemModalHint"></div>
    </div>
    <div class="modalActions single">
      <button class="btn btnPrimary" id="btnShopItemModalOk">OK</button>
    </div>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const close = () => closeShopItemModal();
  const btnX = box.querySelector("#btnShopItemModalClose");
  const btnOk = box.querySelector("#btnShopItemModalOk");
  if (btnX) btnX.addEventListener("click", close);
  if (btnOk) btnOk.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (overlay.style.display !== "none" && (e.key === "Escape")) close();
  });
}

function closeShopItemModal() {
  const modal = document.getElementById("shopItemModal");
  if (modal) modal.style.display = "none";
}

function openShopItemModal(payload) {
  ensureShopItemModal();
  const modal = document.getElementById("shopItemModal");
  if (!modal) return;

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val || "");
  };

  setText("shopItemModalTitle", payload?.title || "");
  setText("shopItemModalPill", payload?.pill || "");
  setText("shopItemModalName", payload?.name || "");
  setText("shopItemModalDescTitle", payload?.descTitle || "");
  setText("shopItemModalDescText", payload?.desc || "");
  setText("shopItemModalHint", payload?.hint || "");

  const badges = document.getElementById("shopItemModalBadges");
  if (badges) {
    const stats = String(payload?.stats || "").trim();
    badges.innerHTML = stats ? `<span class="badge">${escapeHtml(stats)}</span>` : "";
  }

  const img = document.getElementById("shopItemModalImg");
  if (img) {
    const src = String(payload?.img || "");
    img.style.display = src ? "block" : "none";
    img.src = src;
    img.alt = payload?.name || "";
    img.onerror = () => {
      img.onerror = null;
      img.style.display = "none";
    };
  }

  modal.style.display = "flex";
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
  // Prefer the in-game modal UI (cool FX). Fallback to prompt if HTML was removed.
  const modal = document.getElementById("redeemCodeModal");
  if (modal) {
    openRedeemCodeModal();
    return;
  }

  // Fallback (legacy)
  const raw = prompt("Enter redeem code:");
  if (raw == null) return;
  redeemCodeApply(String(raw || ""));
}

// Shared redeem logic (used by modal + prompt fallback)
function redeemCodeApply(rawInput) {
  // Offline redeem system (local-only).
  // Add/modify codes here:
  const REDEEM_CODES = {
    // Redeem legendaries (examples)
    "YROL": { type: "card", id: "yrol" },
    "ABARSKIE": { type: "card", id: "abarskie" },

    "ROQUE": { type: "card", id: "roque" },

    // ✅ Alias codes (requested)
    "IAMYROL": { type: "card", id: "yrol" },
    "IAMABARCA": { type: "card", id: "abarskie" },
  };

  const code = String(rawInput || "").trim();
  if (!code) {
    throw new Error("Please enter a code.");
  }

  // Normalize: remove spaces and hyphens, uppercase.
  const norm = code.toUpperCase().replace(/[\s-]+/g, "");

  // Load redeemed map
  let redeemed = {};
  try { redeemed = JSON.parse(storageGet(REDEEMED_CODES_KEY) || "{}") || {}; }
  catch { redeemed = {}; }

  if (redeemed[norm]) {
    // ✅ Hard block: once a code is redeemed, it must NEVER grant again.
    // User-requested message (shown in the redeem input modal):
    // "This code is already used and you already redeem the reward"
    throw new Error("This code is already used and you already redeem the reward.");
  }

  // Allow both exact keys AND normalized keys in REDEEM_CODES
  const direct = REDEEM_CODES[code.toUpperCase()] || REDEEM_CODES[norm];

  // Extra fallback: if the player enters a card id directly (case-insensitive), accept it.
  // Example: "yrol" or "ABARSKIE".
  const asId = String(norm || "").toLowerCase();
  const idFallback = (UNLOCKABLE_CARD_DEFS && UNLOCKABLE_CARD_DEFS[asId]) ? { type: "card", id: asId } : null;

  const reward = direct || idFallback || null;

  if (!reward) throw new Error("Invalid code ❌");

  if (reward.type === "card") {
    const cardId = reward.id;
    if (!cardId || !UNLOCKABLE_CARD_DEFS || !UNLOCKABLE_CARD_DEFS[cardId]) {
        throw new Error("This code reward is not configured correctly.");
    }

    // Ensure containers exist
    state.owned = state.owned || {};

    if (state.owned && state.owned[cardId]) {
      // ✅ Hard block: even if the player tries an alias / different code for the
      // same reward, don't "redeem" again.
      throw new Error("This code is already used and you already redeem the reward.");
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

  throw new Error("Unknown reward type.");
}

// =========================
// 🎁 REDEEM CODE INPUT MODAL
// =========================
function openRedeemCodeModal() {
  const modal = document.getElementById("redeemCodeModal");
  const box = document.getElementById("redeemCodeBox");
  const inp = document.getElementById("redeemCodeInput");
  const err = document.getElementById("redeemCodeError");
  const wrap = document.getElementById("redeemInputWrap");
  if (!modal || !box || !inp || !wrap) return;

  // reset
  inp.value = "";
  wrap.classList.remove("typing", "error", "success");
  if (err) { err.style.display = "none"; err.textContent = ""; }

  box.classList.remove("redeemEnter");
  // reflow to restart animation
  void box.offsetWidth;
  box.classList.add("redeemEnter");

  modal.style.display = "flex";
  setTimeout(() => { try { inp.focus(); inp.select(); } catch(e) {} }, 40);
}

function closeRedeemCodeModal() {
  const modal = document.getElementById("redeemCodeModal");
  if (modal) modal.style.display = "none";
}

function submitRedeemCodeModal() {
  const inp = document.getElementById("redeemCodeInput");
  const err = document.getElementById("redeemCodeError");
  const wrap = document.getElementById("redeemInputWrap");
  if (!inp) return;

  if (wrap) wrap.classList.remove("error", "success");
  if (err) { err.style.display = "none"; err.textContent = ""; }

  try {
    redeemCodeApply(inp.value);
    if (wrap) {
      wrap.classList.add("success");
      setTimeout(() => { wrap.classList.remove("success"); }, 550);
    }
    closeRedeemCodeModal();
  } catch (e) {
    const msg = (e && e.message) ? e.message : "Invalid code ❌";
    if (wrap) wrap.classList.add("error");
    if (err) {
      err.textContent = msg;
      err.style.display = "block";
    } else {
      alert(msg);
    }
    try { inp.focus(); inp.select(); } catch(_) {}
  }
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
    if (c.id === "relicbornTitan") return false;
    if (c.id === "awakenedMonster") return !!(state && state.missions && state.missions.omniDefeated);

    // ✅ Hard safety gate: While Mission 1 is still active, NEVER show late-game secret enemies.
    // This prevents gallery/battle from leaking Entity/Awakened Monster due to corrupted mission flags
    // or old saves.
    const mission1Active = !isMission6Complete();
    if (mission1Active && c.id === "relicbornTitan") return false;
    if (mission1Active && c.id === "awakenedMonster") return !!(state && state.missions && state.missions.omniDefeated);

    // ✅ Mission-gated cards must NOT appear in Gallery/Battle unless their mission gate is satisfied.
    // Even if a player somehow owns the card early (old saves / lucky edge cases), keep it hidden
    // until the correct mission unlock flag is set.
    const owned = !!(state.owned && state.owned[c.id]);

    // Mission-locked enemies / rewards
    if (c.id === "cosmoSecret") {
      // Mission 1 reward: Cosmo Secret only appears once unlocked via 50 win streak.
      return isMission6Complete();
    }
    if (c.id === "rayBill") {
      // Mission 2 reward: only visible after defeating Cosmo Secret (and actually owning it).
      return owned && isMission7Complete();
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

    // ✅ Keep unknown/new mission fields from being dropped across versions.
    // Then we harden the important ones with type-safe parsing below.
    try { Object.assign(state.missions, m); } catch (e) {}

    state.missions.totalDefeats = Math.max(0, Number(m.totalDefeats || state.missions.totalDefeats || 0) || 0);

    // NEW Missions 1–5
    state.missions.m1FirstWin = !!(m.m1FirstWin ?? state.missions.m1FirstWin);
    state.missions.m2ReachedStage5 = !!(m.m2ReachedStage5 ?? state.missions.m2ReachedStage5);
    state.missions.m3UsedPotion = !!(m.m3UsedPotion ?? state.missions.m3UsedPotion);
    state.missions.m4BoughtRelic = !!(m.m4BoughtRelic ?? state.missions.m4BoughtRelic);
    state.missions.m5DuelWin = !!(m.m5DuelWin ?? state.missions.m5DuelWin);

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

    // ✅ New Missions 1–5
    state.missions.m1FirstWin = !!(m.m1FirstWin ?? state.missions.m1FirstWin);
    state.missions.m2ReachedStage5 = !!(m.m2ReachedStage5 ?? state.missions.m2ReachedStage5);
    state.missions.m3UsedPotion = !!(m.m3UsedPotion ?? state.missions.m3UsedPotion);
    state.missions.m4BoughtRelic = !!(m.m4BoughtRelic ?? state.missions.m4BoughtRelic);
    state.missions.m5DuelWin = !!(m.m5DuelWin ?? state.missions.m5DuelWin);

    // ✅ Story Mode Phase 2 unlock: persist Omni (Story Boss) defeat
    // Older saves may not have this flag yet.
    state.missions.omniDefeated = !!(m.omniDefeated ?? state.missions.omniDefeated ?? false);

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
    state.skinId = String(p.skinId || "default");
    state.auraId = String(p.auraId || "none");
    state.backgroundId = String(p.backgroundId || "nebula");
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
    skinId: String(state.skinId || "default"),
    auraId: String(state.auraId || "none"),
    backgroundId: String(state.backgroundId || "nebula"),
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
  const skinGrid = document.getElementById("skinGrid");
  const auraGrid = document.getElementById("auraGrid");
  const bgGrid = document.getElementById("bgGrid");

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
  if (skinGrid) {
    skinGrid.innerHTML = "";
    SKINS.forEach((s) => {
      const unlocked = isRankAtLeast(s.unlockRank);
      const btn = document.createElement("button");
      btn.className = `cosItem ${unlocked ? "" : "locked"} ${(state.skinId === s.id) ? "selected" : ""}`;
      const swatch = s.id === "default" ? `<div class="cosFrameSwatch frameDefaultSwatch"></div>` : `<div class="cosFrameSwatch" style="background: rgba(255,255,255,.05);"></div>`;
      btn.innerHTML = `${swatch}<div class="cosLabel">${s.unlockRank}</div>`;
      btn.title = unlocked ? `Select: ${s.label}` : `Locked • Rank ${s.unlockRank}`;
      btn.addEventListener("click", () => {
        if (!unlocked) return;
        state.skinId = s.id;
        // keep profile mirror
        if (!state.profile) state.profile = {};
        state.profile.skinId = s.id;
        saveProgress();
        renderProfileUI();
      });
      skinGrid.appendChild(btn);
    });
  }

  if (auraGrid) {
    auraGrid.innerHTML = "";
    AURAS.forEach((a) => {
      const unlocked = isRankAtLeast(a.unlockRank);
      const btn = document.createElement("button");
      btn.className = `cosItem ${unlocked ? "" : "locked"} ${(state.auraId === a.id) ? "selected" : ""}`;
      const swatch = a.id === "none" ? `<div class="cosFrameSwatch frameDefaultSwatch"></div>` : `<div class="cosFrameSwatch" style="background: rgba(255,255,255,.08);"></div>`;
      btn.innerHTML = `${swatch}<div class="cosLabel">${a.unlockRank}</div>`;
      btn.title = unlocked ? `Select: ${a.label}` : `Locked • Rank ${a.unlockRank}`;
      btn.addEventListener("click", () => {
        if (!unlocked) return;
        state.auraId = a.id;
        if (!state.profile) state.profile = {};
        state.profile.auraId = a.id;
        saveProgress();
        renderProfileUI();
      });
      auraGrid.appendChild(btn);
    });
  }

if (bgGrid) {
  bgGrid.innerHTML = "";
  BACKGROUNDS.forEach((bg) => {
    const unlocked = isRankAtLeast(bg.unlockRank);
    const selected = (state.backgroundId || (state.profile && state.profile.backgroundId) || "nebula") === bg.id;
    const btn = document.createElement("button");
    btn.className = `cosItem ${unlocked ? "" : "locked"} ${selected ? "selected" : ""}`;
    btn.innerHTML = `<div class="cosBgPreview" style="background-image:url('${bg.url}')"></div><div class="cosLabel">${bg.unlockRank}</div>`;
    btn.title = unlocked ? `Select: ${bg.label}` : `Locked • Rank ${bg.unlockRank}`;
    btn.addEventListener("click", () => {
      if (!unlocked) return;
      state.backgroundId = bg.id;
      if (!state.profile) state.profile = {};
      state.profile.backgroundId = bg.id;
      saveProgress();
      renderProfileUI();
      applyArenaBackground();
    });
    bgGrid.appendChild(btn);
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
  const unlockedSkins  = SKINS.filter(s => s.unlockRank === newRank && s.id !== "default").map(s => `Skin unlocked: ${s.label}`);
  const unlockedAuras  = AURAS.filter(a => a.unlockRank === newRank && a.id !== "none").map(a => `Aura unlocked: ${a.label}`);
  const unlockedBgs    = BACKGROUNDS.filter(b => b.unlockRank === newRank).map(b => `Arena unlocked: ${b.label}`);
  const lines = [...unlockedAvatars, ...unlockedFrames, ...unlockedSkins, ...unlockedAuras, ...unlockedBgs];

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
  if (id === "relicbornTitan" && !isMission9Complete()) return false;

  // ✅ Hard gate Cosmic God:
  // - It should only become playable/unlockable after the Story Boss (Omni) is defeated.
  // This makes it behave like an endgame reward instead of a starter/base pick.
  if (id === "cosmicGod" && !(state && state.missions && state.missions.omniDefeated)) return false;
  // base cards are always usable; unlockables require ownership
  const isBase = (BASE_CARDS || []).some((c) => c.id === id);
  const isOwnedUnlock = !!(state.owned && state.owned[id] && UNLOCKABLE_CARD_DEFS && UNLOCKABLE_CARD_DEFS[id]);
  return isBase || isOwnedUnlock;
}

function upgradeCard(cardId) {
  const id = String(cardId || "");
  // ✅ Back-compat: keep this function callable, but route through the new modal flow.
  // (Shop "Upcoming Cards" upgrade buttons now open a modal instead of alert() popups.)
  openCardUpgradeModal(id);
}

// =========================
// ⬆️ CARD UPGRADE MODAL (Shop)
// - replaces alert() popups with a modern, mobile-friendly modal
// =========================
function closeCardUpgradeModal() {
  const el = document.getElementById("cardUpgradeOverlay");
  if (el) el.remove();
}

function openCardUpgradeModal(cardId) {
  const id = String(cardId || "");
  closeCardUpgradeModal();

  const card = findCardById(id) || (typeof UNLOCKABLE_CARD_DEFS !== "undefined" ? UNLOCKABLE_CARD_DEFS[id] : null);
  const name = (card && card.name) ? card.name : id;

  const lvl = getCardLevel(id);
  const atMax = lvl >= CARD_UPGRADE_MAX_LEVEL;
  const cost = getUpgradeCost(id);
  const canUse = isCardUsableByPlayer(id);
  const canPay = state.gold >= cost;

  const baseStatsOk = !!(card && Number.isFinite(Number(card.atk)) && Number.isFinite(Number(card.def)) && Number.isFinite(Number(card.hp)));
  const before = baseStatsOk ? getUpgradedStats({ ...card, id }) : null;
  const after = baseStatsOk ? (() => {
    // preview next level bonuses
    const nextLvl = Math.min(CARD_UPGRADE_MAX_LEVEL, lvl + 1);
    // Temporarily compute by applying getUpgradedStats with a mocked level
    // without mutating state. We re-use the bonus table by reconstructing.
    const atk0 = Number(card.atk) || 0;
    const def0 = Number(card.def) || 0;
    const hp0  = Number(card.hp)  || 0;
    const bonusTable = {
      0: { atk: 0,  def: 0,  hp: 0  },
      1: { atk: 5,  def: 5,  hp: 5  },
      2: { atk: 10, def: 10, hp: 10 },
      3: { atk: 12, def: 12, hp: 12 },
      4: { atk: 15, def: 15, hp: 15 },
      5: { atk: 20, def: 20, hp: 20 },
    };
    const b = bonusTable[nextLvl] || bonusTable[0];
    return { atk: atk0 + b.atk, def: def0 + b.def, hp: hp0 + b.hp, level: nextLvl };
  })() : null;

  const overlay = document.createElement("div");
  overlay.className = "modalOverlay";
  overlay.id = "cardUpgradeOverlay";

  const box = document.createElement("div");
  box.className = "modalBox upgradeModalBox";

  const title = atMax ? "⬆️ Upgrade (MAX)" : "⬆️ Upgrade Card";

  // Helpful status text
  let statusText = "";
  if (!canUse) statusText = "You can only upgrade cards you can use.";
  else if (atMax) statusText = "This card is already at maximum level.";
  else if (!canPay) statusText = `Not enough gold. Need ${cost}g.`;
  else statusText = `Spend ${cost} gold to upgrade to Lv ${lvl + 1}.`;

  box.innerHTML = `
    <div class="modalHeader">
      <div>
        <div class="modalTitle">${title}</div>
        <div class="modalPill">${name}</div>
      </div>
      <button class="btn btnGhost" id="btnUpgradeClose" aria-label="Close">✖</button>
    </div>
    <div class="modalBody">
      <div class="upgradeHero">
        <div class="upgradeCardFrame">
          ${card && card.img ? `<img class="upgradeCardImg" src="${card.img}" alt="${name}" onerror="this.onerror=null;this.src=window.__cardPlaceholder('${String(name).replace(/'/g, "\\'")}')"/>` : ""}
        </div>
        <div class="upgradeHeroRight">
          <div class="upgradeMetaRow">
            <span class="badge">Lv ${lvl}/${CARD_UPGRADE_MAX_LEVEL}</span>
            <span class="badge">Cost: ${cost}g</span>
            <span class="badge">Gold: ${state.gold}</span>
          </div>
          <div class="upgradeStatus" id="upgradeStatus">${statusText}</div>
        </div>
      </div>

      ${before && after ? `
        <div class="upgradeCompare" aria-label="Upgrade comparison">
          <div class="upgradeCol">
            <div class="upgradeColTitle">Current</div>
            <div class="upgradeStat">ATK <b>${before.atk}</b></div>
            <div class="upgradeStat">DEF <b>${before.def}</b></div>
            <div class="upgradeStat">HP <b>${before.hp}</b></div>
          </div>
          <div class="upgradeArrow" aria-hidden="true">➜</div>
          <div class="upgradeCol">
            <div class="upgradeColTitle">After</div>
            <div class="upgradeStat">ATK <b>${after.atk}</b></div>
            <div class="upgradeStat">DEF <b>${after.def}</b></div>
            <div class="upgradeStat">HP <b>${after.hp}</b></div>
          </div>
        </div>
      ` : ""}
    </div>
    <div class="modalActions">
      <button class="btn btnGhost big" id="btnUpgradeCancel">Cancel</button>
      <button class="btn btnPrimary big" id="btnUpgradeConfirm" ${(!canUse || atMax || !canPay) ? "disabled" : ""}>
        ${atMax ? "MAX" : `Upgrade (+1 Lv)`}
      </button>
    </div>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // cinematic entrance (re-uses existing modal animation but adds a class)
  try { box.classList.add("upgradeEnter"); } catch (e) {}

  const close = () => closeCardUpgradeModal();
  const closeBtn = box.querySelector("#btnUpgradeClose");
  const cancelBtn = box.querySelector("#btnUpgradeCancel");
  if (closeBtn) closeBtn.addEventListener("click", close);
  if (cancelBtn) cancelBtn.addEventListener("click", close);

  // close when tapping backdrop (but not when tapping inside the modal)
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  // escape key
  const onKey = (e) => {
    if (e && e.key === "Escape") {
      document.removeEventListener("keydown", onKey);
      close();
    }
  };
  document.addEventListener("keydown", onKey);

  const confirm = box.querySelector("#btnUpgradeConfirm");
  if (confirm) {
    confirm.addEventListener("click", () => {
      playSfx("sfxClick", 0.45);
      doCardUpgradeCommit(id);
    });
  }
}

function doCardUpgradeCommit(cardId) {
  const id = String(cardId || "");
  const status = document.getElementById("upgradeStatus");
  const setStatus = (txt) => { if (status) status.textContent = txt; };

  if (!isCardUsableByPlayer(id)) {
    setStatus("You can only upgrade cards you can use.");
    return;
  }
  const lvl = getCardLevel(id);
  if (lvl >= CARD_UPGRADE_MAX_LEVEL) {
    setStatus("This card is already at maximum level.");
    return;
  }
  const cost = getUpgradeCost(id);
  if (state.gold < cost) {
    setStatus(`Not enough gold. Need ${cost}g.`);
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
  setStatus(`✅ Upgraded ${card ? card.name : id} to Lv ${lvl + 1}!`);

  // tiny success pulse + auto-close
  const box = document.querySelector("#cardUpgradeOverlay .modalBox");
  if (box) {
    try {
      box.classList.remove("upgradeEnter");
      box.classList.add("upgradeSuccess");
    } catch (e) {}
  }

  setTimeout(() => {
    try { closeCardUpgradeModal(); } catch (e) {}
  }, 650);
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
const SECRETS_ONLY_CARD_IDS = ["siyokou", "relicbornTitan", "diablo", "yrol", "abarskie", "cosmoSecret"]; // Entity, Diablo, Yrol, Abarskie, Cosmo-Secret

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
    const rar = getCardRarity(c.id);
    const rarKey = rar.charAt(0).toUpperCase() + rar.slice(1).toLowerCase();
    tile.innerHTML = `
      <img src="${c.img}" alt="${safeName}" onerror="this.onerror=null;this.src=window.__cardPlaceholder('${safeName.replace(/'/g, "\\'")}')" />
      <div style="margin-top:10px;font-weight:1000;letter-spacing:.2px;">${safeName} <span class='rarityPill rarityInline ${rarityCssClass(getCardRarity(c.id))}'>${getCardRarity(c.id)}</span>${up.level ? ` <span class='pill' style='margin-left:6px;'>Lv${up.level}</span>` : ""}</div>
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
  state.voidCollapse = { level: 0, healMult: 1, armorMult: 1, truePerTurn: 0 };

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

  const hasCosmo = !!state.owned["cosmoSecret"]; // Mission 6 reward
  const hasRayBill = !!state.owned["rayBill"];   // Mission 7 reward

  let mainLine = "";
  let subLine = "";

  // NEW Missions 1–5 (onboarding + variety)
  if (!isMission1Complete()) {
    mainLine = "Mission 1: Win your first battle.";
    subLine = "Status: Defeat any enemy once.";
  } else if (!isMission2Complete()) {
    mainLine = "Mission 2: Reach Stage 5 in a run.";
    subLine = "Status: Keep winning until Stage 5.";
  } else if (!isMission3Complete()) {
    mainLine = "Mission 3: Use any potion in battle.";
    subLine = "Status: Tap 🧪 Potion during your turn.";
  } else if (!isMission4Complete()) {
    mainLine = "Mission 4: Buy any relic from the shop.";
    subLine = "Status: Shop → 🪬 Relics → Buy (then equip it).";
  } else if (!isMission5Complete()) {
    mainLine = "Mission 5: Win a Quick Duel.";
    subLine = "Status: Profile → Quick Duel → Win once.";

  // OLD Missions 1–6 are now Missions 6–11
  } else if (!hasCosmo) {
    // Mission 6 is intentionally a "straight" streak challenge.
    // Do not show a numeric counter on the Home card.
    mainLine = "Mission 6: Defeat 50 cards straight to reveal the Revelation.";
    subLine = "Status: Keep your streak alive — losing resets the path.";
  } else if (!hasRayBill) {
    mainLine = "Mission 7: Defeat Cosmo Revelation to unlock Ray Bill.";
    subLine = state.missions.cosmoRevelationDefeated
      ? "Status: Cosmo Revelation defeated ✅ (Ray Bill unlock may appear)."
      : "Status: Not defeated yet.";
  } else if (!state.missions.diabloDefeated) {
    mainLine = "Mission 8: Defeat Diablo.";
    subLine = "Status: Not defeated yet.";
  } else if (!state.missions.entityDefeated) {
    mainLine = "Mission 9: Defeat Entity itself to proceed to Mission 10.";
    subLine = "Status: Not defeated yet.";
  } else if (!state.missions.awakenMonsterDefeated) {
    mainLine = "Mission 10: Defeat the Awakened Monster.";
    subLine = "Status: Not defeated yet. (Defeat it to unlock Anti-Matter)";
  } else if (!state.missions.antiMatterDefeated) {
    mainLine = "Mission 11: Defeat the Anti-Matter card to unlock the Boss Fight.";
    subLine = "Status: Anti-Matter not defeated yet. (Defeat it to open the portal)";
  } else {
    mainLine = "All Missions Cleared: The portal to Omni is open.";
    subLine = "Status: Mission 11 complete ✅ (Boss Fight unlocked ✅)";
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
// Story Mode now supports phases (Phase 1 + Phase 2 unlocked after Omni is defeated)
const STORY_PROGRESS_KEY = "cb_story_progress_v2";

let __storyIndex = 0;
let __storyPhase = 1; // 1 = original story, 2 = post-Omni Phase 2 (Jargon)
let __storyTyping = false;
let __storyTypeTimer = null;
let __storyFullText = "";
let __storyTyped = 0;

// ✅ Longer + hyped story about the Revelation (Phase 1)
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
];

// =========================
// 📜 STORY MODE — PHASE 2 (Unlocked after defeating Omni)
// =========================
const STORY_PAGES_PHASE2 = [
  {
    title: "📖 LEGEND OF JARGON — “THE CLOCKBREAKER”",
    body:
`No one truly knows what Jargon’s ability is.

Not even the greatest cosmic archives.
Not even the highest gods that once ruled the timelines.

All that exists… are warnings.`
  },
  {
    title: "The Predictor’s Last Sentence",
    body:
`They say a Predictor once tried to calculate Jargon’s power—
a being who can read probability like a book…

But the Predictor only wrote one sentence before vanishing:

“Whoever counters this… won’t have a second chance to live.”`
  },
  {
    title: "⏳ THE RUMOR OF HIS POWER",
    body:
`Some say Jargon doesn’t stop time…

He removes it.

Others claim he can see what you’ll do before your brain even thinks it,
like your future is already open in his hands.

One legend swears:

“He watches tomorrow… while you’re still stuck in now.”`
  },
  {
    title: "Cosmic Living’s Report",
    body:
`Cosmic Living, a forbidden dimension that witnesses all time anomalies,
classified his power as:

✅ Legendary Time-Stopping Ability

But even they admitted something terrifying:

“This is not time-stopping…
it’s something above it.”

Some call it Time Collapse.
Others call it The Final Second.`
  },
  {
    title: "🔥 THE FALL OF OMNI",
    body:
`Long ago, the great ruler known as Omni sealed Jargon away…

Not with chains of iron.
Not with magic.

But with something worse:

The Omni-Sealed Chain

A binding made from laws of existence itself.`
  },
  {
    title: "The Seal Breaks",
    body:
`They believed Jargon was too dangerous to destroy…
because even death might not be able to hold him.

But then…

Omni died.

And the moment Omni’s presence faded from reality…

The Omni-Sealed Chain cracked.

The universe heard it.

Not as a sound…

But as a shiver through every timeline.`
  },
  {
    title: "⚔️ THE ANTI-GOD SWORD",
    body:
`Behind Jargon’s back rests the weapon that ended entire destinies:

The Legendary Anti-God Sword

A blade said to cut more than bodies…

It cuts:

Fate

Souls

Dimensions

Immortality

Reincarnation

even “Plot Armor” like it’s nothing`
  },
  {
    title: "The Blade’s Truth",
    body:
`They say the sword doesn’t kill you…

It makes it so you were never meant to survive.`
  },
  {
    title: "🌌 THE MULTIVERSE HUNTER",
    body:
`Now that he’s free…

Jargon isn’t hiding.
He isn’t running.

He’s marching.

One universe at a time.

One god at a time.

One timeline at a time.`
  },
  {
    title: "When He Arrives…",
    body:
`And the scariest part?

He doesn’t conquer with armies.

He conquers with presence.

Because when Jargon arrives…

Clocks stop ticking…

Stars shake…

and reality feels like it’s holding its breath.`
  },
  {
    title: "👁️ THE FEAR BEFORE OMNI",
    body:
`There was a time before Omni ruled.

Back then, the multiverse wasn’t scared of war…
it was scared of one name.

JARGON.

The one who breaks time.
The one who carries the Anti-God Sword.
The one whose true ability is still marked as…

UNKNOWN.`
  },
  {
    title: "The Survivors Agree",
    body:
`But the survivors all agree on one thing:

✅ If you see him… it’s already too late.`
  },
  {
    title: "Phase 2: Teaser",
    body:
`A new chapter will open soon.

Until then… the clock is still breaking.`
  }
];

function loadStoryProgress() {
  try {
    const raw = storageGet(STORY_PROGRESS_KEY);
    if (!raw) return { phase: 1, index: 0 };
    const parsed = JSON.parse(raw);
    const phase = (parsed && Number(parsed.phase) === 2) ? 2 : 1;
    const idx = Math.max(0, Math.floor(Number(parsed && parsed.index) || 0));
    return { phase, index: idx };
  } catch (e) {
    return { phase: 1, index: 0 };
  }
}

function saveStoryProgress() {
  try {
    storageSet(STORY_PROGRESS_KEY, JSON.stringify({ phase: __storyPhase, index: __storyIndex }));
  } catch (e) {}
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
  const saved = loadStoryProgress();
  const omniDefeated = !!(state && state.missions && state.missions.omniDefeated);

  __storyPhase = (omniDefeated && saved && Number(saved.phase) === 2) ? 2 : 1;
  __storyIndex = Math.max(0, Math.floor(Number(saved && saved.index) || 0));

  // Clamp index by phase length
  const pages = (__storyPhase === 2) ? STORY_PAGES_PHASE2 : STORY_PAGES;
  __storyIndex = Math.min(pages.length - 1, __storyIndex);

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
  const pages = (__storyPhase === 2) ? STORY_PAGES_PHASE2 : STORY_PAGES;
  const p = pages[Math.max(0, Math.min(pages.length - 1, __storyIndex))];
  const pill = document.getElementById("storyPagePill");
  const title = document.getElementById("storyTitle");
  const body = document.getElementById("storyBody");
  const img = document.getElementById("storyImg");
  const boss = document.getElementById("storyBossWrap");
  const bossSub = document.getElementById("storyBossSub");
  const bossTag = document.getElementById("storyBossTag");
  const bossTitle = document.getElementById("storyBossTitle");
  const bossImg = document.getElementById("storyBossImg");
  const fightBtn = document.getElementById("btnFightBossNow");
  const subtitle = document.getElementById("storySubtitle");

  if (pill) pill.textContent = `Phase ${__storyPhase} • Page ${__storyIndex + 1} / ${pages.length}`;
  if (title) title.textContent = p?.title || "";
  if (subtitle) {
    subtitle.textContent = (__storyPhase === 2)
      ? "After Omni’s fall… a new legend stirs beyond the broken seconds."
      : "The origin of Cosmo… and why the universe fights for glory.";
  }

  // 🖼️ Phase 1 page images (requested: story/p1p1 ... story/p1p12)
  if (img) {
    img.style.display = "none";
    img.src = "";

    if (__storyPhase === 1) {
      const n = (__storyIndex + 1);
      if (n >= 1 && n <= 12) {
        img.src = `story/p1p${n}.png`;
        img.style.display = "block";
      }
    }
  }

  const text = p?.body || "";
  if (body) {
    if (animateTyping) storyTypeText(text);
    else body.textContent = text;
  }

  const prev = document.getElementById("btnStoryPrev");
  const next = document.getElementById("btnStoryNext");
  if (prev) prev.disabled = (__storyPhase === 1 && __storyIndex <= 0);

  if (next) {
    const atEnd = __storyIndex >= pages.length - 1;
    const omniDefeated = !!(state && state.missions && state.missions.omniDefeated);
    const canAdvanceToP2 = (__storyPhase === 1 && atEnd && omniDefeated);
    next.textContent = canAdvanceToP2 ? "Phase 2 ➡️" : (atEnd ? "⚔️ Coming Soon" : "Next ➡️");
  }

  // Portal panel behavior differs per phase
  const atEnd = (__storyIndex >= pages.length - 1);
  if (boss) boss.style.display = atEnd ? "block" : "none";

  // Reset optional image each render
  if (bossImg) {
    bossImg.style.display = "none";
    bossImg.src = "";
  }

  if (atEnd) {
    if (__storyPhase === 1) {
      // Boss unlock gate: Mission 11 must be cleared
      const unlocked = !!(state && state.missions && state.missions.antiMatterDefeated);
      if (fightBtn) {
        fightBtn.disabled = !unlocked;
        fightBtn.textContent = "⚔️ Fight Boss Now";
        fightBtn.classList.remove("btnSoft");
        fightBtn.classList.add("btnPrimary");
      }
      if (bossTag) bossTag.textContent = "⚔️ BOSS FIGHT";
      if (bossTitle) bossTitle.textContent = "GOD OF ALL GODS";
      if (bossSub) bossSub.textContent = unlocked
        ? "The portal is open. Omni is waiting."
        : "Complete Mission 11 to unlock";
    } else {
      // Phase 2: show Jargon card teaser + Coming Soon button
      if (bossTag) bossTag.textContent = "📌 TEASER";
      if (bossTitle) bossTitle.textContent = "JARGON";
      if (bossSub) bossSub.textContent = "Coming soon";
      if (bossImg) {
        bossImg.src = "cards/jargon.png";
        bossImg.style.display = "block";
      }
      if (fightBtn) {
        fightBtn.disabled = true;
        fightBtn.textContent = "⏳ Coming soon";
      }
    }
  }

  saveStoryProgress();
}

function storyPrev() {
  if (__storyTyping) { storyFinishTyping(); return; }
  if (__storyPhase === 2 && __storyIndex <= 0) {
    __storyPhase = 1;
    __storyIndex = STORY_PAGES.length - 1;
  } else {
    __storyIndex = Math.max(0, __storyIndex - 1);
  }
  renderStoryPage(true);
}

function storyNext() {
  if (__storyTyping) { storyFinishTyping(); return; }

  const pages = (__storyPhase === 2) ? STORY_PAGES_PHASE2 : STORY_PAGES;
  const atEnd = (__storyIndex >= pages.length - 1);

  // ✅ Phase 2 end: go back to Phase 1 last page (so "Back to Phase 1" works every time).
  if (__storyPhase === 2 && atEnd) {
    __storyPhase = 1;
    __storyIndex = STORY_PAGES.length - 1;
    renderStoryPage(true);
    return;
  }

  // Phase 1 -> Phase 2 handoff (only after Omni is defeated)
  if (__storyPhase === 1 && atEnd) {
    const omniDefeated = !!(state && state.missions && state.missions.omniDefeated);
    if (omniDefeated) {
      __storyPhase = 2;
      __storyIndex = 0;
      renderStoryPage(true);
      return;
    }
    // Final page: stay here. The boss button becomes available once Mission 11 is cleared.
    try { renderStoryPage(false); } catch(e) {}
    return;
  }

  if (atEnd) {
    try { renderStoryPage(false); } catch(e) {}
    return;
  }

  __storyIndex = Math.min(pages.length - 1, __storyIndex + 1);
  renderStoryPage(true);
}

// =========================
// FIGHTER
// =========================
function cloneCard(card) {
  const st0 = (typeof getUpgradedStats === 'function') ? getUpgradedStats(card) : { atk: card.atk, def: card.def, hp: card.hp, level: 0 };

  // ✅ Safety: prevent "unstable" stat glitches (NaN / negative / weird floats)
  const clampInt = (v, lo, hi) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return lo;
    const x = Math.floor(n);
    return Math.max(lo, Math.min(hi, x));
  };

  const st = {
    atk: clampInt(st0.atk, 0, 999),
    def: clampInt(st0.def, 0, 999),
    hp:  clampInt(st0.hp,  1, 9999),
    level: clampInt(st0.level || 0, 0, 999)
  };
  return {
    uid: (__CARD_UID++),
    id: card.id,
    name: card.name,
    img: card.img,
    rarity: getCardRarity(card.id),
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

// =========================
// ❌ COMBAT FEED (REMOVED)
// The on-screen "combat feed" overlay was removed because it was annoying.
// Keep these no-op stubs so older calls don't crash the battle.
// =========================
function combatFeedClear(){ /* removed */ }
function combatFeedAdd(){ /* removed */ }

function log(msg, cls = "", meta = null) {
  // Battle log (scrolling history)
  const logEl = $("log");
  if (logEl){
    const el = document.createElement("p");
    if (cls) el.className = cls;
    el.textContent = msg;
    logEl.appendChild(el);
    // ✅ Performance: keep log DOM from growing forever (lag fix)
    while (logEl.children.length > 220){
      try { logEl.removeChild(logEl.firstElementChild); } catch(e){ break; }
    }
    logEl.scrollTop = logEl.scrollHeight;
  }
  // On-screen combat feed removed.
}

// =========================
// ✅ BATTLE RECOVERY (anti-freeze)
// If any action throws during battle, we restore player control so the game
// doesn't soft-lock with disabled buttons.
// =========================
function battleRecoverFromError(err) {
  try {
    if (state && state.phase === "battle") {
      state.turn = "player";
      if (state.modalAction) state.modalAction = null;
    }
    try {
      const msg = (err && err.message) ? err.message : String(err);
      log(`⚠️ An action errored and was recovered. You can continue your turn. (${msg})`, "warn");
    } catch (e) {}
    try { updateUI(); } catch (e) {}
  } catch (e) {
    // last resort: just re-enable buttons
    try {
      const a = document.getElementById("btnAttack");
      const s = document.getElementById("btnSkill");
      const ebtn = document.getElementById("btnEnd");
      const p = document.getElementById("btnPotion");
      [a, s, ebtn, p].forEach((b) => { if (b) b.disabled = false; });
    } catch (e2) {}
  }
}

// =========================
// 🎮 PVP (Local 2-player on one device)
// - Modes: 1v1 / 2v2 / 5v5
// - Manual Tag-In (team modes)
// - Shared match timer + per-turn countdown (pressure mode)
// =========================

// =========================
// 🧪 PVP POTIONS + 🗿 RELICS (local split-screen)
// - Potions are PRE-SELECTED in PVP setup (no shop/inventory needed)
// - Each player has their OWN cooldown + limited uses
// - Relics are passive "mini perks" chosen in setup
// =========================
// =========================
// 🎮 PVP LOADOUT POOLS (Shop-only)
// - Relics: ONLY from RELICS (Shop → 🪬 Relics) and only if owned
// - Potions: ONLY from POTIONS (Shop → 🧪 Potions) and only if owned
// =========================

function pvpOwnedRelicsList(){
  const owned = (window.state && window.state.ownedRelics) ? window.state.ownedRelics : {};
  const list = (Array.isArray(RELICS) ? RELICS : []).filter(r => owned && owned[r.id]);
  // allow "None"
  return [{ id:"none", name:"None", price:0, desc:"No relic equipped (PVP)." }, ...list];
}

function pvpOwnedPotionsList(){
  const list = (Array.isArray(POTIONS) ? POTIONS : []).filter(p => getPotionCount(p.id) > 0);
  return [{ id:"none", name:"None", price:0, desc:"No potion.", effect:"none" }, ...list];
}

// ✅ PVP Loadout: everything unlocked (but still only from the Shop lists)
// - Relics/Potions are NOT consumed / not gated by inventory for PVP.
// - Players choose freely from the same RELICS/POTIONS arrays used by the Shop.
function pvpAllRelicsList(){
  const list = (Array.isArray(RELICS) ? RELICS : []);
  return [{ id:"none", name:"None", price:0, desc:"No relic equipped (PVP)." }, ...list];
}
function pvpAllPotionsList(){
  const list = (Array.isArray(POTIONS) ? POTIONS : []);
  return [{ id:"none", name:"None", price:0, desc:"No potion.", effect:"none" }, ...list];
}

function pvpGetPotionDef(id){
  const pid = String(id||"none");
  const found = (Array.isArray(POTIONS) ? POTIONS : []).find(p=>p.id===pid);
  if (found) return { ...found, icon: found.icon || "🧪" };
    return { id:"none", name:"None", desc:"No potion.", effect:"none", cooldownTurns: 0, icon:"🧪" };
}

function pvpGetRelicDef(id){
  const rid = String(id||"none");
  const found = (Array.isArray(RELICS) ? RELICS : []).find(r=>r.id===rid);
  if (found) return { ...found, icon: found.icon || "🪬" };
    return { id:"none", name:"None", desc:"No relic equipped (PVP).", icon:"🪬" };
}

function isPvpActive() {

  return !!(state && state.pvp && state.pvp.active);
}

function getPvpTeamSize() {
  return Math.max(1, Number(state?.pvp?.teamSize || 1) || 1);
}

function pvpEnsureBenchStrips() {
  const pCard = document.getElementById("playerCard");
  const eCard = document.getElementById("enemyCard");
  if (pCard && !document.getElementById("pvpBenchP1")) {
    const b = document.createElement("div");
    b.id = "pvpBenchP1";
    b.className = "pvpBench";
    pCard.appendChild(b);
  }
  if (eCard && !document.getElementById("pvpBenchP2")) {
    const b = document.createElement("div");
    b.id = "pvpBenchP2";
    b.className = "pvpBench";
    eCard.appendChild(b);
  }
}

function pvpRenderBench() {
  if (!isPvpActive()) return;
  pvpEnsureBenchStrips();
  const p1Wrap = document.getElementById("pvpBenchP1");
  const p2Wrap = document.getElementById("pvpBenchP2");
  if (!p1Wrap || !p2Wrap) return;

  const t1 = state.pvp.p1Team || [];
  const t2 = state.pvp.p2Team || [];

  const render = (wrap, team, activeIdx) => {
    wrap.innerHTML = "";
    if ((team || []).length <= 1) return;
    team.forEach((f, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pvpBenchBtn" + (i === activeIdx ? " active" : "") + (Number(f.hp || 0) <= 0 ? " dead" : "");
      btn.title = `${f.name} (${Math.max(0, Number(f.hp || 0))}/${f.maxHp})`;
      btn.innerHTML = `<img src="${f.img}" alt="${f.name}"/>`;
      wrap.appendChild(btn);
    });
  };

  render(p1Wrap, t1, Number(state.pvp.p1Active || 0) || 0);
  render(p2Wrap, t2, Number(state.pvp.p2Active || 0) || 0);
}

function pvpSetControlsVisible(on) {
  const pveDock = document.getElementById("pveDock");
  const p1Dock = document.getElementById("p1Dock");
  const p2Dock = document.getElementById("p2Dock");
  // PVE dock is hidden during PVP; PVP docks are shown.
  if (pveDock) pveDock.style.display = on ? "none" : "";
  if (p1Dock) p1Dock.style.display = on ? "" : "none";
  if (p2Dock) p2Dock.style.display = on ? "" : "none";
}

function pvpSetTopPills() {
  // Reuse existing pills if present; create missing ones safely.
  const row = document.querySelector(".gameTopLeft .titleRow");
  if (!row) return;

  const ensurePill = (id, label) => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("span");
      el.className = "pill";
      el.id = id;
      el.textContent = label;
      row.appendChild(el);
    }
    return el;
  };

  ensurePill("pvpModePill", "PVP: —");
  ensurePill("pvpMatchTimerPill", "⏱️ Match: 00:00");
  ensurePill("pvpTurnTimerPill", "⏳ Turn: —");
}

function fmtMMSS(ms) {
  ms = Math.max(0, Number(ms || 0) || 0);
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
}

function pvpTickTimers() {
  if (!isPvpActive()) return;

  const now = Date.now();
  const matchMs = now - (Number(state.pvp.matchStart || now) || now);
  const matchPill = document.getElementById("pvpMatchTimerPill");
  if (matchPill) matchPill.textContent = `⏱️ Match: ${fmtMMSS(matchMs)}`;

  const turnPill = document.getElementById("pvpTurnTimerPill");
  const remaining = (Number(state.pvp.turnEndsAt || 0) || 0) - now;
  if (turnPill) turnPill.textContent = `⏳ Turn: ${fmtMMSS(remaining)}`;

  // Auto-end turn when timer hits 0 (pressure mode)
  if (state.pvp.pressure && remaining <= 0) {
    // avoid double-trigger
    state.pvp.turnEndsAt = now + 999999;
    if (state.turn === "player") pvpEnd("p1", { auto:true });
    else pvpEnd("p2", { auto:true });
  }
}

function pvpResetTurnTimer() {
  if (!isPvpActive()) return;
  const sec = Math.max(5, Number(state.pvp.turnSeconds || 20) || 20);
  state.pvp.turnEndsAt = Date.now() + sec * 1000;
}

function pvpSetModeLabel() {
  const pill = document.getElementById("pvpModePill");
  if (!pill) return;
  const n = getPvpTeamSize();
  pill.textContent = `PVP: ${n}v${n}` + (state.pvp.pressure ? " • Pressure" : "");
}

function pvpStartTicker() {
  if (window.__pvpTicker) clearInterval(window.__pvpTicker);
  window.__pvpTicker = setInterval(() => {
    try { pvpTickTimers(); } catch(e) {}
  }, 250);
}

function pvpStopTicker() {
  if (window.__pvpTicker) clearInterval(window.__pvpTicker);
  window.__pvpTicker = null;
}

function pvpNormalizeFighter(f) {
  // Safety for weird saves / upgrades
  if (!f) return f;
  f.hp = Math.max(0, Number(f.hp || 0) || 0);
  f.maxHp = Math.max(1, Number(f.maxHp || 1) || 1);
  f.shield = Math.max(0, Number(f.shield || 0) || 0);
  f.def = Math.max(0, Number(f.def || f.shield || 0) || 0);
  return f;
}

function pvpStartMatch({ teamSize, p1CardIds, p2CardIds, pressure, turnSeconds }) {
  const pool = getAllCards();

  const pickById = (id) => pool.find((c) => c.id === id) || BASE_CARDS.find((c) => c.id === id) || UNLOCKABLE_CARD_DEFS[id];
  const buildTeam = (ids) => (ids || []).map((id) => cloneCard(pickById(id))).filter(Boolean);

  const p1Team = buildTeam(p1CardIds);
  const p2Team = buildTeam(p2CardIds);

  // Fallback so it never crashes
  if (p1Team.length < 1) p1Team.push(cloneCard(pool[0]));
  if (p2Team.length < 1) p2Team.push(cloneCard(pool[Math.min(1, pool.length-1)] || pool[0]));

  state.pvp = {
    active: true,
    teamSize: Math.max(1, Number(teamSize || 1) || 1),
    pressure: !!pressure,
    turnSeconds: Math.max(5, Number(turnSeconds || 20) || 20),
    matchStart: Date.now(),
    turnEndsAt: Date.now(),
    p1Team,
    p2Team,
    p1Active: 0,
    p2Active: 0
  };

  // Save base PVP config for Rematch (full loadout is saved by the setup modal / config rematch)
  state.pvpLastConfig = state.pvpLastConfig && typeof state.pvpLastConfig === "object"
    ? Object.assign({}, state.pvpLastConfig, {
        teamSize: state.pvp.teamSize,
        p1CardIds: (p1CardIds || []).slice(),
        p2CardIds: (p2CardIds || []).slice(),
        pressure: !!pressure,
        turnSeconds: Number(turnSeconds || state.pvp.turnSeconds || 20) || 20
      })
    : {
        teamSize: state.pvp.teamSize,
        p1CardIds: (p1CardIds || []).slice(),
        p2CardIds: (p2CardIds || []).slice(),
        pressure: !!pressure,
        turnSeconds: Number(turnSeconds || state.pvp.turnSeconds || 20) || 20
      };

  // Core battle state (reuses existing UI rendering)
  state.phase = "battle";
  state.turn = "player";
  state.round = 1;
  state.stage = 1;
  state.stageLabel = "PVP";

  // Reset anti-infinite systems for a fresh PVP match
  state.voidCollapse = null;
  state._fatigueWarned = false;
  state._fatigueOverload = false;

  state.player = p1Team[0];
  state.enemy = p2Team[0];

  // PVP should not show "Enemy AI" / passive meta
  state.enemy.aiType = "PVP";
  state.enemy.passiveChance = 0;

  // Clear log
  try { const l = document.getElementById("log"); if (l) l.innerHTML = ""; } catch(e) {}

  log(`🎮 PVP started: ${state.pvp.teamSize}v${state.pvp.teamSize}${state.pvp.pressure ? " (Pressure Mode)" : ""}.`, "good");
  log(`Player 1: ${state.player.name} vs Player 2: ${state.enemy.name}`, "warn");

  pvpSetControlsVisible(true);
  pvpSetTopPills();
  pvpSetModeLabel();
  pvpResetTurnTimer();
  pvpStartTicker();
  pvpRenderBench();

  updateUI();
}

function pvpAnyAlive(team) {
  return (team || []).some((f) => Number(f.hp || 0) > 0);
}
function pvpNextAliveIndex(team, fromIdx) {
  const n = (team || []).length;
  if (n <= 0) return -1;
  let i = (Number(fromIdx || 0) || 0) % n;
  for (let step=0; step<n; step++) {
    const idx = (i + step) % n;
    const f = team[idx];
    if (f && Number(f.hp || 0) > 0) return idx;
  }
  return -1;
}

function pvpSetActive(side, idx) {
  if (!isPvpActive()) return false;
  const s = String(side || "");
  if (s === "p1") {
    const team = state.pvp.p1Team;
    if (!team || !team[idx]) return false;
    if (Number(team[idx].hp || 0) <= 0) return false;
    state.pvp.p1Active = idx;
    state.player = team[idx];
    log(`🔁 Player 1 tags in: ${state.player.name}`, "good");
  } else {
    const team = state.pvp.p2Team;
    if (!team || !team[idx]) return false;
    if (Number(team[idx].hp || 0) <= 0) return false;
    state.pvp.p2Active = idx;
    state.enemy = team[idx];
    log(`🔁 Player 2 tags in: ${state.enemy.name}`, "bad");
  }

  // 2-turn swap cooldown (per player)
  if (s === "p1") state.pvp.p1SwapCd = 2;
  else state.pvp.p2SwapCd = 2;

  pvpRenderBench();
  updateUI();
  return true;
}

function pvpOpenTagMenu(side) {
  if (!isPvpActive()) return;
  const s = String(side || "");
  const isP1 = s === "p1";

  // cooldown gate
  const cd = isP1 ? (Number(state.pvp.p1SwapCd||0)||0) : (Number(state.pvp.p2SwapCd||0)||0);
  if (cd>0){
    log(`⏳ Swap is on cooldown: ${cd} turn(s).`, "warn");
    return;
  }
  const team = isP1 ? (state.pvp.p1Team || []) : (state.pvp.p2Team || []);
  const active = isP1 ? (Number(state.pvp.p1Active || 0) || 0) : (Number(state.pvp.p2Active || 0) || 0);

  const options = team
    .map((f, i) => ({ f, i }))
    .filter((x) => x.i !== active && x.f && Number(x.f.hp || 0) > 0);

  if (options.length === 0) {
    log(`No available tag-in targets.`, "warn");
    return;
  }

  // Simple modal overlay
  const overlay = document.createElement("div");
  overlay.className = "modalOverlay";
  overlay.id = "pvpTagModal";
  overlay.innerHTML = `
    <div class="modalBox">
      <div class="modalHeader">
        <div>
          <div class="modalTitle">🔁 Tag-In</div>
          <div class="modalPill">${isP1 ? "Player 1" : "Player 2"} choose who enters</div>
        </div>
        <button class="btn btnSoft" id="pvpTagClose">✖</button>
      </div>
      <div class="modalBody">
        <div class="pvpSelectGrid" id="pvpTagGrid"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const grid = overlay.querySelector("#pvpTagGrid");
  options.forEach(({ f, i }) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "cardPick";
    card.innerHTML = `
      <img src="${f.img}" alt="${f.name}">
      <div class="cardMeta">
        <div style="font-weight:1000;">${f.name}</div>
        <div class="muted" style="margin-top:4px;">HP ${f.hp}/${f.maxHp} • ATK ${f.atk} • DEF ${f.def}</div>
      </div>
    `;
    card.onclick = () => {
      try { overlay.remove(); } catch(e) {}
      pvpSetActive(isP1 ? "p1" : "p2", i);
      pvpResetTurnTimer();
    };
    grid.appendChild(card);
  });

  overlay.querySelector("#pvpTagClose").onclick = () => { try { overlay.remove(); } catch(e) {} };
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
}

function pvpBasicAttack(attacker, defender, attackerSide) {
  attacker = pvpNormalizeFighter(attacker);
  defender = pvpNormalizeFighter(defender);
  if (!attacker || !defender) return;

  if (attacker.frozen > 0) {
    log(`${attacker.name} is frozen and cannot act!`, "warn");
    pvpEnd(attackerSide, { auto:true, reason:"frozen" });
    return;
  }
  if (attacker.stun2Rounds > 0) {
    log(`${attacker.name} is stunned and cannot act!`, "warn");
    pvpEnd(attackerSide, { auto:true, reason:"stunned" });
    return;
  }

  const dmg = dmgCalc(attacker);
  log(`${attacker.name} attacks for ${dmg} damage!`, attackerSide === "p1" ? "good" : "bad");
  playSfx("sfxAttack", 0.75);

  spawnAttackFx(attackerSide === "p1" ? "player" : "enemy", attackerSide === "p1" ? "enemy" : "player");
  applyDamage(defender, dmg, { source: "attack", damageType: "physical", attacker, attackerName: attacker.name });

  // 🪬 PVP relic triggers (shop-only relic IDs)
try { pvpAfterAttackRelics(attackerSide, attacker, defender, dmg); } catch(e) {}

  updateUI();
}

function pvpUseSkill(attacker, defender, attackerSide) {
  attacker = pvpNormalizeFighter(attacker);
  defender = pvpNormalizeFighter(defender);
  if (!attacker || !defender) return;

  if (!isSkillReady(attacker)) {
    log(`${attacker.name}'s skill is on cooldown.`, "warn");
    updateUI();
    return;
  }
  if (attacker.frozen > 0) {
    log(`${attacker.name} is frozen and cannot act!`, "warn");
    pvpEnd(attackerSide, { auto:true, reason:"frozen" });
    return;
  }
  if (attacker.stun2Rounds > 0) {
    log(`${attacker.name}

  // Arena FX
  try { flashArenaOnSkill(); } catch (e) {}
 is stunned and cannot use a skill!`, "warn");
    pvpEnd(attackerSide, { auto:true, reason:"stunned" });
    return;
  }
  if (isSilenced(attacker)) {
    log(`${attacker.name} is Silenced and cannot use a skill!`, "warn");
    updateUI();
    return;
  }

  const res = attacker.base.skill(attacker, defender, state);
  if (res && res.ok) {
    playSfx("sfxSkill", 0.75);
    log(res.msg, attackerSide === "p1" ? "good" : "bad");
    updateUI();
  } else if (res && res.ok === false) {
    log(res.msg || "Skill failed.", "warn");
    updateUI();
  }
}

function pvpResolveTeamDeathIfNeeded() {
  if (!isPvpActive()) return false;

  // Prevent re-entrant death resolution loops (because we delay for dieFlip FX).
  if (state.pvp && state.pvp._deathResolving) return true;

  const t1 = state.pvp.p1Team || [];
  const t2 = state.pvp.p2Team || [];

  // --- 1) Play the SAME die animation used in Battle mode (dieFlip) ---
  // We only want to play it ONCE per fighter death (uid guard), then continue resolution.
  const p1Dead = !!(state.player && Number(state.player.hp || 0) <= 0);
  const p2Dead = !!(state.enemy  && Number(state.enemy.hp  || 0) <= 0);

  const p1Uid = Number(state.player && state.player.uid) || 0;
  const p2Uid = Number(state.enemy  && state.enemy.uid)  || 0;

  // If either side just died and we haven't played the flip for that uid yet, play it then defer.
  if (p1Dead && p1Uid && state.pvp._p1DeadFlipUid !== p1Uid) {
    state.pvp._p1DeadFlipUid = p1Uid;
    state.pvp._deathResolving = true;
    try { cardDieFlip("player"); } catch (e) {}
    // After a short delay, continue resolution (auto tag-in / win check)
    setTimeout(() => {
      try { state.pvp._deathResolving = false; } catch (e) {}
      try { pvpResolveTeamDeathIfNeeded(); } catch (e) {}
      try { updateUI(); } catch (e) {}
    }, 650);
    return true;
  }

  if (p2Dead && p2Uid && state.pvp._p2DeadFlipUid !== p2Uid) {
    state.pvp._p2DeadFlipUid = p2Uid;
    state.pvp._deathResolving = true;
    try { cardDieFlip("enemy"); } catch (e) {}
    setTimeout(() => {
      try { state.pvp._deathResolving = false; } catch (e) {}
      try { pvpResolveTeamDeathIfNeeded(); } catch (e) {}
      try { updateUI(); } catch (e) {}
    }, 650);
    return true;
  }

  // --- 2) After the death flip, auto-tag to the next alive fighter (team modes) ---
  if (p1Dead) {
    const next = pvpNextAliveIndex(t1, Number(state.pvp.p1Active || 0) + 1);
    if (next >= 0) {
      log(`💀 Player 1 fighter fell. Auto tag-in!`, "warn");
      pvpSetActive("p1", next);
      // Ensure the newly tagged fighter doesn't inherit the dead visual state.
      try { resetCardVisuals(); } catch (e) {}
    }
  }

  if (p2Dead) {
    const next = pvpNextAliveIndex(t2, Number(state.pvp.p2Active || 0) + 1);
    if (next >= 0) {
      log(`💀 Player 2 fighter fell. Auto tag-in!`, "warn");
      pvpSetActive("p2", next);
      try { resetCardVisuals(); } catch (e) {}
    }
  }

  // --- 3) If a whole team is dead, end match with a PVP-specific modal action ---
  const p1Alive = pvpAnyAlive(t1);
  const p2Alive = pvpAnyAlive(t2);

  if (!p1Alive || !p2Alive) {
    const winner = p1Alive ? "Player 1" : "Player 2";

    try { pvpStopTicker(); } catch (e) {}
    state.phase = "over";

    // Mark modal action so the result button routes back to PVP setup.
    state.modalAction = "pvp";

    openModal({
      title: `🏆 ${winner} wins!`,
      text: `PVP ${getPvpTeamSize()}v${getPvpTeamSize()} finished.`,
      stageLabel: "PVP",
      hint: "Return to PVP to draft, or Rematch to replay the same teams.",
      goldReward: 0,
      mode: "defeat"
    });

    // Button: Return to PVP (instead of Home / Next Enemy)
    const btnNext = document.getElementById("btnNextEnemy");
    if (btnNext) {
      btnNext.style.display = "";
      btnNext.textContent = "↩ Return to PVP";
    }
    const btnPlay = document.getElementById("btnPlayAgain");
    if (btnPlay) btnPlay.style.display = "none";

    // Rematch button (replays last draft)
    const btnRematch = document.getElementById("btnRematch");
    if (btnRematch) {
      btnRematch.style.display = "inline-block";
      btnRematch.textContent = "🔁 Rematch";
    }

    return true;
  }

  return false;
}

function pvpEnd(side, { auto=false } = {}) {
  if (!isPvpActive()) return;
  const s = String(side || "");
  const attackerSide = s === "p1" ? "p1" : "p2";

  const msg = auto ? "⏳ Time!" : "⏭️ End turn.";
  log(`${msg}`, "warn");

  // Tick statuses for the side ending their turn (reuse existing)
  try {
    if (attackerSide === "p1") tickStatuses(state.player);
    else tickStatuses(state.enemy);
  } catch(e) {}

  if (pvpResolveTeamDeathIfNeeded()) return;

  // Swap turn
  state.turn = (state.turn === "player") ? "enemy" : "player";

  // Round increments on Player 1 turns (keeps existing visuals)
  if (state.turn === "player") {
    state.round = Math.max(1, Number(state.round || 1) || 1) + 1;

    // 🌌 Void Collapse / Fatigue / Final Moments milestones (anti-infinite; must work in ANY mode)
    try { applyVoidCollapseRoundStart(); } catch(e) {}
    try { applyFatigueRoundStart(); } catch(e) {}
    try { applyFinalMomentsRoundStart(); } catch(e) {}
    try { applyEquippedRelicTurnStart(); } catch(e) {}
  }

  // ✅ Void Collapse TRUE damage tick at the START of EVERY turn (Round 25+)
  try {
    const curUnit = (state.turn === "player") ? state.player : state.enemy;
    applyVoidTurnStartDamage(curUnit);
  } catch(e) {}

  // If void damage killed someone, resolve immediately (prevents "infinite" stalled turns)
  if (pvpResolveTeamDeathIfNeeded()) return;

  // Turn-start ticks (cooldowns + relics)
  try { pvpTickTurnStart(state.turn === "player" ? "p1" : "p2"); } catch(e) {}

  pvpResetTurnTimer();
  updateUI();
}

function pvpWireControls() {
  // Only wires if controls exist (battle.html)
  const w = (id, fn) => {
    const el = document.getElementById(id);
    if (el && !el.__wired) { el.__wired = true; el.addEventListener("click", fn); }
  };

  w("p1Attack", () => { if (!isPvpActive()) return; if (state.turn !== "player") return; pvpBasicAttack(state.player, state.enemy, "p1"); if (!pvpResolveTeamDeathIfNeeded()) pvpEnd("p1"); });
  w("p1Skill",  () => { if (!isPvpActive()) return; if (state.turn !== "player") return; pvpUseSkill(state.player, state.enemy, "p1"); if (!pvpResolveTeamDeathIfNeeded()) pvpEnd("p1"); });
  w("p1Potion", () => { if (!isPvpActive()) return; if (state.turn !== "player") return; pvpUsePotion("p1"); });
  w("p1End",    () => { if (!isPvpActive()) return; if (state.turn !== "player") return; pvpEnd("p1"); });
  w("p1Tag",    () => { if (!isPvpActive()) return; if (state.turn !== "player") return; pvpOpenTagMenu("p1"); });

  w("p2Attack", () => { if (!isPvpActive()) return; if (state.turn !== "enemy") return; pvpBasicAttack(state.enemy, state.player, "p2"); if (!pvpResolveTeamDeathIfNeeded()) pvpEnd("p2"); });
  w("p2Skill",  () => { if (!isPvpActive()) return; if (state.turn !== "enemy") return; pvpUseSkill(state.enemy, state.player, "p2"); if (!pvpResolveTeamDeathIfNeeded()) pvpEnd("p2"); });
  w("p2Potion", () => { if (!isPvpActive()) return; if (state.turn !== "enemy") return; pvpUsePotion("p2"); });
  w("p2End",    () => { if (!isPvpActive()) return; if (state.turn !== "enemy") return; pvpEnd("p2"); });
  w("p2Tag",    () => { if (!isPvpActive()) return; if (state.turn !== "enemy") return; pvpOpenTagMenu("p2"); });
}

// =========================
// 🎮 PVP: Relics + Potions + Cooldowns
// =========================

function pvpOwnerFromSide(attackerSide){
  return (String(attackerSide||"") === "p2" || String(attackerSide||"") === "enemy") ? "p2" : "p1";
}

function pvpRelicId(owner){
  if (!isPvpActive()) return "none";
  return owner==="p2" ? (state.pvp.p2RelicId||"none") : (state.pvp.p1RelicId||"none");
}

function pvpAfterAttackRelics(attackerSide, attacker, defender, dmg){
  if (!isPvpActive()) return;
  const atkOwner = pvpOwnerFromSide(attackerSide);
  const defOwner = atkOwner === "p1" ? "p2" : "p1";

  const atkRelic = pvpRelicId(atkOwner);
  const defRelic = pvpRelicId(defOwner);

  // Vampire Fang: heal 1 after attacking (cap at max)
  if (atkRelic === "vampireFang"){
    try { healUnit(attacker, 1, { source:"relic", healer: attacker, triggerEvents:false }); } catch(e){
      attacker.hp = Math.min(attacker.maxHp||attacker.hp, (Number(attacker.hp||0)||0)+1);
    }
    log(`🪬 Vampire Fang heals ${attacker.name} for 1.`, atkOwner==="p1" ? "good" : "bad");
  }

  // Spiked Armor: reflect 1 when taking damage
  if (defRelic === "spikedArmor" && dmg > 0 && Number(attacker.hp||0)>0){
    try { applyDamage(attacker, 1, { silent:true, source:"relic", damageType:"true" }); } catch(e){
      attacker.hp = Math.max(0, (Number(attacker.hp||0)||0)-1);
    }
    log(`🪬 Spiked Armor reflects 1 back to ${attacker.name}.`, defOwner==="p1" ? "good" : "bad");
  }
}

function pvpApplyRelicStart(owner){
  if (!isPvpActive()) return;
  // Mark relic on all team members (for display/debug)
  const rid = owner==="p2" ? (state.pvp.p2RelicId||"none") : (state.pvp.p1RelicId||"none");
  const team = owner==="p2" ? (state.pvp.p2Team||[]) : (state.pvp.p1Team||[]);
  team.forEach(f=>{ if (f) f._pvpRelicId = rid; });

  // Reinforced Plating: grant +2 starting armor (and +2 max shield cap via a simple bonus field)
  if (rid === "reinforcedPlating"){
    team.forEach(f=>{
      if (!f) return;
      f._pvpShieldCapBonus = (Number(f._pvpShieldCapBonus||0)||0) + 2;
      f.shield = (Number(f.shield||0)||0) + 2;
      f.def = f.shield;
    });
    log(`🪬 ${owner==="p1"?"Player 1":"Player 2"} equipped Reinforced Plating (+2 starting armor).`, owner==="p1"?"good":"bad");
  }
}

// Hook shield cap calculation (add pvp bonus if present)
try{
  if (!window.__pvpShieldCapWrapped){
    const originalGetShieldCap = window.getShieldCap;
    if (typeof originalGetShieldCap === "function"){
      window.getShieldCap = function(f){
        const base = originalGetShieldCap(f);
        const bonus = (f && f._pvpShieldCapBonus) ? (Number(f._pvpShieldCapBonus||0)||0) : 0;
        return Math.max(0, (Number(base||0)||0) + bonus);
      };
      window.__pvpShieldCapWrapped = true;
    }
  }
}catch(e){}

function pvpTickTurnStart(owner){
  if (!isPvpActive()) return;

  // decrement swap cooldown (2 turns)
  if (owner==="p1" && state.pvp.p1SwapCd>0) state.pvp.p1SwapCd -= 1;
  if (owner==="p2" && state.pvp.p2SwapCd>0) state.pvp.p2SwapCd -= 1;

  // decrement potion cooldown
  if (owner==="p1" && state.pvp.p1PotionCd>0) state.pvp.p1PotionCd -= 1;
  if (owner==="p2" && state.pvp.p2PotionCd>0) state.pvp.p2PotionCd -= 1;

  // Adrenal Surge: below 50% HP, gain +1 ATK (once per fighter)
  const rid = pvpRelicId(owner);
  if (rid === "adrenalSurge"){
    const f = owner==="p2" ? state.enemy : state.player;
    if (f && !f._pvpAdrenalUsed && Number(f.hp||0) <= (Number(f.maxHp||f.hp||0)||0)/2){
      f._pvpAdrenalUsed = true;
      f.atk = (Number(f.atk||0)||0) + 1;
      log(`🪬 Adrenal Surge: ${f.name} gains +1 ATK!`, owner==="p1"?"good":"bad");
    }
  }
}

function pvpApplyPotionEffectTo(p, e, potion){
  if (!p || !potion) return false;
  const cap = getShieldCap(p);
  const eff = String(potion.effect || "");

  if (eff === "none") return false;

  // mirror PvE potion effects but with explicit units
  if (eff === "hp" || eff === "twilight" || eff === "galactic") {
    const mhp = Math.max(1, Number(p.maxHp || 1) || 1);
    p.maxHp = mhp;
    p.hp = mhp;
  }
  if (eff === "armor" || eff === "twilight" || eff === "galactic") {
    p.shield = cap;
    p.def = p.shield;
  }
  if (eff === "endurance" || eff === "galactic") {
    reduceAbilityCooldownByOne(p);
  }
  if (eff === "godsUltimate") {
    if (!e) return false;
    e.silencedRounds = Math.max(Number(e.silencedRounds || 0) || 0, 2);
    e.shield = 0; e.def = 0;
    const dmg = 80 + Math.floor(Math.random() * (500 - 80 + 1));
    applyDamage(e, dmg, { silent: true, source: "skill", damageType: "true" });

    const gain = Math.max(0, Number(dmg || 0) || 0);
    p.maxHp = Math.max(1, Number(p.maxHp || 1) || 1) + gain;
    p.hp = Math.min(p.maxHp, (Number(p.hp || 0) || 0) + gain);
    p.shield = Math.min(getShieldCap(p), (Number(p.shield || 0) || 0) + gain);
    p.def = p.shield;

    log(`🧪 God's Ultimate! Enemy silenced (2 rounds), armor shattered, took ${dmg} TRUE damage.`, "warn");
  }
  return true;
}

function pvpGetPotionRemaining(side, potionId){
  if (!isPvpActive()) return 0;
  const s = (side==="p2") ? "p2" : "p1";
  const charges = (s==="p1") ? (state.pvp.p1PotionCharges||{}) : (state.pvp.p2PotionCharges||{});
  return Math.max(0, Number(charges && charges[potionId]) || 0);
}
function pvpConsumePotionCharge(side, potionId){
  if (!isPvpActive()) return;
  const s = (side==="p2") ? "p2" : "p1";
  const key = (s==="p1") ? "p1PotionCharges" : "p2PotionCharges";
  state.pvp[key] = state.pvp[key] || {};
  state.pvp[key][potionId] = Math.max(0, (Number(state.pvp[key][potionId])||0) - 1);
}

function pvpUsePotion(owner){
  if (!isPvpActive()) return;
  const side = owner==="p2" ? "p2" : "p1";
  const isP1 = side==="p1";
  if ((isP1 && state.turn!=="player") || (!isP1 && state.turn!=="enemy")){
    try { showToast("⏳ Potions can only be used on your turn.", "warn"); } catch(e){}
    return;
  }

  const cd = isP1 ? (Number(state.pvp.p1PotionCd||0)||0) : (Number(state.pvp.p2PotionCd||0)||0);
  if (cd>0){
    try { showToast(`🧪 Potion cooldown: ${cd} turn(s)`, "warn"); } catch(e){}
    return;
  }

  const picks = (isP1 ? state.pvp.p1Potions : state.pvp.p2Potions) || [];
  const options = picks
    .map(id=>pvpGetPotionDef(id))
    .filter(p=>p && p.id!=="none" && pvpGetPotionRemaining(side, p.id) > 0);

  if (!options.length){
    try { showToast("No usable potions left.", "warn"); } catch(e){}
    return;
  }

  // Modal picker
  const overlay = document.createElement("div");
  overlay.className = "modalOverlay";
  overlay.innerHTML = `
    <div class="modalBox">
      <div class="modalHeader">
        <div>
          <div class="modalTitle">🧪 ${isP1?"Player 1":"Player 2"} Potion</div>
          <div class="modalPill">Choose one (1 use each match)</div>
        </div>
        <button class="btn btnSoft" id="pvpPotionClose">✖</button>
      </div>
      <div class="modalBody">
        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
          ${options.map(p=>`
            <button class="cardPick" data-pid="${p.id}" type="button" style="text-align:left;">
              <div style="font-weight:1000;">🧪 ${escapeHtml(p.name)}</div>
              <div class="muted" style="margin-top:6px;">${escapeHtml(p.desc||"")}</div>
              <div class="pill" style="margin-top:10px; display:inline-flex;">Remaining: <b style="margin-left:6px;">${pvpGetPotionRemaining(side, p.id)}</b></div>
            </button>
          `).join("")}
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector("#pvpPotionClose")?.addEventListener("click", ()=> overlay.remove());
  overlay.querySelectorAll("[data-pid]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const pid = btn.getAttribute("data-pid");
      const potion = pvpGetPotionDef(pid);
      if (!potion || pvpGetPotionRemaining(side, pid) <= 0) { try { showToast("Not available.", "warn"); } catch(e){} return; }

      // consume 1 match charge
      pvpConsumePotionCharge(side, pid);

      const me = isP1 ? state.player : state.enemy;
      const opp = isP1 ? state.enemy : state.player;

      const ok = pvpApplyPotionEffectTo(me, opp, potion);
      if (ok){
        const nextCd = Math.max(0, Number(potion.cooldownTurns||2)||2);
        if (isP1) state.pvp.p1PotionCd = nextCd;
        else state.pvp.p2PotionCd = nextCd;
        log(`🧪 ${isP1?"P1":"P2"} used ${potion.name}!`, isP1?"good":"bad");
        updateUI();
      }
      overlay.remove();
    });
  });
}

function openPvpSetupModal() {
  const overlay = document.createElement("div");
  overlay.className = "modalOverlay";
  overlay.id = "pvpSetupModal";

  const pool = getAllCards();

  // defaults
  let teamSize = 1;
  let p1 = [];
  let p2 = [];
  let picker = "p1"; // whose turn to pick
  let totalPicks = 2; // updated by mode
  const pickedSet = new Set();

  // loadout defaults
  // Per request: everything is unlocked in PVP, but choices must come from Shop lists.
  let p1Relic = "none";
  let p2Relic = "none";

  // Default to 2 real potions for each player so "Start Match" becomes available
  // as soon as card picks are complete (unless a player intentionally changes them).
  const _pvpPotions = pvpAllPotionsList().filter(p=>p.id && p.id!=="none");
  const _pA = _pvpPotions[0]?.id || "none";
  const _pB = _pvpPotions[1]?.id || _pA || "none";
  let p1PotA = _pA, p1PotB = _pB;
  let p2PotA = _pA, p2PotB = _pB;

  const relicOpt = (r)=> { const icon = r.icon || "🪬"; return `<option value="${r.id}">${icon} ${escapeHtml(r.name)}</option>`; };
  const potionOpt = (p)=> { const icon = p.icon || "🧪"; return `<option value="${p.id}">${icon} ${escapeHtml(p.name)}</option>`; };

  const cardTile = (c) => `
    <button type="button" class="cardPick pvpPick" data-id="${c.id}">
      <img src="${c.img}" alt="${c.name}">
      <div class="cardMeta">
        <div style="font-weight:1000;">${c.name}</div>
        <div class="muted" style="margin-top:4px;">ATK ${c.atk} • DEF ${c.def} • HP ${c.hp}</div>
        <div class="muted" style="margin-top:6px;font-size:12px;"><b>${c.skillName}</b></div>
      </div>
    </button>
  `;

  overlay.innerHTML = `
    <div class="modalBox pvpSetupBox">
      <div class="modalHeader">
        <div>
          <div class="modalTitle">🎮 PVP Setup</div>
          <div class="modalPill">Local 2-player (shared screen)</div>
        </div>
        <button class="btn btnSoft" id="pvpSetupClose">✖</button>
      </div>

      <div class="modalBody">
        <div class="pvpSetupRow">
          <div class="pvpModeRow">
            <span class="pill">Mode</span>
            <button class="btn btnSoft" id="pvpMode1">1v1</button>
            <button class="btn btnSoft" id="pvpMode2">2v2</button>
            <button class="btn btnSoft" id="pvpMode5">5v5</button>
          </div>
          <div class="pvpModeRow" style="justify-content:flex-end;">
            <label class="pill" style="display:flex;gap:8px;align-items:center;">
              <input type="checkbox" id="pvpPressureToggle" checked>
              Pressure Mode (turn timer)
            </label>
            <span class="pill">Turn: <b id="pvpTurnSecLabel">20</b>s</span>
            <input id="pvpTurnSec" type="range" min="10" max="45" step="5" value="20" style="width:160px;">
          </div>
        </div>

        <div id="pvpPickGuide" class="pvpPickGuide p1">🟦 Player 1 pick now (Left)</div>

        <div class="pvpSelectWrap">
          <div class="pvpSide" id="pvpSideP1">
            <div class="pvpSideHead">
              <div style="font-weight:1000;">Player 1 (Left)</div>
              <div class="muted" id="p1Need">Pick 1 card (0/1)</div>
            </div>
            <div class="pvpChosen" id="p1Chosen"></div>

            <div class="pvpLoadout">
              <div class="pvpLoadRow">
                <span class="pill">Relic</span>
                <select id="p1Relic">${pvpAllRelicsList().map(relicOpt).join("")}</select>
              </div>
              <div class="pvpLoadRow">
                <span class="pill">Potions</span>
                <select id="p1PotA">${pvpOwnedPotionsList().map(potionOpt).join("")}</select>
                <select id="p1PotB">${pvpOwnedPotionsList().map(potionOpt).join("")}</select>
              </div>
              <div class="muted tiny" id="p1LoadDesc"></div>
            </div>
          </div>

          <div class="pvpSide" id="pvpSideP2">
            <div class="pvpSideHead">
              <div style="font-weight:1000;">Player 2 (Right)</div>
              <div class="muted" id="p2Need">Pick 1 card (0/1)</div>
            </div>
            <div class="pvpChosen" id="p2Chosen"></div>

            <div class="pvpLoadout">
              <div class="pvpLoadRow">
                <span class="pill">Relic</span>
                <select id="p2Relic">${pvpAllRelicsList().map(relicOpt).join("")}</select>
              </div>
              <div class="pvpLoadRow">
                <span class="pill">Potions</span>
                <select id="p2PotA">${pvpOwnedPotionsList().map(potionOpt).join("")}</select>
                <select id="p2PotB">${pvpOwnedPotionsList().map(potionOpt).join("")}</select>
              </div>
              <div class="muted tiny" id="p2LoadDesc"></div>
            </div>
          </div>
        </div>

        <div class="pvpSelectGrid" id="pvpPickGrid">
          ${pool.map(cardTile).join("")}
        </div>
      </div>

      <div class="modalActions">
        <button class="btn btnGhost big" id="pvpUndo">Undo</button>
        <button class="btn btnGhost big" id="pvpClear">Clear</button>
        <button class="btn btnPrimary big" id="pvpStartBtn" disabled>Start Match</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // set default dropdowns
  const setDefaults = ()=>{
    const s = (id, v)=>{ const el = document.getElementById(id); if (el) el.value = v; };
    s("p1Relic", p1Relic); s("p2Relic", p2Relic);
    s("p1PotA", p1PotA); s("p1PotB", p1PotB);
    s("p2PotA", p2PotA); s("p2PotB", p2PotB);
  };

  const needLabel = (id, n, cur) => {
    const el = document.getElementById(id);
    if (el) el.textContent = `Pick ${n} card${n>1?"s":""} (${cur}/${n})`;
  };

  const renderChosen = () => {
    const a = document.getElementById("p1Chosen");
    const b = document.getElementById("p2Chosen");
    if (a) a.innerHTML = p1.map((id) => {
      const c = pool.find(x => x.id === id);
      return `<div class="pvpChosenTile"><img src="${c?.img||""}" alt=""><div>${escapeHtml(c?.name||id)}</div></div>`;
    }).join("");
    if (b) b.innerHTML = p2.map((id) => {
      const c = pool.find(x => x.id === id);
      return `<div class="pvpChosenTile"><img src="${c?.img||""}" alt=""><div>${escapeHtml(c?.name||id)}</div></div>`;
    }).join("");

    needLabel("p1Need", teamSize, p1.length);
    needLabel("p2Need", teamSize, p2.length);

    // guide banner
    const g = document.getElementById("pvpPickGuide");
    const side1 = document.getElementById("pvpSideP1");
    const side2 = document.getElementById("pvpSideP2");
    if (side1) side1.classList.toggle("pvpPicking", picker==="p1");
    if (side2) side2.classList.toggle("pvpPicking", picker==="p2");
    if (g){
      g.classList.remove("p1","p2");
      g.classList.add(picker);
      g.textContent = picker==="p1" ? "🟦 Player 1 pick now (Left)" : "🟥 Player 2 pick now (Right)";
    }

    // lock picked cards visually
    document.querySelectorAll(".pvpPick").forEach(btn=>{
      const id = btn.getAttribute("data-id");
      btn.disabled = pickedSet.has(id) || (p1.length>=teamSize && p2.length>=teamSize);
      btn.classList.toggle("picked", pickedSet.has(id));
    });

    // start enable
    const startBtn = document.getElementById("pvpStartBtn");
    const potValid = (a,b)=> (a && b && a!=="none" && b!=="none" && a!==b);
    const ready = (p1.length===teamSize && p2.length===teamSize && potValid(p1PotA,p1PotB) && potValid(p2PotA,p2PotB));
    if (startBtn) startBtn.disabled = !ready;

    const warn = document.getElementById("pvpStartWarn");
    if (warn){
      warn.textContent = ready ? "✅ Ready to start!" :
        (p1.length!==teamSize || p2.length!==teamSize) ? "Pick all cards first." :
        (!potValid(p1PotA,p1PotB) || !potValid(p2PotA,p2PotB)) ? "Each player must pick 2 different potions." :
        "Complete setup.";
      warn.classList.toggle("good", ready);
    }

    // loadout descriptions
    const d1 = document.getElementById("p1LoadDesc");
    const d2 = document.getElementById("p2LoadDesc");
    if (d1){
      const r = pvpGetRelicDef(p1Relic);
      const a = pvpGetPotionDef(p1PotA);
      const b = pvpGetPotionDef(p1PotB);
      d1.textContent = `${r.icon} ${r.name}: ${r.desc} • ${a.icon} ${a.name} + ${b.icon} ${b.name}`;
    }
    if (d2){
      const r = pvpGetRelicDef(p2Relic);
      const a = pvpGetPotionDef(p2PotA);
      const b = pvpGetPotionDef(p2PotB);
      d2.textContent = `${r.icon} ${r.name}: ${r.desc} • ${a.icon} ${a.name} + ${b.icon} ${b.name}`;
    }
  };

  const setMode = (n)=>{
    teamSize = n;
    totalPicks = n*2;
    // reset picks when switching mode
    p1 = []; p2 = [];
    picker = "p1";
    pickedSet.clear();
    renderChosen();
  };

  // UI wiring
  document.getElementById("pvpSetupClose")?.addEventListener("click", ()=> { overlay.remove(); window.location.href = "index.html"; });
  document.getElementById("pvpClear")?.addEventListener("click", ()=>{
    p1=[]; p2=[]; picker="p1"; pickedSet.clear(); renderChosen();
  });
  document.getElementById("pvpUndo")?.addEventListener("click", ()=>{
    // undo last pick (reverse pick order)
    const total = p1.length + p2.length;
    if (total<=0) return;
    // last pick belonged to previous picker (since picker points to next)
    const lastOwner = (picker==="p1") ? "p2" : "p1";
    const arr = lastOwner==="p1" ? p1 : p2;
    const removed = arr.pop();
    if (removed) pickedSet.delete(removed);
    picker = lastOwner; // revert picker back
    renderChosen();
  });

  const turnSec = document.getElementById("pvpTurnSec");
  const turnSecLabel = document.getElementById("pvpTurnSecLabel");
  turnSec?.addEventListener("input", ()=>{
    if (turnSecLabel) turnSecLabel.textContent = String(turnSec.value);
  });

  document.getElementById("pvpMode1")?.addEventListener("click", ()=> setMode(1));
  document.getElementById("pvpMode2")?.addEventListener("click", ()=> setMode(2));
  document.getElementById("pvpMode5")?.addEventListener("click", ()=> setMode(5));

  // loadout change wiring
  const bindSelect = (id, fn)=> document.getElementById(id)?.addEventListener("change", fn);

  // Keep potion slots user-friendly:
  // if a player accidentally picks the SAME potion in both slots, we auto-adjust the other slot
  // to the first available different potion (so Start Match doesn't "mysteriously" stay disabled).
  const fixPotionDup = (side)=>{
    const all = pvpAllPotionsList().filter(p=>p.id && p.id!="none").map(p=>p.id);
    if (!all.length) return;
    if (side === "p1"){
      if (p1PotA !== "none" && p1PotA === p1PotB){
        p1PotB = (all.find(id=>id!==p1PotA) || p1PotA);
        const el = document.getElementById("p1PotB");
        if (el) el.value = p1PotB;
      }
    } else {
      if (p2PotA !== "none" && p2PotA === p2PotB){
        p2PotB = (all.find(id=>id!==p2PotA) || p2PotA);
        const el = document.getElementById("p2PotB");
        if (el) el.value = p2PotB;
      }
    }
  };

  bindSelect("p1Relic", (e)=>{ p1Relic = e.target.value; renderChosen(); });
  bindSelect("p2Relic", (e)=>{ p2Relic = e.target.value; renderChosen(); });
  bindSelect("p1PotA", (e)=>{ p1PotA = e.target.value; fixPotionDup("p1"); renderChosen(); });
  bindSelect("p1PotB", (e)=>{ p1PotB = e.target.value; fixPotionDup("p1"); renderChosen(); });
  bindSelect("p2PotA", (e)=>{ p2PotA = e.target.value; fixPotionDup("p2"); renderChosen(); });
  bindSelect("p2PotB", (e)=>{ p2PotB = e.target.value; fixPotionDup("p2"); renderChosen(); });

  // card clicks (guided alternating)
  document.getElementById("pvpPickGrid")?.addEventListener("click", (e)=>{
    const btn = e.target.closest(".pvpPick");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    if (!id) return;
    if (pickedSet.has(id)) return;

    // enforce turn
    if (picker==="p1"){
      if (p1.length>=teamSize) return;
      p1.push(id);
      pickedSet.add(id);
      picker = "p2";
    } else {
      if (p2.length>=teamSize) return;
      p2.push(id);
      pickedSet.add(id);
      picker = "p1";
    }
    renderChosen();
  });

  // Start match
document.getElementById("pvpStartBtn")?.addEventListener("click", () => {
  // Basic readiness gate (should already be enforced by disabled state)
  if (p1.length !== teamSize || p2.length !== teamSize) return;

  // ✅ PVP requires each player to select exactly TWO different potions
  const potValid = (a, b) => (a && b && a !== "none" && b !== "none" && a !== b);
  if (!potValid(p1PotA, p1PotB) || !potValid(p2PotA, p2PotB)) {
    try { showToast("🧪 Each player must pick 2 different potions before starting.", "warn"); } catch (e) {}
    return;
  }

  const pressureEnabled = !!document.getElementById("pvpPressureToggle")?.checked;
  const sec = Math.max(10, Math.min(45, Number(document.getElementById("pvpTurnSec")?.value || 20) || 20));

  // ✅ Use the canonical PVP bootstrapper so ALL required fields exist
  // (fixes "Start Match does nothing" caused by missing makeFighterFromId and mismatched pvp state shape).
  try {
    pvpStartMatch({
      teamSize,
      p1CardIds: p1.slice(),
      p2CardIds: p2.slice(),
      pressure: pressureEnabled,
      turnSeconds: sec
    });
  } catch (e) {
    console.error("PVP start failed:", e);
    try { showToast("❌ PVP failed to start. Check console for details.", "bad"); } catch (err) {}
    return;
  }

  // Add loadouts / cooldowns (used by potion+relic UI)
  state.pvp.p1RelicId = p1Relic;
  state.pvp.p2RelicId = p2Relic;

  state.pvp.p1Potions = [p1PotA, p1PotB];
  state.pvp.p2Potions = [p2PotA, p2PotB];

  state.pvp.p1SwapCd = 0;
  state.pvp.p2SwapCd = 0;
  state.pvp.p1PotionCd = 0;
  state.pvp.p2PotionCd = 0;

  // One use per selected potion (2 total uses)
  state.pvp.p1PotionCharges = { [p1PotA]: 1, [p1PotB]: 1 };
  state.pvp.p2PotionCharges = { [p2PotA]: 1, [p2PotB]: 1 };

  // Save last PVP config for quick Rematch
  state.pvpLastConfig = {
    teamSize,
    p1CardIds: p1.slice(),
    p2CardIds: p2.slice(),
    pressure: pressureEnabled,
    turnSeconds: sec,
    p1RelicId: p1Relic,
    p2RelicId: p2Relic,
    p1Potions: [p1PotA, p1PotB],
    p2Potions: [p2PotA, p2PotB]
  };

  // Ensure PVP controls visible + wired (safe if already done by pvpStartMatch)
  try { pvpWireControls(); } catch (e) {}
  try { pvpSetControlsVisible(true); } catch (e) {}

  // Apply start-of-match relic effects (if any)
  try { pvpApplyRelicStart("p1"); } catch (e) {}
  try { pvpApplyRelicStart("p2"); } catch (e) {}

  // Start timer if enabled
  try { pvpResetTurnTimer(); } catch (e) {}
  try { pvpStartTicker(); } catch (e) {}

  overlay.remove();
  updateUI();
  log("🎮 PVP started! Controls: Player 1 (left) vs Player 2 (right).", "good");
});

  // init
  setMode(1);
  setDefaults();
  renderChosen();
}

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

// ✅ Visual highlight when a card attacks / defends (works on mobile too)
function pulseAttackMotion(from, to) {
  try {
    const a = from === "player" ? document.getElementById("playerCard") : document.getElementById("enemyCard");
    const b = to === "player" ? document.getElementById("playerCard") : document.getElementById("enemyCard");
    const bf = to === "player" ? document.getElementById("pFrame") : document.getElementById("eFrame");
    if (a) {
      a.classList.remove("attackLeft", "attackRight");
      void a.offsetWidth;
      a.classList.add(from === "player" ? "attackRight" : "attackLeft");
    }
    if (b) {
      b.classList.remove("defendBump");
      void b.offsetWidth;
      b.classList.add("defendBump");
    }
    if (bf) {
      bf.classList.remove("impactGlow");
      void bf.offsetWidth;
      bf.classList.add("impactGlow");
    }
  } catch (e) {}
}
function spawnAttackFx(from, to) {
  // highlight attacker + defender immediately
  pulseAttackMotion(from, to);

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
  // ✅ If ATK is 0 (or less), don't let RNG force a minimum 1 damage.
  const baseAtk = Number(attacker.atk || 0) || 0;
  const rng = baseAtk > 0 ? Math.floor(Math.random() * 2) : 0;
  let dmg = baseAtk + rng;

  // ✅ OP Relic: Adrenal Surge (+1 damage when below 50% HP)
  if (hasRelic("adrenalSurge") && attacker === state.player && state.player) {
    if (state.player.hp <= Math.ceil(state.player.maxHp * 0.5)) dmg += 1;
  }

  // Boost adds damage even if baseAtk is 0
  if (attacker.boost > 0) { dmg += 3; attacker.boost = 0; }

  // Stun reduces damage; allow it to reach 0 (no forced minimum)
  if (attacker.stunned > 0) dmg = Math.max(0, dmg - 2);

  return Math.max(0, dmg);
}

// ✅ Variant: damage calculation WITHOUT the random +0/+1 roll.
// Used for Halaka Reality Form so "current damage" doesn't get an extra RNG point.
function dmgCalcNoRng(attacker) {
  let dmg = Number(attacker.atk || 0) || 0;

  if (hasRelic("adrenalSurge") && attacker === state.player && state.player) {
    if (state.player.hp <= Math.ceil(state.player.maxHp * 0.5)) dmg += 1;
  }

  if (attacker.boost > 0) { dmg += 3; attacker.boost = 0; }
  if (attacker.stunned > 0) dmg = Math.max(0, dmg - 2);

  return Math.max(0, dmg);
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

  const attacker = opts.attacker || null;

  // ✅ NEW: Mark (Bounty Mark) — marked target takes +3 damage from all hits
  if (defender.mark && defender.mark > 0 && dmg > 0) {
    dmg += 3;
  }

  // ✅ NEW: Barrier — blocks 1 incoming SKILL completely (does not block attacks)
  if (defender.barrier && defender.barrier > 0 && dmg > 0 && source === "skill") {
    defender.barrier = Math.max(0, Number(defender.barrier || 0) - 1);
    log(`🛡️ Barrier blocks the skill! ${defender.name} takes no skill damage.`, "good");
    updateUI();
    return 0;
  }

// 😵 Fatigue: skills & passives weaken in endless rounds
if (fatigueAppliesToSource(source) && dmg > 0) {
  const _beforeFatigue = dmg;
  dmg = applyFatigueMultiplier(dmg, source);

  // If fatigue fully collapsed, show a cool "fizzle" message on the attacker card
  if (_beforeFatigue > 0 && dmg <= 0 && fatigueFactor() <= 0) {
    const attacker = opts.attacker || null;
    let side = (defender === state.player) ? "enemy" : "player";
    if (attacker === state.player) side = "player";
    if (attacker === state.enemy) side = "enemy";
    floatingDamage(side, "💤 SKILL FIZZLES", "fatigue");
  }
}

  // ✅ NEW: Immunity — take no damage while active (blocks attacks + skills + passives)
  if (defender.immunity && defender.immunity > 0 && dmg > 0) {
    if (!opts.silent) {
      log(`🛡️ ${defender.name} is IMMUNE and takes no damage.`, "good");
      floatingDamage(defender === state.player ? "player" : "enemy", "IMMUNE", "good");
      updateUI();
    }
    return 0;
  }

  // ✅ NEW: Dodge — first incoming ATTACK misses completely
  if (defender.dodge && defender.dodge > 0 && dmg > 0 && source === "attack") {
    defender.dodge = 0;
    log(`💨 ${defender.name} dodges the attack!`, "good");
    floatingDamage(defender === state.player ? "player" : "enemy", "MISS", "good");
    updateUI();
    return 0;
  }

  // ✅ NEW: Parry — reflect the next hit (attack or skill) 100% as normal damage
  if (defender.parry && defender.parry > 0 && dmg > 0 && !opts._parryReflect) {
    defender.parry = 0;
    if (attacker) {
      applyDamage(attacker, dmg, { source: "passive", damageType: "physical", attacker: defender, attackerName: defender.name, _parryReflect: true });
      log(`🗡️ Parry! ${defender.name} reflects ${dmg} damage back to ${attacker.name}.`, "good");
      floatingDamage(attacker === state.player ? "player" : "enemy", `-${dmg}`, "bad");
    } else {
      log(`🗡️ Parry! ${defender.name} reflects the hit.`, "good");
    }
    updateUI();
    return 0;
  }

  // ✅ NEW: Sanctuary — first incoming SKILL hit is halved, prevented damage is reflected as TRUE damage
  if (defender.sanctuary && defender.sanctuary > 0 && dmg > 0 && source === "skill" && !defender.sanctuaryUsed) {
    defender.sanctuaryUsed = true;
    const original = dmg;
    const reduced = Math.ceil(original * 0.5);
    const prevented = Math.max(0, original - reduced);
    dmg = reduced;

    if (attacker && prevented > 0 && !opts._sanctuaryReflect) {
      applyDamage(attacker, prevented, { source: "passive", damageType: "true", attacker: defender, attackerName: defender.name, _sanctuaryReflect: true });
      log(`✨ Sanctuary reduces skill damage by 50% and reflects ${prevented} TRUE damage!`, "good");
    }
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

  // ✅ NEW: Counter Stance (Void Samurai)
  if (defender.counterStance && defender.counterStance > 0) {
    // If enemy used a skill against Samurai, Samurai gains +2 armor
    if (source === "skill") {
      const gained = gainShield(defender, 2);
      if (gained > 0) log(`🌀 Counter Stance: ${defender.name} gains +${gained} Armor from enemy skill.`, "good");
    }
    // If enemy attacked Samurai, attacker takes 3 TRUE backlash
    if (source === "attack" && opts.attacker && actualTaken > 0 && !opts._counterStanceBacklash) {
      applyDamage(opts.attacker, 3, { source: "passive", damageType: "true", attacker: defender, attackerName: defender.name, _counterStanceBacklash: true });
      log(`🌀 Counter Stance: ${opts.attacker.name} takes 3 TRUE backlash!`, "warn");
    }
  }

  // ✅ Zukinimato Form 7 passive: convert taken damage into healing + ATK buffs: convert taken damage into healing + ATK buffs
  if (defender && defender.id === "zukinimato" && defender.zukiUltimatePassive && actualTaken > 0) {
    const buff = Math.floor(Number(actualTaken) || 0);
    if (buff > 0) {
      defender.atk = Number(defender.atk || 0) + buff;
      const healed = heal(defender, buff, { source: "passive" });

      const tgt = defender === state.player ? "player" : "enemy";
      if (healed > 0) {
        log(`🟣 ${defender.name}'s God Form converts ${buff} damage into +${buff} ATK and +${healed} HP!`, "good");
        floatingDamage(tgt, `+${healed}`, "good");
      } else {
        log(`🟣 ${defender.name}'s God Form grants +${buff} ATK, but healing was blocked!`, "warn");
      }
      updateUI();
    }
  }

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

    // 🎲 Roque passive: Loaded Fate (50% revive, then steal enemy current stats) — 2-turn cooldown
  if (
    state.phase === "battle" &&
    actualTaken > 0 &&
    Number(defender.hp) <= 0 &&
    defender &&
    defender.id === "roque" &&
    !(Number(defender.roqueReviveCd || 0) > 0)
  ) {
    if (Math.random() < 0.5) {
      // Determine the opponent whose stats will be stolen
      const foeUnit = opts.attacker || (defender === state.player ? state.enemy : state.player);
      const foeAtk = Math.max(0, Number(foeUnit && foeUnit.atk || 0) || 0);
      const foeDef = Math.max(0, Number((foeUnit && (foeUnit.def ?? foeUnit.shield)) || 0) || 0);
      const foeHp  = Math.max(0, Number(foeUnit && foeUnit.hp || 0) || 0);

      // Revive at 1 HP, then add enemy CURRENT stats
      defender.hp = 1;

      defender.atk = Math.max(0, Number(defender.atk || 0) || 0) + foeAtk;

      defender.shield = Math.max(0, Number(defender.shield || 0) || 0) + foeDef;
      defender.def = defender.shield;
      defender.shieldCap = Math.max(Number(defender.shieldCap || 0) || 0, defender.shield);

      defender.maxHp = Math.max(1, Number(defender.maxHp || 1) || 1) + foeHp;
      defender.hp = Math.min(defender.maxHp, Number(defender.hp || 0) + foeHp);

      defender.roqueReviveCd = 2;

      const side = defender === state.player ? "player" : "enemy";
      try { spawnReviveFx(side, true); } catch (e) {}
      try { cardReviveFlip(side); } catch (e) {}

      log(`🎲 Loaded Fate! ${defender.name} resurrects and steals stats (+${foeAtk} ATK, +${foeDef} DEF, +${foeHp} HP).`, "good");
      floatingDamage(side, `🎲 +STATS`, "good");
    }
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
      const healed = heal(state.player, leeched, { source: "relic" });
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

function heal(fighter, amount, opts = {}) {
  if (!fighter || amount <= 0) return 0;
if (!canHeal(fighter)) return 0;

amount = Number(amount);
if (!Number.isFinite(amount) || amount <= 0) return 0;

// 🌌 Void Collapse healing reduction (kept consistent with healUnit)
if (state && state.phase === "battle" && state.voidCollapse && Number(state.voidCollapse.healMult || 1) < 1) {
  amount = Math.floor(amount * Number(state.voidCollapse.healMult || 1));
}

// 😵 Fatigue: skills & passives weaken in endless rounds
amount = applyFatigueMultiplier(amount, opts.source);
if (amount <= 0) return 0;
 // ✅ blocked by Reboot Seal
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

  // ✅ META timers
  if (f.sanctuary > 0) f.sanctuary -= 1;
  if (f.parry > 0) f.parry -= 1;
  if (f.dodge > 0) f.dodge -= 1;
  if (f.immunity > 0) f.immunity -= 1;
  if (f.counterStance > 0) f.counterStance -= 1;
  if (f.mark > 0) f.mark -= 1;
  if (f.hellBrand > 0) f.hellBrand -= 1;

  // 🎲 Roque: Dice Roll (temporary DEF -> ATK)
  if (f.diceRollTurns > 0) {
    f.diceRollTurns -= 1;
    if (f.diceRollTurns <= 0 && f._diceRollStoredDef) {
      const stored = Math.max(0, Number(f._diceRollStoredDef || 0) || 0);
      // restore ATK
      f.atk = Math.max(0, (Number(f.atk || 0) || 0) - stored);
      // restore armor
      f.shield = Math.max(0, (Number(f.shield || 0) || 0) + stored);
      f.def = f.shield;
      // ensure caps
      f.shieldCap = Math.max(Number(f.shieldCap || 0) || 0, f.shield);
      f._diceRollStoredDef = 0;
      log(`🎲 Dice Roll ends — ${f.name}'s DEF returns.`, "warn");
    }
  }

  // 🎲 Roque: Loaded Fate revive cooldown
  if (f.roqueReviveCd > 0) f.roqueReviveCd -= 1;

  // ✅ Constellation Curse tick (restore ATK when it ends)
  if (f.constellationCurse > 0) {
    f.constellationCurse -= 1;
    if (f.constellationCurse <= 0 && f.constellationCurseAtkDown) {
      f.atk = Math.max(0, Number(f.atk || 0) + Number(f.constellationCurseAtkDown || 0));
      f.constellationCurseAtkDown = 0;
    }
  }

  // ✅ Void Anchor tick (2 TRUE damage each turn while active)
  if (f.voidAnchor > 0) {
    applyDamage(f, 2, { source: "status", damageType: "true", attackerName: "Void Anchor", _voidAnchorTick: true });
    log(`🕳️ Void Anchor burns ${f.name} for 2 TRUE damage.`, "warn");
    f.voidAnchor -= 1;
  }

  // Sanctuary cleanup
  if (f.sanctuary <= 0) f.sanctuaryUsed = false;

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

// 😵 Fatigue: enemy passive chance decays in endless rounds
const effChance = Math.max(0, Number(e.passiveChance || 0) * fatigueFactor());

if (roll > effChance) {
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
const AI_TYPES = ["Aggressive", "Defensive", "Trickster", "Berserker", "Opportunist", "Tactician", "Coward", "Caster"];
function pickEnemyAI() { return AI_TYPES[Math.floor(Math.random() * AI_TYPES.length)]; }

function enemyDecideAction() {
  const e = state.enemy;
  const p = state.player;
  const skillReady = isSkillReady(e) && !isSilenced(e);

  // Trickster: sometimes wastes a turn to desync your cooldown planning
  if (e.aiType === "Trickster" && Math.random() < 0.25) return { type: "end" };

  // Defensive: likes to skill when low or shield is broken
  if (e.aiType === "Defensive") {
    const low = e.hp <= Math.ceil(e.maxHp * 0.5);
    const lowShield = (e.shield || 0) <= 1;
    if (skillReady && (low || lowShield || Math.random() < 0.65)) return { type: "skill" };
    return { type: "attack" };
  }

  // Aggressive: usually attacks, sometimes skills
  if (e.aiType === "Aggressive") {
    if (skillReady && Math.random() < 0.25) return { type: "skill" };
    return { type: "attack" };
  }

  // Berserker: spams skill early, then goes full attack when low HP
  if (e.aiType === "Berserker") {
    const low = e.hp <= Math.ceil(e.maxHp * 0.3);
    if (low) return { type: "attack" };
    if (skillReady && Math.random() < 0.55) return { type: "skill" };
    return { type: "attack" };
  }

  // Opportunist: uses skill to finish when YOU are vulnerable
  if (e.aiType === "Opportunist") {
    const pLow = p && p.hp <= Math.ceil(p.maxHp * 0.35);
    const pNoShield = p && (p.shield || 0) <= 0;
    if (skillReady && (pLow || pNoShield || Math.random() < 0.35)) return { type: "skill" };
    return { type: "attack" };
  }

  // Tactician: uses skill when you have lots of armor (breakpoints), otherwise attacks
  if (e.aiType === "Tactician") {
    const pHighShield = p && (p.shield || 0) >= 4;
    if (skillReady && (pHighShield || Math.random() < 0.35)) return { type: "skill" };
    if (Math.random() < 0.10) return { type: "end" };
    return { type: "attack" };
  }

  // Coward: if low HP, prefers to skill (or even stall) instead of trading hits
  if (e.aiType === "Coward") {
    const low = e.hp <= Math.ceil(e.maxHp * 0.4);
    if (low) {
      if (skillReady && Math.random() < 0.55) return { type: "skill" };
      if (Math.random() < 0.35) return { type: "end" };
      return { type: "attack" };
    }
    if (skillReady && Math.random() < 0.25) return { type: "skill" };
    return { type: "attack" };
  }

  // Caster: heavily favors skill usage
  if (e.aiType === "Caster") {
    if (skillReady && Math.random() < 0.70) return { type: "skill" };
    return { type: "attack" };
  }

  // Default fallback
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

  // Rematch is only for PVP results; default hidden for all other modals
  const btnRematch = document.getElementById("btnRematch");
  if (btnRematch) btnRematch.style.display = "none";

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
  const mission1Active = (typeof isMission1Complete === "function") ? !isMission6Complete() : false;

  // ✅ Mission 1 (Stage 1) should also be a clean start.
  // Even if later missions are already unlocked (Legend/Diablo cleared),
  // NEVER spawn Entity or Awakened Monster on Stage 1.
  const isStage1 = (Number(state.stage || 0) || 0) <= 1;

  // Filter out late-game bosses when Mission 1 is still in progress OR on Stage 1.
  if (mission1Active || isStage1) {
    pool = (pool || []).filter((c) => {
      if (!c) return false;
      if (c.id === "relicbornTitan") return false;
      if (c.id === "awakenedMonster") return !!(state && state.missions && state.missions.omniDefeated);
      return true;
    });
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
      isMission6Complete() &&
      isMission7Complete() &&
      isMission8Complete() &&
      !isMission9Complete() &&
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
      isMission6Complete() &&
      isMission7Complete() &&
      isMission8Complete() &&
      isMission9Complete() &&
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
    const healed = heal(state.player, 1, { source: "relic" });
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
  state.voidCollapse = { level: 0, healMult: 1, armorMult: 1, truePerTurn: 0 };
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

// =========================
// ✅ Status Icons + Tooltip
// =========================
const STATUS_DEFS = [
  { key: "frozen", name: "Frozen", icon: "❄️", desc: "Skip your next turn." },
  { key: "stun2Rounds", name: "Stunned", icon: "💫", desc: "Cannot act for a short time (stun duration counts down each turn)." },
  { key: "stunned", name: "Stunned(-2)", icon: "💫", desc: "A weaker stun variant that reduces action options for a short time." },
  { key: "silenced", name: "Silenced", icon: "🔇", desc: "Cannot use skill while this is active." },
  { key: "poisonRounds", name: "Poison", icon: "☠️", desc: "Takes damage over time at the start of turns. Lasts up to 6 turns (refreshes when reapplied)." },
  { key: "debuffRounds", name: "Debuff", icon: "⬇️", desc: "Lowers ATK/Armor over time. Lasts up to 6 turns (refreshes when reapplied)." },
  { key: "noArmorGain", name: "Time Lock", icon: "⏳", desc: "Cannot gain armor/shield while active." },
  { key: "rebootSeal", name: "Reboot Seal", icon: "🚫", desc: "Healing is blocked while active." },
  { key: "hellBrand", name: "Hell Brand", icon: "🔥", desc: "Punishes healing (healing may trigger recoil damage)." },
  { key: "immunity", name: "Immunity", icon: "🛡️", desc: "Blocks negative status effects for a short time." },
  { key: "mark", name: "Marked", icon: "🎯", desc: "Marked targets are easier to punish or take extra effects." },
  { key: "sanctuary", name: "Sanctuary", icon: "✨", desc: "Reduces incoming damage / stabilizes during dangerous phases." },
  { key: "counterStance", name: "Counter Stance", icon: "🗡️", desc: "May counterattack when hit." },
  { key: "parry", name: "Parry", icon: "🤺", desc: "Chance to negate an incoming hit." },
  { key: "dodge", name: "Dodge", icon: "🏃", desc: "Chance to evade an incoming hit." },
  { key: "voidAnchor", name: "Void Anchor", icon: "🌀", desc: "Special void effect (limits recovery / movement depending on enemy)." },
  { key: "constellationCurse", name: "Constellation Curse", icon: "🌙", desc: "Temporary attack down and/or cooldown extension." },
];

function getStatusCount(f, key) {
  if (!f) return 0;
  const v = f[key];
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  return 0;
}

function getActiveStatusList(f) {
  const active = [];
  for (const def of STATUS_DEFS) {
    const n = getStatusCount(f, def.key);
    if (n > 0) active.push({ ...def, count: n });
  }
  return active;
}

function ensureStatusTooltipEl() {
  return document.getElementById("statusTooltip");
}

function hideStatusTooltip() {
  const tt = ensureStatusTooltipEl();
  if (!tt) return;
  tt.style.display = "none";
  tt.innerHTML = "";
}

function showStatusTooltip(def, x, y) {
  const tt = ensureStatusTooltipEl();
  if (!tt) return;

  const meta = (def && def.count && def.count > 0) ? `Remaining: ${def.count}` : "";
  tt.innerHTML = `
    <div class="ttTitle">${def.icon} ${def.name}</div>
    <div class="ttDesc">${def.desc}</div>
    ${meta ? `<div class="ttMeta">${meta}</div>` : ``}
  `;

  // position near pointer; keep within viewport
  const pad = 12;
  const vw = window.innerWidth || 360;
  const vh = window.innerHeight || 640;

  tt.style.display = "block";
  tt.style.left = "0px";
  tt.style.top = "0px";

  const rect = tt.getBoundingClientRect();
  let left = (x || pad) + 12;
  let top  = (y || pad) + 12;

  if (left + rect.width + pad > vw) left = vw - rect.width - pad;
  if (top + rect.height + pad > vh) top = vh - rect.height - pad;
  if (left < pad) left = pad;
  if (top < pad) top = pad;

  tt.style.left = `${left}px`;
  tt.style.top = `${top}px`;
}

function renderStatusIcons(f, containerId) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;

  wrap.innerHTML = "";
  const beginner = isBeginnerMode();

  const allActive = getActiveStatusList(f);
  let list = allActive;

  if (beginner) {
    const basics = new Set(["frozen", "stun2Rounds", "stunned", "silenced"]);
    list = allActive.filter(s => basics.has(s.key));
  }

  for (const s of list) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "statusIconBtn";
    btn.setAttribute("aria-label", `${s.name} (${s.count})`);
    btn.innerHTML = `<span class="statusIconEmoji">${s.icon}</span><span class="statusIconCount">${s.count}</span>`;
    const onShow = (ev) => {
      const x = (ev && (ev.clientX || (ev.touches && ev.touches[0] && ev.touches[0].clientX))) || 20;
      const y = (ev && (ev.clientY || (ev.touches && ev.touches[0] && ev.touches[0].clientY))) || 20;
      showStatusTooltip(s, x, y);
    };
    btn.addEventListener("mouseenter", onShow);
    btn.addEventListener("focus", (ev) => onShow(ev));
    btn.addEventListener("click", onShow);
    btn.addEventListener("mouseleave", hideStatusTooltip);
    btn.addEventListener("blur", hideStatusTooltip);
    wrap.appendChild(btn);
  }

  // If beginner mode hides some effects, show a "+N" hint
  if (beginner) {
    const hidden = Math.max(0, allActive.length - list.length);
    if (hidden > 0) {
      const more = document.createElement("button");
      more.type = "button";
      more.className = "statusIconBtn";
      more.setAttribute("aria-label", `More effects (${hidden})`);
      const def = { icon: "➕", name: `More Effects`, desc: `There are ${hidden} more active effect(s). Turn off Beginner Mode to see all effect icons.`, count: hidden };
      more.innerHTML = `<span class="statusIconEmoji">➕</span><span class="statusIconCount">${hidden}</span>`;
      const onShow = (ev) => {
        const x = (ev && (ev.clientX || (ev.touches && ev.touches[0] && ev.touches[0].clientX))) || 20;
        const y = (ev && (ev.clientY || (ev.touches && ev.touches[0] && ev.touches[0].clientY))) || 20;
        showStatusTooltip(def, x, y);
      };
      more.addEventListener("mouseenter", onShow);
      more.addEventListener("focus", (ev) => onShow(ev));
      more.addEventListener("click", onShow);
      more.addEventListener("mouseleave", hideStatusTooltip);
      more.addEventListener("blur", hideStatusTooltip);
      wrap.appendChild(more);
    }
  }
}

// Hide tooltip when clicking anywhere else
document.addEventListener("click", (e) => {
  const tt = ensureStatusTooltipEl();
  if (!tt || tt.style.display === "none") return;
  const inside = tt.contains(e.target);
  const isStatusBtn = (e.target && (e.target.closest && e.target.closest(".statusIconBtn")));
  if (!inside && !isStatusBtn) hideStatusTooltip();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideStatusTooltip(); });

// =========================
// 🎮 PVP / Arena text auto-scale
// - Prevent long names/skills from truncating too aggressively.
// - Works on mobile too (no layout jumps; only font size changes).
// =========================
function autoScaleArenaText() {
  const scale = (el, basePx, minPx, lenSoft, lenHard) => {
    if (!el) return;
    const t = String(el.textContent || "").trim();
    const n = t.length;
    let px = basePx;
    if (n >= lenHard) px = minPx;
    else if (n >= lenSoft) {
      // Linear interpolate between base and min
      const k = (n - lenSoft) / Math.max(1, (lenHard - lenSoft));
      px = Math.round((basePx - (basePx - minPx) * Math.min(1, Math.max(0, k))) * 10) / 10;
    }
    el.style.fontSize = `${px}px`;
  };

  // Names
  scale(document.getElementById("pName"), 18, 12, 16, 32);
  scale(document.getElementById("eName"), 18, 12, 16, 32);

  // Skill pills (ability names)
  scale(document.getElementById("pSkillTag"), 12, 10, 14, 26);
  scale(document.getElementById("eSkillTag"), 12, 10, 14, 26);
}


function applyArenaBackground() {
  const arena = document.getElementById("arenaCard");
  if (!arena) return;
  // Prefer profile background if available
  const bid = (state.profile && state.profile.backgroundId) ? state.profile.backgroundId : (state.backgroundId || "nebula");
  const bg = getBackgroundDef(bid);
  arena.style.setProperty("--arenaBg", `url("${bg.url}")`);
  arena.dataset.bg = bg.id;
}

function flashArenaOnSkill() {
  document.body.classList.add("skillFlash");
  clearTimeout(flashArenaOnSkill._t);
  flashArenaOnSkill._t = setTimeout(() => document.body.classList.remove("skillFlash"), 220);
}


// =========================
// 🧠 UI RENDER THROTTLE (prevents mobile stutter)
// =========================
let __uiRafPending = false;
function updateUI() {
  if (__uiRafPending) return;
  __uiRafPending = true;
  requestAnimationFrame(() => {
    __uiRafPending = false;
    try { _updateUIImmediate(); } catch (e) {}
  });
}
// Original renderer (kept intact)
function _updateUIImmediate() {
  // ✅ Keep body state in sync for performance helpers (pause heavy background FX during battle on low-power devices)
  try { document.body.classList.toggle("inBattle", state && state.phase === "battle"); } catch(e) {}
  try { applyArenaBackground(); } catch (e) {}
  // 🏁 FINAL MOMENTS: ensure overlay never leaks outside battle (cleanup after game end)
  try {
    const activeFinal = (typeof isFinalMomentsActive === "function") ? isFinalMomentsActive() : false;
    if (typeof setFinalMomentsUI === "function") setFinalMomentsUI(activeFinal);
    if (!activeFinal) {
      if (typeof stopFinalMomentsSfx === "function") stopFinalMomentsSfx();
      if (state && state._finalMomentsStarted) state._finalMomentsStarted = false;
    }
  } catch (e) {}
  // 🏁 FINAL MOMENTS: ensure overlay never leaks outside battle
  try {
    const activeFinal = (typeof isFinalMomentsActive === "function") ? isFinalMomentsActive() : false;
    if (typeof setFinalMomentsUI === "function") setFinalMomentsUI(activeFinal);
    // Reset the one-time announcement when leaving battle
    if (!activeFinal && state && state._finalMomentsStarted) state._finalMomentsStarted = false;
  } catch (e) {}
  const p = state.player, e = state.enemy;
  if (!p || !e) return;

  // ✅ UI animations: detect DEF/HP drops and animate (clarity for new players)
  try{
    const prev = window.__uiPrev || (window.__uiPrev = {});
    const pShieldNow = Number(p.shield || 0) || 0;
    const eShieldNow = Number(e.shield || 0) || 0;
    const pHpNow = Number(p.hp || 0) || 0;
    const eHpNow = Number(e.hp || 0) || 0;

    function pulseStat(iconId){
      const b = document.getElementById(iconId);
      const wrap = b ? (b.closest(".statIcon") || b.parentElement) : null;
      if (!wrap) return;
      wrap.classList.remove("statDown");
      void wrap.offsetWidth;
      wrap.classList.add("statDown");
      setTimeout(()=>{ try{ wrap.classList.remove("statDown"); }catch(e){} }, 420);
    }
    function shakeCard(cardId){
      const card = document.getElementById(cardId);
      if (!card) return;
      card.classList.remove("hitShake");
      void card.offsetWidth;
      card.classList.add("hitShake");
      setTimeout(()=>{ try{ card.classList.remove("hitShake"); }catch(e){} }, 420);
    }

    if (Number.isFinite(prev.pShield) && pShieldNow < prev.pShield){
      pulseStat("pDEFIcon");
      shakeCard("playerCard");
    }
    if (Number.isFinite(prev.eShield) && eShieldNow < prev.eShield){
      pulseStat("eDEFIcon");
      shakeCard("enemyCard");
    }
    if (Number.isFinite(prev.pHp) && pHpNow < prev.pHp){
      shakeCard("playerCard");
    }
    if (Number.isFinite(prev.eHp) && eHpNow < prev.eHp){
      shakeCard("enemyCard");
    }

    prev.pShield = pShieldNow; prev.eShield = eShieldNow;
    prev.pHp = pHpNow; prev.eHp = eHpNow;
  }catch(e){}

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
  // ✅ Beginner Mode: reduce clutter in the top pills
  const beginner = isBeginnerMode();
  try {
    const ep = document.getElementById("enemyPassiveTag");
    const ea = document.getElementById("enemyAiTag");
    if (ep) ep.style.display = beginner ? "none" : "";
    if (ea) ea.style.display = beginner ? "none" : "";
  } catch (e) {}

  updateGoldUI();

  $("pName").textContent = p.name;

  // Rarity
  const pr = getCardRarity(p.id);
  const prEl = $("pRarity");
  if (prEl) { prEl.textContent = pr; applyRarityPill(prEl, pr); }
  try { applyRarityFrame(document.getElementById("playerCard"), pr); } catch(e) {}
  try { applyRarityFrame(document.getElementById("playerCard"), pr); } catch(e) {}
  $("pImg").src = p.img;
  $("pSkillTag").textContent = `${p.base.skillName}`;

  // Ability info tooltip (hover the "i" icon)
  const pInfo = $("pInfo");
  if (pInfo) {
    const cd = (p.cooldown || 0) > 0 ? `Cooldown: ${p.cooldown} turn(s)` : "Ready";
    const beginnerTip = isBeginnerMode();
    const pDescFull = String(p.base.skillDesc || "");
    const pDescShort = pDescFull.split(/\n|\.|\!/)[0].trim();
    const pDesc = beginnerTip ? (pDescShort ? (pDescShort + (pDescShort.length < pDescFull.length ? "…" : "")) : pDescFull) : pDescFull;
    pInfo.title = `${p.base.skillName}: ${pDesc}\n${cd}`;
  }

  $("eName").textContent = e.name;

  // Rarity
  const er = getCardRarity(e.id);
  const erEl = $("eRarity");
  if (erEl) { erEl.textContent = er; applyRarityPill(erEl, er); }
  try { applyRarityFrame(document.getElementById("enemyCard"), er); } catch(e) {}
  try { applyRarityFrame(document.getElementById("enemyCard"), er); } catch(e) {}
  $("eImg").src = e.img;
  $("eSkillTag").textContent = `${e.base.skillName}`;

  const eInfo = $("eInfo");
  if (eInfo) {
    const cd = (e.cooldown || 0) > 0 ? `Cooldown: ${e.cooldown} turn(s)` : "Ready";
    const beginnerTip = isBeginnerMode();
    const eDescFull = String(e.base.skillDesc || "");
    const eDescShort = eDescFull.split(/\n|\.|\!/)[0].trim();
    const eDesc = beginnerTip ? (eDescShort ? (eDescShort + (eDescShort.length < eDescFull.length ? "…" : "")) : eDescFull) : eDescFull;
    eInfo.title = `${e.base.skillName}: ${eDesc}\n${cd}`;
  }

  // ✅ Auto-scale arena text (names/skills) based on length (PVP + PVE safe)
  try { autoScaleArenaText(); } catch (e) {}

  setText("pHP", `${p.hp}/${p.maxHp}`);
  // ✅ Sync the HP number with the ❤️ HP stat shown on the card
  const pHPIcon = document.getElementById("pHPIcon");
  if (pHPIcon) pHPIcon.textContent = `${p.hp}/${p.maxHp}`;
  // ✅ Some UI layouts show ATK/DEF under the image (pATKIcon/pDEFIcon).
  // Older layouts used pATK/pDEF. Support both to avoid crashes that disable battle buttons.
  const pAtkEl = document.getElementById("pATK") || document.getElementById("pATKIcon");
  if (pAtkEl) pAtkEl.textContent = p.atk;
  const pDefEl = document.getElementById("pDEF") || document.getElementById("pDEFIcon");
  if (pDefEl) pDefEl.textContent = p.def;
  setText("pShield", p.def);

  setText("eHP", `${e.hp}/${e.maxHp}`);
  const eHPIcon = document.getElementById("eHPIcon");
  if (eHPIcon) eHPIcon.textContent = `${e.hp}/${e.maxHp}`;
  const eAtkEl = document.getElementById("eATK") || document.getElementById("eATKIcon");
  if (eAtkEl) eAtkEl.textContent = e.atk;
  const eDefEl = document.getElementById("eDEF") || document.getElementById("eDEFIcon");
  if (eDefEl) eDefEl.textContent = e.def;
  setText("eShield", e.def);

  setWidth("pHpBar", `${Math.round((p.hp / p.maxHp) * 100)}%`);
  setWidth("eHpBar", `${Math.round((e.hp / e.maxHp) * 100)}%`);

  setWidth("pShieldBar", `${Math.round((p.shield / getShieldCap(p)) * 100)}%`);
  setWidth("eShieldBar", `${Math.round((e.shield / getShieldCap(e)) * 100)}%`);

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

  // ✅ Status icons under each card (tap/hover for explanation)
  renderStatusIcons(p, "pStatusIcons");
  renderStatusIcons(e, "eStatusIcons");

  const playerTurn = state.turn === "player" && state.phase === "battle";
  $("btnAttack").disabled = !playerTurn;
  // Skill button: disable while cooldown is running (turn-based OR real-time) and while Silenced.
  // Also add visual states so it feels like the Potion cooldown.
  const bs = $("btnSkill");
  if (bs) {
    const cdTurns = Math.max(0, Number(p.cooldown || 0) || 0);
    const rtCd = (p.skillReadyAt && p.skillReadyAt > Date.now());
    const sil = isSilenced(p);
    const onCd = rtCd || cdTurns > 0;
    const ready = playerTurn && !sil && !onCd;

    // Not clickable during cooldown/silence, clickable when ready
    // ✅ Keep hover tooltip working even while on cooldown.
    // Some browsers don't show tooltips on disabled buttons.
    bs.disabled = !playerTurn;

    // Text + hover tooltip
    if (!playerTurn) {
      bs.textContent = "✨ Use Skill";
    } else if (sil) {
      bs.textContent = "🔇 Silenced";
    } else if (onCd) {
      const cdLabel = rtCd ? formatSkillCd(p) : `${cdTurns} turn(s)`;
      bs.textContent = `⏳ Skill CD: ${cdLabel}`;
    } else {
      bs.textContent = "✨ Use Skill";
    }

    const cdTip = sil
      ? "Silenced: you cannot use your skill right now."
      : (onCd
        ? `Cooldown remaining: ${rtCd ? formatSkillCd(p) : `${cdTurns} turn(s)`}`
        : "Ready!");
    bs.title = buildSkillHoverText(p, cdTip);

    // Visual states
    bs.classList.toggle("skillReady", ready);
    bs.classList.toggle("skillCooldown", playerTurn && !ready);
  }
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

// =========================
// 🎮 PVP UI wiring inside updateUI()
// =========================
if (isPvpActive()) {
  pvpSetControlsVisible(true);
  pvpSetTopPills();
  pvpSetModeLabel();
  pvpRenderBench();

  // Better turn indicators (dock highlight + top turn pill)
  try {
    const d1 = document.getElementById("p1Dock");
    const d2 = document.getElementById("p2Dock");
    if (d1) d1.classList.toggle("pvpTurnActive", (state.turn === "player") && state.phase === "battle");
    if (d2) d2.classList.toggle("pvpTurnActive", (state.turn === "enemy") && state.phase === "battle");

    const tt = document.getElementById("turnTag");
    if (tt) {
      const isP1Turn = (state.turn === "player") && state.phase === "battle";
      tt.textContent = `Turn: ${isP1Turn ? "Player 1" : "Player 2"}`;
      tt.classList.remove("pvpTurnP1", "pvpTurnP2");
      tt.classList.add(isP1Turn ? "pvpTurnP1" : "pvpTurnP2");
    }
  } catch (e) {}

  // Disable PvE dock buttons (but keep them safe)
  try {
    const a = document.getElementById("btnAttack"); if (a) a.disabled = true;
    const s = document.getElementById("btnSkill");  if (s) s.disabled = true;
    const ebtn = document.getElementById("btnEnd"); if (ebtn) ebtn.disabled = true;
    const ptn = document.getElementById("btnPotion"); if (ptn) ptn.disabled = true;
  } catch (e) {}

  // Enable only the current side's buttons
  const p1Turn = (state.turn === "player") && state.phase === "battle";
  const p2Turn = (state.turn === "enemy") && state.phase === "battle";

  const setBtn = (id, on, extraDisabled) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = !on || !!extraDisabled;
    el.classList.toggle("isDisabled", el.disabled);
  };

  // Skill availability checks per side
  const p1SkillBlocked = (!isSkillReady(state.player)) || isSilenced(state.player) || (state.player.frozen > 0) || (state.player.stun2Rounds > 0);
  const p2SkillBlocked = (!isSkillReady(state.enemy))  || isSilenced(state.enemy)  || (state.enemy.frozen > 0)  || (state.enemy.stun2Rounds > 0);

  const p1SwapCd = Number(state?.pvp?.p1SwapCd||0)||0;
const p2SwapCd = Number(state?.pvp?.p2SwapCd||0)||0;
const p1PotCd  = Number(state?.pvp?.p1PotionCd||0)||0;
const p2PotCd  = Number(state?.pvp?.p2PotionCd||0)||0;

  // Ensure Tag-In (swap) buttons are visible in team modes (2v2 / 5v5)
  try {
    const showTag = getPvpTeamSize() > 1;
    const t1 = document.getElementById("p1Tag");
    const t2 = document.getElementById("p2Tag");
    if (t1) t1.style.display = showTag ? "" : "none";
    if (t2) t2.style.display = showTag ? "" : "none";
  } catch (e) {}

setBtn("p1Attack", p1Turn, (state.player.frozen > 0) || (state.player.stun2Rounds > 0));
setBtn("p1Skill",  p1Turn, p1SkillBlocked);
setBtn("p1Potion", p1Turn, p1PotCd > 0 || !(state?.pvp?.p1Potions||[]).length);
setBtn("p1End",    p1Turn, false);
setBtn("p1Tag",    p1Turn, getPvpTeamSize() <= 1 || p1SwapCd > 0);

setBtn("p2Attack", p2Turn, (state.enemy.frozen > 0) || (state.enemy.stun2Rounds > 0));
setBtn("p2Skill",  p2Turn, p2SkillBlocked);
setBtn("p2Potion", p2Turn, p2PotCd > 0 || !(state?.pvp?.p2Potions||[]).length);
setBtn("p2End",    p2Turn, false);
setBtn("p2Tag",    p2Turn, getPvpTeamSize() <= 1 || p2SwapCd > 0);

// Button labels for cooldown feedback
try{
  const t1 = document.getElementById("p1Tag");
  if (t1) {
    t1.textContent = p1SwapCd>0 ? `🔁 Tag-In (CD ${p1SwapCd})` : "🔁 Tag-In";
    t1.classList.add("pvpSwapBtn");
    t1.classList.toggle("pvpSwapCooldown", p1SwapCd>0);
    t1.setAttribute("data-cd", p1SwapCd>0 ? String(p1SwapCd) : "");
    t1.title = p1SwapCd>0 ? `Swap cooldown: ${p1SwapCd} turn(s)` : "Swap / Tag-In a teammate";
  }
  const t2 = document.getElementById("p2Tag");
  if (t2) {
    t2.textContent = p2SwapCd>0 ? `🔁 Tag-In (CD ${p2SwapCd})` : "🔁 Tag-In";
    t2.classList.add("pvpSwapBtn");
    t2.classList.toggle("pvpSwapCooldown", p2SwapCd>0);
    t2.setAttribute("data-cd", p2SwapCd>0 ? String(p2SwapCd) : "");
    t2.title = p2SwapCd>0 ? `Swap cooldown: ${p2SwapCd} turn(s)` : "Swap / Tag-In a teammate";
  }
  const p1b = document.getElementById("p1Potion");
  if (p1b) p1b.textContent = p1PotCd>0 ? `🧪 Potion (CD ${p1PotCd})` : "🧪 Potion";
  const p2b = document.getElementById("p2Potion");
  if (p2b) p2b.textContent = p2PotCd>0 ? `🧪 Potion (CD ${p2PotCd})` : "🧪 Potion";
}catch(e){}
} else {
  // If we exit PVP, restore normal dock visibility
  try { pvpSetControlsVisible(false); } catch(e) {}
}

  // 😵 Fatigue visuals (card gets 'tired' / glitchy in late rounds)
  try { applyFatigueCardVisuals(); } catch (e) {}

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
        
        // ✅ Omni defeated (Story Boss) → unlock boss cards for Gallery/Battle + make them playable
        if (!state.missions) state.missions = {};
        state.missions.omniDefeated = true;

        // Make boss cards usable in Battle/Setup as player cards
        if (!state.owned) state.owned = {};
        state.owned.awakenedMonster = true;
        state.owned.omni = true;

        // ✅ Persist immediately so Phase 2 stays unlocked even after refresh.
        try { saveProgress(); } catch (e) {}

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

      // ✅ NEW Mission 1: first win
      if (!state.missions.m1FirstWin) {
        state.missions.m1FirstWin = true;
        try { showToast("🎯 Mission 1 complete: First win!", "good"); } catch (e) {}
      }

      // ✅ NEW Mission 5: win a Quick Duel (Profile → 1v1)
      if (state.duelMode && !state.missions.m5DuelWin) {
        state.missions.m5DuelWin = true;
        try { showToast("🎯 Mission 5 complete: Duel victory!", "good"); } catch (e) {}
      }

      // Mission 6 reward (Cosmo Secret) is handled by the *win streak* system:
      // - Must be 50 straight wins (loss resets)
      // - Only shows the Cosmo Revelation modal the first time it is unlocked
      // See: applyWinStreakMilestones() -> unlockSecretStreakCard().

      // Mission 7: Defeat Cosmo Revelation
      if (e && e.id === "cosmoSecret") {
        state.missions.cosmoRevelationDefeated = true;
        // Unlock Diablo ...
        state.missions.diabloUnlocked = true;
      }
      // Mission 8: Defeat Diablo
      if (e && e.id === "diablo") {
        state.missions.diabloDefeated = true;
        // Unlock Entity after Mission 3
        state.missions.entityUnlocked = true;
      }
      // Mission 9: Defeat Entity (relicbornTitan)
      // IMPORTANT: Mission 9 is only "active" after Mission 8 is complete (Diablo defeated).
      // If Entity is defeated early (via dev tools/edge cases), do NOT grant Mission 4 rewards.
      if (e && e.id === "relicbornTitan" && isMission8Complete() && state.missions.entityUnlocked) {
        state.missions.entityDefeated = true;

        // ✅ Reward: unlock the Entity card for the player.
        // (Still hard-gated for use until Mission 9 is complete via isCardUsableByPlayer().)
        if (!state.owned) state.owned = {};
        state.owned.relicbornTitan = true;
        log(`🎁 UNLOCKED: Entity card added to your collection!`, "good");
      }

      // Mission 10: Defeat the Awakened Monster
      if (e && e.id === "awakenedMonster" && state.missions.entityDefeated) {
        state.missions.awakenMonsterDefeated = true;
      }

      // Mission 11: Defeat Anti-Matter (unlocks the Boss Fight)
      if (e && e.id === "antiMatter" && state.missions.antiMatterUnlocked) {
        state.missions.antiMatterDefeated = true;
      }

      // 👑 After Mission 11: reveal the God of All Gods story + unlock boss button
      if (state.missions.antiMatterDefeated && !state.missions.godOfAllGodsModalShown) {
        try { saveProgress(); } catch(e) {}
        try { showGodOfAllGodsAwakenedModal(); } catch(e) {}
      }

      try { saveProgress(); } catch(e) {}
      try { if (state.currentView === "home") updateMissionText(); } catch(e) {}

      // 🕳️ Mission 10 reward: Anti-Matter (ONE-TIME popup + unlock)
      // Trigger when the Awakened Monster is defeated.
      if (e && e.id === "awakenedMonster") {
        const m1 = isMission6Complete();
        const m2 = isMission7Complete();
        const m3 = isMission8Complete();
        const m4 = isMission9Complete();
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

      // ✅ NEW Mission 2: reach Stage 5 in a run
      if (!state.missions.m2ReachedStage5 && Number(state.stage || 0) >= 5 && !state.storyBossFight) {
        state.missions.m2ReachedStage5 = true;
        try { showToast("🎯 Mission 2 complete: Stage 5 reached!", "good"); } catch (e) {}
      }

      spawnNextEnemy();
    }, 2200);

    return true;
  }

  return false;
}

function nextTurn() {
  try {
    if (state.phase !== "battle") return;

  // In PVP mode, turns are controlled manually by the two docks.
  if (isPvpActive()) { updateUI(); return; }

  
if (state.turn === "player") tickStatuses(state.player);
  else tickStatuses(state.enemy);

  // ✅ Ey-Ji-Es passive: every 2 turns, increase enemy ability cooldown +2 and gain +1 Armor
  try {
    const cur = state.turn === "player" ? state.player : state.enemy;
    const foe = state.turn === "player" ? state.enemy : state.player;
    if (cur && cur.id === "eyJiEs" && cur.hp > 0 && foe && foe.hp > 0) {
      cur.eyjiesTurns = Number(cur.eyjiesTurns || 0) + 1;
      if (cur.eyjiesTurns % 2 === 0) {
        foe.cooldown = Math.max(0, Number(foe.cooldown || 0)) + 2;
        gainShield(cur, 1);
        log(`⏳ ${cur.name}'s passive triggers! ${foe.name}'s ability cooldown +2. ${cur.name} gains +1 Armor.`, state.turn === "player" ? "good" : "bad");
      }
    }
  } catch (e) {}

  // ✅ Status effects (poison/debuff) can kill — resolve win/lose immediately
  if (checkWin()) return;

  state.turn = state.turn === "player" ? "enemy" : "player";

  // 🌌 Void Collapse: turn-start TRUE damage (can end the fight)
  try {
    const curVoid = state.turn === "player" ? state.player : state.enemy;
    applyVoidTurnStartDamage(curVoid);
    if (checkWin()) return;
  } catch (e) {}

  // ✅ Halaka passive (turn start):
  // Default Form: +1 Armor every turn.
  // Reality Form: Basic attacks become 5 TRUE damage (handled in attack logic) and gains +1 Health +1 Defense every turn (stackable).
  try {
    const cur = state.turn === "player" ? state.player : state.enemy;
    if (cur && cur.id === "halaka" && Number(cur.hp || 0) > 0) {
      const isReality = cur.halakaForm === "reality";
      if (isReality) {
        // +1 Health (stackable): increase maxHp then heal 1
        cur.maxHp = Math.max(1, Number(cur.maxHp || cur.hp || 1) || 1) + 1;
        const healed = healUnit(cur, 1, { source: "passive" });

        // +1 Defense (stackable): raise shield cap then gain 1 armor
        cur.shieldCap = Math.max(0, Number(cur.shieldCap || cur.shield || cur.def || 0) || 0) + 1;
        const gained = gainShield(cur, 1);

        log(`🗡️ ${cur.name} (Reality Form) grows: +${healed} Health, +${gained} Defense.`, state.turn === "player" ? "good" : "bad");
      } else {
        if (!canGainArmor(cur)) {
          log(`🛡️ ${cur.name}'s passive tried to grant Armor, but Armor gain is blocked!`, state.turn === "player" ? "warn" : "warn");
        } else {
          const gained = gainShield(cur, 1);
          log(`🛡️ ${cur.name}'s passive grants +${gained} Armor.`, state.turn === "player" ? "good" : "bad");
        }
      }
      updateUI();
    }
  } catch (e) {}

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

    // 🌌 Void Collapse: milestone effects at round 15 / 20 / 25
    applyVoidCollapseRoundStart();
    applyFatigueRoundStart();
    applyFinalMomentsRoundStart();
    applyEquippedRelicTurnStart();
    tryEnemyPassive();
  }

    if (!isPvpActive() && state.turn === "enemy") setTimeout(enemyAI, 420);
    // PVP: enemy turn is controlled by Player 2 buttons.
  } catch (e) {
    try { console.error(e); } catch (err) {}
    try { battleRecoverFromError(e); } catch (err2) {}
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
    try { combatFeedClear("fast"); } catch(e) {}
    if (isSilenced(e)) {
      log(`${e.name} is Silenced and cannot use a skill!`, "warn");
    } else {
      const res = e.base.skill(e, p, state);
      if (res && res.ok) {
        log(`✨ Enemy uses skill: ${res.msg}`, "bad", { src: e.name, tgt: p.name, kind: "skill" });

        // ✅ META: Mark recoil — using skill while Marked causes 4 recoil damage
        if (e.mark && e.mark > 0) {
          applyDamage(e, 4, { source: "status", damageType: "true", attackerName: "Mark Recoil", _markRecoil: true });
          log(`🎯 Mark recoil! ${e.name} takes 4 damage for using a skill while Marked.`, "warn");
        }

        // ✅ META: Constellation Curse — skill cooldown becomes +1 longer while cursed
        if (e.constellationCurse && e.constellationCurse > 0) {
          e.cooldown = Math.max(0, Number(e.cooldown || 0) || 0) + 1;
          log(`🌙 Constellation Curse extends ${e.name}'s cooldown by +1.`, "warn");
        }
        playSfx("sfxSkill", 0.75);
        updateUI();
        // ✅ If the skill ended the fight, stop here. Otherwise continue to the normal attack.
        if (checkWin()) return;
      } else if (res && res.ok === false) {
        log(`✨ Enemy tried skill: ${res.msg}`, "warn");
      }
    }
  }

  
const isEyjies = e && e.id === "eyJiEs";
const isHalakaReality = e && e.id === "halaka" && e.halakaForm === "reality";

// Ey-Ji-Es keeps its special: always 5 TRUE on basic attacks.
// ✅ Halaka Reality Form: basic attacks become TRUE damage equal to Halaka's CURRENT damage.
const dmg = isEyjies ? dmgCalcNoRng(e) : (isHalakaReality ? dmgCalcNoRng(e) : dmgCalc(e));
const dmgType = isEyjies ? "true" : (isHalakaReality ? "true" : "physical");
try { combatFeedClear("fast"); } catch(e) {}
  log(`${e.name} attacks for ${dmg} damage!`, "bad", { src: e.name, tgt: p.name, kind: "attack" });
playSfx("sfxAttack", 0.75);

spawnAttackFx("enemy", "player");
applyDamage(p, dmg, { source: "attack", damageType: dmgType, attacker: e, attackerName: e.name });

  if (!checkWin()) nextTurn();
}

// =========================
// PLAYER ACTIONS
// =========================
function playerAttack() {
  state.lastAction = "attack";
  try { combatFeedClear("fast"); } catch(e) {}
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

  const isZuki = p && p.id === "zukinimato";
  const zukiTrue = isZuki && (p.zukiForm >= 6 || p.zukiTrueAttack);

  const doOneAttack = (prefixMsg = "") => {
    
const isEyjies = p && p.id === "eyJiEs";
const isHalakaReality = p && p.id === "halaka" && p.halakaForm === "reality";

// Ey-Ji-Es keeps its special: always 5 TRUE on basic attacks.
// ✅ Halaka Reality Form: basic attacks become TRUE damage equal to Halaka's CURRENT damage.
const dmg = isEyjies ? dmgCalcNoRng(p) : (isHalakaReality ? dmgCalcNoRng(p) : dmgCalc(p));
const dmgType = isEyjies ? "true" : (isHalakaReality ? "true" : (zukiTrue ? "true" : "physical"));
log(`${prefixMsg}${p.name} attacks for ${dmg} damage!`, "good", { src: p.name, tgt: e.name, kind: "attack" });

spawnAttackFx("player", "enemy");
applyDamage(e, dmg, { source: "attack", damageType: dmgType, attacker: p, attackerName: p.name });

    // ✅ Zukinimato Form 6/7: extra random true damage each basic attack
    if (zukiTrue && p.zukiRandomTrue) {
      const extra = Math.floor(Math.random() * (50 - 30 + 1)) + 30;
      log(`⚡ ${p.name} deals an extra ${extra} TRUE damage!`, "good");
      applyDamage(e, extra, { source: "attack", damageType: "true", attacker: p, attackerName: p.name });
    }

    // ✅ Zukinimato Form 6: growth per attack (+5 DEF/+5 HP)
    if (zukiTrue && p.zukiGrowthOnAttack) {
      gainShield(p, 5);
      p.maxHp = Number(p.maxHp || p.hp || 0) + 5;
      if (canHeal(p)) {
        p.hp = Math.min(p.maxHp, Number(p.hp || 0) + 5);
      }
      updateUI();
      log(`🛡️ ${p.name} gains +5 DEF and +5 HEALTH from attacking!`, "good");
    }

    // Vampire Fang triggers on each attack
    if (hasRelic("vampireFang")) {
      const healed = heal(p, 1, { source: "relic" });
      if (healed > 0) {
        log(`🪬 Vampire Fang heals you +1 HP.`, "good");
        floatingDamage("player", "+1", "good");
      } else {
        log(`🪬 Vampire Fang tried to heal, but Reboot Seal blocked it!`, "warn");
      }
    }
  };

  doOneAttack("");

  // ✅ OP Relic: Chrono Rune (20% chance to attack twice)
  if (hasRelic("chronoRune") && e && Number(e.hp) > 0 && Math.random() < 0.20) {
    doOneAttack("⏳ Chrono Rune triggers! Extra attack! ");
  }

  if (!checkWin()) nextTurn();
}

function playerSkill() {
  state.lastAction = "skill";
  try { combatFeedClear("fast"); } catch(e) {}
  const p = state.player, e = state.enemy;
  // Safety: prevent skill usage when cooldown is running (turn-based OR real-time)
  if (!isSkillReady(p)) {
    const cdTurns = Math.max(0, Number(p.cooldown || 0) || 0);
    const rtCd = (p.skillReadyAt && p.skillReadyAt > Date.now());
    const cdLabel = rtCd ? formatSkillCd(p) : `${cdTurns} turn(s)`;
    log(`${p.name}'s skill is on cooldown (${cdLabel}).`, "warn");
    updateUI();
    return;
  }
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

  // ✅ META: Mark recoil — using skill while Marked causes 4 recoil damage
  if (p.mark && p.mark > 0) {
    applyDamage(p, 4, { source: "status", damageType: "true", attackerName: "Mark Recoil", _markRecoil: true });
    log(`🎯 Mark recoil! ${p.name} takes 4 damage for using a skill while Marked.`, "warn");
  }

  // ✅ META: Constellation Curse — skill cooldown becomes +1 longer while cursed
  if (p.constellationCurse && p.constellationCurse > 0) {
    p.cooldown = Math.max(0, Number(p.cooldown || 0) || 0) + 1;
    log(`🌙 Constellation Curse extends ${p.name}'s cooldown by +1.`, "warn");
  }

  playSfx("sfxSkill", 0.8);
  log(res.msg, "good", { src: p.name, tgt: e.name, kind: "skill" });

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
    const mhp = Math.max(1, Number(p.maxHp || 1) || 1);
    p.maxHp = mhp;
    p.hp = mhp;
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

      // 🎯 Mission 3: Use any potion in battle
      try {
        ensureMissionUnlockDefaults();
        if (!state.missions.m3UsedPotion) {
          state.missions.m3UsedPotion = true;
          try { saveProgress(); } catch (e) {}
          try { if (state.currentView === "home") updateMissionText(); } catch (e) {}
          try { showToast("🎯 Mission 3 complete: Potion used!", "good"); } catch (e) {}
        }
      } catch (e) {}

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

    // Card is already filtered through isCardUsableByPlayer(), so anything rendered here is pickable.
    div.className = "cardPick";
    try { applyRarityFrame(div, getCardRarity(card.id)); } catch(e) {}
    div.innerHTML = `
      <img src="${card.img}" alt="${card.name}" />
      <div class="titleRow" style="margin-top:10px;">
        <strong>${card.name}${st.level>0 ? ` Lv${st.level}` : ""}</strong>
        <span class="pill">Damage ${st.atk} • Armor ${st.def} • Life ${st.hp}</span>
      </div>
      <div class="muted" style="margin-top:6px;">
        <b>${card.skillName}:</b> ${card.skillDesc}
      </div>
    `;

    div.onclick = () => {
      playSfx("sfxClick", 0.45);
      startGame(card.id);
    };
    grid.appendChild(div);
  });
}

function renderGallery() {
  const grid = $("galleryGrid");
  if (!grid) return;
  grid.innerHTML = "";

  // ✅ Gallery should show ALL cards (base + all shop/redeem defs), even if locked/unowned
  const all = getGalleryCards();

  // Filter / Sort by rarity (UI controls)
  const gFilter = document.getElementById("galleryRarityFilter");
  const gSort = document.getElementById("galleryRaritySort");
  const filterVal = gFilter ? String(gFilter.value || "All") : "All";
  const sortVal = gSort ? String(gSort.value || "default") : "default";

  let list = Array.isArray(all) ? all.slice() : [];
  if (filterVal && filterVal !== "All") {
    list = list.filter(c => getCardRarity(c.id) === filterVal);
  }

  const rarityRank = (id) => {
    const r = getCardRarity(id);
    const i = RARITY_ORDER.indexOf(r);
    return i >= 0 ? i : 0;
  };

  if (sortVal === "rarityDesc") {
    list.sort((a,b) => (rarityRank(b.id) - rarityRank(a.id)) || String(a.name||"").localeCompare(String(b.name||""), undefined, { sensitivity:"base" }));
  } else if (sortVal === "rarityAsc") {
    list.sort((a,b) => (rarityRank(a.id) - rarityRank(b.id)) || String(a.name||"").localeCompare(String(b.name||""), undefined, { sensitivity:"base" }));
  } else if (sortVal === "nameAsc") {
    list.sort((a,b) => String(a.name||"").localeCompare(String(b.name||""), undefined, { sensitivity:"base" }));
  } else {
    // default: keep original order
  }

  list.forEach((card) => {
    const div = document.createElement("div");
    const st = (typeof getUpgradedStats === 'function') ? getUpgradedStats(card) : { atk: card.atk, def: card.def, hp: card.hp, level: 0 };

    div.className = "cardPick";
    const rarity = getCardRarity(card.id);
    try { applyRarityFrame(div, rarity); } catch(e) {}

    const enemyOnly = !!card.enemyOnly;
    const lockTag = enemyOnly ? " 🔒" : "";

    div.innerHTML = `
      <img src="${card.img}" alt="${card.name}" />
      <div class="titleRow" style="margin-top:10px;">
        <strong>${card.name}${st.level>0 ? ` Lv${st.level}` : ""}${lockTag}</strong>
        <span class="rarityPill ${rarityCssClass(rarity)} rarityInline">${rarity}</span>
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
      tip.textContent = (card.lore || CARD_LORE[card.id]) || `No lore available yet for ${card.name}.`;

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

  // ✅ 1%: Card (Siyokou)
  if (r < LUCKY_DRAW.legendaryChance) {
    return {
      type: "card",
      id: "siyokou",
      title: "CARD — Siyokou",
      icon: "🌟",
      rarity: "legendary",
      // Provide an image fallback so the Legendary popup can always show the card art.
      img: (typeof UNLOCKABLE_CARD_DEFS !== "undefined" && UNLOCKABLE_CARD_DEFS && UNLOCKABLE_CARD_DEFS.siyokou && UNLOCKABLE_CARD_DEFS.siyokou.img) ? UNLOCKABLE_CARD_DEFS.siyokou.img : "",
      desc: "Unlocked: Siyokou (1% drop)."
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

// 🌟 Screen flash (used for jackpot moments)
function luckyFlash(durationMs = 550) {
  const el = document.createElement("div");
  el.className = "luckyFlash";
  document.body.appendChild(el);
  setTimeout(() => { try { el.remove(); } catch(e) {} }, Math.max(200, durationMs));
}

// 🌟 Legendary Jackpot modal (separate from normal Lucky Draw modal)
function openJackpotModal(reward, onContinue) {
  const modal = $("jackpotModal");
  if (!modal) {
    // If modal isn't in DOM, fallback to confetti + normal modal
    try { luckyFlash(550);
    confettiBurst(140); } catch(e) {}
    if (typeof onContinue === "function") onContinue();
    return;
  }

  const title = $("jackpotTitle");
  const sub = $("jackpotSub");
  const showcase = $("jackpotShowcase");

  if (title) title.textContent = "LEGENDARY UNLOCKED!";
  if (sub) sub.textContent = (reward?.title || "A rare reward") + " • 1% drop";

  if (showcase) {
    const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    let cardHtml = "";

    if (reward?.type === "card") {
      const idRaw = String(reward.id || "");
      const id = idRaw.trim();
      const idKey = id.toLowerCase();
      const def =
        (typeof findCardById === "function" ? (findCardById(idKey) || findCardById(id)) : null) ||
        (typeof UNLOCKABLE_CARD_DEFS !== "undefined" && UNLOCKABLE_CARD_DEFS ? (UNLOCKABLE_CARD_DEFS[idKey] || UNLOCKABLE_CARD_DEFS[id]) : null) ||
        (typeof ALL_CARDS !== "undefined" && Array.isArray(ALL_CARDS) ? (ALL_CARDS.find(c => String(c.name||"").toLowerCase()===idKey) || ALL_CARDS.find(c => String(c.id||"").toLowerCase()===idKey)) : null);


      const img = (def && def.img) ? def.img : (reward && reward.img ? reward.img : "");
      const name = (def && def.name) ? def.name : (reward?.title || id);
      const atk = Number(def && def.atk);
      const deff = Number(def && def.def);
      const hp = Number(def && def.hp);

      cardHtml = `
        <div class="jackpotCardWrap">
          <div class="luckyCard jackpot flipIn">
            <div class="luckyCardTop">
              <div>
                <div class="luckyCardName">${esc(name)}</div>
                <div class="muted">Legendary Card • NEW</div>
              </div>
              <div class="luckyBigIcon">${reward?.icon || "🌟"}</div>
            </div>
            <div class="luckyCardBody">
              ${img ? `<img class="cardImg jackpotRewardImg" src="${esc(img)}" alt="${esc(name)}" />` : ""}
              ${(Number.isFinite(atk) && Number.isFinite(deff) && Number.isFinite(hp)) ? `
                <div class="statIcons underImg jackpotStats">
                  <span class="statIcon" title="Attack">⚔️ <b>${atk}</b></span>
                  <span class="statIcon" title="Defense">🛡️ <b>${deff}</b></span>
                  <span class="statIcon" title="Health">❤️ <b>${hp}</b></span>
                </div>
              ` : ""}
            </div>
          </div>
        </div>
      `;
    }

    showcase.innerHTML = `
      <div class="jackpotBigIcon">${reward?.icon || "🌟"}</div>
      <div class="jackpotHeadline">${esc(reward?.title || "Legendary Reward")}</div>
      ${cardHtml || ""}
      <div class="muted jackpotDesc">${esc(reward?.desc || "You hit the rarest drop!")}</div>
    `;
  }

  // store callback
  state._jackpotContinue = (typeof onContinue === "function") ? onContinue : null;

  modal.style.display = "flex";
  // EXTRA JUICE
  try { luckyFlash(550); } catch(e) {}
  try { playSfx("sfxJackpot", 0.98); } catch(e) {}
  try { confettiBurst(130); } catch(e) {}
}

function closeJackpotModal() {
  const modal = $("jackpotModal");
  if (modal) modal.style.display = "none";
  const cb = state._jackpotContinue;
  state._jackpotContinue = null;
  if (typeof cb === "function") cb();
}

// 🎬 A little "slow-mo" sequence before showing the jackpot modal
function runJackpotSequence(reward, thenOpen) {
  // quick flash + shake, then modal
  try { luckyFlash(500); } catch(e) {}
  try {
    const machine = $("luckyMachine");
    if (machine) {
      machine.classList.remove("luckyShake");
      void machine.offsetWidth;
      machine.classList.add("luckyShake");
    }
  } catch(e) {}

  setTimeout(() => {
    openJackpotModal(reward, thenOpen);
  }, 420);
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
      luckyFlash(550);
      confettiBurst(120);
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
    const list = Array.isArray(state.luckyPendingRewards) ? state.luckyPendingRewards : [];
    const first = list[0];

    // 🌟 If any legendary hit, show a special jackpot modal first (then reveal normal results).
    const legendary = list.find((x) => x && x.rarity === "legendary");

    const reveal = () => {
      if (n === 5) openLuckyModal(list);
      else openLuckyModal(first);
      if (b1) b1.disabled = false;
      if (b5) b5.disabled = false;
    };

    if (legendary) runJackpotSequence(legendary, reveal);
    else reveal();
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
    showToast("Complete Mission 11 (Defeat Anti-Matter) to unlock Omni.", "warn");
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
  state.voidCollapse = { level: 0, healMult: 1, armorMult: 1, truePerTurn: 0 };

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
  const mission1Active = (typeof isMission1Complete === "function") ? !isMission6Complete() : false;
  const isStage1 = true;
  if (mission1Active || isStage1) {
    pool = (pool || []).filter((c) => {
      if (!c) return false;
      if (c.id === "relicbornTitan") return false;
      if (c.id === "awakenedMonster") return !!(state && state.missions && state.missions.omniDefeated);
      return true;
    });
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
      isMission6Complete() &&
      isMission7Complete() &&
      isMission8Complete() &&
      !isMission9Complete() &&
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
  state.voidCollapse = { level: 0, healMult: 1, armorMult: 1, truePerTurn: 0 };

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
  const _clone = (obj)=>{
    try{ return (typeof structuredClone==='function') ? structuredClone(obj) : JSON.parse(JSON.stringify(obj)); }
    catch(e){ return JSON.parse(JSON.stringify(obj||{})); }
  };

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
    if (!el) return;
    el.addEventListener("click", (ev) => {
      try {
        fn(ev);
      } catch (err) {
        try { console.error(err); } catch (e) {}
        // Recover from "battle freeze" (buttons disabled on enemy turn) by restoring player control.
        try { battleRecoverFromError(err); } catch (e) {}
      }
    });
  };

  // (battleRecoverFromError is now a global helper)

  // 🔁 PVP Rematch helper (replay the same teams/loadouts)
  function pvpStartFromConfig(cfg) {
    if (!cfg) return;
    // ✅ Rematch robustness: ensure we are on the battle view + clear any stale modal flags
    try { showView("game"); } catch (e) {}
    // ✅ Also clear any lingering death/gray flip visuals from the previous match
    try { resetCardVisuals(); } catch (e) {}
    try { closeModal(); } catch (e) {}
    try { state.modalAction = null; } catch (e) {}

    try { pvpStopTicker(); } catch (e) {}
    try { state.pvp = null; } catch (e) {}

    try {
      pvpStartMatch({
        teamSize: cfg.teamSize,
        p1CardIds: (cfg.p1CardIds || []).slice(),
        p2CardIds: (cfg.p2CardIds || []).slice(),
        pressure: !!cfg.pressure,
        turnSeconds: Number(cfg.turnSeconds || 20) || 20
      });
    } catch (e) {
      console.error("PVP rematch failed:", e);
      try { showToast("❌ Rematch failed. Check console for details.", "bad"); } catch (err) {}
      return;
    }

    // Restore loadouts + match-only counters
    state.pvp.p1RelicId = cfg.p1RelicId || "none";
    state.pvp.p2RelicId = cfg.p2RelicId || "none";
    state.pvp.p1Potions = Array.isArray(cfg.p1Potions) ? cfg.p1Potions.slice(0,2) : [];
    state.pvp.p2Potions = Array.isArray(cfg.p2Potions) ? cfg.p2Potions.slice(0,2) : [];
    state.pvp.p1SwapCd = 0;
    state.pvp.p2SwapCd = 0;
    state.pvp.p1PotionCd = 0;
    state.pvp.p2PotionCd = 0;
    // One use per selected potion (2 total uses)
    const a1 = state.pvp.p1Potions[0], b1 = state.pvp.p1Potions[1];
    const a2 = state.pvp.p2Potions[0], b2 = state.pvp.p2Potions[1];
    state.pvp.p1PotionCharges = { ...(a1 ? { [a1]: 1 } : {}), ...(b1 ? { [b1]: 1 } : {}) };
    state.pvp.p2PotionCharges = { ...(a2 ? { [a2]: 1 } : {}), ...(b2 ? { [b2]: 1 } : {}) };

    // Ensure controls are live
    try { pvpWireControls(); } catch (e) {}
    try { pvpSetControlsVisible(true); } catch (e) {}
    try { pvpApplyRelicStart("p1"); } catch (e) {}
    try { pvpApplyRelicStart("p2"); } catch (e) {}
    try { pvpResetTurnTimer(); } catch (e) {}
    try { pvpStartTicker(); } catch (e) {}

    try { updateUI(); } catch (e) {}
  

    // Persist this rematch config as the latest (keeps relics/potions in sync)
    try {
      state.pvpLastConfig = {
        teamSize: cfg.teamSize,
        p1CardIds: (cfg.p1CardIds || []).slice(),
        p2CardIds: (cfg.p2CardIds || []).slice(),
        pressure: !!cfg.pressure,
        turnSeconds: Number(cfg.turnSeconds || 20) || 20,
        p1RelicId: cfg.p1RelicId || "none",
        p2RelicId: cfg.p2RelicId || "none",
        p1Potions: Array.isArray(cfg.p1Potions) ? cfg.p1Potions.slice(0,2) : [],
        p2Potions: Array.isArray(cfg.p2Potions) ? cfg.p2Potions.slice(0,2) : []
      };
    } catch (e) {}
}

  // ✅ Global safety nets: if any promise/error slips through, avoid soft-locking the battle UI.
  window.addEventListener("error", (e) => {
    try { battleRecoverFromError(e && e.error ? e.error : e); } catch (err) {}
  });
  window.addEventListener("unhandledrejection", (e) => {
    try { battleRecoverFromError(e && e.reason ? e.reason : e); } catch (err) {}
  });

  // 💥 Tiny screen shake helper (used on skill cast)
  function screenShakeArena(intensityPx = 6, durationMs = 240) {
    try {
      const arena = document.getElementById("arenaCard") || document.querySelector(".arenaCard");
      if (!arena) return;
      arena.style.setProperty("--shake", `${Math.max(2, Number(intensityPx) || 6)}px`);
      arena.style.setProperty("--shakeDur", `${Math.max(120, Number(durationMs) || 240)}ms`);
      arena.classList.remove("arenaShake");
      // reflow to restart animation
      void arena.offsetWidth;
      arena.classList.add("arenaShake");
      setTimeout(() => {
        try { arena.classList.remove("arenaShake"); } catch (e) {}
      }, Math.max(120, Number(durationMs) || 240));
    } catch (e) {}
  }

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

  // PVP result: return to the PVP draft/setup
  if (state.modalAction === "pvp") {
    state.modalAction = null;
    const btnNext = $("btnNextEnemy");
    if (btnNext) btnNext.textContent = "⚔️ Next Enemy";
    const btnPlay = $("btnPlayAgain");
    if (btnPlay) btnPlay.style.display = "";

    const btnRematch = $("btnRematch");
    if (btnRematch) btnRematch.style.display = "none";

    closeModal();

    // Reset visuals + reopen PVP setup on the current page (battle.html).
    try { resetCardVisuals(); } catch (e) {}
    try { pvpStopTicker(); } catch (e) {}
    try { state.pvp = null; } catch (e) {}
    try { showView("game"); } catch (e) { state.currentView = "game"; }
    try { openPvpSetupModal(); } catch (e) { console.error(e); }
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

  // 🔁 Rematch (PVP result modal)
  safeOn("btnRematch", () => {
    if (state.phase !== "over") return;
    if (state.modalAction !== "pvp") return;

    playSfx("sfxClick", 0.45);
    closeModal();

    // ✅ Use last saved PVP config (same teams / timer settings)
    const cfg = state.pvpLastConfig;

    // If for some reason config is missing, fallback to PVP setup screen
    if (!cfg) {
      try { showToast("⚠️ No rematch data found. Returning to PVP setup.", "warn"); } catch (e) {}
      try { state.modalAction = null; } catch (e) {}
      try { state.pvp = null; } catch (e) {}
      try { showView("game"); } catch (e) { state.currentView = "game"; }
      try { openPvpSetupModal(); } catch (e) { console.error(e); }
      return;
    }

    // ✅ Fully restart the match
    try { state.modalAction = null; } catch (e) {}
    try { pvpStopTicker(); } catch (e) {}
    try { state.pvp = null; } catch (e) {}

    try { pvpStartFromConfig(cfg); } catch (e) {
      console.error("PVP rematch failed:", e);
      try { showToast("❌ Rematch failed. Check console for details.", "bad"); } catch (err) {}
    }
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
  
  safeOn("btnSkill", () => {
    playSfx("sfxClick", 0.35);

    const p = state.player;
    const playerTurn = state.turn === "player" && state.phase === "battle";

    // Not your turn → no action
    if (!playerTurn) return;

    // If not ready (cooldown/silence/etc.), let playerSkill() show the reason,
    // but don't play cast FX / shake.
    if (!isSkillReady(p) || isSilenced(p) || p.frozen > 0 || p.stun2Rounds > 0) {
      playerSkill();
      return;
    }

    // Cast FX only when actually ready
    const b = $("btnSkill");
    if (b) {
      b.classList.remove("skillCast");
      void b.offsetWidth; // reflow to restart animation
      b.classList.add("skillCast");
      setTimeout(() => { try { b.classList.remove("skillCast"); } catch (e) {} }, 380);
    }

    flashArenaOnSkill();
    screenShakeArena(6, 240);
    playerSkill();
  });
  safeOn("btnEnd", () => { playSfx("sfxClick", 0.35); playerEndTurn(); });
  safeOn("btnPotion", () => { playSfx("sfxClick", 0.35); usePotionFlow(); });
  safeOn("btnReset", () => { playSfx("sfxClick", 0.35); resetAll(); });

  // ✅ Battle UI ticker: keeps the Skill button cooldown text/state updating on real-time cooldowns.
  // (Without this, the button can stay in "CD" state until the next action triggers updateUI.)
  if (!window.__battleUiTicker) {
    window.__battleUiTicker = setInterval(() => {
      try {
        if (!state || state.phase !== "battle") return;
        const p = state.player;
        if (!p) return;
        // Only tick if we are using real-time cooldowns, or if a real-time cooldown just ended.
        if (p.skillReadyAt && Math.abs(p.skillReadyAt - Date.now()) < 8 * 60 * 1000) {
          updateUI();
        }
      } catch (e) {}
    }, 450);
  }

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
  // 🎮 PVP button (go to battle.html)
  safeOn("btnPvp", () => { try { playSfx("sfxClick", 0.45); } catch(e) {} window.location.href = "battle.html"; });
  safeOn("btnOpenGallery", () => { playSfx("sfxClick", 0.45); renderGallery(); showView("gallery"); });

  // Gallery filter/sort controls
  try {
    const gf = document.getElementById("galleryRarityFilter");
    const gs = document.getElementById("galleryRaritySort");
    if (gf) gf.addEventListener("change", () => { try { playSfx("sfxClick", 0.15); } catch(e) {} renderGallery(); });
    if (gs) gs.addEventListener("change", () => { try { playSfx("sfxClick", 0.15); } catch(e) {} renderGallery(); });
  } catch (e) {}

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

  function setCosmeticsTab(which){
    const tabs = ["Avatar","Frame","Skin","Aura","Bg"];
    tabs.forEach(t => {
      const btn = document.getElementById("cosNav"+t);
      if (btn) btn.classList.remove("miniTabActive");
    });
    const blocks = [
      { id:"avatarBlock", btn:"cosNavAvatar" },
      { id:"frameBlock", btn:"cosNavFrame" },
      { id:"skinBlock",  btn:"cosNavSkin" },
      { id:"auraBlock",  btn:"cosNavAura" },
      { id:"bgBlock",    btn:"cosNavBg" },
    ];
    blocks.forEach(b=>{
      const el = document.getElementById(b.id);
      if (el) el.style.display = (b.id.toLowerCase().includes(String(which||"").toLowerCase())) ? "" : "none";
    });
    const activeBtn = document.getElementById("cosNav"+which);
    if (activeBtn) activeBtn.classList.add("miniTabActive");
  }

  safeOn("cosNavAvatar", () => { playSfx("sfxClick", 0.25); setCosmeticsTab("Avatar"); });
  safeOn("cosNavFrame",  () => { playSfx("sfxClick", 0.25); setCosmeticsTab("Frame"); });
  safeOn("cosNavSkin",   () => { playSfx("sfxClick", 0.25); setCosmeticsTab("Skin"); });
  safeOn("cosNavAura",   () => { playSfx("sfxClick", 0.25); setCosmeticsTab("Aura"); });
  // ✅ New: Arena background mini-tab
  safeOn("cosNavBg",     () => { playSfx("sfxClick", 0.25); setCosmeticsTab("Bg"); });
  safeOn("btnSaveProfileName", () => {
    playSfx("sfxBuy", 0.55);
    const inp = document.getElementById("profileNameInput");
    state.profileName = inp ? String(inp.value || "").slice(0, 18) : String(state.profileName || "");
    saveProgress();
    renderProfileUI();
    log(`👤 Profile updated${state.profileName ? `: ${state.profileName}` : ""}.`, "good");
  });

  safeOn("btnRedeemCode", () => { playSfx("sfxClick", 0.45); redeemCodeFlow(); });

  // Redeem code input modal buttons
  safeOn("btnRedeemSubmit", () => { playSfx("sfxBuy", 0.55); submitRedeemCodeModal(); });
  safeOn("btnRedeemCancel", () => { playSfx("sfxClick", 0.25); closeRedeemCodeModal(); });
  safeOn("btnRedeemCancel2", () => { playSfx("sfxClick", 0.25); closeRedeemCodeModal(); });

  // Typing FX: add a quick "typing" class while the user enters the code
  const redeemInp = document.getElementById("redeemCodeInput");
  const redeemWrap = document.getElementById("redeemInputWrap");
  if (redeemInp && redeemWrap) {
    let t = null;
    redeemInp.addEventListener("input", () => {
      redeemWrap.classList.add("typing");
      if (t) clearTimeout(t);
      t = setTimeout(() => redeemWrap.classList.remove("typing"), 160);
    });
    redeemInp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitRedeemCodeModal();
      }
    });
  }

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

  // Click outside closes redeem code input modal
  const redeemCodeModal = document.getElementById("redeemCodeModal");
  if (redeemCodeModal) {
    redeemCodeModal.addEventListener("click", (e) => {
      if (e.target === redeemCodeModal) closeRedeemCodeModal();
    });
  }

  // ESC closes redeem reveal if open
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const m = document.getElementById("redeemRevealModal");
    if (m && m.style.display !== "none") closeRedeemRevealModal();

    const r = document.getElementById("redeemCodeModal");
    if (r && r.style.display !== "none") closeRedeemCodeModal();
  });
  safeOn("btnShopToBattle", () => { playSfx("sfxClick", 0.45); resetAll(); });

  safeOn("tabShopRelics", () => { playSfx("sfxClick", 0.35); setShopTab("relics"); });
  safeOn("tabShopCards", () => { playSfx("sfxClick", 0.35); setShopTab("cards"); });

  // Shop cards filter/sort controls
  try {
    const sf = document.getElementById("shopRarityFilter");
    const ss = document.getElementById("shopRaritySort");
    const rerender = () => { try { playSfx("sfxClick", 0.15); } catch(e) {} renderShopCards(); };
    if (sf) sf.addEventListener("change", rerender);
    if (ss) ss.addEventListener("change", rerender);
  } catch (e) {}

  safeOn("tabShopPotions", () => { playSfx("sfxClick", 0.35); setShopTab("potions"); });
  safeOn("tabShopPotions", () => { playSfx("sfxClick", 0.35); setShopTab("potions"); });

  // Lucky Draw buttons
  safeOn("btnLuckySingle", () => { playSfx("sfxClick", 0.45); doLuckyDraw(1); });
  safeOn("btnLuckyFive", () => { playSfx("sfxClick", 0.45); doLuckyDraw(5); });
  safeOn("btnLuckyClaim", () => { playSfx("sfxBuy", 0.65); claimLuckyRewards(); });
  safeOn("btnLuckyClose", () => { playSfx("sfxClick", 0.35); closeLuckyModal(); });
  safeOn("btnJackpotContinue", () => { playSfx("sfxClick", 0.45); closeJackpotModal(); });

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
  // If this page is battle.html with PVP forced, jump straight to the arena.
  if (window.__FORCE_PVP__) {
    try { showView("game"); } catch(e) { state.currentView = "game"; }
    // ensure battle controls exist
    try { pvpWireControls(); } catch(e) {}
    setTimeout(() => { try { openPvpSetupModal(); } catch(e) { console.error(e); } }, 50);
  } else {
    showView("home");
  }
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
        <div class="quickTips">
          <div class="quickTip">✅ <b>Attack</b> = deal damage</div>
          <div class="quickTip">✅ <b>Skill</b> = special move</div>
          <div class="quickTip">✅ <b>End Turn</b> = enemy attacks</div>
        </div>

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

// =========================
// 🆕 WHAT'S NEW / PATCH NOTES
// =========================

// Keep the latest note aligned to GAME_VERSION so the "NEW" badge clears correctly.
// You can add older versions below anytime.
const PATCH_NOTES = [
  {
    version: GAME_VERSION,
    date: "2026-01-27",
    title: "Battle QoL + Freeze Fix",
    highlights: [
      "Removed the on-screen Combat Feed overlay (battle log stays).",
      "Damage popups now stay on screen longer so players can read them.",
      "Fixed a battle soft-lock where the game could freeze after Attack/Ability."
    ],
    changes: [
      "Combat Feed feature removed (no more floating feed messages).",
      "Damage popups linger longer (readability improvement)."
    ],
    fixes: [
      "Added a battle recovery safeguard so any action error won't lock the UI.",
      "nextTurn() is now wrapped with a safe recovery catch to prevent freezes."
    ],
    notes: [
      "If a rare edge-case error happens mid-turn, the game will restore your turn instead of freezing."
    ]
  },
  {
    version: "redeem-roque",
    date: "2026-01-26",
    highlights: [
      "Added new redeem-only card: Roque (Magician)."
    ],
    changes: [
      "Redeem code added: ROQUE → unlocks Roque (one-time use).",
      "Roque Ability: Dice Roll — 50% chance to convert current DEF into ATK for 2 turns (cooldown 2 turns).",
      "Roque Passive: Loaded Fate — on death, 50% chance to resurrect and add the enemy's CURRENT ATK/DEF/HP to Roque's current stats (2-turn cooldown)."
    ],
    fixes: [],
    notes: [
      "Tip: Use the Redeem Code button and enter ROQUE to claim the card."
    ]
  },


  {
    version: "mobile-performance-v6",
    date: "2026-01-25",
    title: "Mobile Performance Update",
    added: [
      "⚡ Auto Performance Mode: reduces heavy background FX + throttles UI renders on low-power/mobile devices (keeps all gameplay/features)."
    ],
    changes: [
      "Balance: Ey-Ji-Es basic attacks now deal TRUE damage equal to its current DMG (instead of flat 5).",
      "Background particles + shooting stars are lighter on mobile (fewer elements, cheaper shadows).",
      "UI rendering is now batched to 1 update per animation frame to avoid stutters during rapid events (damage ticks, logs, passives)."
    ],
    fixes: [
      "Reduced jank during battles on mobile caused by frequent DOM writes + expensive visual filters."
    ]
  },



  

  {
    version: "lucky-draw-jackpot-v5",
    date: "2026-01-25",
    title: "Jackpot modal is scroll-safe",
    added: [
      "📱 1% JACKPOT reveal now scrolls properly on small screens while keeping the Continue button centered and reachable."
    ],
    changes: [
      "Jackpot reveal layout now uses a scrollable content area for better mobile viewing."
    ],
    fixes: [
      "Fixed an issue where the jackpot modal could extend beyond the viewport, making Continue/Claim hard to reach."
    ]
  },

{
    version: "lucky-draw-jackpot-v4",
    date: "2026-01-25",
    title: "Lucky Draw feels LEGENDARY",
    added: [
      "🎰 Lucky Draw now has a separate 🌟 1% JACKPOT modal with rays + full card showcase (fits on screen) + big celebratory reveal.",
      "✨ Screen flash + bigger confetti burst + extra shake & glow when a Legendary drops.",
      "🎁 Multi-draw (5x) now triggers the Jackpot reveal if any Legendary appears in the batch.",
      "🃏 Jackpot now shows the full card image + rarity pill, with a centered Continue button."
    ],
    changes: [
      "Legendary rewards get a more dramatic reveal before showing normal results (more 'gacha moment' energy).",
      "Lucky Draw modal now flashes on Legendary reveals for extra hype."
    ],
    fixes: [
      "Improved draw pacing to reduce the 'instant text reward' feeling."
    ]
  },


  {
    version: "skins-auras-ai-v3",
    date: "2026-01-24",
    title: "Cosmetics + Smarter Enemies",
    added: [
      "✅ 18) Cosmetic Skins + Aura Effects (Profile → Cosmetics)",
      "✅ 16) More Enemy AI Personalities (8 types total)"
    ],
    changes: [
      "New Cosmetics: Arena Backgrounds unlock by rank (Rookie → Legend).",
      "Battle FX: Arena background layer + vignette + animated star mist. Skill casts add a quick tint flash.",
      "Cosmetics now include 4 tabs: Avatar, Frame, Skin, Aura.",
      "Enemy AI tag shows the new personality for each stage."
    ],
    fixes: [
      "Improved cosmetics navigation (tab-style) for easier selection.",
      "Lucky Draw: 1% Legendary popup now shows the full card image + centered Continue button."
    ]
  },

  {
    version: GAME_VERSION,
    date: "2026-01-24",
    highlights: [
      "Added Card Rarity system (Common → Cosmic) and rarity tags in battle, shop, and duel pick.",
      "Updated \"What's New\" with full rarity breakdown for current roster.",
      "Rarity glow effects added (Cosmic has an animated border).",
      "Added filter + sort by rarity in Gallery and Shop (Upcoming Cards).",
      "Added unlockable Arena Background cosmetics (equip from Profile → Cosmetics → 🖼️ Arena).",
      "Added Battle Arena background FX (parallax drift, vignette, star mist, and skill-cast flash)."
    ],
    changes: [
      "New Cosmetics: Arena Backgrounds unlock by rank (Rookie → Legend).",
      "Battle FX: Arena background layer + vignette + animated star mist. Skill casts add a quick tint flash.",
      "Common: Space Patrol, Lucky Cat, Daysi, Patrick the Destroyer, Space Skeleton Pirate, Angelo.",
      "Rare: Baltrio, Nebula Gunslinger, Celestial Priestess, Nova Express, Dr. Nemesis, Otehnsahorse.",
      "Epic: 3dm4rk, Tremo, Ey-Ji-Es, Holly Child, Spidigong, Diablo.",
      "Mythical: Halaka, Space Duelist, Void Chronomancer, Starbreaker Null King, Void Samurai, Astro Witch.",
      "Legendary: Yrol, Abarskie, Siyokou, Zukinimato.",
      "Cosmic: Cosmo Secret, Ray Bill, Anti-Matter, Awakened Monster, Omni.",
      "Cosmic cards now show an animated border (rarity glow frame).",
      "Gallery + Shop Cards tab: use the new Filter/Sort controls to browse by rarity."
    ],
    fixes: [
      "Rarity defaults to Common for any unlisted card IDs (prevents missing tags)."
    ],
    notes: [
      "Tip: You can change a card's rarity by editing CARD_RARITY in game.js."
    ]
  },
  {
    version: "history",
    date: "—",
    highlights: ["Add older versions here anytime."],
    changes: [
      "New Cosmetics: Arena Backgrounds unlock by rank (Rookie → Legend).",
      "Battle FX: Arena background layer + vignette + animated star mist. Skill casts add a quick tint flash.","Example: balance tweaks, new cards, new modes."],
    fixes: ["Example: fixed a crash, fixed a UI overlap."],
    notes: ["Example: known issues, upcoming features."]
  }
];

function closeWhatsNewModal() {
  const el = document.getElementById("whatsNewOverlay");
  if (el) el.remove();
}

function markWhatsNewSeen() {
  try { localStorage.setItem("ccw_last_seen_patch", String(GAME_VERSION || "")); } catch (e) {}
  // remove NEW badge
  try {
    document.querySelectorAll(".btnWhatsNew").forEach((b) => b.removeAttribute("data-new"));
  } catch (e) {}
}

function shouldShowWhatsNewBadge() {
  try {
    const seen = String(localStorage.getItem("ccw_last_seen_patch") || "");
    return String(GAME_VERSION || "") && seen !== String(GAME_VERSION || "");
  } catch (e) {
    return false;
  }
}

function openWhatsNewModal() {
  closeWhatsNewModal();

  const overlay = document.createElement("div");
  overlay.className = "modalOverlay";
  overlay.id = "whatsNewOverlay";

  const box = document.createElement("div");
  box.className = "modalBox whatsNewBox whatsNewEnter";

  const latest = PATCH_NOTES && PATCH_NOTES.length ? PATCH_NOTES[0] : { version: GAME_VERSION, date: "", highlights: [] };
  const esc = (s) => String(s || "").replace(/[&<>\"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const ul = (arr) => {
    const a = Array.isArray(arr) ? arr.filter(Boolean) : [];
    if (!a.length) return "<ul class=\"patchUl\"><li class=\"muted\">—</li></ul>";
    return `<ul class="patchUl">${a.map((t)=>`<li>${esc(t)}</li>`).join("")}</ul>`;
  };

  box.innerHTML = `
    <div class="modalHeader">
      <div>
        <div class="modalTitle">🆕 What's New</div>
        <div class="modalPill">Patch Notes • ${esc(latest.version)}</div>
      </div>
      <button class="btn btnSoft" id="btnWhatsNewClose" aria-label="Close">✖</button>
    </div>

    <div class="modalBody">
      <div class="whatsNewFrame">
        <div class="whatsNewInner">
          <div class="whatsNewMeta">
            <div class="whatsNewMetaLeft">
              <span class="whatsNewVersion">Version: <b>${esc(latest.version)}</b></span>
              <span class="pill">${esc(latest.date || "")}</span>
            </div>
            <span class="pill">Scroll for older updates</span>
          </div>

          <div class="whatsNewList" id="whatsNewList">
            ${PATCH_NOTES.map((p, idx) => {
              const title = `${esc(p.version)} • ${esc(p.date || "")}`;
              const open = idx === 0 ? "open" : "";
              return `
                <details class="patchEntry" ${open}>
                  <summary>
                    <span>${title}</span>
                    <span class="patchTag">${idx === 0 ? "LATEST" : "ARCHIVE"}</span>
                  </summary>
                  <div class="patchBody">
                    <div class="patchCols">
                      <div class="patchCol">
                        <div class="patchColTitle">✨ Highlights</div>
                        ${ul(p.highlights)}
                      </div>
                      <div class="patchCol">
                        <div class="patchColTitle">🧩 Changes & Updates</div>
                        ${ul(p.changes)}
                      </div>
                      <div class="patchCol">
                        <div class="patchColTitle">🛠️ Bug Fixes</div>
                        ${ul(p.fixes)}
                      </div>
                      <div class="patchCol">
                        <div class="patchColTitle">📌 Notes</div>
                        ${ul(p.notes)}
                      </div>
                    </div>
                  </div>
                </details>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    </div>

    <div class="modalActions single">
      <button class="btn btnPrimary big" id="btnWhatsNewOk">Got it ✅</button>
    </div>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const close = () => {
    markWhatsNewSeen();
    closeWhatsNewModal();
  };

  const btnClose = document.getElementById("btnWhatsNewClose");
  const btnOk = document.getElementById("btnWhatsNewOk");
  if (btnClose) btnClose.onclick = close;
  if (btnOk) btnOk.onclick = close;

  // close when clicking outside
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  // escape key
  const onKey = (e) => {
    if (e && e.key === "Escape") {
      document.removeEventListener("keydown", onKey);
      close();
    }
  };
  document.addEventListener("keydown", onKey);
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

  // What's New / Patch Notes
  const showBadge = shouldShowWhatsNewBadge();
  document.querySelectorAll(".btnWhatsNew").forEach((btn) => {
    if (showBadge) btn.setAttribute("data-new", "1");
    btn.addEventListener("click", () => {
      try { playSfx("sfxClick", 0.45); } catch(e) {}
      openWhatsNewModal();
    });
  });
});

const shopItems = [
  { id: "healPotion", name: "Healing Potion", type: "potion", price: 600, desc: "Restores HP." },
  { id: "manaPotion", name: "Mana Potion", type: "potion", price: 500, desc: "Restores MP." },

  // NEW POTIONS
  { id: "silencePotion", name: "Silence Potion", type: "potion", price: 1000, desc: "Silences enemy for 1 turn (can't use abilities)." },
  { id: "sealPotion", name: "Seal Potion", type: "potion", price: 1200, desc: "Seals enemy for 1 turn (can't heal)." },
  { id: "armorGrowthPotion", name: "Armor Growth Potion", type: "potion", price: 1500, desc: "Gain +1 Armor every turn (stackable)." },
];

// =========================
// 🏁 FINAL MOMENTS MODE (Round 30+)
// - Darker screen + heartbeat sound
// - Damage popups glow harder (CSS body.finalMoments)
// - Both fighters gain a "last stand aura" (CSS)
// =========================
function isFinalMomentsActive() {
  if (!state || state.phase !== "battle") return false;
  return (Number(state.round || 1) || 1) >= 30;
}

function setFinalMomentsUI(on) {
  const body = document.body;
  if (!body) return;
  if (on) body.classList.add("finalMoments");
  else body.classList.remove("finalMoments");
}

function playFinalMomentsSfx(vol = 0.65) {
  try {
    const el = document.getElementById("finalMomentsSfx");
    if (el && typeof el.play === "function") {
      el.loop = true;
      el.volume = Math.max(0, Math.min(1, vol));
      // Only restart if not already playing
      const isPlaying = (el.currentTime > 0 && !el.paused && !el.ended);
      if (!isPlaying) {
        el.currentTime = 0;
        const p = el.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
      return;
    }
    // Fallback if audio tag is missing
    const a = new Audio("sfx/final.mp3");
    a.loop = true;
    a.volume = Math.max(0, Math.min(1, vol));
    a.play().catch(() => {});
    // keep reference so we can stop it later
    if (state) state._finalMomentsFallbackAudio = a;
  } catch (e) {}
}

function stopFinalMomentsSfx() {
  try {
    const el = document.getElementById("finalMomentsSfx");
    if (el) {
      el.loop = false;
      el.pause();
      el.currentTime = 0;
    }
  } catch (e) {}
  try {
    if (state && state._finalMomentsFallbackAudio) {
      const a = state._finalMomentsFallbackAudio;
      a.loop = false;
      a.pause();
      a.currentTime = 0;
      state._finalMomentsFallbackAudio = null;
    }
  } catch (e) {}
}

function pulseRoundTag(ms = 4200) {
  try {
    const tag = document.getElementById("roundTag");
    if (!tag) return;
    tag.classList.add("roundFinalPulse");
    clearTimeout(tag._pulseT);
    tag._pulseT = setTimeout(() => tag.classList.remove("roundFinalPulse"), Math.max(800, ms));
  } catch (e) {}
}

function playFinalMomentsHeartbeat(vol = 0.15) {
  try {
    // Simple procedural heartbeat (no external audio files needed)
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!state._finalMomentsAudio) state._finalMomentsAudio = {};
    const s = state._finalMomentsAudio;

    const ctx = s.ctx || new AC();
    s.ctx = ctx;

    // Prevent overlapping: if last beat was very recent, skip
    const now = Date.now();
    if (s.lastBeatAt && (now - s.lastBeatAt) < 700) return;
    s.lastBeatAt = now;

    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();

    o1.type = "sine";
    o2.type = "triangle";

    // heartbeat "thump"
    o1.frequency.value = 70;
    o2.frequency.value = 45;

    g.gain.value = 0.0001;

    o1.connect(g);
    o2.connect(g);
    g.connect(ctx.destination);

    const t0 = ctx.currentTime;

    // two quick pulses: lub-dub
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);

    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * 0.72), t0 + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.34);

    o1.start(t0);
    o2.start(t0);
    o1.stop(t0 + 0.38);
    o2.stop(t0 + 0.38);
  } catch (e) {
    // silent fail
  }
}

function applyFinalMomentsRoundStart() {
  if (!state || state.phase !== "battle") return;

  const active = isFinalMomentsActive();
  setFinalMomentsUI(active);

  if (!active) return;

  // One-time announce
  if (!state._finalMomentsStarted) {

    state._finalMomentsStarted = true;

    // 🔴 Round tag warning pulse + FINAL MOMENTS SFX
    pulseRoundTag(5200);
    playFinalMomentsSfx(0.72);
    showArenaAlert("🏁 FINAL MOMENTS — The universe holds its breath...", "void3");
    screenShakeArena(10, 420);

    floatingDamage("player", "🏁 FINAL MOMENTS", "fatigue");
    floatingDamage("enemy",  "🏁 FINAL MOMENTS", "fatigue");

    // Big heartbeat kick
    playFinalMomentsHeartbeat(0.22);
  } else {
    // small heartbeat each round start
    playFinalMomentsHeartbeat(0.14);
  
    playFinalMomentsSfx(0.55);
}
}

// =========================
// 🎮 PVP MODE (2 players / 1 device)
// Features: mode select (1v1/2v2/5v5), ready check, draft pick + ban, rules, reactions,
// combo meter, sudden death, local win tracker.
// =========================
(function(){
  const PVP_KEY = "ccw_pvp_v1";

  function $(id){ return document.getElementById(id); }
  function qs(sel){ return document.querySelector(sel); }

  function loadPvpStats(){
    try{
      const raw = localStorage.getItem(PVP_KEY);
      const data = raw ? JSON.parse(raw) : {};
      return {
        p1Wins: Number(data.p1Wins||0)||0,
        p2Wins: Number(data.p2Wins||0)||0,
        lastWinner: data.lastWinner || ""
      };
    }catch(e){ return {p1Wins:0,p2Wins:0,lastWinner:""}; }
  }
  function savePvpStats(st){
    try{ localStorage.setItem(PVP_KEY, JSON.stringify(st)); }catch(e){}
  }

  function ensurePvpUI(){
    // Insert PVP dock container inside the arena card (below existing actionDock)
    const arena = $("arenaCard");
    const actionDock = qs(".actionDock");
    if (!arena || !actionDock) return;

    if ($("pvpDockWrap")) return;

    const wrap = document.createElement("div");
    wrap.id = "pvpDockWrap";
    wrap.className = "pvpDockWrap";
    wrap.style.display = "none";

    wrap.innerHTML = `
      <div class="pvpTopBar">
        <div class="pvpTimerPill" id="pvpTimerPill" style="display:none;">⏱️ 20s</div>
        <div class="pvpTimerPill" id="pvpRoundPill" style="opacity:.9;">Round 1</div>
        <div class="pvpTimerPill" id="pvpScorePill">P1 0 — 0 P2</div>
      </div>
      <div class="pvpDock" id="pvpDockP1">
        <div class="dockTitle">
          <span>🟦 Player 1</span>
          <span class="comboPill" id="pvpComboP1">COMBO x0</span>
        </div>
        <div class="dockBtns">
          <button class="btn btnPrimary big" id="btnP1Attack">⚔️ Attack</button>
          <button class="btn btnSoft big" id="btnP1Skill">✨ Skill</button>
          <button class="btn btnGhost big" id="btnP1End">⏭️ End</button>
          <button class="btn btnGhost big" id="btnP1Potion">🧪 Potion</button>
          <button class="btn btnSoft big" id="btnP1Tag">🔁 Tag</button>
        </div>
        <div class="pvpRosterMini" id="pvpRosterP1"></div>
        <div class="pvpRosterMini" id="pvpRosterP2"></div>
        <div class="reactionRow">
          <button class="reactBtn" data-react="😈 EZ" data-owner="p1">😈 EZ</button>
          <button class="reactBtn" data-react="😂 LOL" data-owner="p1">😂 LOL</button>
          <button class="reactBtn" data-react="😤 Tryhard" data-owner="p1">😤 Tryhard</button>
          <button class="reactBtn" data-react="👑 Skill issue" data-owner="p1">👑 Skill issue</button>
        </div>
        <div class="reactionFloat" id="pvpReactFloatP1"></div>
      </div>

      <div class="pvpDock" id="pvpDockP2">
        <div class="dockTitle">
          <span>🟥 Player 2</span>
          <span class="comboPill" id="pvpComboP2">COMBO x0</span>
        </div>
        <div class="dockBtns">
          <button class="btn btnPrimary big" id="btnP2Attack">⚔️ Attack</button>
          <button class="btn btnSoft big" id="btnP2Skill">✨ Skill</button>
          <button class="btn btnGhost big" id="btnP2End">⏭️ End</button>
          <button class="btn btnGhost big" id="btnP2Potion">🧪 Potion</button>
          <button class="btn btnSoft big" id="btnP2Tag">🔁 Tag</button>
        </div>
        <div class="reactionRow">
          <button class="reactBtn" data-react="😭 NOOO" data-owner="p2">😭 NOOO</button>
          <button class="reactBtn" data-react="😂 LOL" data-owner="p2">😂 LOL</button>
          <button class="reactBtn" data-react="😤 Tryhard" data-owner="p2">😤 Tryhard</button>
          <button class="reactBtn" data-react="👑 Skill issue" data-owner="p2">👑 Skill issue</button>
        </div>
        <div class="reactionFloat" id="pvpReactFloatP2"></div>
      </div>
    `;

    actionDock.insertAdjacentElement("afterend", wrap);

    // Turn banner injected into gameTopLeft
    const gTop = qs(".gameTopLeft");
    if (gTop && !$("pvpTurnBanner")){
      const banner = document.createElement("div");
      banner.id = "pvpTurnBanner";
      banner.className = "turnBanner";
      banner.style.display = "none";
      banner.innerHTML = `<span id="pvpTurnText">PVP</span><span class="pill" id="pvpScorePill">P1 0 — 0 P2</span>`;
      gTop.appendChild(banner);
    }

    // Reaction clicks
    wrap.addEventListener("click", (e)=>{
      const btn = e.target && e.target.closest && e.target.closest(".reactBtn");
      if (!btn) return;
      const owner = btn.getAttribute("data-owner");
      const msg = btn.getAttribute("data-react") || "";
      showReaction(owner, msg);
    });
  }

  function showReaction(owner, msg){
    const el = owner === "p2" ? $("pvpReactFloatP2") : $("pvpReactFloatP1");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(()=>el.classList.remove("show"), 900);
  }

  // Lightweight modal builder (no new CSS needed; uses existing modalOverlay styles)
  function openModal(title, bodyHtml, actions){
    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.style.zIndex = 10050;
    overlay.innerHTML = `
      <div class="modalBox">
        <div class="modalHeader">
          <div>
            <div class="modalTitle">${escapeHtml(title)}</div>
            <div class="modalPill">PVP</div>
          </div>
          <button class="btn btnGhost" aria-label="close">✖</button>
        </div>
        <div class="modalBody">${bodyHtml}</div>
        <div class="modalActions ${actions && actions.length===1 ? "single" : ""}"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    const closeBtn = overlay.querySelector("button.btn.btnGhost");
    const actionsWrap = overlay.querySelector(".modalActions");

    function close(){
      overlay.remove();
    }
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", (e)=>{ if (e.target === overlay) close(); });

    (actions||[]).forEach(a=>{
      const b = document.createElement("button");
      b.className = a.className || "btn btnPrimary big";
      b.textContent = a.label || "OK";
      b.addEventListener("click", ()=>a.onClick && a.onClick({ close, overlay }));
      actionsWrap.appendChild(b);
    });

    return { close, overlay };
  }

  function escapeHtml(s){
    return String(s||"")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }

  
// Expose card pools for PVP UI
try{ window.BASE_CARDS = BASE_CARDS; window.SHOP_CARDS = SHOP_CARDS; window.ALL_CARDS = [...BASE_CARDS, ...SHOP_CARDS]; }catch(e){}
// PVP runtime state
  const PVP = {
    enabled: false,
    mode: "1v1",
    rules: { healing: "normal", suddenDeath: true },
    selection: "select",
    draft: { enabled: true, banEach: 1 },
    tagUsed: { p1:false, p2:false },
    timer: { enabled:false, secondsPerTurn:20, remaining:20, interval:null },
    ready: { p1:false, p2:false },
    teamSize(){ return this.mode==="2v2" ? 2 : (this.mode==="5v5" ? 5 : 1); },
    turnOwner: "p1",
    combo: { p1:0, p2:0, lastActionOwner:null, lastActionTurn:null },
    stats: loadPvpStats(),
    teams: { p1:[], p2:[] },
    activeIdx: { p1:0, p2:0 },
    bannedIds: new Set(),
    // Loadouts (PVP-only; independent per player)
    loadout: {
      // selections (ids)
      relic: { p1:"none", p2:"none" },
      potions: { p1:["heal","shield"], p2:["heal","shield"] },
      // runtime state
      potionCd: { p1:0, p2:0 },
      potionUses: { p1:{}, p2:{} },
      relicState: { p1:{}, p2:{} },
    },
  };

  // Hook into existing game by patching a few globally exposed functions (best-effort).
  // We rely on these existing globals: state, startBattle, updateUI, log, applyDamage, healUnit, canHeal
  function isGlobalsReady(){
    return typeof window.state === "object" && typeof window.updateUI === "function" && typeof window.log === "function";
  }

  function applyRulesPatch(){
    // Healing rules: normal / reduced / none
    if (typeof window.healUnit !== "function") return;

    const original = window.healUnit;
    if (original._pvpWrapped) return;

    window.healUnit = function(target, amount, opts){
      if (PVP.enabled){
        if (PVP.rules.healing === "none") return 0;
        if (PVP.rules.healing === "reduced") amount = Math.floor(Number(amount||0) * 0.5);
      }
      return original(target, amount, opts);
    };
    window.healUnit._pvpWrapped = true;
  }

  function setTurn(owner){
    PVP.turnOwner = owner;
    // Visual glow
    const d1 = $("pvpDockP1"), d2 = $("pvpDockP2");
    if (d1 && d2){
      d1.classList.remove("p1Active"); d2.classList.remove("p2Active");
      if (owner === "p1") d1.classList.add("p1Active");
      else d2.classList.add("p2Active");
    }
    // Enable / disable buttons
    const p1 = owner==="p1";
    const ids = [
      ["btnP1Attack", p1], ["btnP1Skill", p1], ["btnP1End", p1], ["btnP1Potion", p1],
      ["btnP2Attack", !p1], ["btnP2Skill", !p1], ["btnP2End", !p1], ["btnP2Potion", !p1],
    ];
    ids.forEach(([id, en])=>{
      const el = $(id);
      if (el) el.disabled = !en;
    });
    // Update PVP potion buttons (uses + cooldown) and show relic tooltip
    try{
      const mk = (ownerId, btnId)=>{
        const btn = $(btnId);
        if (!btn) return;
        const cd = Number(PVP.loadout?.potionCd?.[ownerId]||0)||0;
        const picks = (PVP.loadout?.potions?.[ownerId]) || ["heal","shield"];
        const uses = (PVP.loadout?.potionUses?.[ownerId]) || {};
        const left = picks.reduce((a,p)=>a + Math.max(0, Number(uses[p]||0)||0), 0);
        const ready = cd<=0 && left>0;
        btn.textContent = ready ? `🧪 Potion (${left})` : (left<=0 ? "🧪 Potion (0)" : `🧪 CD: ${cd}`);
        const r = pvpGetRelicDef((PVP.loadout?.relic?.[ownerId])||"none");
        btn.title = `${r.icon} ${r.name}: ${r.desc}\nPotions: ${picks.map(p=>pvpGetPotionDef(p).name).join(" + ")}\nCooldown: ${cd<=0?"Ready":cd+" turn(s)"}`;
      };
      mk("p1","btnP1Potion");
      mk("p2","btnP2Potion");
    }catch(e){}

        // Relic + potion cooldown tick (start of turn)
    if (typeof pvpApplyRelicTurnStart === "function") pvpApplyRelicTurnStart(owner);

    // 🌌 Void Collapse: TRUE damage at start of each turn (Round 25+)
    try{
      if (typeof window.applyVoidTurnStartDamage === "function"){
        const u = owner==="p1" ? window.state.player : window.state.enemy;
        window.applyVoidTurnStartDamage(u);
      }
    }catch(e){}
const banner = $("pvpTurnBanner");
    const text = $("pvpTurnText");
    if (banner && text){
      banner.style.display = PVP.enabled ? "" : "none";
      text.textContent = owner==="p1" ? "🟦 Player 1 Turn" : "🟥 Player 2 Turn";
    }

    // keep original "Turn" pill aligned if exists
    const tTag = $("turnTag");
    if (tTag && PVP.enabled) tTag.textContent = owner==="p1" ? "Turn: P1" : "Turn: P2";

    // per-turn reset
    PVP.tagUsed.p1 = false; PVP.tagUsed.p2 = false;
    resetTurnTimer();
  }

  function updateScorePill(){
    const pill = $("pvpScorePill");
    if (!pill) return;
    pill.textContent = `P1 ${PVP.stats.p1Wins} — ${PVP.stats.p2Wins} P2`;
  }

  function updateComboPills(){
    const c1 = $("pvpComboP1"), c2 = $("pvpComboP2");
    if (c1) c1.textContent = `COMBO x${PVP.combo.p1}`;
    if (c2) c2.textContent = `COMBO x${PVP.combo.p2}`;
  }

  
  function renderRosterMini(){
    const r1 = $("pvpRosterP1"), r2 = $("pvpRosterP2");
    if (!r1 || !r2) return;

    const mk = (owner, wrap)=>{
      const team = PVP.teams[owner] || [];
      const active = PVP.activeIdx[owner] || 0;
      wrap.innerHTML = team.map((u,i)=>{
        const dead = Number(u.hp||0) <= 0;
        const act = i === active;
        const label = `${act ? "▶ " : ""}${u.name}${dead ? " 💀" : ""}`;
        return `<button class="${act ? "active" : ""}" data-owner="${owner}" data-idx="${i}" ${dead ? "disabled" : ""}>${escapeHtml(label)}</button>`;
      }).join("");

      wrap.querySelectorAll("button").forEach(b=>{
        b.addEventListener("click", ()=>{
          if (!PVP.enabled) return;
          if (PVP.turnOwner !== owner) return;
          const idx = Number(b.getAttribute("data-idx")||0);
          tagTo(owner, idx);
        });
      });
    };

    mk("p1", r1);
    mk("p2", r2);
  }

  function tagTo(owner, idx){
    if (PVP.teamSize() === 1){
      window.log("Tag is only available in team modes.", "warn");
      return;
    }
    if (!PVP.enabled) return;
    const team = PVP.teams[owner] || [];
    if (!team[idx]) return;
    if (Number(team[idx].hp||0) <= 0) return;
    if (idx === (PVP.activeIdx[owner]||0)) return;
    if (PVP.tagUsed[owner]){
      window.log(`🔁 ${owner==="p1"?"🟦 P1":"🟥 P2"} already tagged this turn.`, "warn");
      return;
    }
    PVP.activeIdx[owner] = idx;
    PVP.tagUsed[owner] = true;

    if (owner === "p1") window.state.player = currentUnit("p1");
    else window.state.enemy = currentUnit("p2");

    window.log(`🔁 ${owner==="p1"?"🟦 P1":"🟥 P2"} tags to ${currentUnit(owner).name}!`, "warn");
    window.updateUI();
    renderRosterMini();
  }

  function openTagModal(owner){
    if (PVP.teamSize() === 1){
      window.log("Tag is only available in team modes.", "warn");
      return;
    }
    if (PVP.turnOwner !== owner) return;
    const team = PVP.teams[owner] || [];
    const active = PVP.activeIdx[owner] || 0;
    const opts = team.map((u,i)=>({u,i})).filter(x=>Number(x.u.hp||0)>0 && x.i!==active);
    if (!opts.length){
      window.log("No available teammate to tag in.", "warn");
      return;
    }
    const body = `
      <p class="modalText">Choose a teammate to tag in (once per turn).</p>
      <div style="display:grid; gap:10px; margin-top:10px;">
        ${opts.map(x=>`<button class="btn btnSoft big" data-idx="${x.i}">🔁 ${escapeHtml(x.u.name)} (HP ${x.u.hp})</button>`).join("")}
      </div>
    `;
    const m = openModal(owner==="p1"?"🟦 Player 1 Tag":"🟥 Player 2 Tag", body, [
      { label:"Cancel", className:"btn btnGhost big", onClick: ({close})=>close() }
    ]);
    m.overlay.querySelectorAll("button[data-idx]").forEach(b=>{
      b.addEventListener("click", ()=>{
        const idx = Number(b.getAttribute("data-idx")||0);
        m.close();
        tagTo(owner, idx);
      });
    });
  }

  function handleEndTurn(owner){
    // Resolve deaths and auto tag-in if needed
        // Phoenix Feather can prevent a forced tag swap once per match
    pvpTryPhoenixRevive("p1");
    pvpTryPhoenixRevive("p2");
checkTeamSwap("p1");
    checkTeamSwap("p2");

    const winner = pvpCheckWin();
    if (winner){
      endMatch(winner);
      return;
    }

    // swap turn
    const next = otherOwner(owner);
    setTurn(next);

    // end-of-round = when P2 ends
    if (owner === "p2"){
      // Advance the *shared* battle round counter so all round-based systems work in PVP too
      window.state.round = (Number(window.state.round||1)||1) + 1;

      const rp = $("pvpRoundPill");
      if (rp) rp.textContent = `Round ${window.state.round}`;

      // Round-based systems (Void Collapse + Fatigue + Final Moments) — same order as PvE
      if (typeof window.applyVoidCollapseRoundStart === "function") window.applyVoidCollapseRoundStart();
      if (typeof window.applyFatigueRoundStart === "function") window.applyFatigueRoundStart();
      if (typeof window.applyFinalMomentsRoundStart === "function") window.applyFinalMomentsRoundStart();

      // Sudden death / pressure tick
      suddenDeathTick();

      // Relics (if enabled in this mode)
      if (typeof window.applyEquippedRelicTurnStart === "function") window.applyEquippedRelicTurnStart();
    }

    // reset combo tracking
    PVP.combo.lastActionOwner = null;
    PVP.combo.lastActionTurn = null;
    updateComboPills();
    renderRosterMini();
    window.updateUI();
  }

  function resetTurnTimer(){
    const pill = $("pvpTimerPill");
    if (!PVP.enabled || !PVP.timer.enabled){
      if (pill) pill.style.display = "none";
      if (PVP.timer.interval){ clearInterval(PVP.timer.interval); PVP.timer.interval = null; }
      return;
    }
    PVP.timer.remaining = Number(PVP.timer.secondsPerTurn)||20;
    if (pill){ pill.style.display = ""; pill.textContent = `⏱️ ${PVP.timer.remaining}s`; }

    if (PVP.timer.interval){ clearInterval(PVP.timer.interval); PVP.timer.interval = null; }
    PVP.timer.interval = setInterval(()=>{
      if (!PVP.enabled){ clearInterval(PVP.timer.interval); PVP.timer.interval = null; return; }
      PVP.timer.remaining -= 1;
      if (pill) pill.textContent = `⏱️ ${Math.max(0,PVP.timer.remaining)}s`;
      if (PVP.timer.remaining <= 0){
        clearInterval(PVP.timer.interval); PVP.timer.interval = null;
        window.log("⏱️ Time! Auto end turn.", "warn");
        handleEndTurn(PVP.turnOwner);
      }
    }, 1000);
  }

  function registerAction(owner, type){
    // Simple combo: if you do Skill then Attack in same personal turn => +1
    // Reset when turn changes.
    if (PVP.combo.lastActionOwner !== owner){
      // new owner: reset both? no, reset only current owner's chain
      if (owner === "p1") PVP.combo.p1 = 0;
      if (owner === "p2") PVP.combo.p2 = 0;
    }

    const last = PVP.combo.lastActionTurn;
    const curTurn = owner;

    // If same owner and sequence Skill->Attack or Attack->Skill in same turn, increase
    if (PVP.combo.lastActionOwner === owner && last && last !== type){
      if (owner === "p1") PVP.combo.p1 += 1;
      if (owner === "p2") PVP.combo.p2 += 1;
    }

    PVP.combo.lastActionOwner = owner;
    PVP.combo.lastActionTurn = type;
    updateComboPills();
  }

  function applyComboBonus(owner, baseDmg){
    const stacks = owner==="p1" ? PVP.combo.p1 : PVP.combo.p2;
    if (stacks <= 0) return baseDmg;
    return baseDmg + stacks; // +1 dmg per combo stack
  }

  function currentUnit(owner){
    const team = PVP.teams[owner];
    const idx = Math.max(0, Math.min(team.length-1, PVP.activeIdx[owner]||0));
    return team[idx];
  }

  
  // =========================
  // 🗿 Relics + 🧪 Potions runtime (PVP only)
  // =========================
  function pvpApplyRelicStart(owner){
    // Shop relic IDs only
    const rid = (PVP.loadout?.relic?.[owner]) || "none";
    const u = currentUnit(owner);
    if (!u) return;
    // Reinforced Plating: small armor drip (PVP-friendly)
    if (rid === "reinforcedPlating"){
      gainShield(u, 2, { source:"passive" });
    }
    // other relics are reactive
  }

  function pvpApplyRelicTurnStart(owner){
    // Shop relic IDs only
    const rid = (PVP.loadout?.relic?.[owner]) || "none";
    const u = currentUnit(owner);
    if (!u) return;

    // decrement potion cooldown
    if (PVP.loadout?.potionCd){
      PVP.loadout.potionCd[owner] = Math.max(0, Number(PVP.loadout.potionCd[owner]||0) - 1);
    }

    if (rid === "reinforcedPlating"){
      gainShield(u, 2, { source:"passive" });
      floatingDamage(owner==="p1"?"player":"enemy", "+2 🛡️", "good");
    }
  }

  function pvpTryPhoenixRevive(owner){
    const rid = (PVP.loadout?.relic?.[owner]) || "";
    if (rid !== "phoenixEmber") return false;
    const st = (PVP.loadout?.relicState?.[owner]) || {};
    if (st.phoenixUsed) return false;

    const u = currentUnit(owner);
    if (!u || Number(u.hp||0) > 0) return false;

    st.phoenixUsed = true;
    u.hp = 1;
    u.shield = 0; u.def = 0;
    window.log(`🪶 ${owner==="p1"?"Player 1":"Player 2"} Phoenix Ember revives ${u.name} at 1 HP!`, "warn");
    floatingDamage(owner==="p1"?"player":"enemy", "🪶 REVIVE", "warn");
    return true;
  }

  function pvpOnSkillCast(owner, unit){
    const rid = (PVP.loadout?.relic?.[owner]) || "";
    const st = (PVP.loadout?.relicState?.[owner]) || {};
    if (rid !== "chronoRune") return;
    if (st.chronoUsed) return;
    st.chronoUsed = true;
    // cooldown convention: skills set cooldown value; reduce by 1 immediately
    if (unit && Number(unit.cooldown||0) > 0){
      unit.cooldown = Math.max(0, Number(unit.cooldown||0) - 1);
      window.log(`⏳ Chrono Rune triggers! ${owner==="p1"?"P1":"P2"} skill cooldown reduced by 1.`, "good");
      floatingDamage(owner==="p1"?"player":"enemy", "⏳ -1 CD", "good");
    }
  }

  function pvpOnAttackDealt(owner, dealt, unit){
    const rid = (PVP.loadout?.relic?.[owner]) || "";
    if (rid !== "vampireFang") return;
    const heal = Math.max(1, Math.floor(Number(dealt||0) * 0.30));
    const healed = healUnit(unit, heal, { source:"passive", healer:unit, triggerEvents:true });
    if (healed>0){
      floatingDamage(owner==="p1"?"player":"enemy", `+${healed} 🩸`, "good");
      window.log(`🩸 Vampire Fang heals ${unit.name} for ${healed}.`, "good");
    }
  }

  function pvpOpenPotionMenu(owner){
    if (!PVP.enabled) return;
    if (PVP.turnOwner !== owner) return;

    const fallback = pvpAllPotionsList().filter(p=>p.id && p.id!=="none").slice(0,2).map(p=>p.id);
    const picks = (PVP.loadout?.potions?.[owner]) || (fallback.length?fallback:["none","none"]);
    const uses = (PVP.loadout?.potionUses?.[owner]) || {};
    const cd = Number(PVP.loadout?.potionCd?.[owner]||0) || 0;

    const rows = picks.map(pid=>{
      const def = pvpGetPotionDef(pid);
      const left = Math.max(0, Number(uses[pid]||0)||0);
      const disabled = (cd>0 || left<=0);
      return `
        <button class="btn ${disabled?"btnGhost":"btnSoft"} big pvpPotionChoice" data-pid="${def.id}" ${disabled?"disabled":""}>
          ${def.icon} ${escapeHtml(def.name)} <span class="muted">(${left} left)</span>
          <div class="muted tiny" style="margin-top:4px;">${escapeHtml(def.desc)}</div>
        </button>
      `;
    }).join("");

    const title = owner==="p1" ? "🟦 Player 1 Potions" : "🟥 Player 2 Potions";
    const cdLine = cd>0 ? `Potion cooldown: ${cd} turn(s)` : "Potion cooldown: Ready";

    showActionModal(title, `
      <div class="muted" style="margin-bottom:10px;">${cdLine}</div>
      <div class="pvpPotionGrid">${rows}</div>
    `, [
      { label:"Close", className:"btn btnGhost big", onClick: ({close})=>close() }
    ]);

    // bind choices after modal renders
    setTimeout(()=>{
      document.querySelectorAll(".pvpPotionChoice").forEach(btn=>{
        if (btn._bound) return;
        btn._bound = true;
        btn.addEventListener("click", ()=>{
          const pid = btn.getAttribute("data-pid");
          if (!pid) return;
          const u = currentUnit(owner);
          if (!u) return;

          const cdNow = Number(PVP.loadout.potionCd[owner]||0)||0;
          const leftNow = Math.max(0, Number(PVP.loadout.potionUses[owner]?.[pid]||0)||0);
          if (cdNow>0 || leftNow<=0) return;

          const def = pvpGetPotionDef(pid);
          // apply
          try{ def.use(u); }catch(e){}
          PVP.loadout.potionUses[owner][pid] = leftNow - 1;
          PVP.loadout.potionCd[owner] = 3; // shorter PVP cooldown
          registerAction(owner, "potion");
          window.updateUI();
          window.log(`🧪 ${owner==="p1"?"P1":"P2"} used ${def.name}!`, "good");
          // close topmost modal
          const mod = document.querySelector(".actionModalOverlay");
          if (mod) mod.remove();
        });
      });
    }, 0);
  }

function otherOwner(owner){ return owner==="p1" ? "p2" : "p1"; }

  function checkTeamSwap(owner){
    const u = currentUnit(owner);
    if (!u || Number(u.hp||0) > 0) return false;
    const nextIdx = (PVP.activeIdx[owner]||0) + 1;
    if (nextIdx < (PVP.teams[owner]||[]).length){
      PVP.activeIdx[owner] = nextIdx;
      // Bind to global state.player/state.enemy for UI rendering
      if (owner === "p1") window.state.player = currentUnit("p1");
      else window.state.enemy = currentUnit("p2");
      window.log(`🔁 ${owner==="p1"?"Player 1":"Player 2"} tags in ${currentUnit(owner).name}!`, "warn");
      window.updateUI();
      return true;
    }
    return false;
  }

  function endMatch(winnerOwner){
    PVP.stats = loadPvpStats();
    if (winnerOwner === "p1") PVP.stats.p1Wins += 1;
    if (winnerOwner === "p2") PVP.stats.p2Wins += 1;
    PVP.stats.lastWinner = winnerOwner;
    savePvpStats(PVP.stats);
    updateScorePill();

    const title = winnerOwner==="p1" ? "🟦 Player 1 Wins!" : "🟥 Player 2 Wins!";
    const body = `
      <p class="modalText">GG! Want a rematch?</p>
      <div class="modalStats">
        <div class="modalStat"><div class="modalStatLabel">Score</div><div class="modalStatValue">P1 ${PVP.stats.p1Wins} — ${PVP.stats.p2Wins} P2</div></div>
        <div class="modalStat"><div class="modalStatLabel">Last Winner</div><div class="modalStatValue">${winnerOwner==="p1"?"Player 1":"Player 2"}</div></div>
      </div>
    `;
    openModal(title, body, [
      { label:"🎮 Rematch", className:"btn btnPrimary big", onClick: ({close})=>{ close(); startPvpFlow(); } },
      { label:"🏠 Home", className:"btn btnGhost big", onClick: ({close})=>{ close(); window.location.href = "index.html"; } }
    ]);
  }

  function pvpCheckWin(){
    const p1Alive = (PVP.teams.p1||[]).some(u => Number(u.hp||0) > 0);
    const p2Alive = (PVP.teams.p2||[]).some(u => Number(u.hp||0) > 0);
    if (!p1Alive) return "p2";
    if (!p2Alive) return "p1";
    return null;
  }

  // Draft + Ban Picker
  function pickFromPool(pool, alreadyPicked){
    // returns 6 options not in already/banned
    const out = [];
    const tried = new Set();
    while (out.length < Math.min(6, pool.length) && tried.size < pool.length*3){
      const c = pool[Math.floor(Math.random()*pool.length)];
      tried.add(c.id);
      if (PVP.bannedIds.has(c.id)) continue;
      if (alreadyPicked.has(c.id)) continue;
      if (out.some(x=>x.id===c.id)) continue;
      out.push(c);
    }
    return out;
  }

  function showDraftModal(teamSize, onDone){
    // pool from global BASE_CARDS + unlockables (whatever is available in your build)
    const pool = (window.ALL_CARDS || window.BASE_CARDS || []).slice();
    if (!pool.length){
      // fallback: try infer from pickGrid if not available
      window.log("PVP Draft: card pool not found; using BASE_CARDS only.", "warn");
    }

    const picked = { p1:[], p2:[] };
    const pickedIds = new Set();
    let phase = "ban";
    let banLeft = { p1: PVP.draft.banEach, p2: PVP.draft.banEach };
    let picker = "p1";

    function render(){
      const banInfo = phase==="ban"
        ? `<div class="muted">Ban Phase: each player bans <b>${PVP.draft.banEach}</b> card(s).</div>`
        : `<div class="muted">Draft Phase: pick until you have <b>${teamSize}</b> fighter(s) each.</div>`;

      const score = `<div class="modalStats">
        <div class="modalStat"><div class="modalStatLabel">P1 Picks</div><div class="modalStatValue">${picked.p1.length}/${teamSize}</div></div>
        <div class="modalStat"><div class="modalStatLabel">P2 Picks</div><div class="modalStatValue">${picked.p2.length}/${teamSize}</div></div>
      </div>`;

      const options = pickFromPool(pool, pickedIds);
      const cards = options.map(c=>`
        <button class="cardPick" data-id="${escapeHtml(c.id)}" style="text-align:left;">
          <div style="font-weight:1000;">${escapeHtml(c.name)}</div>
          <div class="muted" style="margin-top:6px;">ATK ${c.atk} • DEF ${c.def} • HP ${c.hp}</div>
        </button>
      `).join("");

      const turnLine = phase==="ban"
        ? `<p class="modalHint">${picker==="p1"?"🟦 Player 1":"🟥 Player 2"}: choose a card to <b>BAN</b> (${banLeft[picker]} left)</p>`
        : `<p class="modalHint">${picker==="p1"?"🟦 Player 1":"🟥 Player 2"}: choose a card to <b>PICK</b></p>`;

      return `${banInfo}${turnLine}${score}<div class="grid" style="margin-top:14px;">${cards}</div>
      <div class="muted" style="margin-top:12px;">Banned: ${Array.from(PVP.bannedIds).slice(0,8).join(", ") || "None"}</div>`;
    }

    const modal = openModal("🎯 Draft & Ban", render(), [
      { label:"Cancel", className:"btn btnGhost big", onClick: ({close})=>{ close(); } }
    ]);

    modal.overlay.addEventListener("click", (e)=>{
      const btn = e.target && e.target.closest && e.target.closest(".cardPick");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const card = pool.find(x=>x.id===id);
      if (!card) return;

      if (phase==="ban"){
        if (banLeft[picker] <= 0) return;
        PVP.bannedIds.add(card.id);
        banLeft[picker] -= 1;
        window.log(`${picker==="p1"?"🟦 P1":"🟥 P2"} bans ${card.name}!`, "warn");
        // swap picker or phase
        if (banLeft.p1<=0 && banLeft.p2<=0){
          phase = "pick";
          picker = "p1";
        }else{
          picker = (picker==="p1") ? "p2" : "p1";
        }
      }else{
        // pick
        picked[picker].push(_clone(card));
        pickedIds.add(card.id);
        window.log(`${picker==="p1"?"🟦 P1":"🟥 P2"} picks ${card.name}!`, "good");

        // if both complete
        if (picked.p1.length>=teamSize && picked.p2.length>=teamSize){
          modal.close();
          onDone(picked);
          return;
        }
        // swap picker
        picker = (picker==="p1") ? "p2" : "p1";
      }

      // re-render
      const body = modal.overlay.querySelector(".modalBody");
      if (body) body.innerHTML = render();
    });
  }

  function showRulesModal(onDone){
    const body = `
      <p class="modalText">Pick your PVP rules.</p>
      <div class="modalStats">
        <div class="modalStat">
          <div class="modalStatLabel">Healing</div>
          <div style="margin-top:10px; display:grid; gap:8px;">
            <label class="chip"><input type="radio" name="pvpHeal" value="normal" checked> Normal</label>
            <label class="chip"><input type="radio" name="pvpHeal" value="reduced"> Reduced (50%)</label>
            <label class="chip"><input type="radio" name="pvpHeal" value="none"> No Healing</label>
          </div>
        </div>
        <div class="modalStat">
          <div class="modalStatLabel">Sudden Death</div>
          <div style="margin-top:10px;">
            <label class="chip"><input type="checkbox" id="pvpSudden" checked> Enable (after 10 rounds: TRUE dmg)</label>
          </div>
        </div>
        <div class="modalStat">
          <div class="modalStatLabel">Selection</div>
          <div style="margin-top:10px; display:grid; gap:8px;">
            <label class="chip"><input type="radio" name="pvpSelect" value="select" checked> Character Select</label>
            <label class="chip"><input type="radio" name="pvpSelect" value="draft"> Competitive Ban + Draft</label>
          </div>
        </div>
        <div class="modalStat">
          <div class="modalStatLabel">Pressure Timer</div>
          <div style="margin-top:10px; display:grid; gap:8px;">
            <label class="chip"><input type="checkbox" id="pvpPressure"> Enable turn timer</label>
            <label class="chip">Seconds per turn: <input id="pvpSeconds" type="number" min="5" max="120" value="20" style="width:90px; margin-left:8px;"></label>
          </div>
        </div>
      </div>
      <p class="muted" style="margin-top:12px;">Tip: Sudden Death uses TRUE damage so fights end fast.</p>
    `;
    const m = openModal("⚙️ PVP Rules", body, [
      { label:"Continue", className:"btn btnPrimary big", onClick: ({close, overlay})=>{
          const heal = overlay.querySelector('input[name="pvpHeal"]:checked')?.value || "normal";
          const sudden = !!overlay.querySelector("#pvpSudden")?.checked;
          PVP.rules.healing = heal;
          PVP.rules.suddenDeath = sudden;
          const sel = overlay.querySelector('input[name="pvpSelect"]:checked')?.value || "select";
          PVP.selection = sel;
          PVP.timer.enabled = !!overlay.querySelector("#pvpPressure")?.checked;
          const sec = Number(overlay.querySelector("#pvpSeconds")?.value || 20);
          PVP.timer.secondsPerTurn = Math.max(5, Math.min(120, sec||20));
          close();
          onDone();
      }},
      { label:"Cancel", className:"btn btnGhost big", onClick: ({close})=>close() }
    ]);
  }

  
  function showCharacterSelectModal(teamSize, onDone){
    const pool = (window.ALL_CARDS || []).slice();
    if (!pool.length){
      window.log("No card pool found — falling back to draft.", "warn");
      return showDraftModal(teamSize, onDone);
    }

    const picks = { p1:[], p2:[] };

    const body = `
      <p class="modalText">Pick your fighters. Tap 🟦 or 🟥 to assign a character (same device).</p>
      <div class="modalStats">
        <div class="modalStat">
          <div class="modalStatLabel">🟦 Player 1 Team (${teamSize})</div>
          <div id="pvpSelP1" style="margin-top:10px; display:grid; gap:8px;"></div>
        </div>
        <div class="modalStat">
          <div class="modalStatLabel">🟥 Player 2 Team (${teamSize})</div>
          <div id="pvpSelP2" style="margin-top:10px; display:grid; gap:8px;"></div>
        </div>
      </div>
      <div id="pvpCharGrid" style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px; margin-top:14px;"></div>
      <style>
        .pickCard{border:1px solid rgba(255,255,255,.12); background: rgba(0,0,0,.22); border-radius: 16px; padding:10px;}
        .pickName{font-weight:1000; margin-bottom:10px;}
        .pickMeta{font-size:12px; opacity:.8; margin-bottom:10px;}
        .pickActions{display:grid; grid-template-columns: 1fr 1fr; gap:8px;}
      </style>
    `;

    const m = openModal("🧩 Character Select", body, [
      { label:`Start Match`, className:"btn btnPrimary big", onClick: ({close})=>{
          close();
          onDone({ p1: picks.p1, p2: picks.p2 });
        }},
      { label:"Back", className:"btn btnGhost big", onClick: ({close})=>close() }
    ]);

    const overlay = m.overlay;
    const startBtn = overlay.querySelector(".modalActions .btnPrimary");

    function render(){
      const p1Wrap = overlay.querySelector("#pvpSelP1");
      const p2Wrap = overlay.querySelector("#pvpSelP2");
      const grid = overlay.querySelector("#pvpCharGrid");

      const renderTeam = (arr, owner)=> arr.map(c=>`
        <div class="chip" style="display:flex; gap:10px; align-items:center; justify-content:space-between;">
          <span>${owner==="p1"?"🟦":"🟥"} ${escapeHtml(c.name)}</span>
          <button class="btn btnGhost" data-remove="${escapeHtml(owner)}:${escapeHtml(c.id)}">✖</button>
        </div>
      `).join("") || `<div class="muted">None yet</div>`;

      p1Wrap.innerHTML = renderTeam(picks.p1, "p1");
      p2Wrap.innerHTML = renderTeam(picks.p2, "p2");

      overlay.querySelectorAll("[data-remove]").forEach(b=>{
        b.addEventListener("click", ()=>{
          const [owner,id] = (b.getAttribute("data-remove")||"").split(":");
          if (owner==="p1") picks.p1 = picks.p1.filter(x=>x.id!==id);
          if (owner==="p2") picks.p2 = picks.p2.filter(x=>x.id!==id);
          render();
        });
      });

      grid.innerHTML = pool.map(c=>{
        const p1Picked = picks.p1.some(x=>x.id===c.id);
        const p2Picked = picks.p2.some(x=>x.id===c.id);
        const p1Dis = p1Picked || picks.p1.length>=teamSize;
        const p2Dis = p2Picked || picks.p2.length>=teamSize;
        const meta = `ATK ${c.atk} • ARM ${c.def} • HP ${c.hp}`;
        return `
          <div class="pickCard">
            <div class="pickName">${escapeHtml(c.name)}</div>
            <div class="pickMeta">${escapeHtml(meta)}</div>
            <div class="pickActions">
              <button class="btn btnSoft" data-pick="p1" data-id="${escapeHtml(c.id)}" ${p1Dis?'disabled':''}>🟦 Pick</button>
              <button class="btn btnSoft" data-pick="p2" data-id="${escapeHtml(c.id)}" ${p2Dis?'disabled':''}>🟥 Pick</button>
            </div>
          </div>
        `;
      }).join("");

      overlay.querySelectorAll("[data-pick]").forEach(b=>{
        b.addEventListener("click", ()=>{
          const owner = b.getAttribute("data-pick");
          const id = b.getAttribute("data-id");
          const card = pool.find(x=>x.id===id);
          if (!card) return;
          if (picks[owner].length >= teamSize) return;
          if (picks[owner].some(x=>x.id===id)) return;
          picks[owner].push(card);
          render();
        });
      });

      const ok = (picks.p1.length===teamSize && picks.p2.length===teamSize);
      startBtn.disabled = !ok;
    }

    render();
  }

function showReadyModal(onReady){
    PVP.ready.p1 = false; PVP.ready.p2 = false;
    const body = `
      <p class="modalText">Both players press READY to start.</p>
      <div class="modalStats">
        <div class="modalStat">
          <div class="modalStatLabel">🟦 Player 1</div>
          <div class="modalStatValue" id="readyP1">NOT READY</div>
        </div>
        <div class="modalStat">
          <div class="modalStatLabel">🟥 Player 2</div>
          <div class="modalStatValue" id="readyP2">NOT READY</div>
        </div>
      </div>
      <p class="muted" style="margin-top:12px;">This prevents accidental starts.</p>
    `;
    const m = openModal("✅ Ready Check", body, [
      { label:"🟦 READY (P1)", className:"btn btnSoft big", onClick: ({overlay})=>{
        PVP.ready.p1 = true;
        const el = overlay.querySelector("#readyP1"); if (el) el.textContent = "READY ✅";
        if (PVP.ready.p1 && PVP.ready.p2){ m.close(); onReady(); }
      }},
      { label:"🟥 READY (P2)", className:"btn btnSoft big", onClick: ({overlay})=>{
        PVP.ready.p2 = true;
        const el = overlay.querySelector("#readyP2"); if (el) el.textContent = "READY ✅";
        if (PVP.ready.p1 && PVP.ready.p2){ m.close(); onReady(); }
      }},
      { label:"Cancel", className:"btn btnGhost big", onClick: ({close})=>close() }
    ]);
  }

  function showModeModal(){
    const body = `
      <p class="modalText">Choose your PVP mode.</p>
      <div class="modalStats">
        <div class="modalStat">
          <div class="modalStatLabel">Modes</div>
          <div style="margin-top:10px; display:grid; gap:10px;">
            <button class="btn btnPrimary big" id="pick1v1">⚔️ 1v1 Duel</button>
            <button class="btn btnSoft big" id="pick2v2">👥 2v2 Tag</button>
            <button class="btn btnSoft big" id="pick5v5">🛡️ 5v5 Team War</button>
          </div>
        </div>
        <div class="modalStat">
          <div class="modalStatLabel">Draft</div>
          <div class="muted" style="margin-top:10px; line-height:1.45;">
            Ban + Draft makes fights fair and fun.
            <br><br>
            • Each bans 1 card<br>
            • Then pick fighters alternately
          </div>
        </div>
      </div>
    `;
    const m = openModal("🎮 PVP", body, []);
    m.overlay.querySelector("#pick1v1").addEventListener("click", ()=>{ PVP.mode="1v1"; m.close(); startPvpFlow(); });
    m.overlay.querySelector("#pick2v2").addEventListener("click", ()=>{ PVP.mode="2v2"; m.close(); startPvpFlow(); });
    m.overlay.querySelector("#pick5v5").addEventListener("click", ()=>{ PVP.mode="5v5"; m.close(); startPvpFlow(); });
  }

  function setupPvpBattle(picks){
    PVP.enabled = true;
    applyRulesPatch();

    const size = PVP.teamSize();

    // Build teams
    PVP.teams.p1 = (picks?.p1 || []).map(c=>window.spawnCardInstance ? window.spawnCardInstance(c) : _clone(c));
    PVP.teams.p2 = (picks?.p2 || []).map(c=>window.spawnCardInstance ? window.spawnCardInstance(c) : _clone(c));

    // If spawnCardInstance doesn't exist, normalize fields
    const norm = (u)=>{
      u.maxHp = Number(u.maxHp || u.hp || 1);
      u.hp = Number(u.hp || u.maxHp);
      u.shield = Number(u.shield || u.def || 0);
      u.def = u.shield;
      u.cooldown = Number(u.cooldown || 0) || 0;
      return u;
    };
    PVP.teams.p1.forEach(norm);
    PVP.teams.p2.forEach(norm);

    PVP.activeIdx.p1 = 0;
    PVP.activeIdx.p2 = 0;

    // Force battle screen and map to existing UI variables
    window.state.phase = "battle";
    window.state.round = 1;
    window.state.stage = 1;
    window.state.turn = "player"; // still used by some UI, but we'll override
    window.state.player = currentUnit("p1");
    window.state.enemy  = currentUnit("p2");
    window.state._pvp = true;

    // Hide original dock; show PVP docks
    const dock = qs(".actionDock");
    if (dock) dock.style.display = "none";
    const wrap = $("pvpDockWrap");
    if (wrap) wrap.style.display = "";

    const banner = $("pvpTurnBanner");
    if (banner) banner.style.display = "";
    updateScorePill();

    // Mark roles
    const pRole = qs(".roleTag.rolePlayer"); if (pRole) pRole.textContent = "P1";
    const eRole = qs(".roleTag.roleEnemy"); if (eRole) eRole.textContent = "P2";

    // Set initial turn
    setTurn("p1");

    // Sudden death uses existing void collapse logic, but we add a PVP-specific late-round true damage
    window.log(`🎮 PVP started: ${PVP.mode.toUpperCase()} • Healing: ${PVP.rules.healing} • Sudden Death: ${PVP.rules.suddenDeath ? "ON" : "OFF"}`, "warn");
    window.updateUI();
  }

  function suddenDeathTick(){
    if (!PVP.enabled || !PVP.rules.suddenDeath) return;
    const r = Number(window.state.round || 1) || 1;
    if (r < 10) return;
    // After round 10, apply 6 TRUE dmg to both at start of each full round
    const dmg = 6 + Math.max(0, r - 10); // ramps up
    const p1 = currentUnit("p1"), p2 = currentUnit("p2");
    if (p1 && p1.hp > 0) window.applyDamage(p1, dmg, { source:"pvp_sudden", damageType:"true", attackerName:"Sudden Death" });
    if (p2 && p2.hp > 0) window.applyDamage(p2, dmg, { source:"pvp_sudden", damageType:"true", attackerName:"Sudden Death" });
    window.log(`💥 Sudden Death hits BOTH sides for ${dmg} TRUE damage!`, "bad");
    window.updateUI();
  }

  function wirePvpButtons(){
    ensurePvpUI();

    const map = [
      ["btnP1Attack", "p1", "attack"],
      ["btnP1Skill",  "p1", "skill"],
      ["btnP1End",    "p1", "end"],
      ["btnP1Potion", "p1", "potion"],
      ["btnP2Attack", "p2", "attack"],
      ["btnP2Skill",  "p2", "skill"],
      ["btnP2End",    "p2", "end"],
      ["btnP2Potion", "p2", "potion"],
      ["btnP1Tag", "p1", "tag"],
      ["btnP2Tag", "p2", "tag"],
    ];

    map.forEach(([id, owner, action])=>{
      const el = $(id);
      if (!el || el._pvpBound) return;
      el._pvpBound = true;
      el.addEventListener("click", ()=>{
        if (!PVP.enabled) return;
        if (PVP.turnOwner !== owner) return;

        const me = currentUnit(owner);
        const foe = currentUnit(otherOwner(owner));
        if (!me || !foe) return;

        // Use existing handlers where possible by temporarily mapping state.player/enemy then calling the same logic
        window.state.player = owner==="p1" ? me : foe;
        window.state.enemy  = owner==="p1" ? foe : me;

        if (action === "attack"){
          registerAction(owner, "attack");
          // replicate attack: use dmgCalc if exists else me.atk
          const base = (typeof window.dmgCalc === "function") ? window.dmgCalc(window.state.player) : Math.max(0, Number(window.state.player.atk||0));
          const dmg = applyComboBonus(owner, base);
          window.applyDamage(window.state.enemy, dmg, { source:"attack", damageType:"physical", attacker: window.state.player, attackerName: window.state.player.name });
          window.log(`${owner==="p1"?"🟦 P1":"🟥 P2"} attacks for ${dmg}.`, owner==="p1"?"good":"bad");
          window.updateUI();
        }

        if (action === "skill"){
          if (typeof window.isSilenced === "function" && window.isSilenced(window.state.player)){
            window.log(`🤐 ${window.state.player.name} is silenced and can't use skills!`, "warn");
            return;
          }
          registerAction(owner, "skill");
          if (window.state.player.base && typeof window.state.player.base.skill === "function"){
            // some builds wrap cards into {base,...}; fallback below
          }
          if (typeof window.state.player.skill === "function"){
            const res = window.state.player.skill(window.state.player, window.state.enemy);
            if (res && res.msg) window.log(res.msg, res.ok ? "good" : "warn");
            try{ pvpOnSkillCast(owner, window.state.player); }catch(e){}
            window.updateUI();
          }else if (window.state.player.base && typeof window.state.player.base.skill === "function"){
            const res = window.state.player.base.skill(window.state.player, window.state.enemy);
            if (res && res.msg) window.log(res.msg, res.ok ? "good" : "warn");
            try{ pvpOnSkillCast(owner, window.state.player); }catch(e){}
            window.updateUI();
          }else{
            window.log("This fighter has no skill function wired.", "warn");
          }
        }

        if (action === "potion"){
          if (typeof pvpOpenPotionMenu === "function"){ pvpOpenPotionMenu(owner); }
          return;
        }

        if (action === "tag"){
          openTagModal(owner);
          return;
        }

        if (action === "end"){
          handleEndTurn(owner);
          return;

          // Resolve deaths and tag-in if needed
          checkTeamSwap("p1");
          checkTeamSwap("p2");

          const winner = pvpCheckWin();
          if (winner){
            endMatch(winner);
            return;
          }

          // swap turn
          const next = otherOwner(owner);
          setTurn(next);

          // Each time BOTH players have ended once, increase round and apply sudden death
          // We'll treat "end by P2" as end-of-round
          if (owner === "p2"){
            window.state.round = (Number(window.state.round||1)||1) + 1;
            suddenDeathTick();
          }
          // reset combo tracking when a player ends turn
          PVP.combo.lastActionOwner = null;
          PVP.combo.lastActionTurn = null;
          updateComboPills();

          window.updateUI();
        }
      });
    });
  }

  function startPvpFlow(){
    if (!isGlobalsReady()){
      // try later
      setTimeout(startPvpFlow, 120);
      return;
    }
    ensurePvpUI();
    wirePvpButtons();

    PVP.enabled = false;
    PVP.bannedIds = new Set();

    showRulesModal(()=>{
      const size = PVP.teamSize();
      const picker = (PVP.selection === "draft") ? showDraftModal : showCharacterSelectModal;
      picker(size, (picks)=>{
        showReadyModal(()=>{
          setupPvpBattle(picks);
        });
      });
    });
  }

  function bindHomePvpButton(){
    const btn = $("btnPvp");
    if (!btn || btn._pvpBound) return;
    btn._pvpBound = true;
    btn.addEventListener("click", ()=>{
      // go to battle.html
      window.location.href = "battle.html";
    });
  }

  function autoStartFromBattleHtml(){
    if (!window.__FORCE_PVP__) return;
    // Hide home screen if it exists
    const home = $("home");
    if (home) home.style.display = "none";

    // Force game screen visible (some builds rely on showScreen)
    // If your build has showScreen, use it. Otherwise just display game container.
    if (typeof window.showScreen === "function"){
      try{ window.showScreen("game"); }catch(e){}
    }else{
      const game = $("game");
      if (game) game.style.display = "";
    }
    // Start the flow
    showModeModal();
  }

  window.addEventListener("DOMContentLoaded", ()=>{
    ensurePvpUI();
    bindHomePvpButton();
    // If battle.html, auto start
    autoStartFromBattleHtml();

    // Also allow starting PVP from console
    window.startPvp = startPvpFlow;
  });

})();
