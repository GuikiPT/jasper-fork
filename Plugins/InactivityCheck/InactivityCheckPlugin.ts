import { DefinePlugin, Plugin } from "../../Common/DefinePlugin";
import { MassRegisterEvents } from "../../Common/MassRegisterEvents";

export = DefinePlugin({
    name: "inactivitycheck",
    description: "Check if the Support Threads are inactive.",
    commands: [],
    events: MassRegisterEvents(__dirname, ["Events", "Modal"]),
    public_plugin: true
}) satisfies Plugin;
