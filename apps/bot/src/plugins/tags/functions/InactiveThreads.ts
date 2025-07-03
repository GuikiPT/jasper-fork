import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ThreadChannel } from "discord.js";

import { Context } from "../../../classes/context";

export async function checkInactiveThreads(ctx: Context) {
    if (!ctx || !ctx.channels) return;

    const INACTIVITY_LIMIT = parseInt(ctx.env.get('THREAD_INACTIVITY_LIMIT') || '3600000');
    const GRACE_PERIOD = parseInt(ctx.env.get('THREAD_GRACE_PERIOD') || '60000');
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

            if (threadData.embedTimestamp && now - Number(threadData.embedTimestamp) > INACTIVITY_LIMIT + GRACE_PERIOD && Number(threadData.lastMessage) <= Number(threadData.embedTimestamp)) {
                const closureMessage = {
                    components: [],
                    content: `This thread has been closed due to inactivity. If you need further assistance, please create a new thread.`,
                    embeds: [
                        {
                            color: 0xff0000,
                            description: "This thread was automatically closed due to inactivity.",
                            title: "Thread Closed",
                        },
                    ],
                };

                if (threadData.warningMessageId) {
                    try {
                        const warningMessage = await thread.messages.fetch(threadData.warningMessageId);
                        await warningMessage.edit(closureMessage);
                    } catch (fetchError) {
                        console.error(`[Error editing warning message ${threadData.warningMessageId} for thread ${threadId}]:`, fetchError);
                        await thread.send(closureMessage);
                    }
                } else {
                    await thread.send(closureMessage);
                }

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
                        warningMessageId: embedMessage.id,
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
