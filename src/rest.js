require('./config.js')
const { connect } = require('./infra/db/mongo.js')
const { GetUserProvider } = require('./infra/services/user.js')
const { EventService } = require('./infra/services/events.js')
const http = require('./http/index.js')
connect().then(db => {
  const userProvider = GetUserProvider()
  const eventS = new EventService()
  http(db, eventS, userProvider)
})