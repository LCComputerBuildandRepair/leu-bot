'use strict';
/** Builders for the interactive panels the bot posts into channels. */
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../src/database');
const E = require('./utils/embeds');
const config = require('./config');
const { GAME_ROLES, PING_ROLES } = require('./structure');

function verifyPanel() {
  return {
    embeds: [E.brand('🔓 Verify to enter', `Welcome to **${config.communityName}**!\n\nClick **Verify** below to confirm you're human and unlock the rest of the server.`)],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('verify:btn').setLabel('Verify').setStyle(ButtonStyle.Success).setEmoji('✅'),
    )],
  };
}

function rolesPanel() {
  const gameOpts = GAME_ROLES.filter((r) => db.roleId(r.key)).map((r) => ({ label: r.name, value: r.key, emoji: r.emoji }));
  const pingOpts = PING_ROLES.filter((r) => db.roleId(r.key)).map((r) => ({ label: r.name.replace(/^[^ ]+ /, ''), value: r.key }));

  const rows = [];
  if (gameOpts.length) {
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId('roles:games').setPlaceholder('🎮 Pick your games').setMinValues(0).setMaxValues(gameOpts.length).addOptions(gameOpts),
    ));
  }
  if (pingOpts.length) {
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId('roles:pings').setPlaceholder('🔔 Pick your notifications').setMinValues(0).setMaxValues(pingOpts.length).addOptions(pingOpts),
    ));
  }
  return {
    embeds: [E.brand('🎭 Get your roles', 'Select the **games you play** to unlock their channels, and the **pings you want**. Pick as many as you like — picking a game opens its locked channels; deselecting hides them again.')],
    components: rows,
  };
}

function ticketPanel() {
  return {
    embeds: [E.brand('🎫 Need help?', 'Open a private ticket and our staff team will assist you.\n\nClick below and choose a category.')],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket:open').setLabel('Open a Ticket').setStyle(ButtonStyle.Primary).setEmoji('🎫'),
    )],
  };
}

function rulesPanel() {
  return {
    embeds: [E.brand('📜 Server Rules', [
      '**1.** Be respectful — no harassment, hate speech, slurs or discrimination.',
      '**2.** No spam, mass-pinging, or self-promo without permission.',
      '**3.** Keep content SFW. No NSFW, gore, or shock material.',
      '**4.** No cheating, exploiting, or account sharing in competitive play.',
      '**5.** Use channels for their purpose; keep clips in #clips, etc.',
      '**6.** Listen to staff. Their decisions are final.',
      '**7.** Follow Discord\'s [Terms](https://discord.com/terms) & [Guidelines](https://discord.com/guidelines).',
      '',
      '_Breaking rules can lead to warnings, mutes, kicks or bans._',
    ].join('\n'))],
  };
}

const PANELS = { verify: verifyPanel, roles: rolesPanel, ticket: ticketPanel, rules: rulesPanel };

module.exports = { PANELS, verifyPanel, rolesPanel, ticketPanel, rulesPanel };
