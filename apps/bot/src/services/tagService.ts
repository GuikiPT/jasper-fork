import { Snowflake } from '@antibot/interactions';

import { Context } from '../classes/context';
import { getGuild } from '../db';
import TagSchema, { GuildDocument } from '../models/guildSchema';
import { Nullable } from '../types';

import { CommonCondition, Service } from './service';

export type Options = {
    guildId: Snowflake;
    name: string;
};

export type Tag = {
    author?: Snowflake;
    description: Nullable<string>;
    editedBy?: Nullable<Snowflake>;
    footer: Nullable<string>;
    image_url: Nullable<string>;
    name?: string;
    title: string;
};

export type tagResponse = {
    tagAuthor: Snowflake;
    tagEditedBy: Nullable<Snowflake>;
    tagEmbedDescription: Nullable<string>;
    tagEmbedFooter: Nullable<string>;
    tagEmbedImageURL: Nullable<string>;
    tagEmbedTitle: Nullable<string>;
    tagName: string;
};

class TagService extends Service {
    private guildId: Snowflake;
    private name: string;
    private tag: Tag;

    constructor(public ctx: Context) {
        super(ctx);
        this.guildId = '';
        this.name = '';
        this.tag = {
            author: null,
            description: null,
            editedBy: null,
            footer: null,
            image_url: null,
            name: null,
            title: null,
        };
    }

    public configure<T>(config: T extends Options ? Options & { tag?: Tag } : null): this {
        this.guildId = config?.guildId ?? '';
        this.name = config?.name ?? '';
        this.tag = config?.tag ?? {
            author: null,
            description: null,
            editedBy: null,
            footer: null,
            image_url: null,
            name: null,
            title: null,
        };

        return this;
    }

    public async create<T, R>(
        create?: T extends Options ? Options & { tag?: Tag } : null,
    ): Promise<CommonCondition<R>> {
        let guildId = this.guildId;
        let name = this.name;
        let tag = this.tag;

        if (!this.#checkConfig() && create) {
            guildId = create.guildId;
            name = create.name;
            tag = create.tag ?? {
                author: '',
                description: null,
                editedBy: null,
                footer: null,
                image_url: null,
                name: '',
                title: '',
            };
        }

        if (!guildId || !name) {
            throw new Error('GuildId and name are required to create a tag');
        }

        if (await this.itemExists<Options>({ guildId, name })) {
            throw new Error(`Tag "${name}" already exists in guild ${guildId}`);
        }

        const guild = await getGuild<GuildDocument>(this.ctx, guildId);

        if (!tag.title) {
            throw new Error('Tag title is required');
        }

        const tagName = name.trim();
        const tagAuthor = tag.author;
        const tagEditedBy = tag.editedBy;
        const tagEmbedTitle = tag.title;
        const tagEmbedDescription = tag.description ?? null;
        const tagEmbedImageURL = tag.image_url ?? null;
        const tagEmbedFooter = tag.footer ?? null;

        guild.Tags.push({
            tagAuthor,
            tagEditedBy,
            tagName,
            tagResponse: { tagEmbedDescription, tagEmbedFooter, tagEmbedImageURL, tagEmbedTitle },
        });
        await this.ctx.store.setForeignKey({ guild: guildId }, guild);

        await TagSchema.updateOne(
            { _id: guildId },
            {
                $push: {
                    Tags: {
                        tagAuthor,
                        tagEditedBy,
                        tagName,
                        tagResponse: {
                            tagEmbedDescription,
                            tagEmbedFooter,
                            tagEmbedImageURL,
                            tagEmbedTitle,
                        },
                    },
                },
                $setOnInsert: { _id: guildId },
            },
            { upsert: true },
        );

        return <CommonCondition<R>>undefined;
    }

    public async deleteValue<T, R>(
        d?: T extends Options ? Options : null,
    ): Promise<CommonCondition<R>> {
        let guildId = this.guildId;
        let name = this.name;

        if (!this.#checkConfig() && d) {
            guildId = d.guildId;
            name = d.name;
        }

        if (!guildId || !name) {
            throw new Error('GuildId and name are required for tag deletion');
        }

        const guild = await getGuild<GuildDocument>(this.ctx, guildId);
        const tagExists = await this.itemExists<Options>({ guildId, name });

        if (!tagExists) {
            return <CommonCondition<R>>false;
        }

        const index = guild.Tags.findIndex((tag) => tag.tagName === name);
        if (index === -1) {
            return <CommonCondition<R>>false;
        }

        guild.Tags.splice(index, 1);
        await this.ctx.store.setForeignKey({ guild: guildId }, guild);

        await TagSchema.updateOne({ _id: guildId }, { $pull: { Tags: { tagName: name } } });

        return <CommonCondition<R>>true;
    }

    public async getMultiValues<T, R>(
        getMultiValues?: T extends Snowflake ? Snowflake : null,
    ): Promise<CommonCondition<R extends tagResponse[] ? tagResponse[] : null>> {
        let guildId = this.guildId;

        if (!this.#checkConfig() && getMultiValues) {
            guildId = getMultiValues;
        }

        if (!guildId) {
            throw new Error('GuildId is required to get multiple tags');
        }

        const guild = await getGuild<GuildDocument>(this.ctx, guildId);
        const tags = guild.Tags;

        if (!tags?.length) {
            return <CommonCondition<R extends tagResponse[] ? tagResponse[] : null>>[];
        }

        return <CommonCondition<R extends tagResponse[] ? tagResponse[] : null>>tags.map((tag) => ({
            tagAuthor: tag.tagAuthor,
            tagEditedBy: tag.tagEditedBy,
            tagEmbedDescription: tag.tagResponse.tagEmbedDescription,
            tagEmbedFooter: tag.tagResponse.tagEmbedFooter,
            tagEmbedImageURL: tag.tagResponse.tagEmbedImageURL,
            tagEmbedTitle: tag.tagResponse.tagEmbedTitle,
            tagName: tag.tagName,
        }));
    }

    public async getValues<T, R>(
        get?: T extends Options ? Options : null,
    ): Promise<CommonCondition<R extends tagResponse ? tagResponse : null>> {
        let guildId = this.guildId;
        let name = this.name;

        if (!this.#checkConfig() && get) {
            guildId = get.guildId;
            name = get.name;
        }

        if (!guildId || !name) {
            throw new Error('GuildId and name are required to get tag values');
        }

        if (!(await this.itemExists<Options>({ guildId, name }))) {
            return null;
        }

        const guild = await getGuild<GuildDocument>(this.ctx, guildId);
        const tag = guild.Tags.find((tag) => tag.tagName === name);

        if (!tag) {
            return null;
        }

        const { tagAuthor, tagName, tagResponse } = tag;
        const { tagEmbedDescription, tagEmbedFooter, tagEmbedImageURL, tagEmbedTitle } =
            tagResponse;

        return <CommonCondition<R extends tagResponse ? tagResponse : null>>{
            tagAuthor,
            tagEditedBy: tag.tagEditedBy,
            tagEmbedDescription,
            tagEmbedFooter,
            tagEmbedImageURL,
            tagEmbedTitle,
            tagName,
        };
    }

    public async itemExists<T>(
        exists?: T extends Options ? Options : null,
    ): Promise<CommonCondition<boolean>> {
        let guildId = this.guildId;
        let name = this.name;

        if (!this.#checkConfig() && exists) {
            guildId = exists.guildId;
            name = exists.name;
        }

        const guild = await getGuild<GuildDocument>(this.ctx, guildId);
        const tags = guild.Tags;

        if (tags.find((tag) => tag.tagName === name)) return true;

        return false;
    }

    public async modify<T, R>(
        mod?: T extends Options ? Options & { tag?: Tag } : null,
    ): Promise<CommonCondition<R>> {
        let guildId = this.guildId;
        let name = this.name;
        let tag = this.tag;

        if (!this.#checkConfig() && mod) {
            guildId = mod.guildId;
            name = mod.name;
            tag = mod.tag ?? {
                author: '',
                description: null,
                editedBy: null,
                footer: null,
                image_url: null,
                name: '',
                title: null,
            };
        }

        if (!guildId || !name) {
            throw new Error('GuildId and name are required for tag modification');
        }

        const guild = await getGuild<GuildDocument>(this.ctx, guildId);
        const tagInDb = guild.Tags.find((tag) => tag.tagName === name);

        if (!tagInDb) {
            throw new Error(`Tag "${name}" not found in guild ${guildId}`);
        }

        const index = guild.Tags.findIndex((tag) => tag.tagName === name);

        const updatedtagResponse = {
            tagEmbedDescription:
                typeof tag.description === 'string'
                    ? tag.description
                    : tagInDb.tagResponse.tagEmbedDescription,
            tagEmbedFooter:
                typeof tag.footer === 'string' ? tag.footer : tagInDb.tagResponse.tagEmbedFooter,
            tagEmbedImageURL:
                typeof tag.image_url === 'string'
                    ? tag.image_url
                    : tagInDb.tagResponse.tagEmbedImageURL,
            tagEmbedTitle: tag.title || tagInDb.tagResponse.tagEmbedTitle,
        };

        const updatedTag = {
            tagAuthor: tagInDb.tagAuthor,
            tagEditedBy: tag.editedBy ?? tagInDb.tagEditedBy,
            tagName: name,
            tagResponse: updatedtagResponse,
        };

        guild.Tags[index] = updatedTag;
        await this.ctx.store.setForeignKey({ guild: guildId }, guild);

        await TagSchema.updateOne(
            {
                _id: guildId,
                'Tags.tagName': name,
            },
            {
                $set: {
                    'Tags.$.tagEditedBy': updatedTag.tagEditedBy,
                    'Tags.$.tagResponse': updatedtagResponse,
                },
            },
        );

        return <CommonCondition<R>>null;
    }

    #checkConfig(): boolean {
        return Boolean(this.guildId && this.name);
    }
}

export default TagService;
