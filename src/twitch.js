'use strict';
/**
 * Twitch "go live" alerts. Polls the Twitch Helix API every POLL_MS for the
 * tracked streamers (db.listStreamers) and posts an announcement the moment one
 * flips from offline → live. No inbound ports needed (outbound polling only).
 * Disabled automatically if TWITCH_CLIENT_ID / SECRET aren't set.
 */
const { EmbedBuilder } = require('discord.js');
const config = require('./config');
const db = require('./database');

const POLL_MS = 90_000;
const TWITCH_PURPLE = 0x9146FF;

let token = null;
let tokenExp = 0;

async function getToken() {
  if (!config.twitchClientId || !config.twitchClientSecret) return null;
  if (token && Date.now() < tokenExp) return token;
  const url = `https://id.twitch.tv/oauth2/token?client_id=${config.twitchClientId}&client_secret=${config.twitchClientSecret}&grant_type=client_credentials`;
  const res = await fetch(url, { method: 'POST' });
  const json = await res.json();
  if (json.access_token) {
    token = json.access_token;
    tokenExp = Date.now() + (json.expires_in - 60) * 1000;
    return token;
  }
  console.error('[twitch] token error:', json);
  return null;
}

async function helix(path, tok) {
  const res = await fetch(`https://api.twitch.tv/helix/${path}`, {
    headers: { 'Client-ID': config.twitchClientId, Authorization: `Bearer ${tok}` },
  });
  if (res.status === 401) { token = null; return null; } // force refresh next cycle
  return res.json();
}

async function poll(client) {
  try {
    const streamers = db.listStreamers();
    if (!streamers.length) return;
    const tok = await getToken();
    if (!tok) return;

    const logins = streamers.map((s) => s.login);
    const q = logins.map((l) => `user_login=${encodeURIComponent(l)}`).join('&');
    const data = await helix(`streams?${q}`, tok);
    if (!data?.data) return;

    const liveNow = new Map(data.data.map((s) => [s.user_login.toLowerCase(), s]));

    // Profile pictures for nicer embeds.
    const users = await helix(`users?${logins.map((l) => `login=${encodeURIComponent(l)}`).join('&')}`, tok);
    const avatars = new Map((users?.data || []).map((u) => [u.login.toLowerCase(), u.profile_image_url]));

    for (const login of logins) {
      const stream = liveNow.get(login);
      if (stream && !db.isLive(login)) {
        await announce(client, stream, avatars.get(login));
        db.setLive(login, stream.id);
      } else if (!stream && db.isLive(login)) {
        db.clearLive(login); // went offline — allow a fresh alert next time
      }
    }
  } catch (err) {
    console.error('[twitch] poll error:', err.message);
  }
}

async function announce(client, stream, avatar) {
  const chId = db.channelId('golive');
  if (!chId) return;
  const channel = client.channels.cache.get(chId) || (await client.channels.fetch(chId).catch(() => null));
  if (!channel) return;

  const url = `https://twitch.tv/${stream.user_login}`;
  const thumb = (stream.thumbnail_url || '').replace('{width}', '1280').replace('{height}', '720') + `?t=${Date.now()}`;
  const embed = new EmbedBuilder()
    .setColor(TWITCH_PURPLE)
    .setAuthor({ name: `${stream.user_name} is now LIVE on Twitch!`, iconURL: avatar || undefined, url })
    .setTitle(stream.title || 'Come hang out!')
    .setURL(url)
    .addFields(
      { name: '🎮 Playing', value: stream.game_name || 'Just Chatting', inline: true },
      { name: '👀 Viewers', value: String(stream.viewer_count ?? 0), inline: true },
    )
    .setImage(thumb)
    .setFooter({ text: 'Twitch' })
    .setTimestamp();

  const pingId = db.roleId('p_live');
  await channel.send({
    content: `${pingId ? `<@&${pingId}> ` : ''}🔴 **${stream.user_name}** just went live! ${url}`,
    embeds: [embed],
  }).catch(() => {});
}

function start(client) {
  if (!config.twitchClientId || !config.twitchClientSecret) {
    console.log('[twitch] alerts disabled (no TWITCH_CLIENT_ID / SECRET set).');
    return;
  }
  console.log('[twitch] go-live alerts enabled.');
  poll(client);
  setInterval(() => poll(client), POLL_MS);
}

module.exports = { start, poll };
