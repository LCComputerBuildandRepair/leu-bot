'use strict';
const fs = require('fs');
const path = require('path');
const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags,
} = require('discord.js');
const db = require('../database');
const E = require('../utils/embeds');
const panels = require('../panels');
const { ROLES, GAME_ROLES, PING_ROLES, LEVEL_ROLES, CATEGORIES } = require('../structure');

const EPH = MessageFlags.Ephemeral;

const TYPE_MAP = {
  text: ChannelType.GuildText,
  voice: ChannelType.GuildVoice,
  announcement: ChannelType.GuildAnnouncement,
  forum: ChannelType.GuildForum,
};

// Which blueprint role keys can see each visibility tier (besides staff, who always can).
const AUDIENCE = {
  verified: ['member', 'creator', 'manager', 'captain', 'player', 'sub'],
  comp: ['manager', 'captain', 'player', 'sub'],
  staff: [],
};
const STAFF_KEYS = ['owner', 'admin', 'mod'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Build (or repair) the entire LEU* server — roles, channels, permissions & panels.')
    .addStringOption((o) => o.setName('mode').setDescription('What to build').addChoices(
      { name: 'all — roles, channels & panels', value: 'all' },
      { name: 'roles only', value: 'roles' },
      { name: 'channels only', value: 'channels' },
      { name: 'panels only (re-post messages)', value: 'panels' },
    ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ embeds: [E.error('Admins only', 'You need Administrator to run setup.')], flags: EPH });
    }
    await interaction.reply({ embeds: [E.info('⚙️ Building LEU*…', 'Reconciling roles, channels and panels. This can take a moment.')], flags: EPH });

    const guild = interaction.guild;
    const mode = interaction.options.getString('mode') || 'all';
    const log = [];

    try {
      if (mode === 'all' || mode === 'roles') await buildRoles(guild, log);
      if (mode === 'all' || mode === 'channels') await buildChannels(guild, log);
      if (mode === 'all' || mode === 'panels' || mode === 'channels') await postPanels(guild, log);
      if (mode === 'all') await applyServerIcon(guild, log);

      const summary = E.success('Setup complete', log.slice(0, 40).join('\n') || 'Nothing to do.')
        .setFooter({ text: `${log.length} actions • run /setup again any time to repair` });
      await interaction.editReply({ embeds: [summary] });
    } catch (err) {
      console.error('[setup] failed:', err);
      await interaction.editReply({ embeds: [E.error('Setup failed', `\`${err.message}\`\nMake sure my role is at the **top** of the role list with **Manage Roles/Channels**.`)] });
    }
  },
};

// ── Roles ────────────────────────────────────────────────────────────────────
async function buildRoles(guild, log) {
  const all = [...ROLES, ...GAME_ROLES, ...PING_ROLES, ...LEVEL_ROLES];
  await guild.roles.fetch();
  for (const def of all) {
    let role = guild.roles.cache.find((r) => r.name === def.name);
    const perms = def.admin ? [PermissionFlagsBits.Administrator]
      : (def.perms || []).map((p) => PermissionFlagsBits[p]).filter(Boolean);
    if (!role) {
      role = await guild.roles.create({
        name: def.name, color: def.color, hoist: !!def.hoist,
        mentionable: !!def.mentionable, permissions: perms, reason: 'LEU* setup',
      });
      log.push(`➕ Role **${def.name}**`);
    }
    db.setId('roles', def.key, role.id);
  }
}

// ── Channels & categories ─────────────────────────────────────────────────────
// `gameKey` is set for 'game'-visibility channels: only that game's role (+ staff)
// can see them. 'gated' categories resolve to "everyone denied, staff only" — a
// member with a game role still sees their channel via the channel-level grant.
function overwritesFor(guild, visibility, readonly, gameKey) {
  const everyone = guild.roles.everyone.id;
  const ow = [];
  const SEND = [PermissionFlagsBits.SendMessages, PermissionFlagsBits.SendMessagesInThreads, PermissionFlagsBits.CreatePublicThreads];

  if (!visibility || visibility === 'public') {
    if (readonly) ow.push({ id: everyone, deny: SEND });
  } else {
    ow.push({ id: everyone, deny: [PermissionFlagsBits.ViewChannel] });
    const audienceKeys = visibility === 'game' ? (gameKey ? [gameKey] : []) : (AUDIENCE[visibility] || []);
    for (const key of audienceKeys) {
      const id = db.roleId(key);
      if (id) ow.push({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak], deny: readonly ? SEND : [] });
    }
  }
  // Staff always get full access (incl. send) regardless of readonly.
  for (const key of STAFF_KEYS) {
    const id = db.roleId(key);
    if (id) ow.push({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ManageMessages] });
  }
  return ow;
}

async function buildChannels(guild, log) {
  await guild.channels.fetch();
  for (const cat of CATEGORIES) {
    // Category
    let category = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === cat.name);
    if (!category) {
      category = await guild.channels.create({
        name: cat.name, type: ChannelType.GuildCategory,
        permissionOverwrites: overwritesFor(guild, cat.visibility, false), reason: 'LEU* setup',
      });
      log.push(`📁 Category **${cat.name}**`);
    }
    db.setId('categories', cat.key, category.id);

    // Channels in it
    for (const ch of cat.channels) {
      const vis = ch.visibility || cat.visibility;
      let channel = guild.channels.cache.find((c) => c.parentId === category.id && c.name === ch.name);

      // Adopt an existing channel (by alias) so its history is preserved.
      if (!channel && ch.aliases) {
        const adopted = findAdoptable(guild, ch);
        if (adopted) {
          channel = adopted;
          if (channel.parentId !== category.id) {
            // Move into the new category and sync to its permission scheme.
            await channel.setParent(category.id, { lockPermissions: true }).catch(() => {});
          }
          if (channel.name !== ch.name) await channel.setName(ch.name).catch(() => {});
          log.push(`♻️ Kept **#${adopted.name}** → ${ch.name}`);
        }
      }

      if (!channel) {
        channel = await guild.channels.create({
          name: ch.name,
          type: TYPE_MAP[ch.type] || ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: overwritesFor(guild, vis, ch.readonly, ch.gameKey),
          reason: 'LEU* setup',
        });
        log.push(`#️⃣ ${ch.name}`);
      }
      db.setId('channels', ch.key, channel.id);
    }
  }
}

// Normalise a channel name for fuzzy matching: lowercase, emojis/punctuation → '-'.
function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Find any existing TEXT channel in the guild whose name matches the blueprint
// name or one of its aliases. Skips channels already adopted as another key.
function findAdoptable(guild, def) {
  const wanted = new Set([def.name, ...(def.aliases || [])].map(normalizeName));
  return guild.channels.cache.find((c) =>
    c.type === ChannelType.GuildText && wanted.has(normalizeName(c.name))) || null;
}

// ── Panels ────────────────────────────────────────────────────────────────────
// Posts an interactive panel into a channel, but only if one isn't already there
// (avoids duplicate panels on repeated /setup runs).
async function postPanelOnce(guild, channelKey, builder, tag, log) {
  const id = db.channelId(channelKey);
  if (!id) return;
  const ch = guild.channels.cache.get(id) || (await guild.channels.fetch(id).catch(() => null));
  if (!ch || !ch.isTextBased()) return;

  const recent = await ch.messages.fetch({ limit: 20 }).catch(() => null);
  const mine = recent?.find((m) => m.author.id === guild.members.me.id && m.embeds.length);
  if (mine) return; // panel already present

  await ch.send(builder());
  log.push(`📨 Panel → #${ch.name} (${tag})`);
}

async function postPanels(guild, log) {
  await postPanelOnce(guild, 'rules', panels.rulesPanel, 'rules', log);
  await postPanelOnce(guild, 'verify', panels.verifyPanel, 'verify', log);
  await postPanelOnce(guild, 'roles', panels.rolesPanel, 'roles', log);
  await postPanelOnce(guild, 'support', panels.ticketPanel, 'ticket', log);
}

// ── Branding ──────────────────────────────────────────────────────────────────
// If the user dropped assets/logo.png in, use it as the server icon. Silently
// skips when the file is absent or we lack permission — never fails setup.
async function applyServerIcon(guild, log) {
  try {
    const logo = ['logo.png', 'logo.jpg', 'logo.jpeg']
      .map((f) => path.join(__dirname, '..', '..', 'assets', f))
      .find((p) => fs.existsSync(p));
    if (!logo) return;
    if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) return;
    await guild.setIcon(logo, 'LEU* branding');
    log.push('🖼️ Set server icon from assets/logo');
  } catch { /* branding is best-effort */ }
}
