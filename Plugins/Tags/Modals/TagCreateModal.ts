import { defineEvent } from '../../../Common/define';
import { MessageFlags, ModalSubmitInteraction } from 'discord.js';
import { Context } from '../../../Source/Context';
import { Emojis } from '../../../Common/enums';
import { Options, Tag } from '../../../Services/TagService';

export = {
    Event: defineEvent({
        event: {
            name: 'interactionCreate',
            once: false,
        },
        on: async (interaction: ModalSubmitInteraction, ctx: Context) => {
            if (interaction.customId === `tag_create_${interaction.user.id}`) {
                if (!interaction.isModalSubmit()) return;

                const name = interaction.fields.getTextInputValue('tag_create_embed_name');
                const title = interaction.fields.getTextInputValue('tag_create_embed_title');
                const author = interaction.user.id;
                const description =
                    interaction.fields.getTextInputValue('tag_create_embed_description') ?? null;
                const image_url =
                    interaction.fields.getTextInputValue('tag_create_embed_image_url') ?? null;
                const footer =
                    interaction.fields.getTextInputValue('tag_create_embed_footer') ?? null;

                ctx.services.tags.configure<Options>({
                    guildId: interaction.guild.id,
                    name,
                    tag: { name, title, author, description, image_url, footer },
                });

                if (await ctx.services.tags.itemExists<Options>()) {
                    return interaction.reply({
                        content: `> The support tag \`${name}\` already exists!`,
                        flags: MessageFlags.Ephemeral,
                    });
                }

                if (image_url && !/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)$/i.test(image_url)) {
                    return interaction.reply({
                        content: `> The provided image link is not a valid image URL!`,
                        flags: MessageFlags.Ephemeral,
                    });
                } else {
                    await ctx.services.tags.create<Options & { tag: Tag }, void>();

                    return interaction.reply({
                        content: `${Emojis.CHECK_MARK} Successfully created \`${name}\`!`,
                        embeds: [
                            {
                                title: title,
                                color: 0x323338,
                                description: description,
                                image: image_url ? { url: image_url } : undefined,
                                footer: { text: footer },
                            },
                        ],
                        flags: MessageFlags.Ephemeral,
                    });
                }
            }
        },
    }),
};
