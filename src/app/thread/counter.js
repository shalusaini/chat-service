const { ThreadType } = require('../../base/thread.js')
async function UpdateCountersForSendMessage (c, thread, message) {
  // TODO: use redis as frontend
  let localCounterQ = {
    threadId: thread._id,
    userId: { $ne: message.senderUserId }
  }
  let globalCounterQ = {
    userId: { $in: thread.users, $ne: message.senderUserId }
  }
  if (thread.type === ThreadType.Single) {
    localCounterQ = { threadId: thread._id, userId: message.receiverUserId }
    globalCounterQ = { userId: message.receiverUserId }
  }
  const promises = []
  // update global unread count query
  promises.push(
    c.UserThread.updateMany(localCounterQ, { $inc: { unreadCount: 1 } })
  )
  if (Array.isArray(thread.users) && thread.users.length) {
    promises.push(
      c.UserChat.updateMany(globalCounterQ, { $inc: { unreadCount: 1 } })
    )
  }
  await Promise.all(promises)
}
module.exports = UpdateCountersForSendMessage
//# sourceMappingURL=counter.js.map
