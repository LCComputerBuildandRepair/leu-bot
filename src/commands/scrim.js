'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../database');
const E = require('../utils/embeds');
const { isStaff } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scrim')
    .setDescription('Schedule a scrim with a sign-up sheet.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .addStringOption((o) => o.setName('game').setDescription('Which game').setRequired(true))
    .addStringOption((o) => o.setName('time').setDescription('Unix timestamp OR "in 2h" / "tomorrow 8pm" style note').setRequired(true))
    .addStringOption((o) => o.setName('note').setDescription('Extra details (opponent, format, etc.)')),

  async execute(interaction) {
    if (!isStaff(interaction.member) && !interaction.member.roles.cache.has(db.roleId('captain'))) {
      return interaction.reply({ embeds: [E.error('No permission', 'Only staff or captains can schedule scrims.')], flags: MessageFlags.Ephemeral });
    }
    const game = interaction.options.getString('game');
    const note = interaction.options.getString('note');
    const raw = interaction.options.getString('time');

    // Accept a raw unix timestamp; otherwise default to +1h and keep the text as the note.
    let ts = parseInt(raw, 10);
    let extraNote = note;
    if (!Number.isFinite(ts) || ts < 1_000_000_000) {
      ts = Math.floor(Date.now() / 1000) + 3600;
      extraNote = [note, `🕓 *Scheduled: ${raw}*`].filter(Boolean).join('\n');
    }

    const id = String(db.nextCounter('scrim'));
    db.setScrim(id, { game, time: ts, note: extraNote, signups: [], by: interaction.user.id });

    const embed = E.brand(`🆚 Scrim — ${game}`, extraNote || null)
      .addFields(
        { name: '🗓️ When', value: `<t:${ts}:F> (<t:${ts}:R>)` },
        { name: '✅ Signed up (0)', value: '_No sign-ups yet — be first!_' },
      );
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`scrim:join:${id}`).setLabel('Sign Up').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId(`scrim:leave:${id}`).setLabel('Withdraw').setStyle(ButtonStyle.Secondary).setEmoji('↩️'),
    );

    const pingId = db.roleId('p_scrim');
    const scrimsCh = db.channelId('scrims');
    const channel = (scrimsCh && interaction.guild.channels.cache.get(scrimsCh)) || interaction.channel;
    await channel.send({ content: pingId ? `<@&${pingId}>` : undefined, embeds: [embed], components: [row] });
    return interaction.reply({ embeds: [E.success('Scrim posted', `Posted in ${channel}.`)], flags: MessageFlags.Ephemeral });
  },
};
