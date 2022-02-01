// This script deploys the commands to a specific discord guild (server).
// Permissions will be set according to environment values:
//  - ADMIN_ROLE_ID: comma-separated list of role id's that can use management commands
//  - ADMIN_USER_ID: comma-separated list of user id's that can use management commands
//

require('dotenv').config()

const { SlashCommandBuilder } = require('@discordjs/builders')
const { REST } = require('@discordjs/rest')
const { Routes, ChannelType } = require('discord-api-types/v9')

const {
  CLIENT_ID: clientId,
  GUILD_ID: guildId,
  DISCORD_TOKEN: token,
  ADMIN_ROLE_ID: adminRoleIds = '',
  ADMIN_USER_ID: adminUserIds = '',
} = process.env

const roles = adminRoleIds
  .split(',')
  .map((id) => id.trim())
  .filter((id) => !!id)

const users = adminUserIds
  .split(',')
  .map((id) => id.trim())
  .filter((id) => !!id)

const hasUsersOrRoles = roles.length + users.length > 0

const rest = new REST({ version: '9' }).setToken(token)

const commands = [
  new SlashCommandBuilder()
    .setName('pickem')
    .setDescription('Run a PickEm command')
    .setDefaultPermission(!hasUsersOrRoles)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('create')
        .setDescription('Create a PickEm pool in this channel')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('The display name of the pool')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('options')
            .setDescription(
              'A semicolon-separated (;) list of things predictions will be made on (e.g. teams or players)'
            )
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('questions')
            .setDescription(
              'A semicolon-separated (;) list of questions. You will be prompted for details'
            )
            .setRequired(true)
        )
        .addChannelOption((option) =>
          option
            .setName('share-channel')
            .setDescription(
              'An optional channel where users can share their predictions in'
            )
            .addChannelType(ChannelType.GuildText)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('lock').setDescription('Locks a pool in this channel')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('export')
        .setDescription('Exports all answers of your pool')
    ),
].map((command) => command.toJSON())

rest
  .put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
  .then((commands) => {
    const permissions = [
      ...roles.map((id) => ({ id, type: 1, permission: true })),
      ...users.map((id) => ({ id, type: 2, permission: true })),
    ]

    const commandsPermissions = commands.map(({ id }) => ({ id, permissions }))

    rest
      .put(Routes.guildApplicationCommandsPermissions(clientId, guildId), {
        body: commandsPermissions,
      })
      .then(() => {
        console.log(
          'Successfully registered application commands and permissions.'
        )
      })
  })
  .catch(console.error)
