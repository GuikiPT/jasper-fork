import { Message } from "discord.js";
import { DefineEvent } from "../../../Common/DefineEvent";

export = {
    Event: DefineEvent({
        event: {
            name: "messageCreate",
            once: false,
        },
        on: async (message: Message, ctx) => {
            try {
                if (!message.channel.isThread()) return;

                if (message.channel.parentId !== String(ctx.env.get("support_thread"))) return;

                if (message.author.id === message.channel.ownerId) {
                    await ctx.store.setThreadTimestamp(message.channel.id, message.author.id, null);

                    console.log(`[INFO] OP message logged:
                        - Thread Name: ${message.channel.name}
                        - Thread ID: ${message.channel.id}
                        - Parent Channel ID: ${message.channel.parentId}
                        - User: ${message.author.tag} (ID: ${message.author.id})
                        - Timestamp: ${new Date().toISOString()}`);
                }
            } catch (error) {
                console.error(`[Error] Failed to save timestamp for thread ${message.channel.id}:`, error);
            }
        },
    }),
};
