import { ApplicationCommandOptionType } from '@antibot/interactions';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    ContainerBuilder,
    MessageActionRowComponentBuilder,
    MessageFlags,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    ThumbnailBuilder,
} from 'discord.js';

import { chunk } from '../../../array';
import { Context } from '../../../classes/context';
import { defineSubCommand } from '../../../define';
import { Options, SetTopicOptions } from '../../../services/settingsService';

export const AddTopicSubCommand = defineSubCommand({
    handler: async (ctx: Context, interaction: ChatInputCommandInteraction) => {
        const guildId = interaction.guildId!;
        const topic = interaction.options.getString('topic')!;

        await ctx.services.settings.configure<Options>({ guildId });
        const topicsExistInDB = await ctx.services.settings.getTopics<string>(guildId, 'Topics');

        const pages = chunk(topicsExistInDB, 10);
        const initialState = { addTopicPages: { page: 0, pages } };

        ctx.pagination.set(interaction.user.id, initialState);
        const state = ctx.pagination.get(interaction.user.id);

        if (!state || !state.addTopicPages) {
            await interaction.reply({
                content: 'Failed to initialize pagination state',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (topicsExistInDB.includes(topic)) {
            const addTopicComponents = [
                new ContainerBuilder()
                    .setAccentColor(global.embedColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(interaction.guild?.iconURL()),
                            )
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    '## Current Topics in Configuration',
                                ),
                            ),
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                            .setDivider(true),
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `For the record, **${topic}** is already in the topics list.`,
                        ),
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                            .setDivider(true),
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            (state.addTopicPages.pages[state.addTopicPages.page] || [])
                                .map(
                                    (string, i) =>
                                        `**${state.addTopicPages.page * 10 + i + 1}.** *${string}*`,
                                )
                                .join('\n') || 'There are no topics configured.',
                        ),
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                            .setDivider(true),
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `-# Page: ${state.addTopicPages.page + 1}/${state.addTopicPages.pages.length} • Total Topics: ${topicsExistInDB.length}`,
                        ),
                    )
                    .addActionRowComponents(
                        ...(topicsExistInDB.length > 10
                            ? [
                                  new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                                      new ButtonBuilder()
                                          .setStyle(ButtonStyle.Primary)
                                          .setLabel('Previous')
                                          .setCustomId(
                                              `add_topic_subcommand_button_previous_${interaction.user.id}`,
                                          )
                                          .setDisabled(state.addTopicPages.page === 0),
                                      new ButtonBuilder()
                                          .setStyle(ButtonStyle.Secondary)
                                          .setLabel('Home')
                                          .setCustomId(
                                              `add_topic_subcommand_button_home_${interaction.user.id}`,
                                          ),
                                      new ButtonBuilder()
                                          .setStyle(ButtonStyle.Primary)
                                          .setLabel('Next')
                                          .setCustomId(
                                              `add_topic_subcommand_button_next_${interaction.user.id}`,
                                          )
                                          .setDisabled(
                                              state.addTopicPages.page ===
                                                  state.addTopicPages.pages.length - 1,
                                          ),
                                  ),
                              ]
                            : []),
                    ),
            ];

            await interaction.reply({
                components: addTopicComponents,
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
            });
            return;
        }

        await ctx.services.settings.setTopics<SetTopicOptions>({
            guildId,
            ...{ key: 'Topics', topics: topic },
        });

        const updatedTopics = await ctx.services.settings.getTopics<string>(guildId, 'Topics');
        const updatedPages = chunk(updatedTopics, 10);
        state.addTopicPages.pages = updatedPages;

        const addTopicComponents = [
            new ContainerBuilder()
                .setAccentColor(global.embedColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(interaction.guild?.iconURL()),
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                '## Current Topics in Configuration',
                            ),
                        ),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `I've added **${topic}** to the topics list.`,
                    ),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        (state.addTopicPages.pages[state.addTopicPages.page] || [])
                            .map(
                                (string, i) =>
                                    `**${state.addTopicPages.page * 10 + i + 1}.** *${string}*`,
                            )
                            .join('\n') || 'There are no topics configured.',
                    ),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# Page: ${state.addTopicPages.page + 1}/${state.addTopicPages.pages.length} • Total Topics: ${updatedTopics.length}`,
                    ),
                )
                .addActionRowComponents(
                    ...(updatedTopics.length > 10
                        ? [
                              new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                                  new ButtonBuilder()
                                      .setStyle(ButtonStyle.Primary)
                                      .setLabel('Previous')
                                      .setCustomId(
                                          `add_topic_subcommand_button_previous_${interaction.user.id}`,
                                      )
                                      .setDisabled(state.addTopicPages.page === 0),
                                  new ButtonBuilder()
                                      .setStyle(ButtonStyle.Secondary)
                                      .setLabel('Home')
                                      .setCustomId(
                                          `add_topic_subcommand_button_home_${interaction.user.id}`,
                                      ),
                                  new ButtonBuilder()
                                      .setStyle(ButtonStyle.Primary)
                                      .setLabel('Next')
                                      .setCustomId(
                                          `add_topic_subcommand_button_next_${interaction.user.id}`,
                                      )
                                      .setDisabled(
                                          state.addTopicPages.page ===
                                              state.addTopicPages.pages.length - 1,
                                      ),
                              ),
                          ]
                        : []),
                ),
        ];

        await interaction.reply({
            components: addTopicComponents,
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        });
    },
    name: 'add_topic',
});

export const commandOptions = {
    description: 'Add a new topic to the list of topics.',
    name: 'add_topic',
    options: [
        {
            description: 'The topic you want to add to the list.',
            name: 'topic',
            required: true,
            type: ApplicationCommandOptionType.STRING,
        },
    ],
    type: ApplicationCommandOptionType.SUB_COMMAND,
};
