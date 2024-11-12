const { CreateError } = require('../../base/error.js')
const Result = require('../../base/result.js')
const {
  ThreadMessageEvent,
  ThreadMessageType,
  ThreadType
} = require('../../base/thread.js')
const { SchemaID } = require('../../infra/db/mongo.js')
const Conf = require('../../config.js')
const UpdateCountersForSendMessage = require('./counter.js')
const MessageTypes = () => [
  ThreadMessageType.Attachment,
  ThreadMessageType.Info,
  ThreadMessageType.Link,
  ThreadMessageType.MediaAudio,
  ThreadMessageType.MediaImage,
  ThreadMessageType.MediaVideo,
  ThreadMessageType.Text,
  ThreadMessageType.RichText,
  ThreadMessageType.Markdown
]
const Redis = require('../../infra/redis/index.js')
// directly used, no defination
const redis = Redis.create()
async function SendMessage (
  token,
  c,
  event,
  sender,
  attrs,
  thread,
  created = false
) {
  // default message type
  attrs.type = attrs.type || ThreadMessageType.Text
  // LINK message should have url in meta
  if (
    attrs.type == ThreadMessageType.Link &&
    (!attrs.meta || !attrs.meta.url)
  ) {
    return Result.fail(CreateError('Link is abesent'))
  }
  // ATTACHMENT and MEDIA_ message should have attachment in meta
  if (
    (ThreadMessageType.Attachment == attrs.type ||
      attrs.type.startsWith('MEDIA_')) &&
    (!attrs.meta || typeof attrs.meta.attachment != 'string')
  ) {
    return Result.fail(CreateError('Attachment is abesent'))
  }
  // check for thread
  thread = thread || (await c.Thread.findOne({ _id: SchemaID(attrs.threadId) }))
  if (!thread) {
    // thread not found
    return Result.fail(CreateError('Thread not found'))
  }
  // global thread does not have user refs
  if (
    thread.type != ThreadType.Global &&
    !thread.users.includes(sender.id.toString())
  ) {
    // sender is not a member of this thread
    return Result.fail(CreateError('Recipient user not found'))
  }
  const senderUserId = sender.id.toString()
  if (
    Array.isArray(thread.blockedUsers) &&
    thread.blockedUsers.includes(senderUserId)
  ) {
    // sender is blocked in this thread
    return Result.fail(CreateError('You are blocked', 400))
  }
  // receiver id, only required for one-to-one thread
  const receiverUserId = attrs.receiverUserId?.toString()

  // message model
  const message = {
    threadId: thread._id,
    senderUserId,
    content: attrs.content,
    createdAt: new Date(),
    meta: {},
    type: attrs.type || ThreadMessageType.Text
    // threadSubscribed
  }
  switch (thread.type) {
    case ThreadType.Single:
      // one-to-one thread should have receiver user id
      if (!receiverUserId) {
        return Result.fail(CreateError('Recipient user not found', 400))
      }
      message.threadSubscribed =
        (await redis.hget('sio.subscribedthread', receiverUserId)) ===
        thread._id.toString()
      message.receiverUserId = receiverUserId
      break
  }
  if (attrs.meta) {
    // process message meta
    if (attrs.meta.attachment) {
      // meta has attachment
      const result = await c.Storage.findOne({
        _id: SchemaID(attrs.meta.attachment)
      })
      if (!result) {
        return Result.fail(CreateError('Attachment not found'))
      }
      message.meta.attachment = result.file
      if (result.thumbnail) {
        // attachment has thumbnail
        message.meta.thumbnail = result.thumbnail
      } else if (attrs.meta.thumbnail) {
        // meta has thumbnail
        const result = await c.Storage.findOne({
          _id: SchemaID(attrs.meta.thumbnail)
        })
        if (!result) {
          return Result.fail(CreateError('Thumbnail not found'))
        }
        message.meta.thumbnail = result.file
      }
    }
    if (typeof attrs.meta.uuid == 'string' && attrs.meta.uuid.length <= 40) {
      // has UUID
      message.meta.uuid = attrs.meta.uuid
    }
    if (typeof attrs.meta.url == 'string' && attrs.meta.url.length <= 1000) {
      // has link
      message.meta.url = attrs.meta.url
    }
  }
  const promises = [
    // TODO: use redis as frontend
    c.ThreadMessage.insertOne(message)
  ]
  const threadUpdates = { $push: { messages: message } }
  if (Array.isArray(thread.deletedByUsers) && thread.deletedByUsers.length) {
    // remove users, those have deleted this thread
    threadUpdates.$pullAll = { deletedByUsers: thread.deletedByUsers }
  }
  if (
    message.receiverUserId &&
    Array.isArray(thread.blockedUsers) &&
    thread.blockedUsers.includes(message.receiverUserId)
  ) {
    // unblock user
    threadUpdates.$pull = { blockedUsers: message.receiverUserId }
  }
  threadUpdates.$set = { updatedAt: message.createdAt }
  // push message to thread query
  promises.push(c.Thread.updateOne({ _id: thread._id }, threadUpdates))
  // remove message  = require( thread messages logic
  if (thread.messages.length >= Conf.chat.thread.recentMessagesCount) {
    promises.push(
      c.Thread.updateOne({ _id: thread._id }, { $pop: { messages: -1 } })
    )
  }
  await Promise.all(promises)
  // TODO: use redis as frontend
  UpdateCountersForSendMessage(c, thread, message)
  // frontend request
  message.createdAt = message.createdAt.toISOString()
  console.log('calling fron send message api==================>', {
    event: ThreadMessageEvent.Send,
    data: {
      thread,
      message,
      sender,
      created,
      token
    }
  })

  // dispatch send message event
  event.dispatch({
    event: ThreadMessageEvent.Send,
    data: {
      thread,
      message,
      sender,
      created,
      token
    }
  })
  return Result.ok(message)
}
async function DeleteMessage (c, user, thread, message) {
  ;[thread, message] = await Promise.all([
    typeof thread == 'string'
      ? c.Thread.findOne({ _id: SchemaID(thread) })
      : Promise.resolve(thread),
    typeof message == 'string'
      ? c.ThreadMessage.findOne({ _id: SchemaID(message) })
      : Promise.resolve(message)
  ])
  if (!thread || !message) {
    return Result.fail(CreateError('Invalid request', 400))
  }
  if (thread._id.toString() != message.threadId.toString()) {
    return Result.fail(CreateError('Request message does not exists', 404))
  }
  const result = await c.ThreadMessage.updateOne(
    { _id: message._id },
    { $addToSet: { deletedByUsers: user.id.toString() } }
  )
  if (!result.modifiedCount) {
    return Result.fail(CreateError('internal server error', 500))
  }
  return Result.ok()
}
module.exports = {
  MessageTypes,
  SendMessage,
  DeleteMessage
}
//# sourceMappingURL=message.js.map
