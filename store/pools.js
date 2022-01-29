const { db, generateId } = require('./db')

/*
A pool is an instance of PickEm.
Pools are stored using the key format `pool:${poolId}`.
*/

exports.createPool = async (poolInfo) => {
  const id = await generateId()

  const pool = {
    id,
    state: 'new',
    createdAt: new Date(),
    name: poolInfo.name,
    userId: poolInfo.userId,
    channelId: poolInfo.channelId,
    teams: poolInfo.teams,
    questions: poolInfo.questions,
  }

  await db.put(`pool:${id}`, JSON.stringify(pool))

  return pool
}

exports.getPool = async (poolId) => {
  return JSON.parse(await db.get(`pool:${poolId}`))
}

exports.deletePool = async (poolId) => {
  await db.del(poolId)
}

exports.updatePool = async (poolId, pool) => {
  await db.put(`pool:${poolId}`, JSON.stringify(pool))
}

exports.updatePoolQuestion = async (poolId, questionIndex, question) => {
  const pool = await exports.getPool(poolId)
  pool.questions[questionIndex] = question
  await exports.updatePool(poolId, pool)
}
