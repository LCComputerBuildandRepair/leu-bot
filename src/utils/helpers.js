'use strict';
const db = require('../database');

/** Resolve a configured role mention string, or empty string if not set up yet. */
function roleMention(key) {
  const id = db.roleId(key);
  return id ? `<@&${id}>` : '';
}

/** Does the member hold any of the given blueprint role keys (or Administrator)? */
function hasRole(member, ...keys) {
  if (member.permissions.has('Administrator')) return true;
  return keys.some((k) => {
    const id = db.roleId(k);
    return id && member.roles.cache.has(id);
  });
}

/** Staff = owner/admin/mod or Administrator permission. */
function isStaff(member) {
  return hasRole(member, 'owner', 'admin', 'mod');
}

/** Post an embed to a configured log channel by blueprint key. */
async function logTo(guild, channelKey, embed) {
  try {
    const id = db.channelId(channelKey);
    if (!id) return;
    const ch = guild.channels.cache.get(id) || (await guild.channels.fetch(id).catch(() => null));
    if (ch) await ch.send({ embeds: [embed] });
  } catch { /* logging must never throw */ }
}

module.exports = { roleMention, hasRole, isStaff, logTo };
