/* eslint @typescript-eslint/no-explicit-any: "off" */
import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    PermissionsBitField,
} from '@antibot/interactions';
import { defineCommand } from '../../../Common/define';
import { ChannelType, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { checkForRoles } from '../../../Common/roles';

export = {
    Command: defineCommand<ChatInputCommandInteraction>({
        command: {
            name: 'resolve',
            type: ApplicationCommandType.CHAT_INPUT,
            description: 'Marks post as resolved and sends a message to inform OP',
            options: [
                {
                    type: ApplicationCommandOptionType.STRING,
                    name: 'original_question',
                    description: 'Original Question asked by OP',
                    required: false,
                },
                {
                    type: ApplicationCommandOptionType.STRING,
                    name: 'summarized_answer',
                    description: "Summarization of the answer to the OP's original question",
                    required: false,
                },
            ],
        },
        permissions: [PermissionsBitField.ManageThreads],
        on: async (ctx, interaction) => {
            if (
                checkForRoles(
                    interaction,
                    ctx.env.get('admin'),
                    ctx.env.get('staff'),
                    ctx.env.get('support'),
                )
            ) {
                const finalReply: Record<'content', string> = {
                    content: `Post marked as Resolved by <@${interaction.user.id}>`,
                };
                const originalQuestion: string = interaction.options.getString('original_question');
                const summarizedAnswer: string = interaction.options.getString('summarized_answer');
                const embeds: {
                    title: string;
                    fields: { name: string; value: string }[];
                    color: number;
                }[] = [{ title: 'Overview', fields: [], color: global.embedColor }];

                const appliedTags = (interaction.channel as any).appliedTags;
                if (interaction.channel.type == ChannelType.PublicThread) {
                    if (appliedTags.length >= 5) {
                        return interaction.reply({
                            content:
                                'This thread already has 5 tags applied.\nPlease remove one tag before executing `/resolve` again!',
                            flags: MessageFlags.Ephemeral,
                        });
                    }

                    if (!appliedTags.includes('1144008960966402149')) {
                        const tagIndex = appliedTags.indexOf('1284733312501420145');
                        if (tagIndex !== -1) {
                            appliedTags.splice(tagIndex, 1);
                        }
                        await interaction.channel.setAppliedTags([
                            '1144008960966402149',
                            ...appliedTags,
                        ]);
                    }
                    if (originalQuestion) {
                        embeds[0].fields.push({
                            name: 'Original Question',
                            value: originalQuestion,
                        });
                    }
                    if (summarizedAnswer) {
                        embeds[0].fields.push({
                            name: 'Summarized Answer',
                            value: summarizedAnswer,
                        });
                    }
                    if (embeds[0].fields.length > 0) {
                        finalReply['embeds'] = embeds;
                    }
                    await interaction.reply(finalReply);
                    if (!interaction.channel.locked) {
                        await interaction.channel.setLocked(true);
                    }
                    if (!interaction.channel.archived) {
                        await interaction.channel.setArchived(true);
                    }
                    return;
                } else {
                    return interaction.reply({
                        content:
                            'Channel is not a thread. This command **must be** executed in Forum Posts!',
                        flags: MessageFlags.Ephemeral,
                    });
                }
            }
            return interaction.reply({
                content: "Sorry but you can't use this command.",
                flags: MessageFlags.Ephemeral,
            });
        },
    }),
};
