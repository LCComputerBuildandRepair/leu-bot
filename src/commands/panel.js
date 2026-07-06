'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const E = require('../utils/embeds');
const { PANELS } = require('../panels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('(Re)post an interactive panel into the current channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) => o.setName('type').setDescription('Which panel').setRequired(true).addChoices(
      { name: 'verify', value: 'verify' },
      { name: 'roles', value: 'roles' },
      { name: 'ticket', value: 'ticket' },
      { name: 'rules', value: 'rules' },
    )),

  async execute(interaction) {
    const type = interaction.options.getString('type');
    const builder = PANELS[type];
    if (!builder) return interaction.reply({ embeds: [E.error('Unknown panel', 'No such panel.')], flags: MessageFlags.Ephemeral });
    await interaction.channel.send(builder());
    return interaction.reply({ embeds: [E.success('Panel posted', `Posted the **${type}** panel here.`)], flags: MessageFlags.Ephemeral });
  },
};
