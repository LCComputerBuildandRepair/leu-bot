'use strict';
const { Events } = require('discord.js');
const db = require('../database');
const E = require('../utils/embeds');

const STAR = '⭐';
const THRESHOLD = 3; // stars needed to hit the highlights board

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction) {
    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.emoji.name !== STAR) return;

      const highlightsId = db.channelId('highlights');
      if (!highlightsId) return;

      const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
      if (!message.guild || message.author?.bot) return;
      if (message.channel.id === highlightsId) return; // don't star the board itself

      const count = reaction.count || 0;
      if (count < THRESHOLD) return;

      const board = message.guild.channels.cache.get(highlightsId);
      if (!board) return;

      const embed = E.brand(`${STAR} ${count} • Highlight`)
        .setDescription(message.content || '*[no text]*')
        .addFields({ name: 'Jump', value: `[Go to message](${message.url})`, inline: true })
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setFooter({ text: `#${message.channel.name}` });
      const image = message.attachments.find((a) => a.contentType?.startsWith('image'));
      if (image) embed.setImage(image.url);

      const existingId = db.getStar(message.id);
      if (existingId) {
        const msg = await board.messages.fetch(existingId).catch(() => null);
        if (msg) return msg.edit({ embeds: [embed] });
      }
      const sent = await board.send({ embeds: [embed] });
      db.setStar(message.id, sent.id);
    } catch (err) {
      console.error('[starboard]', err.message);
    }
  },
};
