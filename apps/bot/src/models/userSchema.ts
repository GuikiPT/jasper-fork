import { model, Schema } from 'mongoose';

import { UserDocument } from './userDocument';

export default model<UserDocument>(
    'support-helpers',
    new Schema(
        {
            _id: String,
            Incognito: {
                showCommandAuthor: { default: false, type: Boolean },
                showCommands: { default: false, type: Boolean },
            },
        },
        { timestamps: true, versionKey: false },
    ),
);
