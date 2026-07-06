'use strict';
/**
 * LEU* server blueprint.
 *
 * This is the single source of truth for /setup. Edit this file to change what
 * the bot builds — roles, categories, channels and their permissions — then run
 * /setup again. The bot reconciles the live server against this blueprint:
 * anything missing is created, anything already present (matched by name) is reused.
 *
 * Permission tokens used below map to discord.js PermissionFlagsBits in setup.js.
 */

// ── Roles ─────────────────────────────────────────────────────────────────────
// Listed highest-first. `key` is a stable id the bot stores so other features
// (moderation, competitive, verification) can find the role later by purpose.
const ROLES = [
  // Staff
  { key: 'owner',     name: '👑 Owner',          color: 0xE11D48, hoist: true,  mentionable: false, admin: true },
  { key: 'admin',     name: '🛡️ Admin',          color: 0xF59E0B, hoist: true,  mentionable: false, admin: true },
  { key: 'mod',       name: '🔧 Moderator',      color: 0x3B82F6, hoist: true,  mentionable: true,
    perms: ['KickMembers', 'BanMembers', 'ModerateMembers', 'ManageMessages', 'ManageNicknames'] },
  // Competitive
  { key: 'manager',   name: '📋 Team Manager',   color: 0xFB923C, hoist: true,  mentionable: true },
  { key: 'captain',   name: '🎖️ Captain',        color: 0xF97316, hoist: true,  mentionable: true },
  { key: 'player',    name: '🎮 Player',         color: 0xEA580C, hoist: true,  mentionable: true },
  { key: 'sub',       name: '🔁 Substitute',     color: 0x38BDF8, hoist: false, mentionable: true },
  // Community
  { key: 'creator',   name: '🎬 Content Creator', color: 0xEC4899, hoist: true, mentionable: true },
  { key: 'booster',   name: '💎 Server Booster', color: 0xF472B6, hoist: true,  mentionable: false },
  { key: 'member',    name: '✅ Member',          color: 0x94A3B8, hoist: false, mentionable: false },
  { key: 'unverified',name: '🕓 Unverified',      color: 0x4B5563, hoist: false, mentionable: false },
  // Bot
  { key: 'bot',       name: '⚡ LEU Bot',          color: 0xFF6A00, hoist: false, mentionable: false },
];

// Self-assignable game roles (handled by the /roles panel). EVERY game gets its
// own dedicated category (chat / LFG / clips / voice), locked to its role.
// `slug` is used for channel names. Keep this list at 24 or fewer — Discord
// allows max 25 options per select menu.
const GAME_ROLES = [
  { key: 'g_valorant', name: 'Valorant',          emoji: '🔫', color: 0xFF4655, slug: 'valorant' },
  { key: 'g_cs2',      name: 'CS2',               emoji: '💣', color: 0xF7A800, slug: 'cs2' },
  { key: 'g_lol',      name: 'League of Legends', emoji: '⚔️', color: 0x1E90FF, slug: 'league' },
  { key: 'g_ow',       name: 'Overwatch 2',       emoji: '🧡', color: 0xF99E1A, slug: 'overwatch' },
  { key: 'g_apex',     name: 'Apex Legends',      emoji: '🩸', color: 0xDA292A, slug: 'apex' },
  { key: 'g_fortnite', name: 'Fortnite',          emoji: '🛠️', color: 0x9D4DBB, slug: 'fortnite' },
  { key: 'g_cod',      name: 'Call of Duty / Warzone', emoji: '🎯', color: 0x6E7B8B, slug: 'warzone' },
  { key: 'g_r6',       name: 'Rainbow Six Siege', emoji: '🚪', color: 0x1F2937, slug: 'r6' },
  { key: 'g_rivals',   name: 'Marvel Rivals',     emoji: '🦸', color: 0xEF4444, slug: 'rivals' },
  { key: 'g_rl',       name: 'Rocket League',     emoji: '🚗', color: 0x0090FF, slug: 'rocket-league' },
  { key: 'g_deadlock', name: 'Deadlock',          emoji: '🔱', color: 0xC2410C, slug: 'deadlock' },
  { key: 'g_pubg',     name: 'PUBG',              emoji: '🍳', color: 0xF59E0B, slug: 'pubg' },
  { key: 'g_destiny',  name: 'Destiny 2',         emoji: '👁️', color: 0x4B5563, slug: 'destiny' },
  { key: 'g_rust',     name: 'Rust',              emoji: '🔩', color: 0xB45309, slug: 'rust' },
  { key: 'g_minecraft',name: 'Minecraft',         emoji: '🟩', color: 0x44A648, slug: 'minecraft' },
  { key: 'g_phasmo',   name: 'Phasmophobia',      emoji: '👻', color: 0x6D28D9, slug: 'phasmophobia' },
  { key: 'g_gta',      name: 'GTA V / FiveM',     emoji: '🌆', color: 0x10B981, slug: 'fivem' },
  { key: 'g_redm',     name: 'RedM',              emoji: '🤠', color: 0x92400E, slug: 'redm' },
  { key: 'g_wow',      name: 'World of Warcraft', emoji: '🐉', color: 0x2563EB, slug: 'wow' },
  { key: 'g_fc',       name: 'EA FC / FIFA',      emoji: '⚽', color: 0x16A34A, slug: 'eafc' },
  { key: 'g_lethal',   name: 'Lethal Company',    emoji: '👾', color: 0x65A30D, slug: 'lethal' },
  { key: 'g_amongus',  name: 'Among Us',          emoji: '🛸', color: 0xC1121C, slug: 'amongus' },
  { key: 'g_other',    name: 'Other Games',       emoji: '🕹️', color: 0x64748B, slug: 'other-games' },
];

// Notification/ping roles (also self-assignable via /roles panel).
const PING_ROLES = [
  { key: 'p_announce', name: '📣 Announcements', color: 0xFBBF24 },
  { key: 'p_scrim',    name: '🆚 Scrim Pings',   color: 0x60A5FA },
  { key: 'p_tourney',  name: '🏆 Tournaments',   color: 0xFCD34D },
  { key: 'p_events',   name: '🎉 Events',        color: 0x34D399 },
];

// ── Channel blueprint ──────────────────────────────────────────────────────────
// `visibility`:
//   'public'   — everyone can view
//   'verified' — hidden from @everyone & Unverified; visible to Member+
//   'comp'     — competitive area, visible to Player/Captain/Sub + staff
//   'staff'    — staff only
//   'gated'    — category hidden from everyone (per-game category shells)
//   'game'     — channel visible ONLY to holders of `gameKey`'s role (+ staff)
// `type`: 'text' | 'voice' | 'announcement' | 'forum'
// `readonly: true` — members can read but not send (announcements, rules, etc.)
const CATEGORIES = [
  {
    key: 'cat_info', name: '📌 INFORMATION', visibility: 'public',
    channels: [
      { key: 'welcome',      name: '👋・welcome',        type: 'text',         readonly: true },
      { key: 'rules',        name: '📜・rules',          type: 'text',         readonly: true },
      { key: 'announce',     name: '📣・announcements',  type: 'announcement', readonly: true },
      { key: 'roles',        name: '🎭・get-roles',      type: 'text',         readonly: true },
      { key: 'status',       name: '📊・server-status',  type: 'text',         readonly: true },
      { key: 'verify',       name: '🔓・verify',         type: 'text',         readonly: true, visibility: 'public' },
    ],
  },
  {
    key: 'cat_community', name: '💬 COMMUNITY', visibility: 'verified',
    channels: [
      // `aliases`: existing channels matching these names are ADOPTED (moved here &
      // renamed) instead of recreated — so their message history is preserved.
      { key: 'general',   name: '💬・general-chat', type: 'text',
        aliases: ['general', 'general-chat', 'gen-chat', 'general-discussion', 'main-chat', 'lobby'] },
      { key: 'offtopic',  name: '🌀・off-topic',  type: 'text' },
      { key: 'memes',     name: '😂・memes',      type: 'text',
        aliases: ['meme', 'meme-dump', 'memes-and-shitposts', 'shitposting'] },
      { key: 'clips',     name: '🎞️・clips',      type: 'text' },
      { key: 'irl',       name: '📸・irl-photos', type: 'text',
        aliases: ['irl', 'irl-photos', 'irl-pics', 'irl-chat', 'photos', 'pictures', 'selfies', 'media'] },
      { key: 'highlights',name: '⭐・highlights',  type: 'text', readonly: true },
      { key: 'suggest',   name: '💡・suggestions',type: 'text' },
      { key: 'bots',      name: '🤖・bot-commands',type: 'text' },
    ],
  },
  {
    key: 'cat_comp', name: '🏆 COMPETITIVE', visibility: 'verified',
    channels: [
      { key: 'roster',     name: '📋・roster',       type: 'text', readonly: true },
      { key: 'lfg',        name: '🔎・looking-for-game', type: 'text' },
      { key: 'scrims',     name: '🆚・scrims',       type: 'text' },
      { key: 'tournaments',name: '🏆・tournaments',  type: 'text' },
      { key: 'results',    name: '📈・results',      type: 'text', readonly: true },
      { key: 'vod',        name: '🎥・vod-review',   type: 'text' },
      { key: 'strats',     name: '🧠・strats',       type: 'text', visibility: 'comp' },
    ],
  },
  {
    key: 'cat_voice', name: '🔊 VOICE', visibility: 'verified',
    channels: [
      { key: 'vc_create', name: '➕ Join to Create', type: 'voice' }, // spawns a temp VC per user
      { key: 'vc_lobby',  name: '🟢 Lobby',     type: 'voice' },
      { key: 'vc_team1',  name: '🎮 Team A',    type: 'voice' },
      { key: 'vc_team2',  name: '🎮 Team B',    type: 'voice' },
      { key: 'vc_scrim',  name: '🆚 Scrim Room',type: 'voice' },
      { key: 'vc_chill',  name: '☕ Chill',     type: 'voice' },
      { key: 'vc_afk',    name: '💤 AFK',       type: 'voice' },
    ],
  },
  {
    key: 'cat_staff', name: '🛠️ STAFF', visibility: 'staff',
    channels: [
      { key: 'staff_chat',  name: '🛠️・staff-chat',     type: 'text' },
      { key: 'mod_log',     name: '📕・mod-logs',       type: 'text' },
      { key: 'ticket_log',  name: '🎫・ticket-logs',    type: 'text' },
      { key: 'server_log',  name: '📜・server-logs',    type: 'text' },
      { key: 'vc_staff',    name: '🔒 Staff VC',        type: 'voice' },
    ],
  },
  {
    // Tickets are created on demand inside this category.
    key: 'cat_support', name: '🎫 SUPPORT', visibility: 'public',
    channels: [
      { key: 'support',   name: '🎫・open-a-ticket', type: 'text', readonly: true },
    ],
  },
];

// ── Per-game categories ─────────────────────────────────────────────────────────
// Every game in GAME_ROLES gets its own category with chat / LFG / clips / voice,
// all locked to that game's role. Inserted after COMPETITIVE.
function gameCategory(g) {
  return {
    key: 'cat_' + g.key,
    name: `${g.emoji} ${g.name.toUpperCase()}`,
    visibility: 'gated',
    game: g.key,
    channels: [
      { key: g.key + '_chat',  name: `${g.emoji}・${g.slug}-chat`,  type: 'text',  visibility: 'game', gameKey: g.key },
      { key: g.key + '_lfg',   name: `🔎・${g.slug}-lfg`,           type: 'text',  visibility: 'game', gameKey: g.key },
      { key: g.key + '_clips', name: `🎞️・${g.slug}-clips`,         type: 'text',  visibility: 'game', gameKey: g.key },
      { key: g.key + '_vc',    name: `🔊 ${g.name} VC`,             type: 'voice', visibility: 'game', gameKey: g.key },
    ],
  };
}

CATEGORIES.splice(3, 0, ...GAME_ROLES.map(gameCategory));

module.exports = { ROLES, GAME_ROLES, PING_ROLES, CATEGORIES };
