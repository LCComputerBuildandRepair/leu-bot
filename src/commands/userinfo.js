'use strict';
const { SlashCommandBuilder } = require('discord.js');
const E = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show info about a member.')
    .addUserOption((o) => o.setName('user').setDescription('Member')),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const roles = member ? member.roles.cache.filter((r) => r.id !== interaction.guild.id).sort((a, b) => b.position - a.position).map((r) => r.toString()).slice(0, 20).join(' ') || 'None' : 'Not in server';

    const embed = E.brand(`👤 ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '🆔 ID', value: user.id, inline: true },
        { name: '📅 Account created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
      );
    if (member) {
      embed.addFields(
        { name: '📥 Joined server', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
        { name: `🎭 Roles (${member.roles.cache.size - 1})`, value: roles },
      );
    }
    return interaction.reply({ embeds: [embed] });
  },
};
