'use strict';
/**
 * Tiny zero-dependency JSON store. Keeps the bot install painless on a Windows
 * VPS (no native modules to compile). All bot state lives in data/db.json.
 *
 * Shape:
 * {
 *   ids:        { roles: {key: id}, channels: {key: id}, categories: {key: id} },
 *   tickets:    { "<channelId>": {...} },
 *   warnings:   { "<userId>": [ {...} ] },
 *   scrims:     { "<id>": {...} },
 *   tournaments:{ "<id>": {...} },
 *   counters:   { ticket: 0, scrim: 0, tournament: 0 }
 * }
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'db.json');

const DEFAULTS = {
  ids: { roles: {}, channels: {}, categories: {} },
  tickets: {},
  warnings: {},
  scrims: {},
  tournaments: {},
  levels: {},        // userId → { xp, level }
  tempVcs: {},       // channelId → ownerId  (join-to-create voice rooms)
  starboard: {},     // sourceMsgId → starboardMsgId
  movies: {},        // id → movie-night data
  counters: { ticket: 0, scrim: 0, tournament: 0, movie: 0 },
};

let cache = null;

function load() {
  if (cache) return cache;
  try {
    cache = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
  } catch {
    cache = JSON.parse(JSON.stringify(DEFAULTS));
  }
  return cache;
}

function save() {
  if (!cache) return;
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(cache, null, 2));
}

const db = {
  get all() { return load(); },

  // ── id registry (populated by /setup) ──
  setId(kind, key, id) { load().ids[kind][key] = id; save(); },
  getId(kind, key) { return load().ids[kind][key]; },
  roleId(key) { return load().ids.roles[key]; },
  channelId(key) { return load().ids.channels[key]; },

  nextCounter(name) {
    const d = load();
    d.counters[name] = (d.counters[name] || 0) + 1;
    save();
    return d.counters[name];
  },

  // ── tickets ──
  setTicket(channelId, data) { load().tickets[channelId] = data; save(); },
  getTicket(channelId) { return load().tickets[channelId]; },
  deleteTicket(channelId) { delete load().tickets[channelId]; save(); },

  // ── warnings ──
  addWarning(userId, entry) {
    const d = load();
    (d.warnings[userId] ||= []).push(entry);
    save();
  },
  getWarnings(userId) { return load().warnings[userId] || []; },
  clearWarnings(userId) { delete load().warnings[userId]; save(); },

  // ── scrims / tournaments ──
  setScrim(id, data) { load().scrims[id] = data; save(); },
  getScrim(id) { return load().scrims[id]; },
  setTournament(id, data) { load().tournaments[id] = data; save(); },
  getTournament(id) { return load().tournaments[id]; },

  // ── leveling ──
  getLevel(userId) { return load().levels[userId] || { xp: 0, level: 0 }; },
  setLevel(userId, data) { load().levels[userId] = data; save(); },
  topLevels(n = 10) {
    const lv = load().levels;
    return Object.entries(lv)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.level - a.level || b.xp - a.xp)
      .slice(0, n);
  },

  // ── temp voice channels ──
  addTempVc(channelId, ownerId) { load().tempVcs[channelId] = ownerId; save(); },
  isTempVc(channelId) { return !!load().tempVcs[channelId]; },
  removeTempVc(channelId) { delete load().tempVcs[channelId]; save(); },

  // ── starboard ──
  getStar(srcId) { return load().starboard[srcId]; },
  setStar(srcId, starId) { load().starboard[srcId] = starId; save(); },

  // ── movie nights ──
  setMovie(id, data) { load().movies[id] = data; save(); },
  getMovie(id) { return load().movies[id]; },

  save,
};

module.exports = db;
