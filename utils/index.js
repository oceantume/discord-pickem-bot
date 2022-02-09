const emojiRegex = require('emoji-regex')

const customIdRegex =
  /^pool:([a-zA-Z0-9-]+):([a-zA-Z0-9-]+)((?::[a-zA-Z0-9-]+)*)$/

exports.parsePoolCustomId = (customId) => {
  const match = customId && customId.match(customIdRegex)

  if (!match) {
    return null
  }

  const [, poolId, action, rawParams] = match
  const params = (rawParams && rawParams.split(':').slice(1)) || []

  return { poolId, action, params }
}

exports.getTeamDisplayText = (team) => {
  if (!team.emoji) {
    return team.name
  }

  const { name, id } = team.emoji
  if (name && id) {
    return `<:${name}:${id}> ${team.name}`
  }

  return `${name} ${team.name}`
}

// match a string that starts with a unicode emoji or a discord emoji code `<:name:id>`
const teamWithEmojiRegex = new RegExp(
  `(?:(${emojiRegex().source})|<:([a-zA-Z0-9_]{2,}):(\\d+)>)(.+)`
)

exports.extractTeamFromString = (str) => {
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
