import { ApplicationCommandOptionType } from '@antibot/interactions';
import {
    ChatInputCommandInteraction,
    ContainerBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
} from 'discord.js';

import { Context } from '../../../classes/context';
import { ConfigurationChannels, ConfigurationRoles } from '../../../container';
import { defineSubCommand } from '../../../define';
import { Options, tagResponse } from '../../../services/tagService';

export const ShowSubCommand = defineSubCommand({
    autocomplete: async (ctx: Context, interaction) => {
        const guildId = interaction.guildId!;
        const name = interaction.options.getString('tag-name') || '';

        const tags = await ctx.services.tags.getMultiValues<string, tagResponse[]>(guildId);
        const filtered = tags
            .filter((tag) => tag.tagName.toLowerCase().includes(name.toLowerCase()))
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

        const container = new ContainerBuilder()
            .setAccentColor(global.embedColor)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ${tag.tagEmbedTitle}`),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${tag.tagEmbedDescription}`),
            );

        if (tag.tagEmbedImageURL) {
            container.addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL(`${tag.tagEmbedImageURL}`),
                ),
            );
        }
        if (tag.tagEmbedFooter) {
            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            ),
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# ${tag.tagEmbedFooter}`),
                );
        }

        await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
    name: 'show',
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
    description: "Show a tag's content to yourself",
    name: ShowSubCommand.name,
    options: [
        {
            autocomplete: true,
            description: 'The name of the tag to show',
            name: 'tag-name',
            required: true,
            type: ApplicationCommandOptionType.STRING,
        },
    ],
    type: ApplicationCommandOptionType.SUB_COMMAND,
};
