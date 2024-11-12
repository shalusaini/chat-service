const SocketEvent = {
  Subscribe: { done: 'subscribed' },
  Thread: { new: 'thread:new', update: 'thread:update' },
  Error: { default: 'errored' },
  Message: { default: 'message' }
}
const SocketNS = {
  Chat: '/chat'
}
module.exports = {
  SocketEvent,
  SocketNS
}
//# sourceMappingURL=socket.js.map
