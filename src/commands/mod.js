'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../database');
const E = require('../utils/embeds');
const { isStaff, logTo } = require('../utils/helpers');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Moderation tools (staff only).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) => s.setName('warn').setDescription('Warn a member')
      .addUserOption((o) => o.setName('user').setDescription('Member to warn').setRequired(true))
      .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(true)))
    .addSubcommand((s) => s.setName('warnings').setDescription('List a member\'s warnings')
      .addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true)))
    .addSubcommand((s) => s.setName('clearwarns').setDescription('Clear a member\'s warnings')
      .addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true)))
    .addSubcommand((s) => s.setName('timeout').setDescription('Time out a member')
      .addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true))
      .addIntegerOption((o) => o.setName('minutes').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(40320))
      .addStringOption((o) => o.setName('reason').setDescription('Reason')))
    .addSubcommand((s) => s.setName('untimeout').setDescription('Remove a member\'s timeout')
      .addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true)))
    .addSubcommand((s) => s.setName('kick').setDescription('Kick a member')
      .addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true))
      .addStringOption((o) => o.setName('reason').setDescription('Reason')))
    .addSubcommand((s) => s.setName('ban').setDescription('Ban a member')
      .addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true))
      .addStringOption((o) => o.setName('reason').setDescription('Reason'))
      .addIntegerOption((o) => o.setName('delete_days').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7)))
    .addSubcommand((s) => s.setName('unban').setDescription('Unban a user by ID')
      .addStringOption((o) => o.setName('user_id').setDescription('User ID').setRequired(true)))
    .addSubcommand((s) => s.setName('purge').setDescription('Bulk-delete recent messages')
      .addIntegerOption((o) => o.setName('count').setDescription('How many (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ embeds: [E.error('No permission', 'This command is staff only.')], flags: EPH });
    }
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const target = interaction.options.getUser('user');
    const member = target ? await guild.members.fetch(target.id).catch(() => null) : null;
    const reason = interaction.options.getString('reason') || 'No reason given';

    // Hierarchy guard for actions targeting a member.
    if (member && ['timeout', 'kick', 'ban'].includes(sub)) {
      if (member.id === interaction.user.id) return interaction.reply({ embeds: [E.error('Nope', 'You can\'t target yourself.')], flags: EPH });
      if (!member.moderatable && sub !== 'ban') return interaction.reply({ embeds: [E.error('Can\'t do that', 'My role is below this member, or they\'re above you.')], flags: EPH });
    }

    switch (sub) {
      case 'warn': {
        const entry = { reason, by: interaction.user.id, at: Date.now() };
        db.addWarning(target.id, entry);
        const count = db.getWarnings(target.id).length;
        await target.send({ embeds: [E.warn(`Warning in ${guild.name}`, `**Reason:** ${reason}\nThis is warning **#${count}**.`)] }).catch(() => {});
        await logTo(guild, 'mod_log', E.warn('Member warned', `**User:** ${target} \`${target.id}\`\n**By:** ${interaction.user}\n**Reason:** ${reason}\n**Total warnings:** ${count}`));
        return interaction.reply({ embeds: [E.success('Warned', `${target} warned. They now have **${count}** warning(s).`)], flags: EPH });
      }
      case 'warnings': {
        const list = db.getWarnings(target.id);
        if (!list.length) return interaction.reply({ embeds: [E.info('No warnings', `${target} has a clean record. ✨`)], flags: EPH });
        const body = list.map((w, i) => `\`${i + 1}.\` ${w.reason} — by <@${w.by}> <t:${Math.floor(w.at / 1000)}:R>`).join('\n');
        return interaction.reply({ embeds: [E.warn(`${list.length} warning(s)`, body)], flags: EPH });
      }
      case 'clearwarns': {
        db.clearWarnings(target.id);
        await logTo(guild, 'mod_log', E.info('Warnings cleared', `${target} by ${interaction.user}`));
        return interaction.reply({ embeds: [E.success('Cleared', `${target}'s warnings were cleared.`)], flags: EPH });
      }
      case 'timeout': {
        const mins = interaction.options.getInteger('minutes');
        await member.timeout(mins * 60_000, reason);
        await logTo(guild, 'mod_log', E.warn('Member timed out', `**User:** ${target}\n**By:** ${interaction.user}\n**Duration:** ${mins}m\n**Reason:** ${reason}`));
        return interaction.reply({ embeds: [E.success('Timed out', `${target} muted for **${mins}** minute(s).`)], flags: EPH });
      }
      case 'untimeout': {
        await member.timeout(null);
        return interaction.reply({ embeds: [E.success('Timeout removed', `${target} can speak again.`)], flags: EPH });
      }
      case 'kick': {
        await member.kick(reason);
        await logTo(guild, 'mod_log', E.warn('Member kicked', `**User:** ${target}\n**By:** ${interaction.user}\n**Reason:** ${reason}`));
        return interaction.reply({ embeds: [E.success('Kicked', `${target} was kicked.`)], flags: EPH });
      }
      case 'ban': {
        const days = interaction.options.getInteger('delete_days') ?? 0;
        await guild.members.ban(target.id, { reason, deleteMessageSeconds: days * 86400 });
        await logTo(guild, 'mod_log', E.error('Member banned', `**User:** ${target} \`${target.id}\`\n**By:** ${interaction.user}\n**Reason:** ${reason}`));
        return interaction.reply({ embeds: [E.success('Banned', `${target} was banned.`)], flags: EPH });
      }
      case 'unban': {
        const id = interaction.options.getString('user_id');
        await guild.bans.remove(id).catch(() => { throw new Error('That user isn\'t banned or the ID is invalid.'); });
        await logTo(guild, 'mod_log', E.info('Member unbanned', `\`${id}\` by ${interaction.user}`));
        return interaction.reply({ embeds: [E.success('Unbanned', `<@${id}> was unbanned.`)], flags: EPH });
      }
      case 'purge': {
        const count = interaction.options.getInteger('count');
        const deleted = await interaction.channel.bulkDelete(count, true).catch(() => null);
        if (!deleted) return interaction.reply({ embeds: [E.error('Failed', 'Can\'t delete messages older than 14 days.')], flags: EPH });
        await logTo(guild, 'mod_log', E.info('Messages purged', `**${deleted.size}** messages in ${interaction.channel} by ${interaction.user}`));
        return interaction.reply({ embeds: [E.success('Purged', `Deleted **${deleted.size}** messages.`)], flags: EPH });
      }
    }
  },
};
