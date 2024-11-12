const { Server } = require('socket.io')
const { createAdapter } = require('@socket.io/redis-adapter')
const redis = require('../redis/index.js')
const Conf = require('../../config.js')
function init (server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      allowedHeaders: [],
      credentials: false
    },
    allowEIO3: true ,
    pingTimeout: 5 * 1000,
    serveClient: false,
    transports: ['websocket']
  })
  const pubClient = redis.create(Conf.socketio.key)
  const subClient = pubClient.duplicate()
  io.adapter(createAdapter(pubClient, subClient, { key: Conf.socketio.key }))
  return io
}
module.exports = init
//# sourceMappingURL=index.js.map
