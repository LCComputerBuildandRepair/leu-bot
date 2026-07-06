'use strict';
/**
 * LEU* — all-in-one community + competitive Discord bot.
 * Entry point: loads commands & events, logs in, and (on first ready) registers
 * slash commands to the guild so they're available immediately.
 */
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./src/config');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.Reaction, Partials.User],
});

// ── Load commands ──────────────────────────────────────────────────────────
client.commands = new Collection();
const commandsDir = path.join(__dirname, 'src', 'commands');
for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'))) {
  const cmd = require(path.join(commandsDir, file));
  if (cmd?.data?.name && typeof cmd.execute === 'function') {
    client.commands.set(cmd.data.name, cmd);
  } else {
    console.warn(`[load] Skipped command file ${file} (missing data/execute).`);
  }
}
console.log(`[load] ${client.commands.size} commands loaded.`);

// ── Load events ────────────────────────────────────────────────────────────
const eventsDir = path.join(__dirname, 'src', 'events');
for (const file of fs.readdirSync(eventsDir).filter((f) => f.endsWith('.js'))) {
  const evt = require(path.join(eventsDir, file));
  if (evt.once) client.once(evt.name, (...args) => evt.execute(...args, client));
  else client.on(evt.name, (...args) => evt.execute(...args, client));
}

// ── Safety nets ────────────────────────────────────────────────────────────
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));

client.login(config.token);
