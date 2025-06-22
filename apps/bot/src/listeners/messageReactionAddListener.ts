import {
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageFlags,
    MessageReaction,
    PartialMessageReaction,
    SeparatorSpacingSize,
    TextChannel,
} from 'discord.js';

import { Context } from '../classes/context';
import { defineEvent } from '../define';
import { Options } from '../services/settingsService';

import { Listener } from './listener';

export default class MessageReactionAddListener extends Listener<'messageReactionAdd'> {
    constructor(ctx: Context) {
        super(ctx, 'messageReactionAdd');
    }

    public async execute(reaction: MessageReaction | PartialMessageReaction): Promise<void> {
        try {
            if (reaction.partial) {
                try {
                    await reaction.fetch();
                } catch (error) {
                    console.error('Failed to fetch the reaction:', error);
                    return;
                }
            }

            const guildId = await reaction.message.guildId;
            await this.ctx.services.settings.configure<Options>({ guildId });

            const { Skullboard } = this.ctx.services.settings.getSettings();
            const isSkullboardEmoji = reaction.emoji.name === Skullboard.SkullboardEmoji;
            const meetsReactionThreshold = reaction.count >= Skullboard.SkullboardReactionThreshold;

            if (isSkullboardEmoji && meetsReactionThreshold) {
                const skullboardChannel = (await this.ctx.channels.resolve(
                    Skullboard.SkullboardChannel,
                )) as TextChannel;

                const fetchedChannel = await this.ctx.channels.fetch(reaction.message.channel.id);

                if (fetchedChannel?.isTextBased()) {
                    const message = await fetchedChannel.messages.fetch(reaction.message.id);

                    const member = message.guild.members.resolve(message.author.id);
                    if (!member) {
                        throw new Error('Could not resolve message author as guild member');
                    }

                    try {
                        const { chromium } = require('playwright');
                        const messageUrl = `http://localhost:3000/${message.guildId}/${message.channel.id}/${message.id}`;

                        const browser = await chromium.launch({ headless: true });
                        const page = await browser.newPage();

                        await page.evaluate(() => {
                            document.body.style.zoom = '2';
                        });

                        await page.goto(messageUrl, { waitUntil: 'networkidle' });

                        const element = await page.locator('div#discord-message-container');
                        if ((await element.count()) === 0) {
                            throw new Error('Could not find discord-message-container element');
                        }

                        const imageBuffer = await element.screenshot({
                            // fullPage: true,
                            type: 'png',
                        });
                        await browser.close();

                        const attachment = new AttachmentBuilder(imageBuffer, {
                            name: 'screenshot.png',
                        });

                        await skullboardChannel.send({
                            components: [
                                new ContainerBuilder()
                                    .addTextDisplayComponents((textDisplay) =>
                                        textDisplay.setContent(
                                            `## ${member.displayName || member.user.username} get 💀!`,
                                        ),
                                    )
                                    .addSeparatorComponents((separator) =>
                                        separator.setSpacing(SeparatorSpacingSize.Large),
                                    )
                                    .addMediaGalleryComponents((mediaGalleryItem) =>
                                        mediaGalleryItem.addItems((item) =>
                                            item.setURL('attachment://screenshot.png'),
                                        ),
                                    )
                                    .addSeparatorComponents((separator) =>
                                        separator.setSpacing(SeparatorSpacingSize.Large),
                                    )
                                    .addActionRowComponents((actionRow) =>
                                        actionRow.addComponents(
                                            new ButtonBuilder()
                                                .setLabel('Jump to Message')
                                                .setStyle(ButtonStyle.Link)
                                                .setURL(
                                                    `https://discord.com/channels/${message.guildId}/${message.channel.id}/${message.id}`,
                                                ),
                                            new ButtonBuilder()
                                                .setLabel('View Profile')
                                                .setStyle(ButtonStyle.Link)
                                                .setURL(
                                                    `https://discord.com/users/${message.author?.id}`,
                                                ),
                                        ),
                                    ),
                            ],
                            files: [attachment],
                            flags: MessageFlags.IsComponentsV2,
                        });
                    } catch (error) {
                        console.error('Error generating message screenshot:', error);
                        // Fallback to text-based embed
                        await skullboardChannel.send({
                            embeds: [
                                {
                                    color: global.embedColor,
                                    description: `${message.content}`,
                                    fields: [
                                        {
                                            inline: true,
                                            name: 'Author',
                                            value: `<@${message.author?.id}>`,
                                        },
                                        {
                                            inline: true,
                                            name: 'Channel',
                                            value: `<#${message.channel.id}>`,
                                        },
                                        {
                                            inline: true,
                                            name: 'Message Link',
                                            value: `[Jump to message](https://discord.com/channels/${message.guildId}/${message.channel.id}/${message.id})`,
                                        },
                                    ],
                                    timestamp: new Date().toISOString(),
                                    title: `${message.author?.username} (${message.author?.id})`,
                                },
                            ],
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error in execute:', error);
        }
    }

    public toEvent() {
        return defineEvent({
            event: {
                name: this.name,
                once: this.once,
            },
            on: (reaction: MessageReaction | PartialMessageReaction) => {
                const user = reaction.message.author;
                if (!user) return;
                return this.execute(reaction);
            },
        });
    }
}
