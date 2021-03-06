require('dotenv').config()

require('./utils/sentry')

require('./features/pool-creation')
require('./features/pool-deletion')
require('./features/pool-locking')
require('./features/predictions')
require('./features/export')
require('./features/option-rename')

const { botClient } = require('./bot-client')

botClient.once('ready', (client) => {
  console.log('Bot client is ready!')
})

const { BOT_TOKEN: token } = process.env
botClient.login(token)
