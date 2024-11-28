import { GuildExists } from "../../../Common/GuildExists";
import TagSchema from "../../../Models/GuildSchema";
import { GuildSnowflake, TagResponse, TagCreateOptions } from "./Types";


export async function TagCreate(tagCreateOptions: TagCreateOptions): Promise<void> {
    const { guildId, options, ctx }: TagCreateOptions = tagCreateOptions;
    const key: GuildSnowflake = { guild: guildId };
    const exists: number = await ctx.store.guildExists(key);
    if (exists) {
        const cachedTags: TagResponse[] = await ctx.store.getGuild(key);
        cachedTags.push({
            TagName: options.name.trim(),
            TagAuthor: options.author,
            TagEmbedTitle: options.title,
            TagEmbedDescription: options.description,
            TagEmbedImageURL: options.image_url,
            TagEmbedFooter: options.footer,
        });
    } else {
        ctx.store.setKey(key);
        const cachedTags: TagResponse[] = await ctx.store.getGuild(key);
        cachedTags.push({
            TagName: options.name.trim(),
            TagAuthor: options.author,
            TagEmbedTitle: options.title,
            TagEmbedDescription: options.description,
            TagEmbedImageURL: options.image_url,
            TagEmbedFooter: options.footer,
        });
    }
    if (await GuildExists(guildId)) {
        await TagSchema.updateOne(
            {
                _id: guildId,
            },
            {
                $push: {
                    Tags: {
                        TagName: options.name.trim(),
                        TagAuthor: options.author,
                        TagResponse: {
                            TagEmbedTitle: options.title,
                            TagEmbedDescription: options.description
                                ? options.description
                                : null,
                            TagEmbedImageURL: options.image_url ? options.image_url : null,
                            TagEmbedFooter: options.footer ? options.footer : null,
                        },
                    },
                },
            }
        );
    } else {
        await new TagSchema({ _id: guildId }).save();
        await TagSchema.updateOne(
            {
                _id: guildId,
            },
            {
                $push: {
                    Tags: {
                        TagName: options.name.trim(),
                        TagAuthor: options.author,
                        TagResponse: {
                            TagEmbedTitle: options.title,
                            TagEmbedDescription: options.description
                                ? options.description
                                : null,
                            TagEmbedImageURL: options.image_url ? options.image_url : null,
                            TagEmbedFooter: options.footer ? options.footer : null,
                        },
                    },
                },
            }
        );
    }
}