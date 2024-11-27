import { DefinePlugin, Plugin } from "../../Common/DefinePlugin";
import { MassRegisterCommands } from "../../Common/MassRegisterCommands";

export = DefinePlugin({
    name: "settings",
    description: "Settings you can change in Jasper for your liking.",
    commands: MassRegisterCommands(__dirname, ["Commands"]),
    events: [],
    public_plugin: true
}) satisfies Plugin;