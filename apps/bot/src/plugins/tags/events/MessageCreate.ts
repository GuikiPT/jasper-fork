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
                console.log('[INFO] Message is partial, fetching...');
                await message.fetch();
            }

            if (!message.channel.isThread()) return console.log('[INFO] Message is not in a thread, skipping.');

            await ctx.services.settings.configure<Options>({ guildId: message.guildId! });
            const { Channels } = await ctx.services.settings.getSettings();
            const allowedTagChannels = Channels.AllowedTagChannels;
            if (!allowedTagChannels.includes(message.channel.parentId)) {
                return console.log('[INFO] Message is not in an allowed tag channel, skipping.');
            }

            if (message.author.id === message.channel.ownerId) {
                await ctx.store.setThread(message.channel.id, message.author.id, null);

                console.log(`[INFO] OP message logged:
                        - Thread Name: ${message.channel.name}
                        - Thread ID: ${message.channel.id}
                        - Parent Channel ID: ${message.channel.parentId}
                        - User: ${message.author.tag} (ID: ${message.author.id})
                        - Timestamp: ${new Date().toISOString()}`);
            }
        } catch (error) {
            console.error(
                `[Error] Failed to save timestamp for thread ${message.channel.id}:`,
                error,
            );
        }
    },
});
