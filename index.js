require('dotenv').config()

require('./features/pool-creation')
require('./features/pool-deletion')
require('./features/pool-locking')
require('./features/predictions')
require('./features/export')

const { botClient } = require('./bot-client')

botClient.once('ready', (client) => {
  console.log('Bot client is ready!')
})

const { DISCORD_TOKEN: token } = process.env
botClient.login(token)
