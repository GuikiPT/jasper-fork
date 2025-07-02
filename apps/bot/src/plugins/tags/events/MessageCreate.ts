import { Events, Message } from 'discord.js';

import { Context } from '../../../classes/context';
import { defineEvent } from '../../../define';
import { Options } from '../../../services/settingsService';

export const Event = defineEvent<Message>({
    event: {
        name: Events.MessageCreate,
        once: false,
    },
    on: async (message: Message, ctx: Context) => {
        try {
            if (message.partial) {
                await message.fetch();
            }

            if (!message.channel.isThread()) return;

            await ctx.services.settings.configure<Options>({ guildId: message.guildId! });

            const { Channels } = await ctx.services.settings.getSettings();
            const allowedTagChannels = Channels.AllowedTagChannels;

            if (!allowedTagChannels.includes(message.channel.parentId)) return;

            if (message.author.id === message.channel.ownerId) {
                await ctx.store.setThreadTimestamp(message.channel.id, message.author.id, null);
            }
        } catch (error) {
            console.error(
                `[Error] Failed to save timestamp for thread ${message.channel.id}:`,
                error,
            );
        }
    },
});
