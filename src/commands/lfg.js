'use strict';
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../database');
const E = require('../utils/embeds');
const { GAME_ROLES } = require('../structure');

// Up to 25 choices allowed; GAME_ROLES is 23.
const GAME_CHOICES = GAME_ROLES.map((g) => ({ name: g.name, value: g.key }));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lfg')
    .setDescription('Post a "looking for group/game" call-out.')
    .addIntegerOption((o) => o.setName('players').setDescription('How many players you need').setRequired(true).setMinValue(1).setMaxValue(20))
    .addStringOption((o) => o.setName('game').setDescription('Pick a game to post in its channel & ping its role').addChoices(...GAME_CHOICES))
    .addStringOption((o) => o.setName('mode').setDescription('Mode / rank / details')),

  async execute(interaction) {
    const players = interaction.options.getInteger('players');
    const gameKey = interaction.options.getString('game');
    const mode = interaction.options.getString('mode');
    const gameDef = GAME_ROLES.find((g) => g.key === gameKey);

    const embed = E.info(`🔎 LFG — ${gameDef ? gameDef.name : 'Looking for group'}`, `${interaction.user} is looking for **${players}** more!`)
      .addFields({ name: '👥 Need', value: `${players}`, inline: true })
      .setThumbnail(interaction.user.displayAvatarURL());
    if (gameDef) embed.addFields({ name: '🎮 Game', value: gameDef.name, inline: true });
    if (mode) embed.addFields({ name: '📋 Details', value: mode });

    // Route to the game's own lfg channel + ping its role when a game is chosen.
    let channel = interaction.channel;
    let ping;
    if (gameDef) {
      const chId = db.channelId(`${gameKey}_lfg`);
      if (chId) channel = interaction.guild.channels.cache.get(chId) || channel;
      const roleId = db.roleId(gameKey);
      if (roleId) ping = `<@&${roleId}>`;
    } else {
      const chId = db.channelId('lfg');
      if (chId) channel = interaction.guild.channels.cache.get(chId) || channel;
    }

    await channel.send({ content: ping, embeds: [embed] });
    return interaction.reply({ embeds: [E.success('LFG posted', `Posted in ${channel}. GLHF! 🎮`)], flags: MessageFlags.Ephemeral });
  },
};
