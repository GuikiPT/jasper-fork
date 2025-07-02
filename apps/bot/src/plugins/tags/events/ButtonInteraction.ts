import { ButtonInteraction, ComponentType, Events, MessageFlags, TextInputStyle } from 'discord.js';

import { Context } from '../../../classes/context';
import { defineEvent } from '../../../define';
import { Options } from '../../../services/settingsService';

export const Event = defineEvent<ButtonInteraction>({
    event: {
        name: Events.InteractionCreate,
        once: false,
    },
    on: async (interaction: ButtonInteraction, ctx: Context) => {
        await ctx.services.settings.configure<Options>({ guildId: interaction.guildId! });

        const { Channels } = await ctx.services.settings.getSettings();
        const allowedTagChannels = Channels.AllowedTagChannels;

        if (!allowedTagChannels.includes(interaction.channel.parentId)) return;

        if (!interaction.isButton()) return;

        if (interaction.customId.startsWith('close_thread_')) {
            const threadId = interaction.customId.split('_')[2];

            const thread = await ctx.channels.fetch(threadId).catch(() => null);
            if (!thread || !thread.isThread()) {
                await interaction.reply({
                    content: 'This thread no longer exists.',
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (thread.archived) {
                await interaction.reply({
                    content: 'This thread is already archived.',
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            await interaction.showModal({
                components: [
                    {
                        components: [
                            {
                                customId: 'reason',
                                label: 'Reason for closing thread',
                                maxLength: 1000,
                                placeholder: 'Please provide a reason for closing this thread...',
                                required: true,
                                style: TextInputStyle.Paragraph,
                                type: ComponentType.TextInput,
                            },
                        ],
                        type: ComponentType.ActionRow,
                    },
                ],
                customId: `close_thread_reason_${threadId}`,
                title: 'Close Thread',
            });
            return;
        }

        if (interaction.customId.startsWith('keep_thread_')) {
            const threadId = interaction.customId.split('_')[2];

            try {
                const thread = await ctx.channels.fetch(threadId).catch(() => null);
                if (!thread || !thread.isThread()) {
                    await interaction.reply({
                        content: 'This thread no longer exists.',
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }

                if (thread.archived) {
                    await interaction.reply({
                        content: 'This thread is already archived.',
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }

                const threadData = await ctx.store.getThreadTimestamp(threadId);
                if (threadData) {
                    await ctx.store.set(
                        `support:thread:${threadId}`,
                        JSON.stringify({
                            lastMessage: Date.now(),
                            userId: threadData.userId,
                        }),
                    );
                }

                await interaction.update({
                    components: [],
                    content: `<@${interaction.user.id}> chose to keep this thread open.`,
                    embeds: [
                        {
                            color: 0x00ff00,
                            description:
                                'Thread will remain open. The inactivity timer has been reset.',
                            title: 'Thread Kept Open',
                        },
                    ],
                });
            } catch (error) {
                console.error(`[Error keeping thread open ${threadId}]:`, error);
                await interaction.reply({
                    content: 'An error occurred while trying to keep the thread open.',
                    flags: MessageFlags.Ephemeral,
                });
            }
            return;
        }
    },
});
