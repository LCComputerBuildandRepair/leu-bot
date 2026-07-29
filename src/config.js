'use strict';
require('dotenv').config();

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`\n[config] Missing required env var: ${name}`);
    console.error('         Copy .env.example to .env and fill it in.\n');
    process.exit(1);
  }
  return v;
}

module.exports = {
  token: required('DISCORD_TOKEN'),
  clientId: required('CLIENT_ID'),
  guildId: required('GUILD_ID'),
  brandColor: parseInt(process.env.BRAND_COLOR || 'FF6A00', 16),
  accentColor: parseInt(process.env.ACCENT_COLOR || '22D3EE', 16), // electric blue from the logo
  communityName: process.env.COMMUNITY_NAME || "Light 'Em Up Gaming",
  // Logo shown on every embed. If unset, the bot falls back to its own avatar
  // (set that to the logo with `npm run avatar`).
  logoUrl: process.env.LOGO_URL || null,
  // Twitch "go live" alerts (optional). Get these from dev.twitch.tv/console/apps.
  // If either is blank, the feature just stays off.
  twitchClientId: process.env.TWITCH_CLIENT_ID || null,
  twitchClientSecret: process.env.TWITCH_CLIENT_SECRET || null,
};
