async function UnreadCountOfThreads (c, threadIds, userId) {
  // TODO: use redis as frontend
  const q = { threadId: { $in: threadIds } }
  if (userId) {
    q.userId = userId
  }
  const result = await c.UserThread.find(q).toArray()
  const counter = {}
  for (const item of result) {
    counter[item.threadId.toString()] = {
      threadId: item.threadId,
      userId: item.userId,
      unreadCount: item.unreadCount
    }
  }
  return counter
}
async function UnreadCountOfUsers (c, userIds) {
  // TODO: use redis as frontend
  const result = await c.UserChat.find({ userId: { $in: userIds } }).toArray()
  const counter = {}
  for (const item of result) {
    counter[item.userId.toString()] = {
      userId: item.userId,
      unreadCount: item.unreadCount
    }
  }
  return counter
}
module.exports = {
  UnreadCountOfThreads,
  UnreadCountOfUsers
}
//# sourceMappingURL=counter.js.map
