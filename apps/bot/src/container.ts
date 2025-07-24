export enum ConfigurationChannels {
    allowedTagChannels,
    allowedSnipeChannels,
    automaticSlowmodeChannels,
}

export enum ConfigurationRoles {
    supportRoles,
    TagRoles,
    TagAdminRoles,
    AdminRoles,
    StaffRoles,
    ignoredSnipedRoles,
}

export enum ConfigurationUsers {
    ignoreSnipedUsers,
}

export const configurationRolesContainer = [
    [ConfigurationRoles.AdminRoles, 'allowedAdminRoles'],
    [ConfigurationRoles.StaffRoles, 'allowedStaffRoles'],
    [ConfigurationRoles.supportRoles, 'supportRoles'],
    [ConfigurationRoles.TagRoles, 'allowedTagRoles'],
    [ConfigurationRoles.TagAdminRoles, 'allowedTagAdminRoles'],
    [ConfigurationRoles.ignoredSnipedRoles, 'ignoredSnipedRoles'],
] as const;

export const configurationChannelsContainer = [
    [ConfigurationChannels.allowedTagChannels, 'allowedTagChannels'],
    [ConfigurationChannels.allowedSnipeChannels, 'allowedSnipeChannels'],
    [ConfigurationChannels.automaticSlowmodeChannels, 'automaticSlowmodeChannels'],
] as const;

export const configurationUsersContainer = [
    [ConfigurationUsers.ignoreSnipedUsers, 'ignoreSnipedUsers'],
] as const;

export function filterContainer<R extends []>(
    container: ReadonlyArray<
        readonly [ConfigurationChannels | ConfigurationRoles | ConfigurationUsers, string]
    >,
): R {
    const array = [];

    for (let i = 0; i < container.length; i++) {
        array.push(container[i][1]);
    }

    return array as R;
}

export function getChannelConfigurationContainer<R extends Array<R>>(): R {
    return filterContainer(configurationChannelsContainer) as unknown as R;
}

export function getConfigurationContainer<R extends Array<R>>(): R {
    return [
        ...getChannelConfigurationContainer(),
        ...getRoleConfigurationContainer(),
        ...getUserConfigurationContainer(),
    ] as unknown as R;
}

export function getRoleConfigurationContainer<R extends Array<R>>(): R {
    return filterContainer(configurationRolesContainer) as unknown as R;
}

export function getUserConfigurationContainer<R extends Array<R>>(): R {
    return filterContainer(configurationUsersContainer) as unknown as R;
}
