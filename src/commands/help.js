'use strict';
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const E = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('List LEU* bot commands & features.'),

  async execute(interaction) {
    const embed = E.brand('🤖 LEU* Bot — Commands')
      .setDescription('Everything LEU* runs on. Most setup actions need staff/admin permissions.')
      .addFields(
        { name: '⚙️ Admin / Setup', value: '`/setup` build the whole server\n`/cleanup` remove old channels/roles & onboard members\n`/refreshpanels` re-post all panels\n`/reset` delete bot-created structure\n`/panel` `/status`' },
        { name: '🛡️ Moderation', value: '`/mod warn|warnings|clearwarns`\n`/mod timeout|untimeout|kick|ban|unban|purge`\n_Automod: blocks invite links & mass-mentions._' },
        { name: '🏆 Competitive', value: '`/scrim` `/tournament` `/lfg` `/roster`\n_`/lfg` posts to the game\'s channel & pings its role._' },
        { name: '🎉 Games & Events', value: '`/musicquiz` guess-the-song by genre in voice\n`/movienight` schedule a synced movie night\n`/streamers add|remove|list` Twitch go-live alerts' },
        { name: '⚡ Leveling & Fun', value: '`/rank` `/leaderboard` `/poll`\n_Earn XP + level-reward roles • ⭐×3 → #highlights._' },
        { name: '📣 Community / Utility', value: '`/announce` `/embed` `/userinfo` `/serverinfo` `/help`\n_Join **➕ Join to Create** voice for a personal room._' },
      );
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
