'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const db = require('../database');
const E = require('../utils/embeds');
const { isStaff } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Post a formatted announcement.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName('message').setDescription('Announcement text').setRequired(true))
    .addStringOption((o) => o.setName('title').setDescription('Headline'))
    .addChannelOption((o) => o.setName('channel').setDescription('Where to post (default: #announcements)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addBooleanOption((o) => o.setName('ping').setDescription('Ping the Announcements role?')),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ embeds: [E.error('No permission', 'Only staff can post announcements.')], flags: MessageFlags.Ephemeral });
    }
    const msg = interaction.options.getString('message').replace(/\\n/g, '\n');
    const title = interaction.options.getString('title') || '📣 Announcement';
    const ping = interaction.options.getBoolean('ping');

    const target = interaction.options.getChannel('channel')
      || interaction.guild.channels.cache.get(db.channelId('announce'))
      || interaction.channel;

    const embed = E.brand(title, msg).setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });
    const pingId = db.roleId('p_announce');
    await target.send({ content: ping && pingId ? `<@&${pingId}>` : undefined, embeds: [embed] });
    return interaction.reply({ embeds: [E.success('Announced', `Posted in ${target}.`)], flags: MessageFlags.Ephemeral });
  },
};
