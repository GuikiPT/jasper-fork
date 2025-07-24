import { ApplicationCommandOptionType, Snowflake } from '@antibot/interactions';
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';

import { Context } from '../../../classes/context';
import { defineSubCommand } from '../../../define';
import { createConfigurationExistsEmbed, createConfigurationUpdateEmbed } from '../../../embeds';
import { validateEmoji } from '../../../regex';
import { GuildSnowflake } from '../../../services/settingsService';
import { Options } from '../../../services/tagService';

export const SetSkullboardEmojiSubCommand = defineSubCommand({
    handler: async (ctx: Context, interaction: ChatInputCommandInteraction) => {
        const guildId = interaction.guildId!;
        const emoji = interaction.options.getString('emoji')!;

        if (!validateEmoji(emoji)) {
            await interaction.reply({
                content: `The emoji **${emoji}** is not valid.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await ctx.services.settings.configure<Options>({ guildId });
        const skullboardSettings = await ctx.services.settings.getSkullboard<Snowflake>(guildId);

        if (skullboardSettings?.skullboardEmoji === emoji) {
            await interaction.reply({
                components: [
                    createConfigurationExistsEmbed({
                        configName: 'Skullboard',
                        description: `${skullboardSettings.skullboardEmoji}`,
                    }),
                ],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            });
            return;
        }

        await ctx.services.settings.setSkullboard<GuildSnowflake>({
            emoji: emoji,
            guildId,
        });

        await interaction.reply({
            components: [
                createConfigurationUpdateEmbed({
                    configName: 'Skullboard',
                    description: `${emoji}`,
                }),
            ],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
    },
    name: 'set_skullboard_emoji',
});

export const commandOptions = {
    description: 'Set the emoji for the skullboard',
    name: 'set_skullboard_emoji',
    options: [
        {
            description: 'The emoji to set for the skullboard',
            name: 'emoji',
            required: true,
            type: ApplicationCommandOptionType.STRING,
        },
    ],
    type: ApplicationCommandOptionType.SUB_COMMAND,
};
