'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../database');
const E = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Post / refresh the community status panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const guild = interaction.guild;
    await guild.members.fetch();

    const total = guild.memberCount;
    const online = guild.members.cache.filter((m) => m.presence && m.presence.status !== 'offline').size;
    const roleCount = (key) => {
      const id = db.roleId(key);
      return id ? guild.members.cache.filter((m) => m.roles.cache.has(id)).size : 0;
    };

    const embed = E.brand(`📊 ${guild.name} — Live Status`)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: '👥 Members', value: `${total}`, inline: true },
        { name: '🟢 Online', value: `${online}`, inline: true },
        { name: '🎮 Players', value: `${roleCount('player')}`, inline: true },
        { name: '🎖️ Captains', value: `${roleCount('captain')}`, inline: true },
        { name: '🔁 Subs', value: `${roleCount('sub')}`, inline: true },
        { name: '🎬 Creators', value: `${roleCount('creator')}`, inline: true },
      )
      .setFooter({ text: 'Updated' });

    const statusCh = guild.channels.cache.get(db.channelId('status'));
    if (statusCh) {
      // Edit the existing status message if there is one, else send a new one.
      const recent = await statusCh.messages.fetch({ limit: 10 }).catch(() => null);
      const mine = recent?.find((m) => m.author.id === guild.members.me.id && m.embeds[0]?.title?.includes('Live Status'));
      if (mine) await mine.edit({ embeds: [embed] });
      else await statusCh.send({ embeds: [embed] });
      return interaction.editReply({ embeds: [E.success('Status updated', `Refreshed in ${statusCh}.`)] });
    }
    return interaction.editReply({ embeds: [embed] });
  },
};
