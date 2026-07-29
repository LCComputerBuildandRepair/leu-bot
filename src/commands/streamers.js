'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../database');
const E = require('../utils/embeds');

const EPH = MessageFlags.Ephemeral;

// Accept a full URL or a plain name and return the twitch login.
function toLogin(input) {
  const m = input.trim().match(/(?:twitch\.tv\/)?@?([a-zA-Z0-9_]{3,25})\/?$/);
  return m ? m[1].toLowerCase() : null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('streamers')
    .setDescription('Manage which Twitch channels get "go live" alerts.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('add').setDescription('Track a Twitch channel')
      .addStringOption((o) => o.setName('twitch').setDescription('Twitch URL or username').setRequired(true)))
    .addSubcommand((s) => s.setName('remove').setDescription('Stop tracking a Twitch channel')
      .addStringOption((o) => o.setName('twitch').setDescription('Twitch URL or username').setRequired(true)))
    .addSubcommand((s) => s.setName('list').setDescription('List tracked Twitch channels')),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ embeds: [E.error('No permission', 'You need Manage Server.')], flags: EPH });
    }
    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      const list = db.listStreamers();
      if (!list.length) return interaction.reply({ embeds: [E.info('No streamers tracked', 'Add one with `/streamers add`.')], flags: EPH });
      const body = list.map((s) => `• [${s.login}](https://twitch.tv/${s.login})`).join('\n');
      return interaction.reply({ embeds: [E.brand('📺 Tracked Twitch channels', body)], flags: EPH });
    }

    const login = toLogin(interaction.options.getString('twitch'));
    if (!login) return interaction.reply({ embeds: [E.error('Invalid channel', 'Give a Twitch username or URL like `https://twitch.tv/yourname`.')], flags: EPH });

    if (sub === 'add') {
      const ok = db.addStreamer(login, interaction.user.id);
      if (!ok) return interaction.reply({ embeds: [E.warn('Already tracked', `**${login}** is already on the list.`)], flags: EPH });
      const cfgd = require('../config').twitchClientId ? '' : '\n\n⚠️ Set `TWITCH_CLIENT_ID` & `TWITCH_CLIENT_SECRET` in `.env` (and restart) for alerts to actually fire.';
      return interaction.reply({ embeds: [E.success('Streamer added', `Now watching **${login}** — a 🔴 alert posts in <#${db.channelId('golive') || 0}> when they go live.${cfgd}`)], flags: EPH });
    }
    if (sub === 'remove') {
      const ok = db.removeStreamer(login);
      return interaction.reply({ embeds: ok ? [E.success('Removed', `Stopped tracking **${login}**.`)] : [E.warn('Not found', `**${login}** wasn't on the list.`)], flags: EPH });
    }
  },
};
