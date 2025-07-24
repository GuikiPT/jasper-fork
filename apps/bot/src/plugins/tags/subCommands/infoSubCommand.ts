import { ApplicationCommandOptionType } from '@antibot/interactions';
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';

import { Context } from '../../../classes/context';
import { ConfigurationChannels, ConfigurationRoles } from '../../../container';
import { defineSubCommand } from '../../../define';
import { Emojis } from '../../../enums';
import { Options, tagResponse } from '../../../services/tagService';

export const InfoSubCommand = defineSubCommand({
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
        const name = interaction.options.getString('tag-name');

        if (!interaction.deferred) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }

        ctx.services.tags.configure<Options>({ guildId, name });
        const tag = await ctx.services.tags.getValues<Options, tagResponse>();

        if (!tag) {
            await interaction.editReply('Tag not found.');
            return;
        }

        const exists = (value: string | undefined) =>
            value ? Emojis.CHECK_MARK : Emojis.CROSS_MARK;

        const embed = {
            color: global.embedColor,
            fields: [
                {
                    inline: true,
                    name: 'Author',
                    value: tag.tagAuthor ? `<@${tag.tagAuthor}>` : 'Unknown',
                },
                {
                    inline: true,
                    name: 'Edited by',
                    value: tag.tagEditedBy ? `<@${tag.tagEditedBy}>` : 'Orignal Author',
                },
                { inline: true, name: 'Title', value: tag.tagEmbedTitle || 'No title' },
                { inline: true, name: 'Has Description', value: exists(tag.tagEmbedDescription) },
                { inline: true, name: 'Has Image', value: exists(tag.tagEmbedImageURL) },
                { inline: true, name: 'Has Footer', value: exists(tag.tagEmbedFooter) },
            ],
            thumbnail: { url: ctx.user.displayAvatarURL() },
            title: `Tag Info: ${tag.tagName}`,
        };

        await interaction.editReply({ embeds: [embed] });
    },
    name: 'info',
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
    description: 'Show information about a tag',
    name: InfoSubCommand.name,
    options: [
        {
            autocomplete: true,
            description: 'The name of the tag to get info for',
            name: 'tag-name',
            required: true,
            type: ApplicationCommandOptionType.STRING,
        },
    ],
    type: ApplicationCommandOptionType.SUB_COMMAND,
};
