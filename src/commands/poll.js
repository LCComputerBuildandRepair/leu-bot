'use strict';
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const E = require('../utils/embeds');

const NUM = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a reaction poll.')
    .addStringOption((o) => o.setName('question').setDescription('The poll question').setRequired(true))
    .addStringOption((o) => o.setName('options').setDescription('Up to 5 choices, separated by "|" (omit for a 👍/👎 poll)')),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const raw = interaction.options.getString('options');
    const opts = raw ? raw.split('|').map((s) => s.trim()).filter(Boolean).slice(0, 5) : [];

    const embed = E.brand('📊 Poll', `**${question}**`)
      .setFooter({ text: `Poll by ${interaction.user.tag}` });
    if (opts.length) embed.setDescription(`**${question}**\n\n${opts.map((o, i) => `${NUM[i]} ${o}`).join('\n')}`);

    await interaction.reply({ embeds: [embed] });
    const msg = await interaction.fetchReply();
    if (opts.length) {
      for (let i = 0; i < opts.length; i++) await msg.react(NUM[i]).catch(() => {});
    } else {
      await msg.react('👍').catch(() => {});
      await msg.react('👎').catch(() => {});
    }
  },
};
