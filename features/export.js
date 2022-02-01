const { SelectMenuOption } = require('@discordjs/builders')
const {
  MessageAttachment,
  MessageActionRow,
  MessageSelectMenu,
} = require('discord.js')
const { Stream } = require('stream')
const { botClient } = require('../bot-client')
const { getPoolsInChannel, getPool } = require('../store/pools')
const { getPoolPredictions } = require('../store/predictions')
const { parsePoolCustomId } = require('../utils')

// Creation handler
botClient.on('interactionCreate', async (interaction) => {
  // Handler for `/pickem export`
  if (
    interaction.isCommand() &&
    interaction.commandName === 'pickem' &&
    interaction.options.getSubcommand() === 'export'
  ) {
    const pools = await getPoolsInChannel(
      interaction.guildId,
      interaction.channelId
    )

    if (!pools.length) {
      await interaction.reply(makeNoPoolsAvailable())
      return
    }

    if (pools.length === 1) {
      await interaction.reply(makePoolExported(pool))
      return
    } else {
      await interaction.reply(makePoolSelection(pools))
      return
    }
  }

  if (interaction.isSelectMenu() && interaction.customId === 'export') {
    const poolId = interaction.values[0]
    const pool = await getPool(interaction.guildId, poolId)
    await exportPool(pool, interaction.user.id)
    await interaction.update(makePoolExported(pool))
    return
  }

  const parsedCustomId = parsePoolCustomId(interaction.customId)

  if (!parsedCustomId) {
    return
  }

  const { poolId, action, params } = parsedCustomId

  if (action === 'export') {
    await lockPool(interaction.guildId, poolId)
    const pool = await getPool(interaction.guildId, poolId)
    await exportPool(pool, interaction.userId)
    await interaction.update(makePoolExported(pool))
    return
  }
})

/**
 * Sends a direct message to the specified user containing a CSV file
 * with all predictions and some details on how to parse it.
 *
 * Questions with multiple answers will be split in the amount
 * of columns necessary to output all answers.
 */
const exportPool = async (pool, userId) => {
  const stream = new Stream.PassThrough({ defaultEncoding: 'utf8' })

  // start sending the message. the file will be streamed to it.
  const messagePromise = botClient.users.send(userId, {
    content: "Here's your exported CSV.",
    files: [
      new MessageAttachment()
        .setFile(stream, 'export.csv')
        .setDescription('This is your exported csv.'),
    ],
  })

  writeColumnHeaders(stream, pool)

  for await (const prediction of getPoolPredictions(pool.id)) {
    await writeValueCells(stream, pool, prediction)
  }

  stream.end()

  await messagePromise
}

const writeColumnHeaders = (stream, pool) => {
  const columns = ['username', ...getColumnNamesFromQuestion(pool.questions)]
  stream.write(`${columns.join(',')}\n`)
}

const getColumnNamesFromQuestion = (questions) =>
  questions.flatMap((question, questionIndex) =>
    question.maxValues === 1
      ? `question${questionIndex + 1}`
      : Array.from(
          { length: question.maxValues },
          (_, index) => `question${questionIndex + 1}-${index + 1}`
        )
  )

const writeValueCells = async (stream, pool, { userId, answers }) => {
  const cells = [
    await fetchUsername(userId),
    ...getValueCellsFromAnswers(pool.questions, answers),
  ]

  stream.write(`${cells.join(',')}\n`)
}

const getValueCellsFromAnswers = (questions, answers) =>
  questions.flatMap((question, questionIndex) =>
    Array.from({ length: question.maxValues }, (_, i) =>
      getAnswerCell(answers[questionIndex][i])
    )
  )

const getAnswerCell = (answer) => (answer != null ? Number(answer) + 1 : null)

const fetchUsername = async (userId) => {
  // according to docs, this will prefer cache when possible,
  // but it may need to query the API.
  const user = await botClient.users.fetch(userId)
  return `${user.username}#${user.discriminator}`
}

const makeNoPoolsAvailable = () => ({
  ephemeral: true,
  content: 'No pools found in this channel',
  components: [],
})

const makePoolSelection = (pools) => ({
  ephemeral: true,
  content:
    'There are multiple pools in this channel. Select which pool you want to export below.',
  components: [
    new MessageActionRow().addComponents(
      new MessageSelectMenu()
        .setCustomId(`export`)
        .setPlaceholder('Select a pool')
        .setOptions(
          pools.map((pool) =>
            new SelectMenuOption().setValue(pool.id).setLabel(pool.name)
          )
        )
    ),
  ],
})

const makePoolExported = (pool) => ({
  ephemeral: true,
  content: `A private message has been sent to you with the predictions and details for **${
    pool.name
  }**.${
    pool.status !== 'locked'
      ? 'That pool is **not locked** which means that users can still enter predictions.'
      : ''
  }`,
  components: [],
})
