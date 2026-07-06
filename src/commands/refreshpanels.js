'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../database');
const E = require('../utils/embeds');
const panels = require('../panels');

const EPH = MessageFlags.Ephemeral;

// channelKey → panel builder
const PANELS = [
  ['rules', panels.rulesPanel],
  ['verify', panels.verifyPanel],
  ['roles', panels.rolesPanel],
  ['support', panels.ticketPanel],
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshpanels')
    .setDescription('Delete and re-post all panels (rules/verify/roles/ticket) so they pick up the latest look.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ embeds: [E.error('No permission', 'You need Manage Server.')], flags: EPH });
    }
    await interaction.deferReply({ flags: EPH });
    const guild = interaction.guild;
    const done = [];

    for (const [key, builder] of PANELS) {
      const id = db.channelId(key);
      const ch = id && (guild.channels.cache.get(id) || await guild.channels.fetch(id).catch(() => null));
      if (!ch || !ch.isTextBased()) continue;

      // Remove the bot's old panel messages, then post a fresh one.
      const recent = await ch.messages.fetch({ limit: 25 }).catch(() => null);
      if (recent) {
        for (const m of recent.filter((m) => m.author.id === guild.members.me.id && m.embeds.length).values()) {
          await m.delete().catch(() => {});
        }
      }
      await ch.send(builder());
      done.push(`#${ch.name}`);
    }

    return interaction.editReply({ embeds: [E.success('Panels refreshed', done.length ? `Re-posted: ${done.join(', ')}\n\nRun \`/status\` to refresh the status panel too.` : 'No panel channels found — run `/setup` first.')] });
  },
};
