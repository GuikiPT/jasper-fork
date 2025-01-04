import { DefineEvent } from "../../../Common/DefineEvent";
import { Context } from "../../../Source/Context";
import { checkInactiveThreads, cleanUpExpiredThreads } from "../Functions/InactiveThreads";

export = {
    Event: DefineEvent({
        event: {
            name: "ready",
            once: true,
        },
        on: (ctx: Context) => {
            setInterval(async () => {
                try {
                    await cleanUpExpiredThreads(ctx);
                    await checkInactiveThreads(ctx);
                } catch (error) {
                    console.error("[Error during inactive thread check]:", error);
                }
            }, 10 * 1000);

            console.log("Inactive thread check initialized.");
        },
    }),
};
