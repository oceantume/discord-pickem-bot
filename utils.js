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
