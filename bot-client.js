const { Client, Intents } = require('discord.js')

exports.botClient = new Client({ intents: [Intents.FLAGS.GUILDS] })
