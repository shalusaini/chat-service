const ws = require('../infra/ws/index.js')
const { SocketNS } = require('../base/socket.js')
const chatService = require('./chat/index.js')
async function init (server, db, userProvider) {
  const io = ws(server)
  // const socket = io.of('/chat')
  chatService(db.collections, userProvider,io.of(SocketNS.Chat))
}
module.exports = init
//# sourceMappingURL=index.js.map
