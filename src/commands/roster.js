'use strict';
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../database');
const E = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roster')
    .setDescription('Show the current LEU* competitive roster.'),

  async execute(interaction) {
    await interaction.deferReply();
    const guild = interaction.guild;
    await guild.members.fetch();

    const groups = [
      { key: 'manager', label: '📋 Managers' },
      { key: 'captain', label: '🎖️ Captains' },
      { key: 'player', label: '🎮 Players' },
      { key: 'sub', label: '🔁 Substitutes' },
    ];

    const embed = E.brand('📋 LEU* Roster', 'Our competitive lineup:');
    let total = 0;
    for (const g of groups) {
      const id = db.roleId(g.key);
      if (!id) continue;
      const members = guild.members.cache.filter((m) => m.roles.cache.has(id));
      total += members.size;
      embed.addFields({
        name: `${g.label} (${members.size})`,
        value: members.size ? members.map((m) => `• ${m}`).join('\n').slice(0, 1024) : '_None_',
        inline: false,
      });
    }
    embed.setFooter({ text: `${total} competitive members` });
    return interaction.editReply({ embeds: [embed] });
  },
};
