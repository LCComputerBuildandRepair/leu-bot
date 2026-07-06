'use strict';
const { Events, ChannelType } = require('discord.js');
const db = require('../database');

/**
 * Join-to-Create voice channels. Joining the "➕ Join to Create" channel spawns
 * a personal voice room (with the user as owner) and moves them into it. The room
 * is auto-deleted when the last person leaves.
 */
module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const guild = newState.guild;
    const createId = db.channelId('vc_create');

    // Joined the hub → spin up a temp room.
    if (newState.channelId && newState.channelId === createId) {
      try {
        const parent = db.getId('categories', 'cat_voice') || newState.channel.parentId || undefined;
        // No explicit overwrites → the room is created synced to the VOICE
        // category, so it inherits the same "verified-only" visibility.
        const room = await guild.channels.create({
          name: `🔊 ${newState.member.displayName}'s Room`,
          type: ChannelType.GuildVoice,
          parent,
          reason: 'Join-to-create voice',
        });
        // Then give the owner control of their own room.
        await room.permissionOverwrites.edit(newState.member.id, {
          ManageChannels: true, MoveMembers: true, MuteMembers: true, Connect: true,
        }).catch(() => {});
        db.addTempVc(room.id, newState.member.id);
        await newState.member.voice.setChannel(room).catch(() => {});
      } catch (err) {
        console.error('[voice] failed to create temp room:', err.message);
      }
    }

    // Left a temp room that is now empty → clean it up.
    const left = oldState.channel;
    if (left && db.isTempVc(left.id) && left.members.size === 0) {
      await left.delete('Temp voice empty').catch(() => {});
      db.removeTempVc(left.id);
    }
  },
};
