'use strict';
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const E = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('List LEU* bot commands & features.'),

  async execute(interaction) {
    const embed = E.brand('🤖 LEU* Bot — Commands')
      .setDescription('Everything LEU* runs on. Most setup actions need staff/admin permissions.')
      .addFields(
        { name: '⚙️ Admin / Setup', value: '`/setup` build the whole server\n`/cleanup` remove old channels/roles & onboard members\n`/reset` delete bot-created structure\n`/panel` re-post a panel\n`/status` post live status' },
        { name: '🛡️ Moderation', value: '`/mod warn|warnings|clearwarns`\n`/mod timeout|untimeout|kick|ban|unban|purge`\n_Automod: blocks invite links & mass-mentions._' },
        { name: '🏆 Competitive', value: '`/scrim` `/tournament` `/lfg` `/roster`' },
        { name: '⚡ Leveling & Fun', value: '`/rank` `/leaderboard` `/poll`\n_Earn XP by chatting • ⭐ a message 3× for the highlights board._' },
        { name: '📣 Community / Utility', value: '`/announce` `/embed` `/userinfo` `/serverinfo` `/help`\n_Join **➕ Join to Create** voice for a personal room._' },
      );
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
