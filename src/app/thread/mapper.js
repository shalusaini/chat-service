function LeanThread (thread, includes = []) {
  const result = {
    _id: thread._id,
    name: thread.name,
    type: thread.type,
    ownerId: thread.ownerId,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt
  }
  for (const key in includes) {
    if (thread[key]) {
      result[key] = thread[key]
    }
  }
  return result
}
function LeanMessage (message, includes = []) {
  const result = {
    _id: message._id,
    threadId: message.threadId,
    senderUserId: message.senderUserId,
    receiverUserId: message.receiverUserId,
    content: message.content,
    type: message.type,
    meta: message.meta,
    sender: message.sender,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt
  }
  for (const key in includes) {
    if (message[key]) {
      result[key] = message[key]
    }
  }
  return result
}
module.exports = {
  LeanThread,
  LeanMessage
}
//# sourceMappingURL=mapper.js.map
