const { SelectMenuOption } = require('@discordjs/builders')
const {
  MessageActionRow,
  MessageButton,
  MessageSelectMenu,
} = require('discord.js')
const { botClient } = require('../bot-client')
const { getActivePoolsInChannel, getPool, lockPool } = require('../store/pools')
const { parsePoolCustomId } = require('../utils')
const { makePoolMessage } = require('./pool-creation')

botClient.on('interactionCreate', async (interaction) => {
  if (
    interaction.isCommand() &&
    interaction.commandName === 'pickem' &&
    interaction.options.getSubcommand() === 'lock'
  ) {
    const pools = await getActivePoolsInChannel(
      interaction.guildId,
      interaction.channelId
    )

    if (!pools.length) {
      await interaction.reply(makeNoPoolsWarning())
      return
    }

    if (pools.length === 1) {
      await interaction.reply(makeLockPrompt(pools[0]))
      return
    }

    await interaction.reply(makeLockSelection(pools))
  }

  if (!interaction.isMessageComponent()) {
    return
  }

  if (interaction.isSelectMenu() && interaction.customId === 'lock') {
    const poolId = interaction.values[0]
    const pool = await getPool(interaction.guildId, poolId)
    await interaction.update(makeLockPrompt(pool))
  }

  const parsedCustomId = parsePoolCustomId(interaction.customId)

  if (!parsedCustomId) {
    return
  }

  const { poolId, action, params } = parsedCustomId

  if (action === 'lock') {
    await lockPool(interaction.guildId, poolId)
    const pool = await getPool(interaction.guildId, poolId)
    await interaction.channel.messages.edit(
      pool.messageId,
      makePoolMessage(pool)
    )
    await interaction.update(makeLockedConfirmation(pool))
  }
})

const makeNoPoolsWarning = () => ({
  ephemeral: true,
  content: 'No active pools found.',
  components: [],
})

const makeLockSelection = (pools) => ({
  ephemeral: true,
  content: 'Select an active pool to lock.',
  components: [
    new MessageActionRow().addComponents(
      new MessageSelectMenu()
        .setCustomId(`lock`)
        .setPlaceholder('Select a pool')
        .setOptions(
          pools.map((pool) =>
            new SelectMenuOption().setValue(pool.id).setLabel(pool.name)
          )
        )
    ),
  ],
})

const makeLockPrompt = (pool) => ({
  ephemeral: true,
  content: `You're about to lock **${pool.name}**. This will prevent users from entering or changing their predictions.`,
  components: [
    new MessageActionRow().addComponents(
      new MessageButton()
        .setStyle('DANGER')
        .setLabel('Lock pool')
        .setCustomId(`pool:${pool.id}:lock`)
    ),
  ],
})

const makeLockedConfirmation = (pool) => ({
  ephemeral: true,
  content: `**${pool.name}** has been locked.`,
  components: [],
})
