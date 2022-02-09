const { SelectMenuComponent, SelectMenuOption } = require('@discordjs/builders')
const { MessageButton, MessageActionRow } = require('discord.js')
const { botClient } = require('../bot-client')
const {
  getPool,
  createPool,
  updatePoolQuestion,
  activatePool,
  updatePoolMessage,
} = require('../store/pools')
const {
  parsePoolCustomId,
  getTeamDisplayText,
  extractTeamFromString,
} = require('../utils')

// Creation handler
botClient.on('interactionCreate', async (interaction) => {
  // Handler for `/pickem create <...>`
  if (
    interaction.isCommand() &&
    interaction.commandName === 'pickem' &&
    interaction.options.getSubcommand() === 'create'
  ) {
    const name = interaction.options.getString('name').trim()
    const teamsOption = interaction.options.getString('options')
    const questionsOption = interaction.options.getString('questions')
    const shareChannel = interaction.options.getChannel('share-channel')

    const teams = teamsOption
      .split(';')
      .filter((str) => str)
      .map(extractTeamFromString)
    const questions = questionsOption
      .split(';')
      .filter((str) => str)
      .map((str) => ({ description: str.trim() }))

    // TODO: Validations and errors for name, non-empty teams, non-empty questions

    const pool = await createPool(interaction.guildId, {
      name,
      teams,
      questions,
      shareChannelId: shareChannel?.id ?? undefined,
      userId: interaction.user.id,
      channelId: interaction.channel.id,
    })

    await interaction.reply(makeQuestionSetupStep(pool, 0))
  }

  const parsedCustomId = parsePoolCustomId(interaction.customId)

  if (!parsedCustomId) {
    return
  }

  const { poolId, action, params } = parsedCustomId

  // Handler for question setup responses
  if (interaction.isSelectMenu() && action === 'setup-question') {
    let pool = await getPool(interaction.guildId, poolId)

    const questionIndex = Number(params[0])
    const question = pool.questions[questionIndex]

    const nextQuestionIndex = questionIndex + 1

    const selectedValue = Number(interaction.values[0])

    await updatePoolQuestion(interaction.guildId, poolId, questionIndex, {
      ...question,
      minValues: selectedValue,
      maxValues: selectedValue,
    })

    pool = await getPool(interaction.guildId, poolId)

    if (nextQuestionIndex < pool.questions.length) {
      await interaction.update(makeQuestionSetupStep(pool, nextQuestionIndex))
    } else {
      await interaction.update(
        makeCreationConfirmation(pool, nextQuestionIndex)
      )
    }
  }

  // Handler for pool start
  if (interaction.isButton() && action === 'start') {
    await interaction.deferUpdate()

    await activatePool(interaction.guildId, poolId)
    const pool = await getPool(interaction.guildId, poolId)

    try {
      const message = await interaction.channel.send(
        exports.makePoolMessage(pool)
      )

      await updatePoolMessage(interaction.guildId, poolId, message.id)
      await interaction.editReply(makeStartConfirmation(pool))
    } catch (e) {
      await interaction.editReply(makeBotError(e.message))
    }
  }
})

const makeQuestionSetupStep = (pool, questionIndex) => {
  const question = pool.questions[questionIndex]

  return {
    ephemeral: true,
    content: `**Setting up questions**\n${questionIndex + 1}/${
      pool.questions.length
    }: ${question.description}`,
    components: [
      new MessageActionRow().addComponents(
        new SelectMenuComponent()
          .setCustomId(`pool:${pool.id}:setup-question:${questionIndex}`)
          .setPlaceholder('How many answers should be selected?')
          .setOptions([
            Array.from({ length: 10 }, (_, i) =>
              new SelectMenuOption().setValue(`${i + 1}`).setLabel(`${i + 1}`)
            ),
          ])
      ),
    ],
  }
}

const makeCreationConfirmation = (pool) => {
  const content = [
    "You are about to create a Pick'Em pool in this channel. Please confirm the details below.\n",
    `Name:`,
    `> ${pool.name}`,
    `Options:`,
    `${pool.teams.map((team) => `> ${getTeamDisplayText(team)}`).join('\n')}`,
    `Questions:`,
    `${pool.questions
      .map(
        (question) =>
          `> ${question.description} (${question.minValues} answers)`
      )
      .join('\n')}`,
  ].join('\n')

  return {
    ephemeral: true,
    content,
    components: [
      new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId(`pool:${pool.id}:start`)
          .setLabel('Confirm')
          .setStyle('PRIMARY'),
        new MessageButton()
          .setCustomId(`pool:${pool.id}:delete`)
          .setLabel('Cancel')
          .setStyle('DANGER')
      ),
    ],
  }
}

const makeBotError = (error) => {
  return {
    ephemeral: true,
    content: `:warning: Error: \`${error}\``,
    components: [],
  }
}

const makeStartConfirmation = (pool) => {
  return {
    ephemeral: true,
    content: `The Pick'Em pool has been started.`,
    components: [],
  }
}

exports.makePoolMessage = (pool) => ({
  content: [
    `**${pool.name}**`,
    pool.status === 'locked'
      ? `This pool is now locked and predictions cannot be changed.`
      : `Use the menu below to enter, change or view your predictions.`,
  ].join('\n'),
  components: [
    new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`pool:${pool.id}:answer`)
        .setDisabled(pool.status === 'locked')
        .setLabel('Enter your predictions')
        .setStyle('PRIMARY'),
      new MessageButton()
        .setCustomId(`pool:${pool.id}:view`)
        .setLabel('View your predictions')
        .setStyle('SECONDARY')
    ),
  ],
})
