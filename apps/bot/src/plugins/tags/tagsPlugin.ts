import { definePlugin, Plugin } from '../../define';
import { massRegisterCommands, massRegisterEvents } from '../../register';

export = definePlugin({
    commands: massRegisterCommands(__dirname, ['commands']),
    description: 'Tags for the No Text To Speech support team!',
    events: massRegisterEvents(__dirname, ['events']),
    name: 'tags',
    public_plugin: true,
}) satisfies Plugin;
