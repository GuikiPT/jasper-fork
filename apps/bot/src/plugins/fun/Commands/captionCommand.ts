import { ApplicationCommandOptionType, ApplicationCommandType } from '@antibot/interactions';
import { AttachmentBuilder, ChatInputCommandInteraction } from 'discord.js';

import { Context } from '../../../classes/context';
import { ConfigurationRoles } from '../../../container';
import { defineCommand } from '../../../define';

export = {
    Command: defineCommand<ChatInputCommandInteraction>({
        command: {
            description: 'Add a caption to an image.',
            name: 'caption',
            options: [
                {
                    description: 'Caption text',
                    name: 'text',
                    required: true,
                    type: ApplicationCommandOptionType.STRING,
                },
                {
                    description: 'Image attachment',
                    name: 'image',
                    required: true,
                    type: ApplicationCommandOptionType.ATTACHMENT,
                },
                {
                    description: 'Font size for the caption',
                    name: 'font_size',
                    required: false,
                    type: ApplicationCommandOptionType.INTEGER,
                },
                {
                    choices: [
                        {
                            name: 'Top',
                            value: 'top',
                        },
                        {
                            name: 'Bottom',
                            value: 'bottom',
                        },
                    ],
                    description: 'Position of the caption (top or bottom)',
                    name: 'position',
                    required: false,
                    type: ApplicationCommandOptionType.STRING,
                },
            ],
            type: ApplicationCommandType.CHAT_INPUT,
        },
        on: async (ctx: Context, interaction) => {
            const text = interaction.options.getString('text', true);
            const image = interaction.options.getAttachment('image', true);
            const fontSize = interaction.options.getInteger('font_size') ?? 72;
            const position = interaction.options.getString('position') ?? 'top';

            try {
                await interaction.deferReply();
                const response = await ctx.webserver.request(
                    'POST',
                    '/fun/caption',
                    {
                        fontSize,
                        img: image.url,
                        position,
                        text,
                    },
                    true,
                );

                const buffer = await response.arrayBuffer();
                const imageBuffer = Buffer.from(buffer);

                const attachment = new AttachmentBuilder(imageBuffer, {
                    name: 'captioned.png',
                });

                return interaction.editReply({
                    files: [attachment],
                });
            } catch (error) {
                console.error('Caption command error:', error);
                return interaction.editReply({
                    content: 'There was an error generating the caption.',
                });
            }
        },
        restrictToConfigRoles: [
            ConfigurationRoles.AdminRoles,
            ConfigurationRoles.StaffRoles,
            ConfigurationRoles.FunCommandRoles,
        ],
    }),
};
