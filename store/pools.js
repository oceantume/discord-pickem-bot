const { db, generateId } = require('./db')

/*
A pool is an instance of PickEm.

Pools are stored using the key format `pool:${guildId}:${poolId}`.
That key has the following useful properties:
 - iteration through all pools for a guildId
 - access to a specific pool with a guildId and poolId
*/

exports.createPool = async (guildId, poolInfo) => {
  const id = await generateId()

  const pool = {
    id,
    status: 'new',
    createdAt: new Date(),
    name: poolInfo.name,
    userId: poolInfo.userId,
    channelId: poolInfo.channelId,
    teams: poolInfo.teams,
    questions: poolInfo.questions,
  }

  await db.put(`pool:${guildId}:${id}`, JSON.stringify(pool))

  return pool
}

exports.getPool = async (guildId, poolId) => {
  return JSON.parse(await db.get(`pool:${guildId}:${poolId}`))
}

exports.getPoolsInGuild = async (guildId) => {
  const itr = db.iterator({
    gt: `pool:${guildId}:`,
    lte: `pool:${guildId}:~`,
    keys: false,
  })

  const result = []
  for await (const [, value] of itr) {
    result.push(JSON.parse(value))
  }
  return result
}

exports.getPoolsInChannel = async (guildId, channelId) => {
  const pools = await exports.getPoolsInGuild(guildId)
  return pools.filter((pool) => pool.channelId === channelId)
}

exports.getActivePoolsInChannel = async (guildId, channelId) => {
  const pools = await exports.getPoolsInChannel(guildId, channelId)
  return pools.filter((pool) => pool.status === 'active')
}

exports.deletePool = async (guildId, poolId) => {
  await db.del(`pool:${guildId}:${poolId}`)
}

exports.updatePool = async (guildId, poolId, pool) => {
  await db.put(`pool:${guildId}:${poolId}`, JSON.stringify(pool))
}

exports.updatePoolQuestion = async (
  guildId,
  poolId,
  questionIndex,
  question
) => {
  const pool = await exports.getPool(guildId, poolId)
  pool.questions[questionIndex] = question
  await exports.updatePool(guildId, poolId, pool)
}

exports.activatePool = async (guildId, poolId) => {
  const pool = await exports.getPool(guildId, poolId)
  pool.status = 'active'
  await exports.updatePool(guildId, poolId, pool)
}

exports.lockPool = async (guildId, poolId) => {
  const pool = await exports.getPool(guildId, poolId)
  pool.status = 'locked'
  await exports.updatePool(guildId, poolId, pool)
}

exports.updatePoolMessage = async (guildId, poolId, messageId) => {
  const pool = await exports.getPool(guildId, poolId)
  pool.messageId = messageId
  await exports.updatePool(guildId, poolId, pool)
}
