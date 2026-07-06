'use strict';
const https = require('https');
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const {
  joinVoiceChannel, createAudioPlayer, createAudioResource,
  AudioPlayerStatus, VoiceConnectionStatus, entersState, NoSubscriberBehavior,
} = require('@discordjs/voice');
const db = require('../database');
const E = require('../utils/embeds');

// Curated Deezer genres (id → top-chart tracks with 30s previews, no API key needed).
const GENRES = [
  { name: 'Pop', id: 132 },
  { name: 'Hip-Hop / Rap', id: 116 },
  { name: 'Rock', id: 152 },
  { name: 'Dance / EDM', id: 113 },
  { name: 'R&B', id: 165 },
  { name: 'Alternative', id: 85 },
  { name: 'Country', id: 84 },
  { name: 'Metal', id: 464 },
  { name: 'Latin', id: 197 },
  { name: 'Jazz', id: 129 },
];

const ROUND_MS = 30_000;
const active = new Set(); // guildIds with a running quiz

function getJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

// Normalise for lenient matching: drop "(feat…)", punctuation, spaces.
function norm(s) {
  return String(s).toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/feat\.?.*$/g, '')
    .replace(/[^a-z0-9]+/g, '');
}
function hit(guess, answer) {
  const g = norm(guess), a = norm(answer);
  return a.length >= 3 && (g === a || g.includes(a) || (g.length >= 4 && a.includes(g)));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('musicquiz')
    .setDescription('Guess-the-song game — bot plays clips of top tracks in your chosen genre.')
    .addStringOption((o) => o.setName('genre').setDescription('Music genre').setRequired(true).addChoices(...GENRES.map((g) => ({ name: g.name, value: String(g.id) }))))
    .addIntegerOption((o) => o.setName('rounds').setDescription('How many songs (3–15, default 8)').setMinValue(3).setMaxValue(15)),

  async execute(interaction) {
    const vc = interaction.member.voice?.channel;
    if (!vc) return interaction.reply({ embeds: [E.error('Join a voice channel first', 'Hop into a voice channel, then run `/musicquiz` so I can play the clips.')], flags: MessageFlags.Ephemeral });
    if (active.has(interaction.guild.id)) return interaction.reply({ embeds: [E.error('Quiz already running', 'A music quiz is already in progress here.')], flags: MessageFlags.Ephemeral });

    const genreId = interaction.options.getString('genre');
    const genre = GENRES.find((g) => String(g.id) === genreId);
    const rounds = interaction.options.getInteger('rounds') || 8;

    await interaction.reply({ embeds: [E.brand('🎵 Music Quiz starting…', `Genre: **${genre.name}** • ${rounds} rounds\nJoining **${vc.name}** — get ready to type your guesses here!`)] });

    active.add(interaction.guild.id);
    let connection;
    try {
      // Pull top tracks, keep only ones with a playable preview, shuffle.
      const data = await getJSON(`https://api.deezer.com/chart/${genreId}/tracks?limit=50`);
      const pool = (data.data || []).filter((t) => t.preview);
      if (pool.length < rounds) throw new Error('not enough tracks');
      for (let i = pool.length - 1; i > 0; i--) { const j = (i * 7 + 3) % (i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      const picks = pool.slice(0, rounds);

      connection = joinVoiceChannel({ channelId: vc.id, guildId: interaction.guild.id, adapterCreator: interaction.guild.voiceAdapterCreator });
      await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
      const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
      connection.subscribe(player);

      const scores = new Map();
      const bump = (id, n) => scores.set(id, (scores.get(id) || 0) + n);
      const channel = interaction.channel;

      for (let r = 0; r < picks.length; r++) {
        const track = picks[r];
        player.play(createAudioResource(track.preview));

        await channel.send({ embeds: [E.info(`🎶 Round ${r + 1}/${picks.length}`, 'Name the **song** (and/or the **artist**) — type it in chat!')] });

        const title = track.title_short || track.title;
        const artist = track.artist?.name || '';
        let gotTitle = false, gotArtist = false;

        await new Promise((resolve) => {
          const collector = channel.createMessageCollector({ time: ROUND_MS, filter: (m) => !m.author.bot });
          collector.on('collect', (m) => {
            if (!gotArtist && artist && hit(m.content, artist)) { gotArtist = true; bump(m.author.id, 1); m.react('🎤').catch(() => {}); }
            if (!gotTitle && hit(m.content, title)) { gotTitle = true; bump(m.author.id, 2); m.react('✅').catch(() => {}); collector.stop(); }
          });
          collector.on('end', resolve);
        });

        try { player.stop(); } catch { /* ignore */ }
        await channel.send({ embeds: [E.brand('⏱️ Time!', `**${title}** — *${artist}*\n${gotTitle ? '' : 'Nobody got the title.'}`).setThumbnail(track.album?.cover_medium || null)] });
      }

      // Final leaderboard.
      const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
      const board = ranked.length
        ? ranked.map(([id, pts], i) => `${['🥇', '🥈', '🥉'][i] || `\`${i + 1}.\``} <@${id}> — **${pts}** pts`).join('\n')
        : '_No correct guesses this time!_';
      await interaction.channel.send({ embeds: [E.brand(`🏆 Music Quiz — ${genre.name} — Results`, board)] });
    } catch (err) {
      console.error('[musicquiz]', err.message);
      await interaction.channel.send({ embeds: [E.error('Quiz ended', 'Something went wrong (or that genre had too few playable clips). Try again or pick another genre.')] }).catch(() => {});
    } finally {
      active.delete(interaction.guild.id);
      try { connection?.destroy(); } catch { /* ignore */ }
    }
  },
};
