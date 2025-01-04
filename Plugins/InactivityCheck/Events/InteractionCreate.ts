import { DefineEvent } from "../../../Common/DefineEvent";
import { ModalSubmitInteraction } from "discord.js";

export = {
    Event: DefineEvent({
        event: {
            name: "interactionCreate",
            once: false,
        },
        on: async (interaction: ModalSubmitInteraction, ctx) => {
            if (!interaction.isModalSubmit()) return;

            const [action, threadId] = interaction.customId.split("_");
            if (action !== "close_thread_reason") return;

            const thread = await ctx.channels.fetch(threadId).catch(() => null);
            if (!thread || !thread.isThread()) {
                return interaction.reply({ content: "This thread no longer exists.", ephemeral: true });
            }

            const reason = interaction.fields.getTextInputValue("reason");

            await thread.send({
                content: `The thread has been closed by <@${interaction.user.id}> for the following reason:\n\n> ${reason}`,
            });

            await thread.setArchived(true, "Thread closed by the OP.");
            await ctx.store.deleteThread(threadId);

            return interaction.reply({
                content: "The thread has been successfully closed.",
                ephemeral: true,
            });
        },
    }),
};
