// =========================
// CARD BATTLER (SURVIVAL + GOLD + SHOP + RELICS + AI + HIT FX + SFX)
// =========================


const GAME_VERSION = "single-relic-equip-v4";
console.log("Loaded game.js", GAME_VERSION);
// =========================
// HELPERS (Shield / Armor rules)
// =========================
function canGainArmor(f) {
  return !(f && f.noArmorGain && f.noArmorGain > 0);
}
function gainShield(f, amount) {
  if (!f || amount <= 0) return 0;
  if (!canGainArmor(f)) return 0; // Time Lock blocks armor gain
  const cap = getShieldCap();
  const before = f.shield;
  f.shield = Math.min(cap, f.shield + amount);
  return f.shield - before;
}

// ✅ Reboot Seal: blocks healing
function canHeal(f) {
  return !(f && f.rebootSeal && f.rebootSeal > 0);
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
  defender.shield = Math.min(getShieldCap(), defender.shield * 2);

  defender.passiveCdUntil = now + 5 * 60 * 1000;

  log(`⭐ Yrol's passive triggers! Hit by an ability → stats doubled! (5 min CD)`, "good");
  floatingDamage(defender === state.player ? "player" : "enemy", "⭐ x2", "good");
  updateUI();
}



// =========================
// 🎰 LUCKY LEGENDARY PASSIVE: Entity
// On defeating an enemy with a normal ATTACK, doubles ATK/DEF/MaxHP and doubles current HP (capped).
// =========================
function triggerRelicbornTitanOnKill(attacker, defender, opts) {
  if (!attacker || attacker.id !== "relicbornTitan") return;
  if (!defender || Number(defender.hp) > 0) return;
  const source = String(opts?.source || "attack").toLowerCase();
  if (source !== "attack") return;

  attacker.atk = Math.max(0, Number(attacker.atk || 0)) * 2;
  attacker.def = Math.max(0, Number(attacker.def || 0)) * 2;

  const oldHp = Math.max(0, Number(attacker.hp || 0));
  attacker.maxHp = Math.max(1, Number(attacker.maxHp || 1)) * 2;
  attacker.hp = Math.min(attacker.maxHp, oldHp * 2);

  // Shield is still capped by shield cap, but we double what you currently have
  attacker.shield = Math.min(getShieldCap(), Math.max(0, Number(attacker.shield || 0)) * 2);

  log(`🌟 ${attacker.name} grows stronger! (On Kill) → Stats doubled.`, "good");
  floatingDamage(attacker === state.player ? "player" : "enemy", "🌟 x2", "good");
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

      me.cooldown = 2;

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
      me.cooldown = 2;
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
      me.cooldown = 2;
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
      me.cooldown = 2;
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
      me.cooldown = 2;
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
        me.cooldown = 2;
        updateUI();
        return { ok: true, msg: `${me.name} steals 1 Armor! (+${gained} to you)` };
      }

      me.cooldown = 2;
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

    me.cooldown = 2;

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
      me.cooldown = 2;
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
      me.cooldown = 2;
      return { ok: true, msg: `${me.name} casts Void Burst! 2 dmg + Stun.` };
    }
  }
];

// =========================
// BUYABLE/UNLOCKABLE CARDS (SHOP)
// After purchase -> playable + appears in Pick, Gallery, Enemy pool
// =========================
const UNLOCKABLE_CARD_DEFS = {
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
      me.cooldown = 2;
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

      me.cooldown = 2;
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
        me.cooldown = 2;
        return { ok: true, msg: `${me.name} uses Starstep Combo! Healed 5, +${gained} Armor, 3 hits + bonus strike!` };
      }

      me.cooldown = 2;
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

      me.cooldown = 2;
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
    skillDesc: "Deal 4 damage, remove ALL enemy armor, apply Reboot Seal (2 turns) — enemy cannot heal. (CD 3)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      applyDamage(foe, 4, { silent: true, source: "skill", });

      const removed = foe.shield;
      foe.shield = 0;

      foe.rebootSeal = Math.max(foe.rebootSeal || 0, 2);

      me.cooldown = 3;
      updateUI();
      return {
        ok: true,
        msg: `${me.name} uses Reality Lock! 4 dmg, removed ${removed} armor, Reboot Seal (2 turns).`
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
    me.cooldown = 2;
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
    skillDesc: "Silence enemy (no skill) for 2 turns and deal damage based on enemy HP+Shield (40%). Cooldown: 5 minutes.",
    skill: (me, foe) => {
      if (!isSkillReady(me)) {
        return { ok: false, msg: `Skill is on cooldown (${formatSkillCd(me)}).` };
      }
      // Silence
      foe.silenced = Math.max(foe.silenced || 0, 2);

      // Damage based on enemy current HP + Shield
      const total = (foe.hp || 0) + (foe.shield || 0);
      const dmg = Math.max(1, Math.ceil(total * 0.40));

      // Mark as skill damage so Yrol passive can detect it
      applyDamage(foe, dmg, { silent: true, source: "skill", });

      // Start 5-minute real-time cooldown
      setSkillCooldown(me, 5 * 60 * 1000);

      updateUI();
      return { ok: true, msg: `${me.name} uses Null Hymn! Enemy is Silenced (2 turns) and takes ${dmg} damage.` };
    },
    legendaryCooldownMs: 5 * 60 * 1000
  }
,

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
    skillName: "Armor Break Roulette",
    skillDesc: "Remove ALL enemy armor, then 50% chance to deal 25 damage, otherwise 5 damage. (CD 2)",
    skill: (me, foe) => {
      if (me.cooldown > 0) return { ok: false, msg: `Skill is on cooldown (${me.cooldown} turns).` };

      const removed = foe.shield || 0;
      foe.shield = 0;

      const big = Math.random() < 0.5;
      const dmg = big ? 25 : 5;
      applyDamage(foe, dmg, { silent: true, source: "skill", attackerName: me.name });

      me.cooldown = 2;
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

      me.cooldown = 2;
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

      me.cooldown = 2;
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
  }


};

const SHOP_CARDS = [

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

  "relicbornTitan": "A titan forged from broken relics—he spins fate like a roulette wheel and calls it justice.",
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
  { id: "fieldMedic", name: "Field Medic", price: 85, desc: "At the start of every stage, heal 1 HP." }
];

// =========================
// 🎰 LUCKY DRAW (Gacha)
// =========================
const LUCKY_DRAW = {
  singleCost: 2000,
  fiveCost: 10000,
  // Updated rewards (NO relics):
  //  - 1% card
  //  - 99% gold (fixed amounts)
  cardChance: 0.01,
  goldTable: [100, 20, 1000, 2000, 200, 150, 250]
};

// --- Storage keys ---
const GOLD_KEY = "cb_gold";
const OWNED_KEY = "cb_owned";
const RELIC_OWNED_KEY = "cb_owned_relics";
const RELIC_EQUIPPED_KEY = "cb_equipped_relic";

// --- Lucky Draw ---
const LUCKY_ENTITY_OWNED_KEY = "cb_lucky_entity_owned";
const LUCKY_HISTORY_KEY = "cb_lucky_history";

// --- Game State ---
const state = {
  phase: "pick",
  turn: "player",
  round: 1,
  stage: 1,
  gold: 0,
  owned: {},
  ownedRelics: {},
  relics: [],
  equippedRelicId: null,
  luckyEntityOwned: false,
  player: null,
  enemy: null,
  // Last damage/ability line that affected the PLAYER (shown on defeat)
  lastHitSummary: "",
  lastAction: ""
};

const $ = (id) => document.getElementById(id);

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
function getShieldCap() {
  return hasRelic("reinforcedPlating") ? 8 : 6;
}

function equipRelic(id) {
  if (!id) return;

  // ✅ Only 1 relic can be equipped at a time
  state.equippedRelicId = id;
  state.relics = [id];

  // Clamp shields if cap changed
  if (state.player) state.player.shield = Math.min(getShieldCap(), state.player.shield);
  if (state.enemy) state.enemy.shield = Math.min(getShieldCap(), state.enemy.shield);

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
// CARD POOL (BASE + UNLOCKED)
// =========================
function getAllCards() {
  const unlocked = Object.keys(state.owned || {})
    .filter((id) => state.owned[id] && UNLOCKABLE_CARD_DEFS[id])
    .map((id) => UNLOCKABLE_CARD_DEFS[id]);

  const map = new Map();
  [...BASE_CARDS, ...unlocked].forEach((c) => map.set(c.id, c));
  return Array.from(map.values());
}

// =========================
// GALLERY CARD POOL (show ALL cards, even locked/unowned)
// =========================
function getGalleryCards() {
  const allUnlockables = Object.keys(UNLOCKABLE_CARD_DEFS || {}).map((id) => UNLOCKABLE_CARD_DEFS[id]).filter(Boolean);
  const map = new Map();
  [...BASE_CARDS, ...allUnlockables].forEach((c) => map.set(c.id, c));
  return Array.from(map.values());
}

function findCardById(id) {
  const all = getGalleryCards();
  return all.find((c) => c.id === id) || null;
}

// =========================
// PROGRESS
// =========================
function loadProgress() {
  const g = parseInt(localStorage.getItem(GOLD_KEY) || "0", 10);
  state.gold = Number.isFinite(g) ? g : 0;

  try { state.owned = JSON.parse(localStorage.getItem(OWNED_KEY) || "{}") || {}; }
  catch { state.owned = {}; }

  // ---- Relics (owned + equipped) ----
  let ownedRaw;
  try { ownedRaw = JSON.parse(localStorage.getItem(RELIC_OWNED_KEY) || "{}") || {}; }
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
  const equippedRaw = (localStorage.getItem(RELIC_EQUIPPED_KEY) || "").trim();

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

  // ---- Lucky Draw ----
  try {
    state.luckyEntityOwned = (localStorage.getItem(LUCKY_ENTITY_OWNED_KEY) || "") === "1";
  } catch {
    state.luckyEntityOwned = false;
  }

  try {
    const raw = localStorage.getItem(LUCKY_HISTORY_KEY);
    state.luckyHistory = raw ? (JSON.parse(raw) || []) : [];
  } catch {
    state.luckyHistory = [];
  }

  state.relics = state.equippedRelicId ? [state.equippedRelicId] : [];
}


function saveProgress() {
  localStorage.setItem(GOLD_KEY, String(state.gold));
  localStorage.setItem(OWNED_KEY, JSON.stringify(state.owned));
  localStorage.setItem(RELIC_OWNED_KEY, JSON.stringify(state.ownedRelics));
  localStorage.setItem(RELIC_EQUIPPED_KEY, state.equippedRelicId || "");
  localStorage.setItem(LUCKY_HISTORY_KEY, JSON.stringify(state.luckyHistory || []));
localStorage.setItem(LUCKY_ENTITY_OWNED_KEY, state.luckyEntityOwned ? "1" : "0");
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

function showView(view) {
  const ids = ["home", "gallery", "setup", "game", "shop"];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === view ? "block" : "none";
  });
  updateGoldUI();
}

// =========================
// FIGHTER
// =========================
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
      // ✅ no HP overflow in the same hit
      hpLoss = 0;
    } else {
      hpLoss = Math.min(defender.hp, dmg);
      defender.hp = Math.max(0, defender.hp - hpLoss);
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

  // Combat log detail
  if (!opts.silent && dmg > 0) {
    if (damageType === "true") {
      log(`✨ TRUE damage ignores armor → ${defender.name} takes ${hpLoss} HP.`, "warn");
    } else if (absorbed > 0) {
      log(`🛡️ Armor absorbs ${absorbed}. (No HP overflow this hit.)`, "warn");
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

  // Entity on-kill scaling (attack only)
  try { triggerRelicbornTitanOnKill(opts.attacker || null, defender, opts || {}); } catch (e) {}

  // Reflect relic
  if (defender === state.player && hasRelic("spikedArmor") && dmg > 0 && state.enemy && Number(state.enemy.hp) > 0) {
    applyDamage(state.enemy, 1, { silent: true, source: "skill", attackerName: defender.name });
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
    if (dSh > 0) f.shield = Math.max(0, Number(f.shield || 0) - dSh);

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
function closeModal() { const m = document.getElementById("resultModal"); if (m) m.style.display = "none"; }

// =========================
// BATTLE FLOW
// =========================
function spawnNextEnemy() {
  const all = getGalleryCards();
  const playerId = state.player.id;
  const pool = all.filter((c) => c.id !== playerId);
  const enemyBase = pool[Math.floor(Math.random() * pool.length)];

  state.enemy = cloneCard(enemyBase);
  state.enemy.passiveEnabled = true;
  state.enemy.aiType = pickEnemyAI();

  
  resetCardVisuals();
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

  $("turnTag").textContent = `Turn: ${state.turn === "player" ? "Player" : "Enemy"}`;
  $("roundTag").textContent = `Round: ${state.round}`;
  $("stageTag").textContent = `Stage: ${state.stage}`;
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
  $("pShield").textContent = p.shield;

  $("eHP").textContent = `${e.hp}/${e.maxHp}`;
  $("eATK").textContent = e.atk;
  $("eDEF").textContent = e.def;
  $("eShield").textContent = e.shield;

  $("pHpBar").style.width = `${Math.round((p.hp / p.maxHp) * 100)}%`;
  $("eHpBar").style.width = `${Math.round((e.hp / e.maxHp) * 100)}%`;

  $("pShieldBar").style.width = `${Math.round((p.shield / getShieldCap()) * 100)}%`;
  $("eShieldBar").style.width = `${Math.round((e.shield / getShieldCap()) * 100)}%`;

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
}

function checkWin() {
  const p = state.player, e = state.enemy;

  // ✅ HARDEN: if any path produced NaN HP, treat as 0 so deaths resolve
  if (!Number.isFinite(Number(p.hp))) p.hp = 0;
  if (e && !Number.isFinite(Number(e.hp))) e.hp = 0;

  // LOSE -> flip, then show Defeat modal (Go Home)
  if (p.hp <= 0) {
    cardDieFlip("player");
    state.phase = "over";
    updateUI();
    playSfx("sfxLose", 0.9);

    // After the death flip + a short delay so the last damage/ability effects are visible
    setTimeout(() => {
      state.modalAction = "home";
      const btnNext = $("btnNextEnemy");
      if (btnNext) btnNext.textContent = "🏠 Go Home";
      openModal({
        title: "💀 Defeat",
        text: `You died at Stage ${state.stage}.`,
        stageLabel: `Stage ${state.stage}`,
        hint: `Last hit: ${state.lastHitSummary || "Unknown"}.  Check the battle log above to see what killed you, then go home or restart.`,
        goldReward: 0,
        mode: "defeat"
      });
    }, 2200);

    return true;
  }

  // WIN -> flip enemy, then reward gold (no modal) and spawn next enemy
  if (e.hp <= 0) {
        if (state.player && state.player.id === "luckyApexEntity" && state.lastAction === "attack") {
      const p = state.player;
      p.atk = Math.max(1, Number(p.atk || 0) * 2);
      p.def = Math.max(0, Number(p.def || 0) * 2);

      const oldHp = Number(p.hp || 0);
      p.maxHp = Math.max(1, Number(p.maxHp || 1) * 2);
      p.hp = Math.min(p.maxHp, oldHp * 2);

      // Double current shield but respect the current cap
      p.shield = Math.min(getShieldCap(), Number(p.shield || 0) * 2);

      log(`⭐ ${p.name} defeats an enemy → stats doubled!`, "good");
      floatingDamage("player", "⭐ x2", "good");
      updateUI();
    }

    cardDieFlip("enemy");
    state.phase = "over";
    updateUI();
    playSfx("sfxWin", 0.85);

    const reward = 50 + Math.floor(state.stage * 18);

    // after death flip (0.55s) + 1s delay
    setTimeout(() => {
      addGold(reward);
      floatingDamage("player", `+${reward}g`, "good");
      log(`🏆 Victory! +${reward} gold.`, "good");

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
// PICK / GALLERY
// =========================
function renderPick() {
  const grid = $("pickGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const all = getAllCards();

  all.forEach((card) => {
    const div = document.createElement("div");
    const isForbiddenPick = card.id === "cosmicGod"; // ✅ Cosmic God cannot be picked by player
    div.className = "cardPick" + (isForbiddenPick ? " disabledPick" : "");
    div.innerHTML = `
      <img src="${card.img}" alt="${card.name}" />
      <div class="titleRow" style="margin-top:10px;">
        <strong>${card.name}${isForbiddenPick ? " 🔒" : ""}</strong>
        <span class="pill">Damage ${card.atk} • Armor ${card.def} • Life ${card.hp}</span>
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
    div.className = "cardPick";

    const enemyOnly = card.id === "cosmicGod";
    const lockTag = enemyOnly ? " 🔒" : "";

    div.innerHTML = `
      <img src="${card.img}" alt="${card.name}" />
      <div class="titleRow" style="margin-top:10px;">
        <strong>${card.name}${lockTag}</strong>
        <span class="pill">Damage ${card.atk} • Armor ${card.def} • Life ${card.hp}</span>
      </div>
      <div class="muted" style="margin-top:6px;">
        <b>${card.skillName}:</b> ${card.skillDesc}
      </div>

      ${enemyOnly ? `<div class="muted" style="margin-top:8px;"><b>Note:</b> Sealed by Gods (Enemy-only).</div>` : ``}

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
// ✅ REDEEM CODES
// =========================
function redeemCodeFlow() {
  const codeRaw = prompt("Enter redeem code:") || "";
  const code = codeRaw.trim().toUpperCase();
  if (!code) return;

  const map = {
    "IAMYROL": "yrol",
    "IAMABARCA": "abarskie"
  };

  const id = map[code];
  if (!id) {
    alert("Invalid code.");
    return;
  }

  if (state.owned[id]) {
    alert("You already redeemed this legendary.");
    return;
  }

  // Unlock permanently
  state.owned[id] = true;
  saveProgress();
  updateGoldUI();

  // Refresh pick/gallery so it appears immediately
  renderPick();
  renderGallery();

  const c = UNLOCKABLE_CARD_DEFS[id];
  alert(`Redeemed: ${c?.name || id} ⭐\nIt is now unlocked & playable!`);
}

// =========================
// SHOP TABS
// =========================
function setShopTab(tab) {
  const relicWrap = $("shopRelicsWrap");
  const cardWrap = $("shopCardsWrap");
  const luckyWrap = $("shopLuckyWrap");
  const bRelics = $("tabShopRelics");
  const bCards = $("tabShopCards");
  const bLucky = $("tabShopLucky");

  if (!relicWrap || !cardWrap || !bRelics || !bCards || !luckyWrap || !bLucky) return;

  if (tab === "relics") {
    relicWrap.style.display = "block";
    cardWrap.style.display = "none";
    luckyWrap.style.display = "none";
    bRelics.classList.add("tabActive");
    bCards.classList.remove("tabActive");
    bLucky.classList.remove("tabActive");
  } else if (tab === "cards") {
    relicWrap.style.display = "none";
    cardWrap.style.display = "block";
    luckyWrap.style.display = "none";
    bRelics.classList.remove("tabActive");
    bCards.classList.add("tabActive");
    bLucky.classList.remove("tabActive");
  } else {
    // lucky
    relicWrap.style.display = "none";
    cardWrap.style.display = "none";
    luckyWrap.style.display = "block";
    bRelics.classList.remove("tabActive");
    bCards.classList.remove("tabActive");
    bLucky.classList.add("tabActive");
    renderLuckyDraw();
  }
}

// =========================
// SHOP (Cards)
// =========================
function renderShopCards() {
  const grid = $("shopGrid");
  if (!grid) return;
  grid.innerHTML = "";

  SHOP_CARDS.forEach((item) => {
    const owned = !!state.owned[item.id];
    const canBuy = state.gold >= item.price;
    const isSoon = !!item.comingSoon;
    const imgHtml = item.img ? `<img class="shopCardImg" src="${item.img}" alt="${item.name}" />` : "";

    const btnText = isSoon
      ? "Coming Soon"
      : owned
        ? "✅ Owned"
        : (canBuy ? "Buy" : "Not Enough Gold");

    const btnDisabled = isSoon || owned || !canBuy;

    const div = document.createElement("div");
    div.className = "shopItem";
    div.innerHTML = `
      ${imgHtml}
      <div class="shopItemTop">
        <div>
          <h3 class="shopName">${item.name}</h3>
          <div class="shopMeta">
            <span class="badge">Price: ${item.price} Gold</span>
            ${owned ? `<span class="badge badgeOwned">Owned</span>` : (isSoon ? `<span class="badge">Soon</span>` : `<span class="badge">Playable</span>`)}
          </div>
        </div>
      </div>
      <p class="shopDesc">${item.desc}</p>
      <div class="shopActions">
        <button class="btn btnPrimary" ${btnDisabled ? "disabled" : ""} data-buy="${item.id}">
          ${btnText}
        </button>
      </div>
    `;
    grid.appendChild(div);
  });

  grid.querySelectorAll("button[data-buy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      playSfx("sfxClick", 0.45);
      const id = btn.getAttribute("data-buy");
      buyCardFromShop(id);
    });
  });
}

function buyCardFromShop(id) {
  const item = SHOP_CARDS.find((x) => x.id === id);
  if (!item) return;
  if (item.comingSoon) return;
  if (state.owned[id]) return;
  if (state.gold < item.price) return;

  state.gold -= item.price;
  state.owned[id] = true;

  saveProgress();
  updateGoldUI();
  renderShopCards();

  renderPick();
  renderGallery();

  playSfx("sfxBuy", 0.85);

  if (UNLOCKABLE_CARD_DEFS[id]) {
    alert(`Unlocked & Playable: ${item.name} ✅\nGo to Battle Now / Setup to pick it!`);
  } else {
    alert(`Purchased: ${item.name} ✅`);
  }
}

// =========================
// SHOP (Relics)
// =========================
function renderShopRelics() {
  const grid = $("shopRelicGrid");
  if (!grid) return;
  grid.innerHTML = "";

  // ✅ Sanity: enforce single equipped relic
  if (Array.isArray(state.relics) && state.relics.length > 1) {
    state.relics = [state.relics[0]];
  }
  if (!state.equippedRelicId && Array.isArray(state.relics) && state.relics.length === 1) {
    state.equippedRelicId = state.relics[0];
  }


  RELICS.forEach((r) => {
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
        <button class="btn btnPrimary" ${btnDisabled ? "disabled" : ""} data-relic-action="${action}" data-relic-id="${r.id}">
          ${btnText}
        </button>
      </div>
    `;
    grid.appendChild(div);
  });

  grid.querySelectorAll("button[data-relic-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      playSfx("sfxClick", 0.45);
      const id = btn.getAttribute("data-relic-id");
      const action = btn.getAttribute("data-relic-action");

      if (action === "buy") buyRelic(id);
      if (action === "equip") equipRelic(id);
    });
  });
}

function buyRelic(id) {
  const r = RELICS.find((x) => x.id === id);
  if (!r) return;

  // If already owned, just equip it
  if (state.ownedRelics[id]) {
    equipRelic(id);
    return;
  }

  if (state.gold < r.price) return;

  state.gold -= r.price;
  state.ownedRelics[id] = true;

  // ✅ Equip ONLY this one relic
  equipRelic(id);

  saveProgress();
  updateGoldUI();
  renderShopRelics();

  playSfx("sfxBuy", 0.85);

  if (state.phase === "battle") {
    log(`🪬 Purchased & equipped relic: ${r.name}`, "good");
  }

  alert(`Purchased & Equipped: ${r.name} ✅`);
}

function renderShop() {
  renderShopRelics();
  renderShopCards();
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

  // 1% Card (unique)
  // If already owned, treat as a non-card reward to avoid "dead" draws.
  if (!state.luckyEntityOwned && r < LUCKY_DRAW.cardChance) {
    return {
      type: "card",
      id: "relicbornTitan",
      title: "LEGENDARY — Entity",
      icon: "🌟",
      rarity: "legendary",
      desc: "6 Damage • 5 Armor • 5 Life • Passive: on kill, doubles stats • Ability: remove all armor + 50% 25/5 dmg."
    };
  }

  // Otherwise: gold reward (fixed amounts; no relics in Lucky Draw)
  const table = Array.isArray(LUCKY_DRAW.goldTable) && LUCKY_DRAW.goldTable.length
    ? LUCKY_DRAW.goldTable
    : [100];
  const gold = pickRandomFrom(table) || 100;
  return {
    type: "gold",
    amount: gold,
    title: `Gold +${gold}`,
    icon: "🪙",
    rarity: "common",
    desc: "More gold for the shop."
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

function openLuckyModal(reward) {
  const modal = $("luckyModal");
  if (!modal) return;

  const title = $("luckyModalTitle");
  const pill = $("luckyModalPill");
  const body = $("luckyRewardBody");
  const hint = $("luckyModalHint");
  const card = $("luckyCardReveal");
  const name = $("luckyRewardName");
  const rarityEl = $("luckyRewardRarity");

  // Multi progress (1 / 5)
  const list = Array.isArray(state.luckyPendingRewards) ? state.luckyPendingRewards : [];
  const idx = Number(state.luckyPendingIndex || 0);
  const total = Math.max(1, list.length || 1);
  setLuckyModalProgress(idx, total);

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

  if (hint) hint.textContent = "Tap Claim to add it to your account.";

  modal.style.display = "flex";

  // Flip-in animation every reveal
  if (card) {
    card.classList.remove("flipIn", "legendaryBurst");
    void card.offsetWidth;
    card.classList.add("flipIn");
    if (reward?.rarity === "legendary") card.classList.add("legendaryBurst");
  }

  // Jackpot sound for legendary
  if (reward?.rarity === "legendary") {
    playSfx("sfxJackpot", 0.95);
    // extra juice
    const box = modal.querySelector(".modalBox");
    if (box) {
      box.classList.remove("luckyShake");
      void box.offsetWidth;
      box.classList.add("luckyShake");
    }
    confettiBurst(total > 1 ? 110 : 80);
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
  } else if (reward.type === "card") {
    state.owned[reward.id] = true;
    // Track the Lucky Draw entity as unique
    if (reward.id === "relicbornTitan") {
      state.luckyEntityOwned = true;
      try { localStorage.setItem(LUCKY_ENTITY_OWNED_KEY, "1"); } catch (e) {}
    }
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
    openLuckyModal(first);
    if (b1) b1.disabled = false;
    if (b5) b5.disabled = false;
  }, spinMs);
}

function claimNextLuckyReward() {
  const list = Array.isArray(state.luckyPendingRewards) ? state.luckyPendingRewards : [];
  const i = Number(state.luckyPendingIndex || 0);
  const reward = list[i];
  if (!reward) {
    closeLuckyModal();
    return;
  }

  applyLuckyReward(reward);

  // Move to next reward (for 5x draws)
  state.luckyPendingIndex = i + 1;
  const next = list[state.luckyPendingIndex];
  if (next) {
    // Micro-transition between cards for a snappy multi-reveal
    const card = $("luckyCardReveal");
    if (card) {
      card.classList.remove("flipIn");
      void card.offsetWidth;
    }
    setTimeout(() => openLuckyModal(next), 140);
  } else {
    closeLuckyModal();
  }
}
// =========================
// START / RESET
// =========================
function startGame(playerCardId) {
  // ✅ Prevent picking Cosmic God as the player (enemy can still roll it randomly)
  if (playerCardId === "cosmicGod") {
    alert("Cosmic God is sealed by the Gods and cannot be selected. (Enemy-only card)");
    return;
  }

  state.stage = 1;
  state.relics = state.equippedRelicId ? [state.equippedRelicId] : [];

  const playerBase = findCardById(playerCardId);
  const all = getGalleryCards();
  const pool = all.filter((c) => c.id !== playerCardId);
  const enemyBase = pool[Math.floor(Math.random() * pool.length)];

  state.player = cloneCard(playerBase);
  state.enemy = cloneCard(enemyBase);
  state.enemy.passiveEnabled = true;
  state.enemy.aiType = pickEnemyAI();

  state.player.shield = Math.min(getShieldCap(), state.player.shield);

  state.phase = "battle";
  state.turn = "player";
  state.round = 1;

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

  // Defeat: go back home/setup
  if (state.modalAction === "home") {
    state.modalAction = null;
    const btnNext = $("btnNextEnemy");
    if (btnNext) btnNext.textContent = "⚔️ Next Enemy";
    resetAll();
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
  state.modalAction = null;
  const btnNext = $("btnNextEnemy");
  if (btnNext) btnNext.textContent = "⚔️ Next Enemy";
  closeModal();
  resetAll();
});

safeOn("btnAttack", () => { playSfx("sfxClick", 0.35); playerAttack(); });
safeOn("btnSkill", () => { playSfx("sfxClick", 0.35); playerSkill(); });
safeOn("btnEnd", () => { playSfx("sfxClick", 0.35); playerEndTurn(); });
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
safeOn("btnBackHomeFromGallery", () => { playSfx("sfxClick", 0.45); showView("home"); });
safeOn("btnGalleryToBattle", () => { playSfx("sfxClick", 0.45); resetAll(); });
safeOn("btnBackHomeFromSetup", () => { playSfx("sfxClick", 0.45); showView("home"); });
safeOn("btnSetupGallery", () => { playSfx("sfxClick", 0.45); renderGallery(); showView("gallery"); });
safeOn("btnExitToHome", () => { playSfx("sfxClick", 0.45); showView("home"); });

safeOn("btnOpenShop", () => { playSfx("sfxClick", 0.45); renderShop(); setShopTab("relics"); showView("shop"); });
safeOn("btnHomeShop", () => { playSfx("sfxClick", 0.45); renderShop(); setShopTab("relics"); showView("shop"); });
safeOn("btnShopBackHome", () => { playSfx("sfxClick", 0.45); showView("home"); });

safeOn("btnRedeemCode", () => { playSfx("sfxClick", 0.45); redeemCodeFlow(); });
safeOn("btnShopToBattle", () => { playSfx("sfxClick", 0.45); resetAll(); });

safeOn("tabShopRelics", () => { playSfx("sfxClick", 0.35); setShopTab("relics"); });
safeOn("tabShopCards", () => { playSfx("sfxClick", 0.35); setShopTab("cards"); });



// Lucky Draw buttons
safeOn("btnLuckySingle", () => { playSfx("sfxClick", 0.45); doLuckyDraw(1); });
safeOn("btnLuckyFive", () => { playSfx("sfxClick", 0.45); doLuckyDraw(5); });
safeOn("btnLuckyClaim", () => { playSfx("sfxBuy", 0.65); claimNextLuckyReward(); });
safeOn("btnLuckyClose", () => { playSfx("sfxClick", 0.35); closeLuckyModal(); });

safeOn("tabShopLucky", () => { playSfx("sfxClick", 0.35); setShopTab("lucky"); });



// Close any open lore tooltips when clicking elsewhere
function closeAllLoreTooltips() {
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
showView("home");
