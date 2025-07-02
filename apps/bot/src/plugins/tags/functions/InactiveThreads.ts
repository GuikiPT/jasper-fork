import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ThreadChannel } from "discord.js";

import { Context } from "../../../classes/context";

export async function checkInactiveThreads(ctx: Context) {
    if (!ctx || !ctx.channels) return;

    // TODO: Do these dinamically or either as enviroment variable
    const INACTIVITY_LIMIT = 1 * 60 * 1000;
    const keys = await ctx.store.getAllThreads();

    for (const key of keys) {
        const threadId = key.split(":").pop();
        if (!threadId) continue;

        try {
            const threadData = await ctx.store.getThreadTimestamp(threadId);
            if (!threadData) continue;

            const thread = await ctx.channels.fetch(threadId) as ThreadChannel;

            if (thread.archived) {
                await ctx.store.deleteThread(threadId);
                continue;
            }

            const now = Date.now();
            // TODO: Do these dinamically or either as enviroment variable
            const GRACE_PERIOD = 60 * 1000;

            if (threadData.embedTimestamp && now - Number(threadData.embedTimestamp) > INACTIVITY_LIMIT + GRACE_PERIOD && Number(threadData.lastMessage) <= Number(threadData.embedTimestamp)) {
                //TODO: Instead sending a new message, edit the existing embed one
                await thread.send({
                    content: `This thread has been closed due to inactivity. If you need further assistance, please create a new thread.`,
                });
                await thread.setLocked(true);
                await thread.setArchived(true);
                await ctx.store.deleteThread(threadId);
                continue;
            }

            if (!threadData.embedTimestamp || now - Number(threadData.embedTimestamp) >= INACTIVITY_LIMIT + GRACE_PERIOD) {
                if (now - threadData.lastMessage > INACTIVITY_LIMIT) {
                    const user = await ctx.users.fetch(threadData.userId);

                    const keepOpenButton = new ButtonBuilder()
                        .setCustomId(`keep_thread_${threadId}`)
                        .setLabel("Keep Open")
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(false);

                    const closeButton = new ButtonBuilder()
                        .setCustomId(`close_thread_${threadId}`)
                        .setLabel("Close Thread")
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(false);

                    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(keepOpenButton, closeButton);

                    const embedMessage = await thread.send({
                        components: [actionRow],
                        content: `<@${user.id}>`,
                        embeds: [
                            {
                                color: 0x323338,
                                description: "You haven't responded in a while. Please choose an action below.",
                                title: "Do you still need help with your issue?",
                            },
                        ],
                    });

                    await ctx.store.set(`support:thread:${threadId}`, JSON.stringify({
                        embedTimestamp: embedMessage.createdTimestamp,
                        lastMessage: threadData.lastMessage,
                        userId: threadData.userId,
                    }));
                }
            }
        } catch (error) {
            console.error(`[Error processing thread ${threadId}]:`, error);
        }
    }
}

export async function cleanUpExpiredThreads(ctx) {
    const keys = await ctx.store.getAllThreads();

    for (const key of keys) {
        const threadId = key.split(":").pop();
        try {
            const thread = await ctx.channels.fetch(threadId) as ThreadChannel;

            if (thread.archived) {
                await ctx.store.deleteThread(threadId);
                continue;
            }
        } catch {
            await ctx.store.deleteThread(threadId);
        }
    }
}
