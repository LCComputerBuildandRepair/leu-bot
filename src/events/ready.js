'use strict';
const { Events, REST, Routes, ActivityType } = require('discord.js');
const config = require('../config');
const E = require('../utils/embeds');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`[ready] Logged in as ${client.user.tag}`);

    // Logo for every embed: use LOGO_URL if set, otherwise the bot's own avatar
    // (set that to the logo with `npm run avatar`).
    E.setBrandIcon(config.logoUrl || client.user.displayAvatarURL({ extension: 'png', size: 256 }));

    // Register all slash commands to the guild (instant availability).
    const body = client.commands.map((c) => c.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(config.token);
    try {
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
      console.log(`[ready] Registered ${body.length} slash commands to guild ${config.guildId}.`);
    } catch (err) {
      console.error('[ready] Failed to register commands:', err);
    }

    client.user.setPresence({
      activities: [{ name: `🔥 ${config.communityName}`, type: ActivityType.Competing }],
      status: 'online',
    });
  },
};
