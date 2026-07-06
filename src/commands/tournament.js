'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../database');
const E = require('../utils/embeds');
const { isStaff } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tournament')
    .setDescription('Announce a tournament.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .addStringOption((o) => o.setName('name').setDescription('Tournament name').setRequired(true))
    .addStringOption((o) => o.setName('game').setDescription('Game').setRequired(true))
    .addStringOption((o) => o.setName('format').setDescription('e.g. 5v5 BO3 Single Elim').setRequired(true))
    .addStringOption((o) => o.setName('prize').setDescription('Prize pool / reward'))
    .addStringOption((o) => o.setName('time').setDescription('Unix timestamp of start'))
    .addStringOption((o) => o.setName('signup').setDescription('Sign-up link or instructions')),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ embeds: [E.error('No permission', 'Only staff can announce tournaments.')], flags: MessageFlags.Ephemeral });
    }
    const name = interaction.options.getString('name');
    const game = interaction.options.getString('game');
    const format = interaction.options.getString('format');
    const prize = interaction.options.getString('prize');
    const ts = parseInt(interaction.options.getString('time'), 10);
    const signup = interaction.options.getString('signup');

    const id = String(db.nextCounter('tournament'));
    db.setTournament(id, { name, game, format, prize, time: ts || null, by: interaction.user.id });

    const embed = E.brand(`🏆 ${name}`, `A new **${game}** tournament has been announced!`)
      .addFields(
        { name: '🎮 Game', value: game, inline: true },
        { name: '🗂️ Format', value: format, inline: true },
        { name: '💰 Prize', value: prize || 'Glory & bragging rights', inline: true },
      );
    if (Number.isFinite(ts) && ts > 1_000_000_000) embed.addFields({ name: '🗓️ Starts', value: `<t:${ts}:F> (<t:${ts}:R>)` });
    if (signup) embed.addFields({ name: '📝 Sign up', value: signup });

    const pingId = db.roleId('p_tourney');
    const ch = db.channelId('tournaments');
    const channel = (ch && interaction.guild.channels.cache.get(ch)) || interaction.channel;
    await channel.send({ content: pingId ? `<@&${pingId}>` : undefined, embeds: [embed] });
    return interaction.reply({ embeds: [E.success('Tournament announced', `Posted in ${channel}.`)], flags: MessageFlags.Ephemeral });
  },
};
