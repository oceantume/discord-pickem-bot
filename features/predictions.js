const { MessageActionRow, MessageSelectMenu } = require('discord.js')
const { botClient } = require('../bot-client')
const {
  updatePrediction,
  getPrediction,
  updatePredictionSharedAt,
} = require('../store/predictions')
const { getPool } = require('../store/pools')
const { parsePoolCustomId, getTeamDisplayText } = require('../utils')
const { ButtonComponent } = require('@discordjs/builders')

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
    const pool = await getPool(interaction.guildId, poolId)
    const prediction = await getPrediction(poolId, interaction.user.id)

    if (prediction) {
      const channelName = await getChannelName(pool.shareChannelId)
      interaction.reply(makePredictionSummary(pool, prediction, channelName))
    } else {
      interaction.reply(makeEmptyAnswersView(pool))
    }
  }

  if (action === 'share') {
    const pool = await getPool(interaction.guildId, poolId)
    const prediction = await getPrediction(poolId, interaction.user.id)

    if (!prediction) {
      interaction.reply(makeEmptyAnswersView(pool))
      return
    }

    const oneHour = 60 * 60 * 1000
    const sharedAt = new Date(prediction.sharedAt)
    if (
      prediction.sharedAt &&
      Math.abs(new Date().getTime() - sharedAt.getTime()) < oneHour
    ) {
      interaction.reply(makeAlreadyShared())
      return
    }

    await updatePredictionSharedAt(poolId, interaction.user.id, new Date())

    const channel = await botClient.channels.fetch(pool.shareChannelId)
    await channel.send(makePredictionSharedSummary(pool, prediction))

    interaction.reply(makeSharedConfirmation(pool))
  }

  if (action === 'answer') {
    const pool = await getPool(interaction.guildId, poolId)

    const questionIndex = params[0] && Number(params[0])

    if (questionIndex != null) {
      if (pool.status !== 'active') {
        await interaction.reply(makePoolIsNotActiveError())
        return
      }

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
      const channelName = await getChannelName(pool.shareChannelId)
      interaction.update(makePredictionSummary(pool, prediction, channelName))
    }
  }
})

const getChannelName = async (channelId) =>
  channelId == null
    ? channelId
    : (await botClient.channels.fetch(channelId))?.name

const makeQuestionStep = (pool, questionIndex) => {
  const teamOptions = pool.teams.map((team, index) => ({
    label: team.name,
    value: `${index}`,
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
          .setPlaceholder(`Select ${getAnswerRange(question)} option(s)`)
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
    components: [],
  }
}

const makeAlreadyShared = () => {
  return {
    ephemeral: true,
    content: 'You have already shared your predictions recently.',
    components: [],
  }
}

const makeSharedConfirmation = (pool) => {
  return {
    ephemeral: true,
    content: `Your predictions have been shared to <#${pool.shareChannelId}>.`,
    components: [],
  }
}

const makePoolIsNotActiveError = () => ({
  ephemeral: true,
  content: 'This pool is not active.',
  components: [],
})

const makePredictionSummary = (pool, prediction, channelName) => {
  const summary = getPredictionSummaryText(pool, prediction)

  return {
    ephemeral: false,
    content: `You can review your predictions below. You can always change them until the pool gets locked by an admin.\n\n${summary}`,
    components: channelName
      ? [
          new MessageActionRow().addComponents(
            new ButtonComponent()
              .setCustomId(`pool:${pool.id}:share`)
              .setLabel(`Share in #${channelName}`)
              .setStyle(1)
          ),
        ]
      : [],
  }
}

const makePredictionSharedSummary = (pool, prediction) => {
  const summary = getPredictionSummaryText(pool, prediction)

  return {
    content: `**${pool.name}**\nSharing predictions of <@${prediction.userId}>.\n\n${summary}`,
    components: [],
  }
}

const getPredictionSummaryText = (pool, prediction) =>
  pool.questions
    .map((question, index) => ({
      question,
      answer: prediction.answers[index].map((teamIndex) =>
        getTeamDisplayText(pool.teams[teamIndex])
      ),
    }))
    .map(
      ({ question, answer }, index) =>
        `${index + 1}. ${question.description}\n${answer
          .map((value) => `> ${value}`)
          .join('\n')}`
    )
    .join('\n\n')
