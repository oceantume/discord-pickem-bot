const level = require('level')
const uuidv4 = require('uuid').v4

const location = process.env.DATABASE_LOCATION || './store/pickem-db'

exports.db = level(location)
exports.generateId = () => uuidv4()
