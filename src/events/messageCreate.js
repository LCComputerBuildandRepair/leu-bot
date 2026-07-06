'use strict';
const { Events, PermissionFlagsBits } = require('discord.js');
const db = require('../database');
const E = require('../utils/embeds');
const { isStaff, logTo } = require('../utils/helpers');
const { LEVEL_ROLES } = require('../structure');

// Give the member the highest level-reward role they've earned, remove lower ones.
async function syncLevelRole(member, level) {
  const earned = LEVEL_ROLES.filter((r) => level >= r.level);
  if (!earned.length) return null;
  const top = earned[earned.length - 1];
  const topId = db.roleId(top.key);
  for (const r of LEVEL_ROLES) {
    const id = db.roleId(r.key);
    if (!id) continue;
    if (id === topId) { if (!member.roles.cache.has(id)) await member.roles.add(id).catch(() => {}); }
    else if (member.roles.cache.has(id)) await member.roles.remove(id).catch(() => {});
  }
  return top;
}

// XP needed to clear a given level (Mee6-style curve).
const xpNeeded = (level) => 5 * level * level + 50 * level + 100;
const xpCooldown = new Map(); // userId → timestamp of last award

const INVITE_RE = /(discord\.(gg|io|me|li)|discord(?:app)?\.com\/invite)\/\S+/i;
const MASS_MENTION = 6;

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild || message.author.bot || !message.member) return;

    // ── Automod (staff exempt) ──
    if (!isStaff(message.member) && !message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      const mentionCount = message.mentions.users.size + message.mentions.roles.size;
      if (INVITE_RE.test(message.content)) {
        await message.delete().catch(() => {});
        await message.channel.send({ content: `${message.author}`, embeds: [E.warn('No invite links', 'Posting other servers\' invite links isn\'t allowed here.')] }).then((m) => setTimeout(() => m.delete().catch(() => {}), 6000)).catch(() => {});
        await logTo(message.guild, 'mod_log', E.warn('Auto-removed invite', `**User:** ${message.author}\n**Channel:** ${message.channel}\n**Content:** ${message.content.slice(0, 500)}`));
        return;
      }
      if (mentionCount >= MASS_MENTION) {
        await message.delete().catch(() => {});
        await message.member.timeout(10 * 60_000, 'Mass mention (automod)').catch(() => {});
        await logTo(message.guild, 'mod_log', E.warn('Mass-mention blocked', `**User:** ${message.author} timed out 10m\n**Mentions:** ${mentionCount}`));
        return;
      }
    }

    // ── Suggestion auto-voting (general suggestions + movie suggestions) ──
    const isSuggest = message.channel.id === db.channelId('suggest');
    const isMovieSuggest = message.channel.id === db.channelId('movie_suggest');
    if ((isSuggest || isMovieSuggest) && message.content) {
      await message.react('👍').catch(() => {});
      await message.react('👎').catch(() => {});
      const tag = isMovieSuggest ? '🍿' : '💡';
      message.startThread({ name: `${tag} ${message.content.slice(0, 60)}`, autoArchiveDuration: 1440 }).catch(() => {});
      return;
    }

    // ── Leveling ──
    const now = Date.now();
    const last = xpCooldown.get(message.author.id) || 0;
    if (now - last < 60_000) return; // 1 message per minute counts
    xpCooldown.set(message.author.id, now);

    const data = db.getLevel(message.author.id);
    data.xp += 15 + Math.floor((message.content.length % 10)); // 15–24 xp
    let leveled = false;
    while (data.xp >= xpNeeded(data.level)) {
      data.xp -= xpNeeded(data.level);
      data.level += 1;
      leveled = true;
    }
    db.setLevel(message.author.id, data);

    if (leveled) {
      const reward = await syncLevelRole(message.member, data.level).catch(() => null);
      const extra = reward ? `\nYou earned the **${reward.name}** role! 🎉` : '';
      message.channel.send({ embeds: [E.brand('⚡ Level Up!', `${message.author} just reached **Level ${data.level}**! 🔥${extra}`)] }).catch(() => {});
    }
  },
};
