'use strict';
const { EmbedBuilder } = require('discord.js');
const config = require('../config');

const COLORS = {
  brand: config.brandColor,        // fire-orange
  accent: config.accentColor,      // electric blue
  success: 0x22C55E,
  warn: 0xF59E0B,
  error: 0xEF4444,
  info: config.accentColor,
};

// The LEU logo, shown on every embed. Set once at startup from config.logoUrl or
// the bot's avatar (see ready.js → setBrandIcon).
let BRAND_ICON = config.logoUrl;
function setBrandIcon(url) { BRAND_ICON = url; }
function getBrandIcon() { return BRAND_ICON; }

function base(color = COLORS.brand) {
  const e = new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: `${config.communityName} • LEU*` })
    .setTimestamp();
  // Logo at the top of every embed (commands that want a different author, like
  // /announce, just call .setAuthor() again afterwards to override).
  if (BRAND_ICON) e.setAuthor({ name: config.communityName, iconURL: BRAND_ICON });
  return e;
}

module.exports = {
  COLORS,
  base,
  setBrandIcon,
  getBrandIcon,
  brand: (title, desc) => base(COLORS.brand).setTitle(title).setDescription(desc || null),
  success: (title, desc) => base(COLORS.success).setTitle(`✅ ${title}`).setDescription(desc || null),
  error: (title, desc) => base(COLORS.error).setTitle(`❌ ${title}`).setDescription(desc || null),
  warn: (title, desc) => base(COLORS.warn).setTitle(`⚠️ ${title}`).setDescription(desc || null),
  info: (title, desc) => base(COLORS.info).setTitle(title).setDescription(desc || null),
};
