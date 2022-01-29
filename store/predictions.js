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
      answers: [],
    }
  }

  prediction.answers[questionIndex] = answer

  await db.put(`prediction:${poolId}:${userId}`, JSON.stringify(prediction))
}
