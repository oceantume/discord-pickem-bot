const { botClient } = require('../bot-client')
const { getPool, deletePool } = require('../store/pools')
const { parsePoolCustomId } = require('../utils')

// TODO: Look into supporting auto-deletion when message is deleted.
// TODO: Add support for commands (i.e. delete all pools in my channel).

// Deletion handlers
botClient.on('interactionCreate', async (interaction) => {
  const parsedCustomId = parsePoolCustomId(interaction.customId)

  if (!parsedCustomId) {
    return
  }

  const { poolId, action, params } = parsedCustomId

  // TODO: Add "delete-prompt" which will give an optional "are you sure?" prompt

  // Handler for pool cancel/deletion
  if (interaction.isButton() && action === 'delete') {
    const pool = await getPool(interaction.guildId, poolId)
    await deletePool(interaction.guildId, poolId)
    await interaction.update(makeDeletionConfirmation(pool))
  }
})

const makeDeletionConfirmation = (pool) => {
  return {
    ephemeral: true,
    content: `The Pick'Em pool '${pool.name}' was deleted.`,
    components: [],
  }
}
