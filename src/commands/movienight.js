'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../database');
const E = require('../utils/embeds');
const { isStaff } = require('../utils/helpers');

const SERVICES = ['Netflix', 'Hulu', 'Peacock', 'Amazon Prime', 'Disney+', 'Max', 'YouTube', 'Other'];
// How each service does synced group watching (bot can't stream — it coordinates).
const WATCH_HOWTO = {
  'Netflix': 'Use **Teleparty** (browser extension) to sync playback.',
  'Hulu': 'Use Hulu\'s built-in **Watch Party** (Hulu subscribers).',
  'Peacock': 'Use **Teleparty** to sync playback.',
  'Amazon Prime': 'Use Prime Video\'s built-in **Watch Party**.',
  'Disney+': 'Use Disney+ **GroupWatch**.',
  'Max': 'Use **Teleparty** to sync playback.',
  'YouTube': 'Use Discord\'s **Watch Together** activity in the Movie Night voice channel.',
  'Other': 'Screen-share in the Movie Night voice channel (non-DRM content only).',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('movienight')
    .setDescription('Schedule a movie night with RSVP buttons.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .addStringOption((o) => o.setName('movie').setDescription('What are we watching?').setRequired(true))
    .addStringOption((o) => o.setName('service').setDescription('Streaming service').setRequired(true).addChoices(...SERVICES.map((s) => ({ name: s, value: s }))))
    .addStringOption((o) => o.setName('time').setDescription('Unix timestamp OR text like "Fri 8pm EST"').setRequired(true))
    .addStringOption((o) => o.setName('notes').setDescription('Extra details')),

  async execute(interaction) {
    if (!isStaff(interaction.member) && !interaction.member.permissions.has(PermissionFlagsBits.ManageEvents)) {
      return interaction.reply({ embeds: [E.error('No permission', 'Only staff/event hosts can schedule movie nights.')], flags: MessageFlags.Ephemeral });
    }
    const movie = interaction.options.getString('movie');
    const service = interaction.options.getString('service');
    const rawTime = interaction.options.getString('time');
    const notes = interaction.options.getString('notes');

    let when;
    const ts = parseInt(rawTime, 10);
    if (Number.isFinite(ts) && ts > 1_000_000_000) when = `<t:${ts}:F> (<t:${ts}:R>)`;
    else when = rawTime;

    const id = String(db.nextCounter('movie'));
    db.setMovie(id, { movie, service, when, host: interaction.user.id, going: [], maybe: [], out: [] });

    const embed = E.brand(`📽️ Movie Night — ${movie}`, notes || null)
      .addFields(
        { name: '🎬 Watching', value: movie, inline: true },
        { name: '📺 On', value: service, inline: true },
        { name: '🗓️ When', value: when, inline: false },
        { name: '▶️ How we watch together', value: WATCH_HOWTO[service] || WATCH_HOWTO.Other },
        { name: '✅ Going (0)', value: '_Be the first!_', inline: true },
        { name: '🤔 Maybe (0)', value: '_—_', inline: true },
        { name: '❌ Can\'t (0)', value: '_—_', inline: true },
      )
      .setFooter({ text: `Hosted by ${interaction.user.tag}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`mn:going:${id}`).setLabel('Going').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId(`mn:maybe:${id}`).setLabel('Maybe').setStyle(ButtonStyle.Secondary).setEmoji('🤔'),
      new ButtonBuilder().setCustomId(`mn:out:${id}`).setLabel("Can't").setStyle(ButtonStyle.Danger).setEmoji('❌'),
    );

    const pingId = db.roleId('p_movie');
    const chId = db.channelId('movie_night');
    const channel = (chId && interaction.guild.channels.cache.get(chId)) || interaction.channel;
    await channel.send({ content: pingId ? `<@&${pingId}>` : undefined, embeds: [embed], components: [row] });
    return interaction.reply({ embeds: [E.success('Movie night posted', `Posted in ${channel}.`)], flags: MessageFlags.Ephemeral });
  },
};
