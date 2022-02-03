const Sentry = require('@sentry/node')
const { version } = require('../package.json')

Sentry.init({
  enabled: !!process.env.SENTRY_DSN,
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: version,
})
