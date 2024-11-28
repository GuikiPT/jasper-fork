import { GuildExists } from "../../../Common/GuildExists";
import { Wrap } from "../../../Common/Wrap";
import { Tag } from "../../../Models/GuildDocument";
import TagSchema from "../../../Models/GuildSchema";
import { commonOptions, GuildSnowflake, TagResponse } from "./Types";

export async function TagExists(options: commonOptions): Promise<boolean> {
    const { guildId, ctx, name }: commonOptions = options;
    const key: GuildSnowflake = { guild: guildId };
    const exists: number = await ctx.store.guildExists(key);
    if (!exists) {
        if (!(await GuildExists(guildId))) {
            return false;
        }
        ctx.store.setKey(key);
    }

    let tags: TagResponse[] = await ctx.store.getGuild(key);
    if (!Array.isArray(tags)) {
        tags = [];
        ctx.store.setKey(key, ...tags);
    }

    if (tags.find((tag) => tag.TagName === name)) {
        return true;
    }
    try {
        const wrappedGuild = await Wrap(TagSchema.findOne({ _id: guildId }));
        if (!wrappedGuild.data) {
            return false;
        }
        const findTag: Tag = wrappedGuild.data.Tags.find(
            (tag: Tag) => tag.TagName === name
        );
        if (findTag) {
            tags.push({
                TagAuthor: findTag.TagAuthor,
                TagName: findTag.TagName,
                TagEmbedTitle: findTag.TagResponse.TagEmbedTitle,
                TagEmbedDescription: findTag.TagResponse.TagEmbedDescription,
                TagEmbedImageURL: findTag.TagResponse.TagEmbedImageURL,
                TagEmbedFooter: findTag.TagResponse.TagEmbedFooter,
            });
            ctx.store.setKey(key, ...tags);
            return true;
        }
    } catch (error) {
        console.log("Error fetching tags from the database:", error);
        return false;
    }

    return false;
}
