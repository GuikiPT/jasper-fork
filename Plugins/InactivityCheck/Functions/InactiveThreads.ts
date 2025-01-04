import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ThreadChannel } from "discord.js";

export async function checkInactiveThreads(ctx) {
    if (!ctx || !ctx.channels) {
        console.error("[Error] Discord client is not properly initialized in the context.");
        return;
    }

    const INACTIVITY_LIMIT = 1 * 60 * 1000;
    const keys = await ctx.store.getAllThreads();
    console.log("[DEBUG] Retrieved thread keys from Redis:", keys);

    for (const key of keys) {
        const threadId = key.split(":").pop();
        if (!threadId) continue;

        try {
            const threadData = await ctx.store.getThreadTimestamp(threadId);
            console.log(`[DEBUG] Thread data for ${threadId}:`, threadData);
            if (!threadData) continue;

            const thread = await ctx.channels.fetch(threadId) as ThreadChannel;

            if (thread.archived) {
                console.log(`[INFO] Thread ${threadId} is archived. Removing from Redis.`);
                await ctx.store.deleteThread(threadId);
                continue;
            }

            const now = Date.now();

            if (threadData.embedTimestamp && now - threadData.embedTimestamp > INACTIVITY_LIMIT && threadData.lastMessage <= threadData.embedTimestamp) {
                console.log(`[INFO] Closing thread ${threadId} due to inactivity.`);
                await thread.send({
                    content: `This thread has been closed due to inactivity. If you need further assistance, please create a new thread.`,
                });
                await thread.setLocked(true);
                await thread.setArchived(true);
                await ctx.store.deleteThread(threadId);
                continue;
            }

            if (!threadData.embedTimestamp || now - threadData.embedTimestamp >= INACTIVITY_LIMIT) {
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
                        content: `<@${user.id}>`,
                        embeds: [
                            {
                                title: "Do you still need help with your issue?",
                                description: "You haven't responded in a while. Please choose an action below.",
                                color: 0x323338,
                            },
                        ],
                        components: [actionRow],
                    });

                    await ctx.store.set(`support:thread:${threadId}`, JSON.stringify({
                        lastMessage: threadData.lastMessage,
                        userId: threadData.userId,
                        embedTimestamp: embedMessage.createdTimestamp,
                    }));
                    console.log(`[INFO] Inactivity embed sent for thread ${threadId}.`);
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
                console.log(`[INFO] Thread ${threadId} is archived. Removing from Redis.`);
                await ctx.store.deleteThread(threadId);
                continue;
            }
        } catch {
            console.log(`Thread ${threadId} no longer exists. Removing from Redis.`);
            await ctx.store.deleteThread(threadId);
        }
    }
}
