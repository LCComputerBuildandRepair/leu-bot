'use strict';
const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const E = require('../utils/embeds');

const xpNeeded = (level) => 5 * level * level + 50 * level + 100;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show your (or someone\'s) level and XP.')
    .addUserOption((o) => o.setName('user').setDescription('Whose rank to show')),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const data = db.getLevel(user.id);
    const need = xpNeeded(data.level);
    const ranked = db.topLevels(10_000);
    const pos = ranked.findIndex((r) => r.id === user.id);

    const filled = Math.round((data.xp / need) * 12);
    const bar = '█'.repeat(filled) + '░'.repeat(12 - filled);

    const embed = E.brand(`📊 ${user.username}'s Rank`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: '⚡ Level', value: `${data.level}`, inline: true },
        { name: '✨ XP', value: `${data.xp} / ${need}`, inline: true },
        { name: '🏆 Position', value: pos >= 0 ? `#${pos + 1}` : 'Unranked', inline: true },
        { name: 'Progress', value: `\`${bar}\`` },
      );
    return interaction.reply({ embeds: [embed] });
  },
};
