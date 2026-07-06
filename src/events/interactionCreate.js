'use strict';
const { Events, MessageFlags } = require('discord.js');
const components = require('../components');
const E = require('../utils/embeds');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    try {
      // ── Slash commands ──
      if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(interaction.commandName);
        if (!cmd) return;
        return await cmd.execute(interaction, client);
      }

      // ── Buttons / selects / modals → component router ──
      if (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit()) {
        return await components.route(interaction, client);
      }
    } catch (err) {
      console.error(`[interaction] Error handling ${interaction.commandName || interaction.customId}:`, err);
      const payload = { embeds: [E.error('Something went wrong', 'That action failed. A staff member has been notified if it keeps happening.')], flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => {});
      else await interaction.reply(payload).catch(() => {});
    }
  },
};
