'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const db = require('../database');
const E = require('../utils/embeds');
const { ROLES, GAME_ROLES, PING_ROLES, CATEGORIES } = require('../structure');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('DANGER: delete the channels/roles this bot created.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) => o.setName('confirm').setDescription('Type CONFIRM to proceed').setRequired(true))
    .addBooleanOption((o) => o.setName('roles').setDescription('Also delete created roles? (default: channels only)')),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ embeds: [E.error('Admins only', 'You need Administrator.')], flags: EPH });
    }
    if (interaction.options.getString('confirm') !== 'CONFIRM') {
      return interaction.reply({ embeds: [E.warn('Not confirmed', 'Run again with `confirm: CONFIRM` to wipe the bot-created structure. This cannot be undone.')], flags: EPH });
    }
    await interaction.reply({ embeds: [E.warn('🧨 Resetting…', 'Deleting bot-created channels' + (interaction.options.getBoolean('roles') ? ' and roles' : '') + '.')], flags: EPH });

    const guild = interaction.guild;
    let removed = 0;

    // Delete tracked channels, then their categories.
    let kept = 0;
    for (const cat of CATEGORIES) {
      for (const ch of cat.channels) {
        // Never delete adopted "keeper" channels (general/memes/irl) — preserve history.
        if (ch.aliases) {
          const id = db.channelId(ch.key);
          const c = id && guild.channels.cache.get(id);
          if (c) { await c.setParent(null).catch(() => {}); kept++; }
          continue;
        }
        const id = db.channelId(ch.key);
        const c = id && guild.channels.cache.get(id);
        if (c) { await c.delete().catch(() => {}); removed++; }
      }
      const catId = db.getId('categories', cat.key);
      const cc = catId && guild.channels.cache.get(catId);
      if (cc) { await cc.delete().catch(() => {}); removed++; }
    }
    // Also sweep any leftover ticket channels.
    guild.channels.cache.filter((c) => c.type === ChannelType.GuildText && c.name.startsWith('ticket-'))
      .forEach((c) => c.delete().catch(() => {}));

    if (interaction.options.getBoolean('roles')) {
      for (const def of [...ROLES, ...GAME_ROLES, ...PING_ROLES]) {
        if (def.key === 'bot') continue; // don't delete our own managed role
        const id = db.roleId(def.key);
        const r = id && guild.roles.cache.get(id);
        if (r && r.editable) { await r.delete().catch(() => {}); removed++; }
      }
    }

    // Clear the id registry so the next /setup rebuilds cleanly.
    db.all.ids = { roles: {}, channels: {}, categories: {} };
    db.save();

    return interaction.editReply({ embeds: [E.success('Reset complete', `Removed **${removed}** items` + (kept ? `, kept **${kept}** history channel(s) safe` : '') + `. Run \`/setup\` to rebuild.`)] });
  },
};
