'use strict';
const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const E = require('../utils/embeds');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Top members by level/XP.'),

  async execute(interaction) {
    const top = db.topLevels(10);
    if (!top.length) return interaction.reply({ embeds: [E.info('Leaderboard', 'No XP earned yet — start chatting! 💬')] });

    const lines = top.map((r, i) => `${MEDALS[i] || `\`${i + 1}.\``} <@${r.id}> — **Level ${r.level}** (${r.xp} xp)`).join('\n');
    return interaction.reply({ embeds: [E.brand('🏆 LEU* Leaderboard', lines)] });
  },
};
