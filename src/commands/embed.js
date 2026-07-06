'use strict';
const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags,
} = require('discord.js');
const E = require('../utils/embeds');
const config = require('../config');
const { isStaff } = require('../utils/helpers');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create and post a custom embedded message.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName('title').setDescription('Embed title'))
    .addStringOption((o) => o.setName('description').setDescription('Main text — use \\n for new lines'))
    .addStringOption((o) => o.setName('color').setDescription('Hex colour e.g. FF6A00 (default: brand orange)'))
    .addChannelOption((o) => o.setName('channel').setDescription('Where to post (default: here)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addStringOption((o) => o.setName('image').setDescription('Large image URL'))
    .addStringOption((o) => o.setName('thumbnail').setDescription('Small thumbnail URL'))
    .addStringOption((o) => o.setName('footer').setDescription('Footer text'))
    .addBooleanOption((o) => o.setName('logo').setDescription('Show the LEU logo on it (default: true)')),

  async execute(interaction) {
    if (!isStaff(interaction.member) && !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ embeds: [E.error('No permission', 'You need Manage Messages to use /embed.')], flags: EPH });
    }

    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    if (!title && !description && !interaction.options.getString('image')) {
      return interaction.reply({ embeds: [E.error('Empty embed', 'Give at least a **title**, **description**, or **image**.')], flags: EPH });
    }

    const colorRaw = interaction.options.getString('color');
    const color = colorRaw ? parseInt(colorRaw.replace('#', ''), 16) : config.brandColor;

    const embed = new EmbedBuilder().setColor(Number.isFinite(color) ? color : config.brandColor);
    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description.replace(/\\n/g, '\n'));

    const image = interaction.options.getString('image');
    const thumb = interaction.options.getString('thumbnail');
    if (image) embed.setImage(image);

    const showLogo = interaction.options.getBoolean('logo');
    if (thumb) embed.setThumbnail(thumb);
    else if (showLogo !== false && E.getBrandIcon()) embed.setThumbnail(E.getBrandIcon());

    const footer = interaction.options.getString('footer');
    if (footer) embed.setFooter({ text: footer });

    const target = interaction.options.getChannel('channel') || interaction.channel;
    try {
      await target.send({ embeds: [embed] });
    } catch {
      return interaction.reply({ embeds: [E.error('Could not post', `Check I can send messages in ${target}, and that any image/thumbnail URLs are valid direct links.`)], flags: EPH });
    }
    return interaction.reply({ embeds: [E.success('Embed posted', `Sent to ${target}.`)], flags: EPH });
  },
};
