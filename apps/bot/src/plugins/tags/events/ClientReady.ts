import { Client, Events } from 'discord.js';

import { Context } from '../../../classes/context';
import { defineEvent } from '../../../define';
import { checkInactiveThreads, cleanUpExpiredThreads } from '../functions/InactiveThreads';

export const Event = defineEvent<Client>({
    event: {
        name: Events.ClientReady,
        once: true,
    },
    on: (client: Client<true>, ctx: Context) => {
        console.log('Inactive thread check initialized.');

        setInterval(async () => {
            try {
                await cleanUpExpiredThreads(ctx);
                await checkInactiveThreads(ctx);
            } catch (error) {
                console.error('[Error during inactive thread check]:', error);
            }
        }, 10 * 1000);
    },
});
