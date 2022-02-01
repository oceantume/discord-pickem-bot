const { db } = require('./db')

/*
A prediction is a list of answers to a pool's questions, made by a specific user.
The answers can be edited at any time, as long as the pool is active.

User predictions are stored using the key format `prediction:${poolId}:${userId}`.
That key has the following useful properties:
 - iteration through all predictions for a poolId
 - access to a specific prediction with a poolId and userId
*/

exports.getPrediction = async (poolId, userId) => {
  const [storedValue] = await db.getMany([`prediction:${poolId}:${userId}`])
  return storedValue && JSON.parse(storedValue)
}

exports.updatePrediction = async (poolId, userId, questionIndex, answer) => {
  let prediction = await exports.getPrediction(poolId, userId)

  if (!prediction) {
    prediction = {
      poolId,
      userId,
      answers: [],
    }
  }

  prediction.answers[questionIndex] = answer

  await db.put(`prediction:${poolId}:${userId}`, JSON.stringify(prediction))
}

exports.updatePredictionSharedAt = async (poolId, userId, sharedAt) => {
  let prediction = await exports.getPrediction(poolId, userId)

  if (!prediction) {
    return
  }

  prediction.sharedAt = sharedAt

  await db.put(`prediction:${poolId}:${userId}`, JSON.stringify(prediction))
}

exports.getPoolPredictions = async (poolId) => {
  const itr = db.iterator({
    gt: `prediction:${poolId}:`,
    lte: `prediction:${poolId}:~`,
    keys: false,
  })

  const result = []
  for await (const [, value] of itr) {
    result.push(JSON.parse(value))
  }
  return result
}

exports.getPoolPredictions = async function* (poolId) {
  const itr = db.iterator({
    gt: `prediction:${poolId}:`,
    lte: `prediction:${poolId}:~`,
    keys: false,
  })

  for await (const [, value] of itr) {
    yield JSON.parse(value)
  }
}
