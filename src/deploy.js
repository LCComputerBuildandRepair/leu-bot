'use strict';
/**
 * Optional: manually (re)register slash commands without starting the bot.
 *   npm run deploy
 * The bot also auto-registers on startup, so you rarely need this.
 */
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./config');

const body = [];
const dir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
  const cmd = require(path.join(dir, file));
  if (cmd?.data?.toJSON) body.push(cmd.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(config.token);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
    console.log(`Registered ${body.length} commands to guild ${config.guildId}.`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
