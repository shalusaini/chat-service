const { SocketEvent } = require('../../base/socket.js')
const { ThreadType } = require('../../base/thread.js')
const { SchemaID } = require('../../infra/db/mongo.js')
const { log, error } = require('../../infra/support/log.js')
const Redis = require('../../infra/redis/index.js')

// directly used, no defination
const redis = Redis.create()
function init (c, userProvider, io) {
  io.use(async (socket, next) => {
    let { token } = socket.handshake.auth
    token = token || socket.handshake.headers.authorization
    // const token = socket.handshake.headers.access_token
    // console.log({ token, handshake: socket.handshake })
    log('authorization request received!', { token })
    const result = await userProvider.token(token)
    if (!result.ok) {
      const err = result.value()
      error('error %o, token %s', err, token)
      next(new Error(err.message))
      return
    }
    const user = result.value()
    const userid = String(user.id)
    await socket.join(userid)
    socket.user = user
    socket.userid = userid
    next()
  })
  io.on('connection', socket => {
    log('Incomming connection!')
    const userId = socket.userid
    c.UserChat.updateOne(
      { userId },
      { $setOnInsert: { userId, unreadCount: 0 } },
      { upsert: true }
    ).catch(console.error)

    redis.hset(`sio.onlines`, { [userId]: 1 }).catch(console.error)
    socket.on('subscribe:thread', async data => {
      // console.log({data, user: socket.user})
      const thread = await c.Thread.findOne({ _id: SchemaID(data.threadId) })
      // console.log(thread)
      if (
        !thread ||
        (thread.type != ThreadType.Global &&
          !thread.users.includes(socket.userid))
      ) {
        socket.emit(SocketEvent.Error.default, {
          message: 'Thread not found.',
          event: 'subscribe:thread',
          ts: Date.now()
        })
        return
      }
      const localCounterQ = { threadId: thread._id, userId: socket.userid }
      await c.UserThread.updateMany(localCounterQ, { $set: { unreadCount: 0 } })
      await socket.join(thread._id.toString())
      redis
        .hset(`sio.subscribedthread`, { [userId]: thread._id })
        .catch(console.error)
      socket.threadid = thread._id.toString()
      socket.emit(SocketEvent.Subscribe.done, {
        subscription: 'thread',
        thread: data.threadId,
        ts: Date.now()
      })
    })
    socket.on('thread:typing', async data => {
      const threadId = socket.threadid
      if (!threadId) {
        socket.emit(SocketEvent.Error.default, {
          message: 'No thread subscription.',
          event: 'thread:typing',
          ts: Date.now()
        })
        return
      }
      const thread = await c.Thread.findOne(
        { _id: SchemaID(threadId) },
        { projection: { users: 1 } }
      )
      if (!thread) {
        socket.emit(SocketEvent.Error.default, {
          message: 'Thread not found.',
          event: 'thread:typing',
          ts: Date.now()
        })
        return
      }
      const reply = {
        typing: data.typing || false,
        user: socket.user,
        threadId
      }
      thread.users.forEach(uid => {
        socket.to(uid).emit('thread:typing', reply)
      })
    })
    socket.on('bot', data => {
      console.info('bot:', data)
      socket.emit(data.event, data.data)
    })

    socket.on('unsubscribe:thread', ({ threadId }) => {
      console.log('unsubscribe thread', threadId)
      socket.leave(threadId)
      redis.hdel('sio.onlines', userId).catch(console.error)
      redis.hdel('sio.subscribedthread', userId)
    })

    socket.on('disconnecting', () => {
      redis.hdel('sio.onlines', userId).catch(console.error)
      redis.hget('sio.subscribedthread', userId).catch(console.error)
      // old implementation
      // redis.lrem('sio.online.uids', 1, userId).catch(console.error);
      // redis.hdel('sio.onlines', userId).catch(console.error);
      // redis.hdel('sio.subscribedthread', userId)
      const response = { online: false, userId }
      c.Thread.find({ users: userId })
        .toArray()
        .then(threads => {
          const friends = new Set()
          for (const thread of threads) {
            for (const uid of thread.users) {
              if (!friends.has(uid)) {
                io.to(uid.toString()).emit('user:status', response)
                friends.add(uid)
              }
            }
          }
        })
        .catch(console.error)
    })
  })
}
module.exports = init
//# sourceMappingURL=index.js.map
