'use strict';
/**
 * One-off: set the bot's avatar from assets/logo.png.
 *   npm run avatar
 * Discord rate-limits avatar changes (~2/hour), so this is a separate script
 * rather than something that runs on every startup.
 */
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');

const logo = ['logo.png', 'logo.jpg', 'logo.jpeg']
  .map((f) => path.join(__dirname, '..', 'assets', f))
  .find((p) => fs.existsSync(p));

if (!logo) {
  console.error('No assets/logo.(png|jpg) found. Drop your logo in the assets/ folder first.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once('ready', async () => {
  try {
    await client.user.setAvatar(logo);
    console.log(`✅ Set bot avatar from ${path.basename(logo)}.`);
  } catch (err) {
    console.error('Failed to set avatar:', err.message);
  } finally {
    client.destroy();
    process.exit(0);
  }
});
client.login(config.token);
