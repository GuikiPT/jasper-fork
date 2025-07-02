import { Events, MessageFlags, ModalSubmitInteraction } from 'discord.js';

import { Context } from '../../../classes/context';
import { defineEvent } from '../../../define';

export const Event = defineEvent<ModalSubmitInteraction>({
    event: {
        name: Events.InteractionCreate,
        once: false,
    },
    on: async (interaction: ModalSubmitInteraction, ctx: Context) => {
        if (!interaction.isModalSubmit()) return;

        const customIdParts = interaction.customId.split('_');
        if (customIdParts.length < 4 || customIdParts.slice(0, 3).join('_') !== 'close_thread_reason') return;

        const threadId = customIdParts[3];
        console.log(`[DEBUG] Processing modal submit for thread: ${threadId}`);

        const thread = await ctx.channels.fetch(threadId).catch(() => null);
        if (!thread || !thread.isThread()) {
            console.log(`[DEBUG] Thread ${threadId} not found or not a thread`);
            return interaction.reply({
                content: 'This thread no longer exists.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (thread.archived) {
            console.log(`[DEBUG] Thread ${threadId} is already archived`);
            return interaction.reply({
                content: 'This thread is already archived.',
                flags: MessageFlags.Ephemeral
            });
        }

        const reason = interaction.fields.getTextInputValue('reason');

        try {
            await thread.fetch();

            if (thread.archived) {
                console.log(`[DEBUG] Thread ${threadId} was archived while processing modal`);
                return interaction.reply({
                    content: 'This thread was archived while you were submitting the form.',
                    flags: MessageFlags.Ephemeral
                });
            }

            console.log(`[DEBUG] Closing thread ${threadId} with reason: ${reason}`);

            await interaction.reply({
                content: 'The thread has been successfully closed.',
                flags: MessageFlags.Ephemeral,
            });

            try {
                const messages = await thread.messages.fetch({ limit: 10 });
                const inactivityMessage = messages.find(msg =>
                    msg.embeds.length > 0 &&
                    msg.embeds[0].title === "Do you still need help with your issue?"
                );

                if (inactivityMessage) {
                    await inactivityMessage.edit({
                        components: [],
                        content: `Post marked as Closed by the OP <@${interaction.user.id}>`,
                        embeds: [
                            {
                                color: 0xff0000,
                                fields: [
                                    {
                                        inline: true,
                                        name: 'Reason',
                                        value: reason,
                                    },
                                ],
                            },
                        ],
                    });
                } else {
                    await thread.send({
                        content: `Post marked as Closed by the OP <@${interaction.user.id}>`,
                        embeds: [
                            {
                                color: 0xff0000,
                                fields: [
                                    {
                                        inline: true,
                                        name: 'Reason',
                                        value: reason,
                                    },
                                ],
                            },
                        ],
                    });
                }
            } catch (editError) {
                console.error(`[Error editing inactivity message for thread ${threadId}]:`, editError);
                await thread.send({
                    content: `Post marked as Closed by the OP <@${interaction.user.id}>`,
                    embeds: [
                        {
                            color: 0xff0000,
                            fields: [
                                {
                                    inline: true,
                                    name: 'Reason',
                                    value: reason,
                                },
                            ],
                        },
                    ],
                });
            }

            await thread.setLocked(true);
            await thread.setArchived(true, 'Thread closed by user.');

            await ctx.store.deleteThread(threadId);

            console.log(`[DEBUG] Successfully closed thread ${threadId}`);

            return;
        } catch (error) {
            console.error(`[Error closing thread ${threadId}]:`, error);

            if (error.message && error.message.includes('Thread is archived')) {
                return interaction.reply({
                    content: 'This thread was archived while you were submitting the form.',
                    flags: MessageFlags.Ephemeral,
                });
            }

            return interaction.reply({
                content: 'An error occurred while closing the thread. Please try again.',
                flags: MessageFlags.Ephemeral,
            });
        }
    },
});
