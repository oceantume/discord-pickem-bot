const level = require('level')
const uuidv4 = require('uuid').v4

exports.db = level('./store/pickem-db')
exports.generateId = () => uuidv4()
