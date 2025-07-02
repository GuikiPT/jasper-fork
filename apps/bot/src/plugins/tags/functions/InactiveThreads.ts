import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ThreadChannel } from "discord.js";

import { Context } from "../../../classes/context";

export async function checkInactiveThreads(ctx: Context) {
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
            const GRACE_PERIOD = 60 * 1000;

            if (threadData.embedTimestamp && now - Number(threadData.embedTimestamp) > INACTIVITY_LIMIT + GRACE_PERIOD && Number(threadData.lastMessage) <= Number(threadData.embedTimestamp)) {
                console.log(`[INFO] Closing thread ${threadId} due to inactivity.`);
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
