import { ApplicationCommandOptionType } from '@antibot/interactions';
import { ChatInputCommandInteraction, codeBlock, MessageFlags } from 'discord.js';

import { Context } from '../../../classes/context';
import { ConfigurationChannels, ConfigurationRoles } from '../../../container';
import { defineSubCommand } from '../../../define';
import { Options, tagResponse } from '../../../services/tagService';

export const RawSubCommand = defineSubCommand({
    autocomplete: async (ctx: Context, interaction) => {
        const guildId = interaction.guildId!;
        const query = interaction.options.getString('tag-name') || '';

        const tags = await ctx.services.tags.getMultiValues<string, tagResponse[]>(guildId);
        const filtered = tags
            .filter((tag) => tag.tagName.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 25)
            .map((tag) => ({ name: tag.tagName, value: tag.tagName }));

        await interaction.respond(filtered);
    },
    handler: async (ctx: Context, interaction: ChatInputCommandInteraction) => {
        const guildId = interaction.guildId!;
        const name = interaction.options.getString('tag-name', true);

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        ctx.services.tags.configure<Options>({ guildId, name });
        const tag = await ctx.services.tags.getValues<Options, tagResponse>();

        if (!tag) {
            await interaction.editReply('Tag not found.');
            return;
        }

        const rawContent = {
            description: tag.tagEmbedDescription,
            footer: tag.tagEmbedFooter,
            imageUrl: tag.tagEmbedImageURL,
            name: tag.tagName,
            title: tag.tagEmbedTitle,
        };

        await interaction.editReply({
            content: codeBlock('json', JSON.stringify(rawContent, null, 2)),
        });
    },
    name: 'raw',
    restrictToConfigChannels: [ConfigurationChannels.allowedTagChannels],
    restrictToConfigRoles: [
        ConfigurationRoles.supportRoles,
        ConfigurationRoles.StaffRoles,
        ConfigurationRoles.AdminRoles,
        ConfigurationRoles.TagAdminRoles,
        ConfigurationRoles.TagRoles,
    ],
});

export const commandOptions = {
    description: 'Show the raw content of a tag',
    name: RawSubCommand.name,
    options: [
        {
            autocomplete: true,
            description: 'The name of the tag to show raw content for',
            name: 'tag-name',
            required: true,
            type: ApplicationCommandOptionType.STRING,
        },
    ],
    type: ApplicationCommandOptionType.SUB_COMMAND,
};
