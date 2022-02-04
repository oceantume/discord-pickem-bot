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
      await interaction.deferReply({ ephemeral: true })
      await exportPool(pools[0], interaction.user.id)
      await interaction.editReply(makePoolExported(pools[0]))
      return
    } else {
      await interaction.reply(makePoolSelection(pools))
      return
    }
  }

  if (interaction.isSelectMenu() && interaction.customId === 'export') {
    const poolId = interaction.values[0]
    const pool = await getPool(interaction.guildId, poolId)
    await interaction.deferReply({ ephemeral: true })
    await exportPool(pool, interaction.user.id)
    await interaction.editReply(makePoolExported(pool))
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

  const questionsInfo = pool.questions
    .map(({ description }, index) => `question${index + 1}: ${description}`)
    .join('\n')

  const teamsInfo = pool.teams
    .map((team, index) => `${index + 1}: ${team.name}`)
    .join('\n')

  // start sending the message. the file will be streamed to it.
  const messagePromise = botClient.users.send(userId, {
    content: [
      `Here are the predictions for **${pool.name}**.`,
      'They have been exported as a CSV file so it can easily be imported into a spreadsheet.',
      'Refer to the lists below to make sense of the column names and cell values.',
      pool.status !== 'locked' &&
        '\nNote that the pool is **not locked** which means users can still enter predictions.',
      '\nQuestions:',
      '```',
      questionsInfo,
      '```',
      '\nAnswers:',
      '```',
      teamsInfo,
      '```',
    ]
      .filter((line) => !!line)
      .join('\n'),
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
      getAnswerCell(answers[questionIndex]?.[i])
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
