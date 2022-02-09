const {
  SelectMenuComponent,
  SelectMenuOption,
  ButtonComponent,
} = require('@discordjs/builders')
const { MessageActionRow } = require('discord.js')
const { botClient } = require('../bot-client')
const { getPoolsInChannel, updatePoolTeam } = require('../store/pools')
const { extractTeamFromString, getTeamDisplayText } = require('../utils')
const uuidv4 = require('uuid').v4

// Creation handler
botClient.on('interactionCreate', async (interaction) => {
  // Handler for `/pickem rename-option <...>`
  if (
    interaction.isCommand() &&
    interaction.commandName === 'pickem' &&
    interaction.options.getSubcommand() === 'rename-option'
  ) {
    const optionValue = interaction.options.getString('name').trim()
    const newTeam = extractTeamFromString(optionValue)

    const pools = await getPoolsInChannel(
      interaction.guildId,
      interaction.channelId
    )

    const [poolInteraction, pool] = await askUserToSelectPool(
      interaction,
      pools
    )

    if (!pool) {
      return
    }

    console.log(pool.teams)

    const [teamInteraction, teamIndex] = await askUserToSelectTeam(
      poolInteraction,
      pool.teams
    )

    if (teamIndex == null) {
      return
    }

    const [confirmInteraction, confirmed] = await askUserToConfirm(
      teamInteraction,
      pool,
      teamIndex,
      newTeam
    )

    if (confirmed) {
      await updatePoolTeam(interaction.guildId, pool.id, teamIndex, newTeam)
      await confirmTeamRename(confirmInteraction)
    }
  }
})

const askUserToSelectPool = async (interaction, pools) => {
  const customId = uuidv4()

  console.log(customId)
  console.log(pools.map((pool) => new SelectMenuOption().setLabel(pool.name)))

  const reply = await interaction.reply({
    fetchReply: true,
    ephemeral: true,
    content: 'Select which pool you want to rename an option in.',
    components: [
      new MessageActionRow().addComponents([
        new SelectMenuComponent()
          .setCustomId(customId)
          .setPlaceholder('Select a pool')
          .setOptions(
            pools.map((pool) =>
              new SelectMenuOption().setLabel(pool.name).setValue(pool.id)
            )
          ),
      ]),
    ],
  })

  try {
    const poolInteraction = await reply.awaitMessageComponent({
      filter: (interaction) => interaction.customId === customId,
      componentType: 'SELECT_MENU',
      time: 60000,
    })

    const pool = pools.find((pool) => pool.id === poolInteraction.values[0])
    return [poolInteraction, pool]
  } catch (e) {
    await reply.update({
      content: 'No pool was selected or an error occured.',
      components: [],
    })
    return [null, null]
  }
}

const askUserToSelectTeam = async (interaction, teams) => {
  const customId = uuidv4()
  const update = await interaction.update({
    fetchReply: true,
    ephemeral: true,
    content: 'Select which existing option you want to rename.',
    components: [
      new MessageActionRow().addComponents([
        new SelectMenuComponent()
          .setCustomId(customId)
          .setPlaceholder('Select an option')
          .setOptions(
            // NOTE: Don't set emoji here. They may crash when invalid.
            teams.map((team, teamIndex) =>
              new SelectMenuOption()
                .setLabel(team.name)
                .setValue(teamIndex.toString())
            )
          ),
      ]),
    ],
  })

  try {
    const teamInteraction = await update.awaitMessageComponent({
      filter: (interaction) => interaction.customId === customId,
      componentType: 'SELECT_MENU',
      time: 60000,
    })

    const teamIndex = Number(teamInteraction.values[0])
    return [teamInteraction, teamIndex]
  } catch (e) {
    await interaction.update({
      content: 'No option was selected or an error occured.',
      components: [],
    })
    return [null, null]
  }
}

const askUserToConfirm = async (interaction, pool, teamIndex, newTeam) => {
  const customId = uuidv4() // unique customId for message

  const oldTeamText = getTeamDisplayText(pool.teams[teamIndex])
  const newTeamText = getTeamDisplayText(newTeam)

  const update = await interaction.update({
    fetchReply: true,
    ephemeral: true,
    content: `You are about to rename option **${oldTeamText}** into **${newTeamText}** for pool **${pool.name}**.`,
    components: [
      new MessageActionRow().addComponents([
        new ButtonComponent()
          .setCustomId(customId)
          .setStyle(1)
          .setLabel('Confirm'),
      ]),
    ],
  })

  try {
    const confirmInteraction = await update.awaitMessageComponent({
      filter: (interaction) => interaction.customId === customId,
      componentType: 'BUTTON',
      time: 60000,
    })

    return [confirmInteraction, true]
  } catch (e) {
    await interaction.update({
      content: 'You did not confirm or an error occured.',
      components: [],
    })
    return [null, false]
  }
}

const confirmTeamRename = async (interaction) => {
  await interaction.update({
    ephemeral: true,
    content: 'The option has been renamed.',
    components: [],
  })
}
