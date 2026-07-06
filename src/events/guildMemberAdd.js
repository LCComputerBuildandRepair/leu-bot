'use strict';
const { Events } = require('discord.js');
const db = require('../database');
const E = require('../utils/embeds');
const { logTo } = require('../utils/helpers');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    if (member.user.bot) return;

    // Drop new members into "Unverified" until they verify.
    const unverifiedId = db.roleId('unverified');
    if (unverifiedId) {
      await member.roles.add(unverifiedId).catch(() => {});
    }

    // Greet them in #welcome and point at #verify.
    const welcomeId = db.channelId('welcome');
    const verifyId = db.channelId('verify');
    if (welcomeId) {
      const ch = member.guild.channels.cache.get(welcomeId);
      if (ch) {
        const embed = E.brand(
          `Welcome to ${member.guild.name}! 🎮`,
          `Hey ${member}, glad to have you.\n\n` +
          (verifyId ? `➡️ Head to <#${verifyId}> and click **Verify** to unlock the server.\n` : '') +
          `Then grab your **game & ping roles** and jump into the action.`,
        ).setThumbnail(member.user.displayAvatarURL());
        ch.send({ content: `${member}`, embeds: [embed] }).catch(() => {});
      }
    }

    await logTo(member.guild, 'server_log',
      E.info('📥 Member Joined', `${member} (${member.user.tag})\nAccount created <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`));
  },
};
