const { MessageActionRow, MessageSelectMenu } = require('discord.js')
const { botClient } = require('../bot-client')
const { updatePrediction, getPrediction } = require('../store/predictions')
const { getPool } = require('../store/pools')
const { parsePoolCustomId } = require('../utils')

botClient.on('interactionCreate', async (interaction) => {
  if (!interaction.isMessageComponent()) {
    return
  }

  const parsedCustomId = parsePoolCustomId(interaction.customId)

  if (!parsedCustomId) {
    return
  }

  const { poolId, action, params } = parsedCustomId

  if (action === 'view') {
    const pool = await getPool(poolId)
    const prediction = await getPrediction(poolId, interaction.user.id)

    if (prediction) {
      interaction.reply(makePredictionSummary(pool, prediction))
    } else {
      interaction.reply(makeEmptyAnswersView(pool))
    }
  }

  if (action === 'answer') {
    const pool = await getPool(poolId)

    const questionIndex = params[0] && Number(params[0])

    if (questionIndex != null) {
      await updatePrediction(
        poolId,
        interaction.user.id,
        questionIndex,
        interaction.values
      )
    }

    const nextQuestionIndex = questionIndex == null ? 0 : questionIndex + 1

    if (nextQuestionIndex === 0) {
      interaction.reply(makeQuestionStep(pool, nextQuestionIndex))
    } else if (nextQuestionIndex < pool.questions.length) {
      interaction.update(makeQuestionStep(pool, nextQuestionIndex))
    } else {
      const prediction = await getPrediction(poolId, interaction.user.id)
      interaction.update(makePredictionSummary(pool, prediction))
    }
  }
})

const makeQuestionStep = (pool, questionIndex) => {
  const teamOptions = pool.teams.map((team) => ({
    label: team.name,
    value: team.name,
    emoji: team.emoji,
  }))

  const question = pool.questions[questionIndex]

  const customId = `pool:${pool.id}:answer:${questionIndex}`
  const counter = `${questionIndex + 1}/${pool.questions.length}`
  const content = `**Question ${counter}**\n${question.description}`

  return {
    ephemeral: true,
    content,
    components: [
      new MessageActionRow().addComponents(
        new MessageSelectMenu()
          .setCustomId(customId)
          .setPlaceholder(`Select ${getAnswerRange(question)} team(s)`)
          .addOptions(teamOptions)
          .setMinValues(question.minValues || 1)
          .setMaxValues(question.maxValues || 1)
      ),
    ],
  }
}

const getAnswerRange = (question) => {
  if (question.minValues === question.maxValues) {
    return `${question.minValues}`
  } else {
    return `${question.minValues} to ${question.maxValues}`
  }
}

const makeEmptyAnswersView = () => {
  return {
    ephemeral: true,
    content: 'You have no predictions on record yet.',
  }
}

const makePredictionSummary = (pool, prediction) => {
  const summary = pool.questions
    .map((question, index) => ({ question, answer: prediction.answers[index] }))
    .map(
      ({ question, answer }, index) =>
        `${index + 1}. ${question.description}\n${answer
          .map((value) => `> ${value}`)
          .join('\n')}`
    )
    .join('\n\n')

  return {
    ephemeral: true,
    content: [
      `You can review your predictions below. You can always change them until the pool gets locked by an admin.\n\n${summary}`,
    ].join('\n'),
    components: [],
  }
}
