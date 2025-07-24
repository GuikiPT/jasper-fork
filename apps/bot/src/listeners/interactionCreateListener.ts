import { PermissionsToHuman, PlantPermission } from '@antibot/interactions';
/* eslint @typescript-eslint/no-explicit-any: "off" */
import {
    ActionRowBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    ContainerBuilder,
    ContextMenuCommandInteraction,
    Interaction as InteractionEvent,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    ModalBuilder,
    ModalSubmitInteraction,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    TextInputBuilder,
    TextInputStyle,
    ThumbnailBuilder,
} from 'discord.js';

import { Context } from '../classes/context';
import { withConfiguration } from '../db';
import { Command, defineEvent, message } from '../define';
import { Emojis } from '../enums';
import { handlePagination } from '../pagination';
import {
    InactiveThread,
    Options as InactiveThreadOptions,
} from '../services/inactiveThreadsService';
import { Options, Tag, tagResponse } from '../services/tagService';

import { Listener } from './listener';

export default class InteractionCreateListener extends Listener<'interactionCreate'> {
    constructor(ctx: Context) {
        super(ctx, 'interactionCreate');
    }

    public async execute<
        Interaction extends
            | ButtonInteraction
            | ChatInputCommandInteraction
            | ContextMenuCommandInteraction
            | InteractionEvent
            | ModalSubmitInteraction,
    >(interaction: Interaction): Promise<void> {
        await this.handleCommands(interaction);
        if (interaction.isButton()) {
            this.handlePagination(interaction);
            if (interaction.customId.startsWith('list_subcommand_button_')) {
                await this.onListSubCommandButtons(interaction);
            } else if (interaction.customId.startsWith('keep_thread_')) {
                await this.onKeepThreadButton(interaction);
            } else if (interaction.customId.startsWith('close_thread_')) {
                await this.onCloseThreadButton(interaction);
            }
        }
        if (interaction.isModalSubmit()) {
            await this.handleModalSubmit(interaction);
        }
    }

    public toEvent() {
        return defineEvent({
            event: {
                name: this.name,
                once: this.once,
            },
            on: (interaction: InteractionEvent) => this.execute(interaction),
        });
    }

    private async handleCommands(
        interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction | InteractionEvent,
    ): Promise<void> {
        switch (true) {
            case interaction.isChatInputCommand() || interaction.isContextMenuCommand(): {
                const command: Command<
                    ChatInputCommandInteraction | ContextMenuCommandInteraction
                > = this.ctx.interactions.get(interaction.commandName);
                if (command) {
                    if (command.restrictToConfigRoles?.length) {
                        const { noRolesNoConfig, noRolesWithConfig } = await withConfiguration(
                            this.ctx,
                            interaction,
                            'roles',
                            ...command.restrictToConfigRoles,
                        );

                        let configError = false;
                        noRolesWithConfig(interaction, () => {
                            configError = true;
                        });

                        noRolesNoConfig(interaction, () => {
                            message.content +=
                                ' Configuration of roles required. Please check with the server administrator.';
                            configError = true;
                        });

                        if (configError) {
                            await interaction.reply(message);
                            message.content = "Sorry but you can't use this command.";
                            return;
                        }
                    }

                    if (command.restrictToConfigChannels?.length) {
                        const { noChannelsNoConfig, noChannelsWithConfig } =
                            await withConfiguration(
                                this.ctx,
                                interaction,
                                'channels',
                                ...command.restrictToConfigChannels,
                            );

                        let configError = false;
                        noChannelsWithConfig(interaction, () => {
                            configError = true;
                        });

                        noChannelsNoConfig(interaction, () => {
                            message.content +=
                                ' Configuration of channels required. Please check with the server administrator.';
                            configError = true;
                        });

                        if (configError) {
                            await interaction.reply(message);
                            message.content = "Sorry but you can't use this command.";
                            return;
                        }
                    }

                    if (command.permissions) {
                        const perms: any[] = [];
                        if (!interaction.appPermissions.has(command.permissions)) {
                            for (const permission of command.permissions) {
                                perms.push(
                                    PermissionsToHuman(PlantPermission(permission.toString())),
                                );
                            }
                            await interaction.reply({
                                content: `I'm missing permissions! (${
                                    perms.length <= 2 ? perms.join(' & ') : perms.join(', ')
                                })`,
                                flags: MessageFlags.Ephemeral,
                            });
                            return;
                        }
                    }

                    command.on(this.ctx, interaction);
                }
                break;
            }
            case interaction.isAutocomplete(): {
                const command: Command<
                    ChatInputCommandInteraction | ContextMenuCommandInteraction
                > = this.ctx.interactions.get(interaction.commandName);
                if (command && command.autocomplete) {
                    if (command.permissions) {
                        if (!interaction.appPermissions.has(command.permissions)) {
                            return interaction.respond([]);
                        }
                    }
                    command.autocomplete(this.ctx, interaction);
                }
                break;
            }
        }
    }

    private async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
        if (!interaction.isModalSubmit()) return;

        if (interaction.customId.startsWith('close_thread_modal_')) {
            const threadId = interaction.customId.replace('close_thread_modal_', '');
            const reason =
                interaction.fields.getTextInputValue('close_reason')?.trim() ||
                'No reason provided';

            try {
                if (!interaction.guild) {
                    await interaction.reply({
                        content: 'This action can only be performed in a server.',
                        flags: [MessageFlags.Ephemeral],
                    });
                    return;
                }

                if (!interaction.channel || !interaction.channel.isThread()) {
                    await interaction.reply({
                        content: 'This action can only be performed in a thread.',
                        flags: [MessageFlags.Ephemeral],
                    });
                    return;
                }

                await this.ctx.services.settings.configure<InactiveThreadOptions>({
                    guildId: interaction.guild.id,
                });
                const { Channels } = this.ctx.services.settings.getSettings();
                const allowedTagChannels = Channels.allowedTagChannels;

                if (!allowedTagChannels.includes(interaction.channel.parentId)) {
                    await interaction.reply({
                        content: 'This action can only be performed in allowed tag channels.',
                        flags: [MessageFlags.Ephemeral],
                    });
                    return;
                }

                if (interaction.channel.ownerId !== interaction.user.id) {
                    await interaction.reply({
                        content: 'You can only close threads that you own.',
                        flags: [MessageFlags.Ephemeral],
                    });
                    return;
                }

                const threadInfo = await this.ctx.services.inactiveThreads.getValues<
                    InactiveThreadOptions,
                    InactiveThread
                >({
                    guildId: interaction.guild.id,
                    threadId: threadId,
                });
                await this.ctx.services.inactiveThreads.deleteValue<InactiveThreadOptions, boolean>(
                    {
                        guildId: interaction.guild.id,
                        threadId: threadId,
                    },
                );

                if (threadInfo && threadInfo.warnMessageId) {
                    try {
                        const warningMessage = await interaction.channel.messages.fetch(
                            threadInfo.warnMessageId,
                        );
                        if (warningMessage) {
                            await warningMessage.delete();
                        }
                    } catch (error) {
                        console.error(
                            `[Error deleting warning message ${threadInfo.warnMessageId}]:`,
                            error,
                        );
                    }
                }

                const cv2ClosingMessage = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## The OP <@${interaction.user.id}> decided to closed this thread.`,
                        ),
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                            .setDivider(true),
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `### **Reason:** ${reason || 'No reason provided'}`,
                        ),
                    );

                await interaction.channel.send({
                    components: [cv2ClosingMessage],
                    flags: MessageFlags.IsComponentsV2,
                });

                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                await interaction.deleteReply();

                await interaction.channel.setLocked(true);
                await interaction.channel.setArchived(true);
            } catch (error) {
                console.error(`[Error closing thread ${threadId}]:`, error);
                await interaction.reply({
                    content: 'An error occurred while processing your request.',
                    flags: [MessageFlags.Ephemeral],
                });
            }
            return;
        }

        if (interaction.customId === `tag_create_${interaction.user.id}`) {
            const name = interaction.fields.getTextInputValue('tag_create_embed_name');
            const title = interaction.fields.getTextInputValue('tag_create_embed_title');
            const author = interaction.user.id;
            const description =
                interaction.fields.getTextInputValue('tag_create_embed_description') ?? null;
            const image_url =
                interaction.fields.getTextInputValue('tag_create_embed_image_url') ?? null;
            const footer = interaction.fields.getTextInputValue('tag_create_embed_footer') ?? null;

            if (!interaction.guild) return;

            this.ctx.services.tags.configure<Options>({
                guildId: interaction.guild.id,
                name,
                tag: { author, description, footer, image_url, name, title },
            });

            if (await this.ctx.services.tags.itemExists<Options>()) {
                await interaction.reply({
                    content: `> The support tag \`${name}\` already exists!`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (image_url && !/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)$/i.test(image_url)) {
                await interaction.reply({
                    content: `> The provided image link is not a valid image URL!`,
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await this.ctx.services.tags.create<Options & { tag: Tag }, void>();

                const confirmContent = new TextDisplayBuilder().setContent(
                    `${Emojis.CHECK_MARK} Successfully created \`${name}\`!`,
                );

                const container = new ContainerBuilder()
                    .setAccentColor(global.embedColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${title}`))
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Large)
                            .setDivider(true),
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${description}`),
                    );

                if (image_url) {
                    container.addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(
                            new MediaGalleryItemBuilder().setURL(`${image_url}`),
                        ),
                    );
                }
                if (footer) {
                    container.addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                            .setDivider(true),
                    ),
                        container.addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`-# ${footer}`),
                        );
                }
                await interaction.reply({
                    components: [confirmContent, container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }
        }

        if (interaction.customId === `tag_edit_${interaction.user.id}`) {
            try {
                const name = interaction.fields.getTextInputValue('tag_edit_embed_name');
                const title =
                    interaction.fields.getTextInputValue('tag_edit_embed_title').trim() ||
                    undefined;
                const editedBy = interaction.user.id;
                const description =
                    interaction.fields.getTextInputValue('tag_edit_embed_description').trim() ||
                    null;
                const image_url =
                    interaction.fields.getTextInputValue('tag_edit_embed_image_url').trim() || null;
                const footer =
                    interaction.fields.getTextInputValue('tag_edit_embed_footer').trim() || null;

                if (!interaction.guild) return;
                const guildId = interaction.guild.id;

                if (!(await this.ctx.services.tags.itemExists<Options>({ guildId, name }))) {
                    await interaction.reply({
                        content: `> The support tag \`${name}\` doesn't exist!`,
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }

                if (image_url && !/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)$/i.test(image_url)) {
                    await interaction.reply({
                        content: `> The provided image link is not a valid image URL!`,
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }

                this.ctx.services.tags.configure<Options>({
                    guildId,
                    name,
                    tag: { description, editedBy, footer, image_url, name, title },
                });

                await this.ctx.services.tags.modify<Options & { tag: Tag }, void>();

                const { tagEmbedDescription, tagEmbedFooter, tagEmbedImageURL, tagEmbedTitle } =
                    await this.ctx.services.tags.getValues<Options, tagResponse>({
                        guildId,
                        name,
                    });

                const confirmContent = new TextDisplayBuilder().setContent(
                    `${Emojis.CHECK_MARK} Successfully edited \`${name}\`!`,
                );

                const container = new ContainerBuilder()
                    .setAccentColor(global.embedColor)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### ${tagEmbedTitle}`),
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Large)
                            .setDivider(true),
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${tagEmbedDescription}`),
                    );

                if (image_url) {
                    container.addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(
                            new MediaGalleryItemBuilder().setURL(`${tagEmbedImageURL}`),
                        ),
                    );
                }
                if (footer) {
                    container.addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                            .setDivider(true),
                    ),
                        container.addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`-# ${tagEmbedFooter}`),
                        );
                }

                await interaction.reply({
                    components: [confirmContent, container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            } catch (error) {
                throw 'Error on TagEditModal ' + error.stack || error;
            }
        }
    }

    private async handlePagination(interaction: ButtonInteraction): Promise<void> {
        if (!interaction.isButton()) return;
        if (!interaction.guild) return;

        const author = interaction.user.id;
        const currentUserState = this.ctx.pagination.get(author);
        if (!currentUserState) return;

        if (interaction.customId.startsWith('add_topics_subcommand_button')) {
            const newTopicPage = await handlePagination({
                buildContainer: (pageContent, footerText) => [
                    new ContainerBuilder()
                        .setAccentColor(global.embedColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(interaction.guild.iconURL()),
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
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(pageContent))
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Small)
                                .setDivider(true),
                        )
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerText)),
                ],
                buttonIdPrefix: 'add_topic_subcommand_button',
                currentPage: currentUserState.addTopicPages.page,
                fetchTotalItemCount: async () =>
                    (
                        await this.ctx.services.settings.getText<string>(
                            interaction.guild!.id,
                            'Topics',
                        )
                    ).length,
                interaction,
                items: currentUserState.addTopicPages.pages.flat(),
                totalPages: currentUserState.addTopicPages.pages.length,
                userId: author,
            });
            currentUserState.addTopicPages.page = newTopicPage as unknown as number;
        } else if (interaction.customId.startsWith('add_action_subcommand_button')) {
            const newActionsPage = await handlePagination({
                buildContainer: (pageContent, footerText) => [
                    new ContainerBuilder()
                        .setAccentColor(global.embedColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(interaction.guild.iconURL()),
                                )
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        '## Current Actions in Configuration',
                                    ),
                                ),
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Small)
                                .setDivider(true),
                        )
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(pageContent))
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Small)
                                .setDivider(true),
                        )
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerText)),
                ],
                buttonIdPrefix: 'add_action_subcommand_button',
                currentPage: currentUserState.addActionPages.page,
                fetchTotalItemCount: async () =>
                    (
                        await this.ctx.services.settings.getText<string>(
                            interaction.guild!.id,
                            'Actions',
                        )
                    ).length,
                interaction,
                items: currentUserState.addActionPages.pages.flat(),
                totalPages: currentUserState.addActionPages.pages.length,
                userId: author,
            });
            currentUserState.addActionPages.page = newActionsPage as unknown as number;
        }

        this.ctx.pagination.set(author, currentUserState);
    }

    private async onCloseThreadButton(interaction: ButtonInteraction): Promise<void> {
        const threadId = interaction.customId.replace('close_thread_', '');

        try {
            if (!interaction.guild) {
                await interaction.reply({
                    content: 'This action can only be performed in a server.',
                    flags: [MessageFlags.Ephemeral],
                });
                return;
            }

            if (!interaction.channel || !interaction.channel.isThread()) {
                await interaction.reply({
                    content: 'This action can only be performed in a thread.',
                    flags: [MessageFlags.Ephemeral],
                });
                return;
            }

            await this.ctx.services.settings.configure<InactiveThreadOptions>({
                guildId: interaction.guild.id,
            });
            const { Channels } = this.ctx.services.settings.getSettings();
            const allowedTagChannels = Channels.allowedTagChannels;

            if (!allowedTagChannels.includes(interaction.channel.parentId)) {
                await interaction.reply({
                    content: 'This action can only be performed in allowed tag channels.',
                    flags: [MessageFlags.Ephemeral],
                });
                return;
            }

            if (interaction.channel.ownerId !== interaction.user.id) {
                await interaction.reply({
                    content: 'You can only close threads that you own.',
                    flags: [MessageFlags.Ephemeral],
                });
                return;
            }

            const modal = new ModalBuilder()
                .setCustomId(`close_thread_modal_${threadId}`)
                .setTitle('Close Thread - Reason');

            const reasonInput = new TextInputBuilder()
                .setCustomId('close_reason')
                .setLabel('Why are you closing this thread?')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Please provide a reason for closing this thread...')
                .setRequired(true)
                .setMaxLength(1000);

            const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
                reasonInput,
            );
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);
        } catch (error) {
            console.error(`[Error showing close modal for thread ${threadId}]:`, error);
            await interaction.reply({
                content: 'An error occurred while processing your request.',
                flags: [MessageFlags.Ephemeral],
            });
        }
    }

    private async onKeepThreadButton(interaction: ButtonInteraction): Promise<void> {
        const threadId = interaction.customId.replace('keep_thread_', '');

        try {
            if (!interaction.guild) {
                await interaction.reply({
                    content: 'This action can only be performed in a server.',
                    flags: [MessageFlags.Ephemeral],
                });
                return;
            }

            if (!interaction.channel || !interaction.channel.isThread()) {
                await interaction.reply({
                    content: 'This action can only be performed in a thread.',
                    flags: [MessageFlags.Ephemeral],
                });
                return;
            }

            await this.ctx.services.settings.configure<InactiveThreadOptions>({
                guildId: interaction.guild.id,
            });
            const { Channels } = this.ctx.services.settings.getSettings();
            const allowedTagChannels = Channels.allowedTagChannels;

            if (!allowedTagChannels.includes(interaction.channel.parentId)) {
                await interaction.reply({
                    content: 'This action can only be performed in allowed tag channels.',
                    flags: [MessageFlags.Ephemeral],
                });
                return;
            }

            if (interaction.channel.ownerId !== interaction.user.id) {
                await interaction.reply({
                    content: 'You can only keep threads that you own.',
                    flags: [MessageFlags.Ephemeral],
                });
                return;
            }

            await this.ctx.services.inactiveThreads.removeWarning<InactiveThreadOptions>({
                guildId: interaction.guild.id,
                threadId: threadId,
            });

            const cv2NotInactive = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## The OP <@${interaction.user.id}> is active and chose to keep the thread open.`,
                ),
            );
            await interaction.update({
                components: [cv2NotInactive],
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {
            console.error(`[Error keeping thread ${threadId} open]:`, error);
            await interaction.reply({
                content: 'An error occurred while processing your request.',
                flags: [MessageFlags.Ephemeral],
            });
        }
    }

    private async onListSubCommandButtons(interaction: ButtonInteraction): Promise<void> {
        if (!interaction.isButton()) return;

        const author = interaction.user.id;
        const title = 'Server Tag List';
        if (!interaction.guild) return;
        const thumbnail = { url: interaction.guild.iconURL() ?? '' };
        const color = global.embedColor;
        const description = '';
        const footer = { text: '' };

        const currentUserState = this.ctx.pagination.get(author);
        if (!currentUserState) return;

        const embedBase = {
            color,
            description,
            footer,
            thumbnail,
            title,
        };

        const updateEmbed = async () => {
            embedBase.description = currentUserState.tagPages[currentUserState.page]
                .map(
                    (e, i) =>
                        `> **${currentUserState.page * 10 + i + 1}.** \`${e.tagName}\` **•** ${
                            e.tagAuthor ? `<@${e.tagAuthor}>` : 'None'
                        }`,
                )
                .join('\n');

            embedBase.footer.text = `Page: ${currentUserState.page + 1}/${
                currentUserState.tagPages.length
            } • emojis by AnThOnY & deussa`;

            const row = {
                components: [
                    {
                        customId: `list_subcommand_button_previous_${interaction.user.id}`,
                        disabled: currentUserState.page === 0,
                        label: 'Previous',
                        style: ButtonStyle.Primary,
                        type: ComponentType.Button,
                    } as const,
                    {
                        customId: `list_subcommand_button_home_${interaction.user.id}`,
                        label: 'Home',
                        style: ButtonStyle.Secondary,
                        type: ComponentType.Button,
                    } as const,
                    {
                        customId: `list_subcommand_button_next_${interaction.user.id}`,
                        disabled: currentUserState.page === currentUserState.tagPages.length - 1,
                        label: 'Next',
                        style: ButtonStyle.Primary,
                        type: ComponentType.Button,
                    } as const,
                ],
                type: ComponentType.ActionRow,
            } as const;

            await interaction.update({
                components: [row],
                embeds: [embedBase],
            });
        };

        switch (interaction.customId) {
            case `list_subcommand_button_home_${author}`:
                currentUserState.page = 0;
                break;

            case `list_subcommand_button_next_${author}`:
                currentUserState.page =
                    (currentUserState.page + 1) % currentUserState.tagPages.length;
                break;

            case `list_subcommand_button_previous_${author}`:
                currentUserState.page =
                    (currentUserState.page - 1 + currentUserState.tagPages.length) %
                    currentUserState.tagPages.length;
                break;

            default:
                break;
        }

        this.ctx.pagination.set(author, currentUserState);
        await updateEmbed();
    }
}
