require('dotenv').config()

const { SlashCommandBuilder } = require('@discordjs/builders')
const { REST } = require('@discordjs/rest')
const { Routes } = require('discord-api-types/v9')

// This deploys the commands to a specific discord guild (server).
// TODO: Replace this with automatic command installation when bot is added to a server.

const {
  CLIENT_ID: clientId,
  GUILD_ID: guildId,
  DISCORD_TOKEN: token,
} = process.env

const commands = [
  new SlashCommandBuilder()
    .setName('pickem')
    .setDescription('Run a PickEm command')
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
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('lock').setDescription('Locks a pool in this channel')
    ),
].map((command) => command.toJSON())

const rest = new REST({ version: '9' }).setToken(token)

rest
  .put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
  .then(() => console.log('Successfully registered application commands.'))
  .catch(console.error)
