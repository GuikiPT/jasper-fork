import { Events, MessageFlags, ModalSubmitInteraction } from 'discord.js';

import { Context } from '../../../classes/context';
import { defineEvent } from '../../../define';
import { Options } from '../../../services/settingsService';

export const Event = defineEvent<ModalSubmitInteraction>({
    event: {
        name: Events.InteractionCreate,
        once: false,
    },
    on: async (interaction: ModalSubmitInteraction, ctx: Context) => {
        await ctx.services.settings.configure<Options>({ guildId: interaction.guildId! });

        const { Channels } = await ctx.services.settings.getSettings();
        const allowedTagChannels = Channels.AllowedTagChannels;

        if (!allowedTagChannels.includes(interaction.channel.parentId)) return;

        if (!interaction.isModalSubmit()) return;

        const customIdParts = interaction.customId.split('_');
        if (
            customIdParts.length < 4 ||
            customIdParts.slice(0, 3).join('_') !== 'close_thread_reason'
        )
            return;

        const threadId = customIdParts[3];

        const thread = await ctx.channels.fetch(threadId).catch(() => null);
        if (!thread || !thread.isThread()) {
            return interaction.reply({
                content: 'This thread no longer exists.',
                flags: MessageFlags.Ephemeral,
            });
        }

        if (thread.archived) {
            return interaction.reply({
                content: 'This thread is already archived.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const reason = interaction.fields.getTextInputValue('reason');

        try {
            await thread.fetch();

            if (thread.archived) {
                return interaction.reply({
                    content: 'This thread was archived while you were submitting the form.',
                    flags: MessageFlags.Ephemeral,
                });
            }

            await interaction.reply({
                content: 'The thread has been successfully closed.',
                flags: MessageFlags.Ephemeral,
            });

            const closureMessage = {
                content: `Post marked as closed by the OP <@${interaction.user.id}>`,
                embeds: [
                    {
                        description: reason,
                        title: 'Reason',
                    },
                ],
            };

            try {
                // TODO: Check these, these isn't the best way to do this
                // TODO: Maybe use store to also store the last warning message
                // TODO: id and reuse it here
                const messages = await thread.messages.fetch({ limit: 10 });
                const inactivityMessage = messages.find(
                    (msg) =>
                        msg.embeds.length > 0 &&
                        msg.embeds[0].title === 'Do you still need help with your issue?',
                );

                if (inactivityMessage) {
                    await inactivityMessage.edit({
                        components: [],
                        ...closureMessage,
                    });
                } else {
                    await thread.send(closureMessage);
                }
            } catch (editError) {
                console.error(
                    `[Error editing inactivity message for thread ${threadId}]:`,
                    editError,
                );
                await thread.send(closureMessage);
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
