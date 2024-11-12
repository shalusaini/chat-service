const { MongoClient, ObjectId } = require('mongodb')
const Conf = require('../../config.js')
const { debug, info } = require('../support/log.js')
function connect (url) {
  let connected = false
  return (async () => {
    if (connected) {
      throw new Error('already connected!')
    }
    url = url || Conf.mongo.url
    debug('connecting to:', url)
    const client = new MongoClient(url, { maxPoolSize: 10 })
    await client.connect()
    connected = true
    // eslint-disable-next-line no-console
    info('Connected successfully to mongodb!')
    const collections = {
      Thread: client.db().collection('threads'),
      ThreadMessage: client.db().collection('thread_messages'),
      Storage: client.db().collection('storage'),
      UserThread: client.db().collection('user_threads'),
      UserChat: client.db().collection('user_chat'),
      SignedLink: client.db().collection('signed_links')
    }
    // collections.User.createIndex({ userId: 1 }, { unique: true });
    return { collections, client }
  })()
}
function ValidateID (id) {
  return ObjectId.isValid(id)
}
function SchemaID (id) {
  return new ObjectId(id)
}
function CreateSchemaID () {
  return new ObjectId()
}
function DomainID (id) {
  return id.toString()
}
function StringID (id) {
  return id.toString()
}

module.exports = {
  connect,
  ValidateID,
  SchemaID,
  CreateSchemaID,
  DomainID,
  StringID
}
//# sourceMappingURL=mongo.js.map
