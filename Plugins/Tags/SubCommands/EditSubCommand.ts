import { ApplicationCommandOptions, ApplicationCommandOptionType } from "@antibot/interactions";
import { Context } from "../../../Source/Context";
import { ChatInputCommandInteraction, ComponentType, TextInputStyle } from "discord.js";
import { RegisterSubCommand } from "../../../Common/RegisterSubCommand";

export const EditSubCommand: ApplicationCommandOptions = {
    name: "edit",
    description: "Edit a tag!",
    type: ApplicationCommandOptionType.SUB_COMMAND,
    options: []
} as ApplicationCommandOptions;

export async function RunEditSubCommand(ctx: Context, interaction: ChatInputCommandInteraction) {
    await RegisterSubCommand({
        subCommand: "edit",
        ctx: ctx,
        interaction: interaction,
        callback: async (ctx: Context, interaction: ChatInputCommandInteraction) => {
            await interaction.showModal(
              {
                customId: `tag_edit_${ interaction.user.id }`,
                title: "Edit a support tag",
                components: [
                  {
                    type: ComponentType.ActionRow,
                    components: [
                      {
                        type: ComponentType.TextInput,
                        customId: "tag_edit_embed_name",
                        label: "Tag",
                        placeholder: "support",
                        maxLength: 80,
                        style: TextInputStyle.Short,
                        required: true
                      }
                    ]
                  },
                  {
                    type: ComponentType.ActionRow,
                    components: [
                      {
                        type: ComponentType.TextInput,
                        customId: "tag_edit_embed_title",
                        label: "Embed Title",
                        placeholder: "How do i contact support?",
                        maxLength: 200,
                        style: TextInputStyle.Short,
                        required: false
                      }
                    ]
                  },
                  {
                    type: ComponentType.ActionRow,
                    components: [
                      {
                        type: ComponentType.TextInput,
                        customId: "tag_edit_embed_description",
                        label: "Embed Description",
                        placeholder: "You can contact us in the support threads!",
                        maxLength: 3000,
                        style: TextInputStyle.Paragraph,
                        required: false
                      }
                    ]
                  },
                  {
                    type: ComponentType.ActionRow,
                    components: [
                      {
                        type: ComponentType.TextInput,
                        customId: "tag_edit_embed_image_url",
                        label: "Embed Image URL",
                        placeholder: "https://imgur.com/Ztrbg8r",
                        maxLength: 500,
                        style: TextInputStyle.Short,
                        required: false
                      }
                    ]
                  },
                  {
                    type: ComponentType.ActionRow,
                    components: [
                      {
                        type: ComponentType.TextInput,
                        customId: "tag_edit_embed_footer",
                        label: "Embed Footer",
                        placeholder: "Make sure to be patient!",
                        maxLength: 40,
                        style: TextInputStyle.Short,
                        required: false
                      }
                    ]
                  }
                ]
              }
            )
        }
    })
}
