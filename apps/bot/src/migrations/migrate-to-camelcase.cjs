// migrate-to-camelcase.cjs
const { config } = require('dotenv');
const mongoose = require('mongoose');

config();

async function migrateToCamelCase() {
    await mongoose.connect(process.env.MONGODB);

    const collection = mongoose.connection.db.collection('support-tags');

    const result = await collection.updateMany({}, [
        {
            $set: {
                'GuildSettings.Channels.allowedSnipeChannels': {
                    $ifNull: [
                        '$GuildSettings.Channels.AllowedSnipeChannels',
                        '$GuildSettings.Channels.allowedSnipeChannels',
                    ],
                },
                'GuildSettings.Channels.allowedTagChannels': {
                    $ifNull: [
                        '$GuildSettings.Channels.AllowedTagChannels',
                        '$GuildSettings.Channels.allowedTagChannels',
                    ],
                },
                'GuildSettings.Channels.automaticSlowmodeChannels': {
                    $ifNull: [
                        '$GuildSettings.Channels.AutomaticSlowmodeChannels',
                        '$GuildSettings.Channels.automaticSlowmodeChannels',
                    ],
                },

                'GuildSettings.Roles.allowedAdminRoles': {
                    $ifNull: [
                        '$GuildSettings.Roles.AllowedAdminRoles',
                        '$GuildSettings.Roles.allowedAdminRoles',
                    ],
                },
                'GuildSettings.Roles.allowedStaffRoles': {
                    $ifNull: [
                        '$GuildSettings.Roles.AllowedStaffRoles',
                        '$GuildSettings.Roles.allowedStaffRoles',
                    ],
                },
                'GuildSettings.Roles.allowedTagAdminRoles': {
                    $ifNull: [
                        '$GuildSettings.Roles.AllowedTagAdminRoles',
                        '$GuildSettings.Roles.allowedTagAdminRoles',
                    ],
                },
                'GuildSettings.Roles.allowedTagRoles': {
                    $ifNull: [
                        '$GuildSettings.Roles.AllowedTagRoles',
                        '$GuildSettings.Roles.allowedTagRoles',
                    ],
                },
                'GuildSettings.Roles.ignoredSnipedRoles': {
                    $ifNull: [
                        '$GuildSettings.Roles.IgnoredSnipedRoles',
                        '$GuildSettings.Roles.ignoredSnipedRoles',
                    ],
                },
                'GuildSettings.Roles.supportRoles': {
                    $ifNull: [
                        '$GuildSettings.Roles.SupportRoles',
                        '$GuildSettings.Roles.supportRoles',
                    ],
                },

                'GuildSettings.Skullboard.skullboardBoolean': {
                    $ifNull: [
                        '$GuildSettings.Skullboard.SkullboardBoolean',
                        '$GuildSettings.Skullboard.skullboardBoolean',
                    ],
                },
                'GuildSettings.Skullboard.skullboardChannel': {
                    $ifNull: [
                        '$GuildSettings.Skullboard.SkullboardChannel',
                        '$GuildSettings.Skullboard.skullboardChannel',
                    ],
                },
                'GuildSettings.Skullboard.skullboardEmoji': {
                    $ifNull: [
                        '$GuildSettings.Skullboard.SkullboardEmoji',
                        '$GuildSettings.Skullboard.skullboardEmoji',
                    ],
                },
                'GuildSettings.Skullboard.skullboardReactionThreshold': {
                    $ifNull: [
                        '$GuildSettings.Skullboard.SkullboardReactionThreshold',
                        '$GuildSettings.Skullboard.skullboardReactionThreshold',
                    ],
                },

                'GuildSettings.Users.ignoreSnipedUsers': {
                    $ifNull: [
                        '$GuildSettings.Users.IgnoreSnipedUsers',
                        '$GuildSettings.Users.ignoreSnipedUsers',
                    ],
                },

                Tags: {
                    $map: {
                        as: 't',
                        in: {
                            tagAuthor: { $ifNull: ['$$t.TagAuthor', '$$t.tagAuthor'] },
                            tagEditedBy: { $ifNull: ['$$t.TagEditedBy', '$$t.tagEditedBy'] },
                            tagName: { $ifNull: ['$$t.TagName', '$$t.tagName'] },
                            tagResponse: {
                                tagEmbedDescription: {
                                    $ifNull: [
                                        '$$t.TagResponse.TagEmbedDescription',
                                        '$$t.tagResponse.tagEmbedDescription',
                                    ],
                                },
                                tagEmbedFooter: {
                                    $ifNull: [
                                        '$$t.TagResponse.TagEmbedFooter',
                                        '$$t.tagResponse.tagEmbedFooter',
                                    ],
                                },
                                tagEmbedImageURL: {
                                    $ifNull: [
                                        '$$t.TagResponse.TagEmbedImageURL',
                                        '$$t.tagResponse.tagEmbedImageURL',
                                    ],
                                },
                                tagEmbedTitle: {
                                    $ifNull: [
                                        '$$t.TagResponse.TagEmbedTitle',
                                        '$$t.tagResponse.tagEmbedTitle',
                                    ],
                                },
                            },
                        },
                        input: '$Tags',
                    },
                },
            },
        },
        {
            $unset: [
                'GuildSettings.Channels.AllowedSnipeChannels',
                'GuildSettings.Channels.AllowedTagChannels',
                'GuildSettings.Channels.AutomaticSlowmodeChannels',

                'GuildSettings.Roles.AllowedAdminRoles',
                'GuildSettings.Roles.AllowedStaffRoles',
                'GuildSettings.Roles.AllowedTagAdminRoles',
                'GuildSettings.Roles.AllowedTagRoles',
                'GuildSettings.Roles.SupportRoles',
                'GuildSettings.Roles.IgnoredSnipedRoles',

                'GuildSettings.Skullboard.SkullboardBoolean',
                'GuildSettings.Skullboard.SkullboardChannel',
                'GuildSettings.Skullboard.SkullboardEmoji',
                'GuildSettings.Skullboard.SkullboardReactionThreshold',

                'GuildSettings.Users.IgnoreSnipedUsers',
            ],
        },
    ]);

    console.log(`Updated ${result.modifiedCount} guilds to camelCase property names.`);
    await mongoose.connection.close();
}

migrateToCamelCase().catch((err) => {
    console.error(err);
    mongoose.connection.close();
});
