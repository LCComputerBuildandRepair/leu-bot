'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const db = require('../database');
const E = require('../utils/embeds');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cleanup')
    .setDescription('Remove old channels/roles and onboard existing members. Run AFTER /setup.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((s) => s.setName('channels').setDescription('Delete channels NOT created by the bot')
      .addStringOption((o) => o.setName('confirm').setDescription('Type CONFIRM').setRequired(true)))
    .addSubcommand((s) => s.setName('roles').setDescription('Delete roles NOT part of the LEU* structure')
      .addStringOption((o) => o.setName('confirm').setDescription('Type CONFIRM').setRequired(true)))
    .addSubcommand((s) => s.setName('members').setDescription('Give every existing member the verified Member role'))
    .addSubcommand((s) => s.setName('all').setDescription('Channels + roles + members in one go')
      .addStringOption((o) => o.setName('confirm').setDescription('Type CONFIRM').setRequired(true))),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ embeds: [E.error('Admins only', 'You need Administrator.')], flags: EPH });
    }
    const sub = interaction.options.getSubcommand();
    const needsConfirm = sub !== 'members';
    if (needsConfirm && interaction.options.getString('confirm') !== 'CONFIRM') {
      return interaction.reply({ embeds: [E.warn('Not confirmed', 'Re-run with `confirm: CONFIRM`. This permanently deletes things and can\'t be undone.\n\n⚠️ Make sure you ran `/setup` first so the new structure exists.')], flags: EPH });
    }

    await interaction.deferReply({ flags: EPH });
    const guild = interaction.guild;
    const results = [];

    if (sub === 'channels' || sub === 'all') results.push(await cleanChannels(guild, interaction.channelId));
    if (sub === 'roles' || sub === 'all') results.push(await cleanRoles(guild));
    if (sub === 'members' || sub === 'all') results.push(await onboardMembers(guild));

    return interaction.editReply({ embeds: [E.success('Cleanup complete', results.join('\n'))] });
  },
};

async function cleanChannels(guild, currentId) {
  await guild.channels.fetch();
  const known = new Set([
    ...Object.values(db.all.ids.channels),
    ...Object.values(db.all.ids.categories),
  ]);
  const victims = guild.channels.cache.filter((c) =>
    !known.has(c.id) &&
    c.id !== currentId &&
    !(c.name && c.name.startsWith('ticket-')) &&
    !db.isTempVc(c.id));

  // Delete non-categories first, then the (now-empty) categories.
  let n = 0;
  for (const c of victims.filter((c) => c.type !== ChannelType.GuildCategory).values()) {
    if (await c.delete('LEU* cleanup').then(() => true).catch(() => false)) n++;
  }
  for (const c of victims.filter((c) => c.type === ChannelType.GuildCategory).values()) {
    if (await c.delete('LEU* cleanup').then(() => true).catch(() => false)) n++;
  }
  return `🗑️ Deleted **${n}** old channel(s).`;
}

async function cleanRoles(guild) {
  await guild.roles.fetch();
  const known = new Set(Object.values(db.all.ids.roles));
  const victims = guild.roles.cache.filter((r) =>
    r.id !== guild.id &&      // not @everyone
    !r.managed &&             // not bot/integration/booster roles
    r.editable &&             // below the bot in the hierarchy
    !known.has(r.id));        // not part of the LEU* blueprint

  let n = 0;
  const names = [];
  for (const r of victims.values()) {
    if (await r.delete('LEU* cleanup').then(() => true).catch(() => false)) { n++; if (names.length < 15) names.push(r.name); }
  }
  return `🧹 Deleted **${n}** unused role(s)${names.length ? `: ${names.join(', ')}` : ''}.`;
}

async function onboardMembers(guild) {
  const memberId = db.roleId('member');
  if (!memberId) return '⚠️ No Member role found — run `/setup` first.';
  const unverifiedId = db.roleId('unverified');
  await guild.members.fetch();
  let n = 0;
  for (const m of guild.members.cache.values()) {
    if (m.user.bot) continue;
    if (!m.roles.cache.has(memberId)) {
      if (await m.roles.add(memberId).then(() => true).catch(() => false)) n++;
    }
    if (unverifiedId && m.roles.cache.has(unverifiedId)) await m.roles.remove(unverifiedId).catch(() => {});
  }
  return `✅ Gave the Member role to **${n}** existing member(s).`;
}
