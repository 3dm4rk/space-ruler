// =========================
// CARD BATTLER (SURVIVAL + GOLD + SHOP + RELICS + AI + HIT FX + SFX)
// =========================

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
    me.shield += 4;
    applyDamage(foe, 6, { silent: true, source: "skill", });
    me.cooldown = 2;
    updateUI();
    return { ok: true, msg: `${me.name} uses Void Counter! +4 armor, 6 damage.` };
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
    foe.hp = Math.max(0, foe.hp - dmg);
    floatingDamage("enemy", `-${dmg}`, "bad");
    tryYrolPassive(foe, { source: "skill" });

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
];

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

// --- Storage keys ---
const GOLD_KEY = "cb_gold";
const OWNED_KEY = "cb_owned";
const RELIC_OWNED_KEY = "cb_owned_relics";

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
  player: null,
  enemy: null
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

  const ids = ["sfxClick", "sfxAttack", "sfxSkill", "sfxEnd", "sfxWin", "sfxLose", "sfxBuy"];
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
function hasRelic(id) { return state.relics.includes(id); }
function getShieldCap() { return hasRelic("reinforcedPlating") ? 8 : 6; }

function equipRelic(id) {
  if (state.relics.includes(id)) return;
  state.relics.push(id);

  if (id === "reinforcedPlating" && state.player) {
    state.player.shield = Math.min(getShieldCap(), state.player.shield);
  }
  updateUI();
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

  try { state.ownedRelics = JSON.parse(localStorage.getItem(RELIC_OWNED_KEY) || "{}") || {}; }
  catch { state.ownedRelics = {}; }

  state.relics = Object.keys(state.ownedRelics).filter((id) => state.ownedRelics[id]);
}

function saveProgress() {
  localStorage.setItem(GOLD_KEY, String(state.gold));
  localStorage.setItem(OWNED_KEY, JSON.stringify(state.owned));
  localStorage.setItem(RELIC_OWNED_KEY, JSON.stringify(state.ownedRelics));
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

// ✅ Armor first then HP
function applyDamage(defender, dmg, opts = {}) {
  // ✅ HARDEN: prevent NaN/undefined HP/Shield from blocking death checks
  dmg = Number(dmg);
  if (!Number.isFinite(dmg)) dmg = 0;

  defender.hp = Number(defender.hp);
  if (!Number.isFinite(defender.hp)) defender.hp = 0;

  defender.shield = Number(defender.shield);
  if (!Number.isFinite(defender.shield)) defender.shield = 0;

  const absorbed = Math.min(defender.shield, dmg);
  defender.shield = Math.max(0, defender.shield - absorbed);

  const remaining = dmg - absorbed;
  defender.hp = Math.max(0, defender.hp - remaining);

  const who = defender === state.player ? "player" : "enemy";
  pulseHit(who);
  floatingDamage(who, `-${dmg}`, "bad");

  // ✅ Legendary passive checks (e.g., Yrol)
  tryYrolPassive(defender, opts || {});

  if (!opts.silent) {
    if (absorbed > 0 && remaining > 0) log(`🛡️ Armor absorbed ${absorbed}, HP took ${remaining}.`, "warn");
    else if (absorbed > 0) log(`🛡️ Armor absorbed ${absorbed}.`, "warn");
  }

  if (defender === state.player && hasRelic("spikedArmor") && dmg > 0 && state.enemy && Number(state.enemy.hp) > 0) {
    applyDamage(state.enemy, 1, { silent: true, source: "skill" });
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
  if (f.cooldown > 0) f.cooldown -= 1;
  if (f.frozen > 0) f.frozen -= 1;
  if (f.stunned > 0) f.stunned -= 1;
  if (f.noArmorGain > 0) f.noArmorGain -= 1;
  if (f.rebootSeal > 0) f.rebootSeal -= 1; // ✅ NEW
  if (f.silenced > 0) f.silenced -= 1;
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
  $("resultTitle").textContent = title;
  $("resultText").textContent = text;
  $("resultStage").textContent = stageLabel;

  $("modalHP").textContent = `${state.player.hp}/${state.player.maxHp}`;
  $("modalShield").textContent = `${state.player.shield}`;
  $("modalGoldReward").textContent = goldReward != null ? `+${goldReward}` : "+0";
  $("modalGoldTotal").textContent = `${state.gold}`;
  $("modalHint").textContent = hint || "";

  if (mode === "lose") $("btnNextEnemy").style.display = "none";
  else $("btnNextEnemy").style.display = "inline-block";

  $("resultModal").style.display = "flex";
}
function closeModal() { $("resultModal").style.display = "none"; }

// =========================
// BATTLE FLOW
// =========================
function spawnNextEnemy() {
  const all = getAllCards();
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
  log(`🔥 Stage ${state.stage}: Enemy is ${state.enemy.name}.`, "warn");
  log(`🧠 Enemy AI: ${state.enemy.aiType}`, "warn");

  tryEnemyPassive();
  updateUI();
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

  $("pShieldBar").style.width = `${Math.round((p.shield / getShieldCap()) * 100)}%`;
  $("eShieldBar").style.width = `${Math.round((e.shield / getShieldCap()) * 100)}%`;

  const pLock = p.noArmorGain > 0 ? ` • Time Lock: ${p.noArmorGain}` : "";
  const eLock = e.noArmorGain > 0 ? ` • Time Lock: ${e.noArmorGain}` : "";

  const pSeal = p.rebootSeal > 0 ? ` • Reboot Seal: ${p.rebootSeal}` : "";
  const eSeal = e.rebootSeal > 0 ? ` • Reboot Seal: ${e.rebootSeal}` : "";

  $("pStatus").textContent =
    (p.frozen ? "Frozen" : (p.stunned ? "Stunned" : (isSilenced(p) ? "Silenced" : "None"))) +
    ((p.skillReadyAt && p.skillReadyAt > Date.now()) ? ` • Skill CD: ${formatSkillCd(p)}` : (p.cooldown ? ` • Skill CD: ${p.cooldown}` : "")) +
    pLock + pSeal;

  $("eStatus").textContent =
    (e.frozen ? "Frozen" : (e.stunned ? "Stunned" : (isSilenced(e) ? "Silenced" : "None"))) +
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


  // LOSE -> flip, then open SHOP modal only
  if (p.hp <= 0) {
    cardDieFlip("player");
    state.phase = "over";
    updateUI();
    playSfx("sfxLose", 0.9);

    // after death flip (0.55s) + 1s delay
    setTimeout(() => {
      state.modalAction = "shop";
      const btnNext = $("btnNextEnemy");
      if (btnNext) btnNext.textContent = "🛒 Shop";
      openModal({
        title: "💀 Defeat",
        text: `You died at Stage ${state.stage}. Spend gold in the shop and try again.`,
        stageLabel: `Stage ${state.stage}`,
        hint: "Buy relics / unlock cards, then restart the run.",
        goldReward: 0,
        mode: "shop"
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
  applyDamage(p, dmg);

  if (!checkWin()) nextTurn();
}

// =========================
// PLAYER ACTIONS
// =========================
function playerAttack() {
  const p = state.player, e = state.enemy;
  if (p.frozen > 0) {
    log(`${p.name} is frozen and cannot act!`, "warn");
    nextTurn();
    return;
  }

  playSfx("sfxAttack", 0.8);

  const dmg = dmgCalc(p);
  log(`${p.name} attacks for ${dmg} damage!`, "good");

  spawnAttackFx("player", "enemy");
  applyDamage(e, dmg);

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
  const p = state.player, e = state.enemy;
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
  const bRelics = $("tabShopRelics");
  const bCards = $("tabShopCards");

  if (!relicWrap || !cardWrap || !bRelics || !bCards) return;

  if (tab === "relics") {
    relicWrap.style.display = "block";
    cardWrap.style.display = "none";
    bRelics.classList.add("tabActive");
    bCards.classList.remove("tabActive");
  } else {
    relicWrap.style.display = "none";
    cardWrap.style.display = "block";
    bRelics.classList.remove("tabActive");
    bCards.classList.add("tabActive");
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

  RELICS.forEach((r) => {
    const owned = !!state.ownedRelics[r.id];
    const canBuy = state.gold >= r.price;

    const div = document.createElement("div");
    div.className = "shopItem";
    div.innerHTML = `
      <div class="shopItemTop">
        <div>
          <h3 class="shopName">🪬 ${r.name}</h3>
          <div class="shopMeta">
            <span class="badge">Price: ${r.price} Gold</span>
            ${owned ? `<span class="badge badgeEquipped">Equipped</span>` : `<span class="badge">Relic</span>`}
          </div>
        </div>
      </div>

      <p class="shopDesc">${r.desc}</p>

      <div class="shopActions">
        <button class="btn btnPrimary" ${owned ? "disabled" : (!canBuy ? "disabled" : "")} data-buy-relic="${r.id}">
          ${owned ? "✅ Equipped" : (canBuy ? "Buy & Auto-Equip" : "Not Enough Gold")}
        </button>
      </div>
    `;
    grid.appendChild(div);
  });

  grid.querySelectorAll("button[data-buy-relic]").forEach((btn) => {
    btn.addEventListener("click", () => {
      playSfx("sfxClick", 0.45);
      const id = btn.getAttribute("data-buy-relic");
      buyRelic(id);
    });
  });
}

function buyRelic(id) {
  const r = RELICS.find((x) => x.id === id);
  if (!r) return;
  if (state.ownedRelics[id]) return;
  if (state.gold < r.price) return;

  state.gold -= r.price;
  state.ownedRelics[id] = true;
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
// START / RESET
// =========================
function startGame(playerCardId) {
  // ✅ Prevent picking Cosmic God as the player (enemy can still roll it randomly)
  if (playerCardId === "cosmicGod") {
    alert("Cosmic God is sealed by the Gods and cannot be selected. (Enemy-only card)");
    return;
  }

  state.stage = 1;
  state.relics = Object.keys(state.ownedRelics).filter((id) => state.ownedRelics[id]);

  const playerBase = findCardById(playerCardId);
  const all = getAllCards();
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
  if (state.phase === "over") {
    playSfx("sfxClick", 0.45);
    closeModal();
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
    state.stage += 1;
    spawnNextEnemy();
    return;
  }
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
