const fs = require('fs')
const { ReadPreference } = require('mongodb')
const { Router } = require('repulser')
const sbody = require('@ukab/sbody')
const compose = require('koa-compose')
const Conf = require('../config.js')
const path = require('path')
const app = require('../infra/http/index.js')
const { GetUserProvider } = require('../infra/services/user.js')
const emitter = require('../infra/ws/emitter.js')
const { info } = require('../infra/support/log.js')
const threadInit = require('../app/thread/index.js')
// controllers
const thread = require('./thread/index.js')
const storage = require('./storage/index.js')
const user = require('./user/index.js')
// internal controllers
const internal = require('./internal/index.js')
const { GetPushProvider } = require('../infra/services/push.js')
// setup stream receiver
const streamReceiver = sbody.default()
// setup router
const router = new Router({})
// internal router
router.use(internal)
// user routers
router.use(thread)
router.use(storage)
router.use(user)
router.get('/', [
  ctx => {
    ctx.body = {
      name: Conf.name,
      version: Conf.version
    }
  }
])
// if (Conf.env.name != 'production') {
//   router.get('/chat.html', [
//     async ctx => {
//       ctx.set('content-type', 'text/html')
//       ctx.body = fs.createReadStream('../../example/chat.html')
//     }
//   ])
//   router.get('/chat.css', [
//     async ctx => {
//       ctx.set('content-type', 'text/css')
//       ctx.body = fs.createReadStream('../../example/chat.css')
//     }
//   ])
//   router.get('/chat.js', [
//     async ctx => {
//       ctx.set('content-type', 'text/javascript')
//       ctx.body = fs.createReadStream('../../example/chat.js')
//     }
//   ])
//   router.get('/media.html', [
//     async ctx => {
//       ctx.set('content-type', 'text/html')
//       ctx.body = fs.createReadStream('../../example/media.html')
//     }
//   ])
// }
if (Conf.env.name != 'production') {
  router.get('/chat.html', [
    async ctx => {
      ctx.set('content-type', 'text/html')
      const file = path.join(process.cwd().split('/src')[0],'example/chat.html');
      ctx.body = fs.createReadStream(file)
    }
  ])
  router.get('/chat.css', [
    async ctx => {
      ctx.set('content-type', 'text/css')
      const file = path.join(process.cwd().split('/src')[0],'example/chat.css');
      ctx.body = fs.createReadStream(file)
    }
  ])
  router.get('/chat.js', [
    async ctx => {
      ctx.set('content-type', 'text/javascript')
      const file = path.join(process.cwd().split('/src')[0],'example/chat.js');
      ctx.body = fs.createReadStream(file)
    }
  ])
  router.get('/media.html', [
    async ctx => {
      ctx.set('content-type', 'text/html')
      const file = path.join(process.cwd().split('/src')[0],'example/media.html');
      ctx.body = fs.createReadStream(file)
    }
  ])
}
async function transaction (client, callback) {
  const session = client.startSession()
  const transactionOptions = {
    readPreference: ReadPreference.PRIMARY,
    readConcern: { level: 'local' },
    writeConcern: { w: 'majority' },
    maxCommitTimeMS: 2 * 60 * 1000
  }
  try {
    session.startTransaction(transactionOptions)
    await callback(session)
  } catch (e) {
    await session.abortTransaction()
  } finally {
    await session.endSession()
  }
}
async function init (db, eventS, userProvider, pushProvider) {
  userProvider = userProvider || GetUserProvider()
  pushProvider = pushProvider || GetPushProvider()
  threadInit(eventS, emitter, pushProvider)
  app.use(async (ctx, next) => {
    ctx.userProvider = userProvider
    ctx.event = eventS
    ctx.db = db.collections
    ctx.transaction = transaction.bind(null, db.client)
    ctx.attrs = () => ctx.request.body || {}
    await streamReceiver(ctx)
    ctx.params = {}
    const route = router.find(ctx.method.toUpperCase(), ctx.path, ctx.params)
    // console.log(ctx.method, ctx.path, route);
    if (route) {
      const handler = compose(route.handler)
      await handler(ctx, null)
    }
    return await next()
  })
  app.server.listen(Conf.port, Conf.host, () => {
    info(`Rest API server will listen to port ${Conf.host}:${Conf.port}.`)
  })
  return app
}
module.exports = init