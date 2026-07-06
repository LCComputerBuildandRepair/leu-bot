'use strict';
const { SlashCommandBuilder, ChannelType } = require('discord.js');
const E = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Show info about this server.'),

  async execute(interaction) {
    const g = interaction.guild;
    await g.members.fetch().catch(() => {});
    const text = g.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
    const voice = g.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;
    const humans = g.members.cache.filter((m) => !m.user.bot).size;
    const bots = g.members.cache.filter((m) => m.user.bot).size;

    const embed = E.brand(`📋 ${g.name}`)
      .setThumbnail(g.iconURL({ size: 256 }))
      .addFields(
        { name: '👑 Owner', value: `<@${g.ownerId}>`, inline: true },
        { name: '📅 Created', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true },
        { name: '🆔 ID', value: g.id, inline: true },
        { name: '👥 Members', value: `${g.memberCount}`, inline: true },
        { name: '🧑 Humans / 🤖 Bots', value: `${humans} / ${bots}`, inline: true },
        { name: '💎 Boosts', value: `${g.premiumSubscriptionCount || 0} (Tier ${g.premiumTier})`, inline: true },
        { name: '💬 Channels', value: `${text} text • ${voice} voice`, inline: true },
        { name: '🎭 Roles', value: `${g.roles.cache.size}`, inline: true },
      );
    return interaction.reply({ embeds: [embed] });
  },
};
