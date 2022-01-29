const { SelectMenuComponent, SelectMenuOption } = require('@discordjs/builders')
const { MessageButton, MessageActionRow } = require('discord.js')
const emojiRegex = require('emoji-regex')
const { botClient } = require('../bot-client')
const { getPool, createPool, updatePoolQuestion } = require('../store/pools')
const { parsePoolCustomId, getTeamDisplayText } = require('../utils')

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

    const teams = teamsOption
      .split(';')
      .filter((str) => str)
      .map(extractTeamFromString)
    const questions = questionsOption
      .split(';')
      .filter((str) => str)
      .map((str) => ({ description: str.trim() }))

    // TODO: Validations and errors for name, non-empty teams, non-empty questions

    const pool = await createPool({
      name,
      teams,
      questions,
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
    let pool = await getPool(poolId)

    const questionIndex = Number(params[0])
    const question = pool.questions[questionIndex]

    const nextQuestionIndex = questionIndex + 1

    const selectedValue = Number(interaction.values[0])

    await updatePoolQuestion(poolId, questionIndex, {
      ...question,
      minValues: selectedValue,
      maxValues: selectedValue,
    })

    pool = await getPool(poolId)

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
    const pool = await getPool(poolId)

    try {
      await interaction.channel.send(makePoolMessage(pool))
      await interaction.update(makeStartConfirmation(pool))
    } catch (e) {
      await interaction.update(makeBotError(e.message))
    }
  }
})

// match a string that starts with a unicode emoji or a discord emoji code `<:name:id>`
const teamWithEmojiRegex = new RegExp(
  `(?:(${emojiRegex().source})|<:([a-zA-Z0-9_]{2,}):(\\d+)>)(.+)`
)

const extractTeamFromString = (str) => {
  const match = str.match(teamWithEmojiRegex)

  if (!match) {
    return { name: str.trim() }
  }

  const [, unicodeEmoji, name, id, teamName] = match

  let emoji
  if (unicodeEmoji) {
    emoji = { name: unicodeEmoji }
  } else if (name && id) {
    emoji = { name, id }
  }

  return { emoji, name: teamName.trim() }
}

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

const makePoolMessage = (pool) => ({
  content: `**${pool.name}**\nUse the menu below to enter, change or view your predictions.`,
  components: [
    new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`pool:${pool.id}:answer`)
        .setLabel('Enter your predictions')
        .setStyle('PRIMARY'),
      new MessageButton()
        .setCustomId(`pool:${pool.id}:view`)
        .setLabel('View your predictions')
        .setStyle('SECONDARY')
    ),
  ],
})
