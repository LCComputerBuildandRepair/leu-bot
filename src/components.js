'use strict';
/**
 * Component router — handles every button, select menu and modal in the bot.
 * customId convention:  "<domain>:<action>[:<arg>]"
 */
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  ChannelType, PermissionFlagsBits, MessageFlags,
} = require('discord.js');
const db = require('../src/database');
const E = require('./utils/embeds');
const { isStaff, logTo } = require('./utils/helpers');
const { GAME_ROLES, PING_ROLES } = require('./structure');

const EPH = MessageFlags.Ephemeral;

async function route(interaction) {
  const [domain] = interaction.customId.split(':');
  const handler = handlers[domain];
  if (!handler) return;
  return handler(interaction);
}

const handlers = {
  // ── Verification ─────────────────────────────────────────────────────────
  // Grants the Member role, which is what unlocks viewing & typing in the main
  // channels. Removes the Unverified holding role.
  async verify(interaction) {
    const memberId = db.roleId('member');
    const unverifiedId = db.roleId('unverified');
    if (!memberId) {
      return interaction.reply({ embeds: [E.error('Not configured', 'Verification roles are missing. Ask staff to run `/setup`.')], flags: EPH });
    }
    if (interaction.member.roles.cache.has(memberId)) {
      return interaction.reply({ embeds: [E.info('Already verified', 'You already have access. 🎮')], flags: EPH });
    }
    // Acknowledge within Discord's 3s window FIRST, then do the (slower) role work.
    await interaction.deferReply({ flags: EPH });
    await interaction.member.roles.add(memberId).catch(() => {});
    if (unverifiedId) await interaction.member.roles.remove(unverifiedId).catch(() => {});
    logTo(interaction.guild, 'server_log', E.success('Member Verified', `${interaction.user} passed verification.`)).catch(() => {});
    return interaction.editReply({ embeds: [E.success('Verified!', 'Welcome in — you can now see and chat in the main channels. Head to **#get-roles** to grab your games. 🎉')] });
  },

  // ── Self-assignable roles ────────────────────────────────────────────────
  async roles(interaction) {
    if (!interaction.isStringSelectMenu()) return;
    const pool = interaction.customId === 'roles:games' ? GAME_ROLES : PING_ROLES;
    const allIds = pool.map((r) => db.roleId(r.key)).filter(Boolean);
    const chosen = new Set(interaction.values.map((k) => db.roleId(k)).filter(Boolean));

    const added = [], removed = [];
    for (const id of allIds) {
      const has = interaction.member.roles.cache.has(id);
      if (chosen.has(id) && !has) { await interaction.member.roles.add(id).catch(() => {}); added.push(id); }
      else if (!chosen.has(id) && has) { await interaction.member.roles.remove(id).catch(() => {}); removed.push(id); }
    }
    const lines = [];
    if (added.length) lines.push(`**Added:** ${added.map((i) => `<@&${i}>`).join(' ')}`);
    if (removed.length) lines.push(`**Removed:** ${removed.map((i) => `<@&${i}>`).join(' ')}`);
    return interaction.reply({ embeds: [E.success('Roles updated', lines.join('\n') || 'No changes.')], flags: EPH });
  },

  // ── Tickets ──────────────────────────────────────────────────────────────
  async ticket(interaction) {
    const [, action] = interaction.customId.split(':');

    if (action === 'open') {
      const menu = new StringSelectMenuBuilder()
        .setCustomId('ticket:create')
        .setPlaceholder('What do you need help with?')
        .addOptions(
          { label: 'General Support', value: 'general', emoji: '🎫', description: 'Questions or general help' },
          { label: 'Report a Player', value: 'report', emoji: '🚨', description: 'Report rule-breaking or toxicity' },
          { label: 'Roster / Team', value: 'roster', emoji: '🎖️', description: 'Team, tryout or roster matters' },
          { label: 'Partnership / Content', value: 'partner', emoji: '🤝', description: 'Partnerships, creators, business' },
        );
      return interaction.reply({ embeds: [E.info('Open a ticket', 'Choose a category below — a private channel will be created for you.')], components: [new ActionRowBuilder().addComponents(menu)], flags: EPH });
    }

    if (action === 'create' && interaction.isStringSelectMenu()) {
      const type = interaction.values[0];
      const num = db.nextCounter('ticket');
      const staffRoles = ['owner', 'admin', 'mod'].map((k) => db.roleId(k)).filter(Boolean);

      const overwrites = [
        { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] },
        ...staffRoles.map((id) => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] })),
      ];

      const channel = await interaction.guild.channels.create({
        name: `ticket-${String(num).padStart(4, '0')}`,
        type: ChannelType.GuildText,
        parent: db.getId('categories', 'cat_support') || undefined,
        permissionOverwrites: overwrites,
        topic: `${type} ticket • opened by ${interaction.user.tag} (${interaction.user.id})`,
      });
      db.setTicket(channel.id, { user: interaction.user.id, type, num, opened: Date.now() });

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket:close').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
      );
      const staffPing = staffRoles.map((id) => `<@&${id}>`).join(' ');
      await channel.send({
        content: `${interaction.user} ${staffPing}`,
        embeds: [E.brand(`🎫 Ticket #${num} • ${type}`, `Thanks ${interaction.user} — describe your issue and staff will be with you shortly.\n\nUse the button below to close when resolved.`)],
        components: [closeRow],
      });
      return interaction.reply({ embeds: [E.success('Ticket created', `Your ticket: ${channel}`)], flags: EPH });
    }

    if (action === 'close') {
      const ticket = db.getTicket(interaction.channel.id);
      if (!ticket) return interaction.reply({ embeds: [E.error('Not a ticket', 'This channel isn\'t a tracked ticket.')], flags: EPH });
      await interaction.reply({ embeds: [E.warn('Closing ticket', 'This channel will be deleted in 5 seconds…')] });

      // Lightweight transcript to the ticket log.
      const msgs = await interaction.channel.messages.fetch({ limit: 100 }).catch(() => null);
      const lines = msgs ? [...msgs.values()].reverse()
        .filter((m) => m.content || m.embeds.length)
        .map((m) => `${m.author.tag}: ${m.content || '[embed]'}`).join('\n').slice(0, 3800) : 'No messages.';
      await logTo(interaction.guild, 'ticket_log',
        E.info(`🎫 Ticket #${ticket.num} closed`, `Opened by <@${ticket.user}> • Closed by ${interaction.user}\n\n**Transcript:**\n\`\`\`\n${lines}\n\`\`\``));

      db.deleteTicket(interaction.channel.id);
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
  },

  // ── Scrim sign-ups ───────────────────────────────────────────────────────
  async scrim(interaction) {
    const [, action, id] = interaction.customId.split(':');
    const scrim = db.getScrim(id);
    if (!scrim) return interaction.reply({ embeds: [E.error('Scrim not found', 'This scrim no longer exists.')], flags: EPH });

    scrim.signups ||= [];
    const uid = interaction.user.id;
    const idx = scrim.signups.indexOf(uid);
    if (action === 'join') {
      if (idx === -1) scrim.signups.push(uid);
    } else if (action === 'leave') {
      if (idx !== -1) scrim.signups.splice(idx, 1);
    }
    db.setScrim(id, scrim);

    const list = scrim.signups.length ? scrim.signups.map((u, i) => `\`${i + 1}.\` <@${u}>`).join('\n') : '_No sign-ups yet — be first!_';
    const embed = E.brand(`🆚 Scrim — ${scrim.game}`, scrim.note || null)
      .addFields(
        { name: '🗓️ When', value: `<t:${scrim.time}:F> (<t:${scrim.time}:R>)`, inline: false },
        { name: `✅ Signed up (${scrim.signups.length})`, value: list, inline: false },
      );
    await interaction.update({ embeds: [embed], components: interaction.message.components });
  },

  // ── Movie night RSVP ─────────────────────────────────────────────────────
  async mn(interaction) {
    const [, choice, id] = interaction.customId.split(':');
    const movie = db.getMovie(id);
    if (!movie) return interaction.reply({ embeds: [E.error('Not found', 'This movie night no longer exists.')], flags: EPH });

    const uid = interaction.user.id;
    // Remove the user from all lists, then add to the chosen one (toggle off if same).
    const was = ['going', 'maybe', 'out'].find((k) => movie[k].includes(uid));
    for (const k of ['going', 'maybe', 'out']) movie[k] = movie[k].filter((u) => u !== uid);
    if (was !== choice) movie[choice].push(uid);
    db.setMovie(id, movie);

    const fmt = (arr) => arr.length ? arr.map((u) => `<@${u}>`).join(' ') : '_—_';
    const src = interaction.message.embeds[0];
    const embed = E.base(src.color ?? undefined).setTitle(src.title).setDescription(src.description || null);
    if (src.footer?.text) embed.setFooter({ text: src.footer.text });
    // Rebuild the static fields + refreshed RSVP tallies.
    const staticFields = src.fields.filter((f) => !/Going|Maybe|Can't/.test(f.name));
    embed.addFields(
      ...staticFields,
      { name: `✅ Going (${movie.going.length})`, value: fmt(movie.going), inline: true },
      { name: `🤔 Maybe (${movie.maybe.length})`, value: fmt(movie.maybe), inline: true },
      { name: `❌ Can't (${movie.out.length})`, value: fmt(movie.out), inline: true },
    );
    await interaction.update({ embeds: [embed], components: interaction.message.components });
  },
};

module.exports = { route, handlers };
