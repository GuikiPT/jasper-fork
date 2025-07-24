import { Document } from 'mongoose';

export interface UserDocument extends Document {
    _id: string;
    Incognito: { showCommandAuthor: boolean; showCommands: boolean };
}
