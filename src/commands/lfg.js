'use strict';
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../database');
const E = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lfg')
    .setDescription('Post a "looking for group/game" call-out.')
    .addStringOption((o) => o.setName('game').setDescription('Game').setRequired(true))
    .addIntegerOption((o) => o.setName('players').setDescription('How many players you need').setRequired(true).setMinValue(1).setMaxValue(20))
    .addStringOption((o) => o.setName('mode').setDescription('Mode / rank / details')),

  async execute(interaction) {
    const game = interaction.options.getString('game');
    const players = interaction.options.getInteger('players');
    const mode = interaction.options.getString('mode');

    const embed = E.info(`🔎 LFG — ${game}`, `${interaction.user} is looking for **${players}** more!`)
      .addFields({ name: '🎮 Game', value: game, inline: true }, { name: '👥 Need', value: `${players}`, inline: true });
    if (mode) embed.addFields({ name: '📋 Details', value: mode });
    embed.setThumbnail(interaction.user.displayAvatarURL());

    const ch = db.channelId('lfg');
    const channel = (ch && interaction.guild.channels.cache.get(ch)) || interaction.channel;
    await channel.send({ embeds: [embed] });
    return interaction.reply({ embeds: [E.success('LFG posted', `Posted in ${channel}. GLHF! 🎮`)], flags: MessageFlags.Ephemeral });
  },
};
