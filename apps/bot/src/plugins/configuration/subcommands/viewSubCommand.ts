import { ApplicationCommandOptionType, Snowflake } from '@antibot/interactions';
import {
    ChatInputCommandInteraction,
    ContainerBuilder,
    MessageFlags,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    ThumbnailBuilder,
} from 'discord.js';

import { Context } from '../../../classes/context';
import { defineSubCommand } from '../../../define';
import { Emojis } from '../../../enums';
import { Options } from '../../../services/settingsService';

const createTable = (table: string, fields: string[], locked: boolean) => {
    if (fields.length === 0) return '';
    return `### ${table} ${locked ? Emojis.LOCK : Emojis.UNLOCKED}\n${fields.join('')}\n`;
};

const createField = (
    field: string,
    data: Snowflake[],
    options: { isChannel: boolean; isRole: boolean; isUser: boolean },
) => {
    if (!data || data.length === 0) {
        return `- **${field}:** None\n`;
    }

    const formattedData = data
        .slice(0, 8)
        .map((id) =>
            options.isChannel
                ? `<#${id}>`
                : options.isUser
                  ? `<@${id}>`
                  : options.isRole
                    ? `<@&${id}>`
                    : id,
        );
    const suffix = data.length > 8 ? ` *(+${data.length - 8} more)*` : '';
    return `- **${field}:** ${formattedData.join(', ')}${suffix}\n`;
};

const bool = (bool: boolean) => {
    return `${bool ? Emojis.CHECK_MARK : Emojis.CROSS_MARK}`;
};

export const ViewChannelSubCommand = defineSubCommand({
    handler: async (ctx: Context, interaction: ChatInputCommandInteraction) => {
        await ctx.services.settings.configure<Options>({ guildId: interaction.guildId! });
        const { Channels, InactiveThreads, Roles, Skullboard, Users } =
            ctx.services.settings.getSettings();

        const viewComponents = [
            new ContainerBuilder()
                .setAccentColor(global.embedColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(interaction.guild?.iconURL()),
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${interaction.guild?.name} Configuration`,
                            ),
                        ),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        createTable(
                            'Channels',
                            [
                                createField('Allowed Tag Channels', Channels.allowedTagChannels, {
                                    isChannel: true,
                                    isRole: false,
                                    isUser: false,
                                }),
                                createField(
                                    'Allowed Snipe Channels',
                                    Channels.allowedSnipeChannels,
                                    {
                                        isChannel: true,
                                        isRole: false,
                                        isUser: false,
                                    },
                                ),
                            ],
                            false,
                        ),
                    ),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        createTable(
                            'Roles',
                            [
                                createField('Support Roles', Roles.supportRoles, {
                                    isChannel: false,
                                    isRole: true,
                                    isUser: false,
                                }),
                                createField('Allowed Tag Roles', Roles.allowedTagRoles, {
                                    isChannel: false,
                                    isRole: true,
                                    isUser: false,
                                }),
                                createField('Allowed Tag Admin Roles', Roles.allowedTagAdminRoles, {
                                    isChannel: false,
                                    isRole: true,
                                    isUser: false,
                                }),
                                createField('Allowed Admin Roles', Roles.allowedAdminRoles, {
                                    isChannel: false,
                                    isRole: true,
                                    isUser: false,
                                }),
                                createField('Allowed Staff Roles', Roles.allowedStaffRoles, {
                                    isChannel: false,
                                    isRole: true,
                                    isUser: false,
                                }),
                                createField('Ignored Sniped Roles', Roles.ignoredSnipedRoles, {
                                    isChannel: false,
                                    isRole: true,
                                    isUser: false,
                                }),
                            ],
                            false,
                        ),
                    ),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        createTable(
                            'Users',
                            [
                                createField('Ignored Sniped Users', Users.ignoreSnipedUsers, {
                                    isChannel: false,
                                    isRole: false,
                                    isUser: true,
                                }),
                            ],
                            false,
                        ),
                    ),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        createTable(
                            'Skullboard',
                            [
                                `- **Skullboard Channel:** ${Skullboard.skullboardChannel ? `<#${Skullboard.skullboardChannel}>` : 'None'}\n`,
                                `- **Emoji:** ${Skullboard.skullboardEmoji ?? '💀'}\n`,
                                `- **Reaction Threshold:** ${Skullboard.skullboardReactionThreshold}\n`,
                            ],
                            false,
                        ),
                    ),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        createTable(
                            'Inactive Threads (support thread)',
                            [
                                `- **Inactive Check**: ${bool(InactiveThreads.warningCheck)}\n`,
                                `- **Warning Time**: ${InactiveThreads.warningTime} (in mins)\n`,
                                `- **Grace Time**: ${InactiveThreads.graceTime} (in mins)\n`,
                            ],
                            false,
                        ),
                    ),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        createTable(
                            'Slowmode',
                            [
                                createField(
                                    'Automatic Slowmode Channels',
                                    Channels.automaticSlowmodeChannels,
                                    {
                                        isChannel: true,
                                        isRole: false,
                                        isUser: false,
                                    },
                                ),
                                `- **Cooldown:** ${global.slowmodeCooldown}s\n`,
                                `- **Message Time Window:** ${global.messageTimeWindow}s\n`,
                                `- **Message Threshold:** ${global.messageThreshold}\n`,
                            ],
                            true,
                        ),
                    ),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# ${Emojis.LOCK} = Locked Configuration | ${Emojis.UNLOCKED} = Configurable Configuration`,
                    ),
                ),
        ];

        await interaction.reply({
            components: viewComponents,
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        });
    },
    name: 'view',
});

export const commandOptions = {
    description: 'View the current configuration of the guild',
    name: 'view',
    options: [],
    type: ApplicationCommandOptionType.SUB_COMMAND,
};
