const { SchemaID, ValidateID } = require('../../infra/db/mongo.js')
const SignLink = require('../../infra/services/link.js')
const { DeleteMessage } = require('../../app/thread/message.js')
const { MessageTypes, SendMessage } = require('../../app/thread/message.js')
const {
  CreateGlobalThread,
  CreateOneToOneThread
} = require('../../app/thread/thread.js')
const StorageStreamer = require('../storage/util.js')
const { ThreadType } = require('../../base/thread.js')
const { GetGroupProvider } = require('../../infra/services/group.js')
async function messageSend (ctx) {
  await ctx.validate({
    threadId: 'requiredWithout:receiverUserId',
    group: 'boolean',
    receiverUserId: 'requiredWithout:threadId',
    content: 'requiredWithout:meta|string|maxLength:500',
    meta: 'object',
    type: `string|in:${MessageTypes()}`
  })
  const attrs = ctx.attrs()
  let thread
  let created = false
  if (!attrs.group && attrs.receiverUserId) {
    // one to one thread logic
    const receiverResult = await ctx.userProvider.get(ctx.token, [
      attrs.receiverUserId
    ])
    if (!receiverResult.ok) {
      ctx.throw(receiverResult.value())
    }
    const [receiver] = receiverResult.value().users
    console.log({ receiver, user: ctx.user })
    if (!receiver) {
      ctx.throw(400, 'Recipient is missing.')
    }
    attrs.receiverUserId = receiver.id.toString()
    if (attrs.receiverUserId == ctx.userid) {
      ctx.throw(400, 'Recipient is invalid.')
    }
    const result = await CreateOneToOneThread(
      ctx.token,
      ctx.db,
      ctx.userProvider,
      ctx.event,
      ctx.user,
      attrs,
      receiver
    )
    if (!result.ok) {
      ctx.throw(result.error())
    }
    ;({ thread, created } = result.value())
    attrs.threadId = thread._id
  } else if (attrs.group && attrs.receiverUserId) {
    // group thread logic
    const result = await CreateGlobalThread(
      ctx.token,
      ctx.db,
      GetGroupProvider(),
      { groupId: attrs.receiverUserId }
    )
    if (!result.ok) {
      ctx.throw(result.error())
    }
    ;({ thread } = result.value())
  }
  const result = await SendMessage(
    ctx.token,
    ctx.db,
    ctx.event,
    ctx.user,
    attrs,
    thread,
    created
  )
  if (result.ok) {
    ctx.status = 204
    return
  }
  ctx.throw(result.error())
}
async function messageStreamAttachment (ctx) {
  await ctx.validate(
    {
      threadId: 'required|mongoId',
      messageId: 'required|mongoId'
    },
    ctx.query
  )
  const attrs = ctx.query
  const [thread, message] = await Promise.all([
    ctx.db.Thread.findOne({
      _id: SchemaID(attrs.threadId),
      users: ctx.userid
    }),
    ctx.db.ThreadMessage.findOne({
      _id: SchemaID(attrs.messageId),
      threadId: SchemaID(attrs.threadId)
    })
  ])
  if (!thread || !message || !message.meta) {
    ctx.throw(404, 'Page not found.')
  }
  if (thread.type != ThreadType.Global) {
    const user = thread.users.find(id => id === ctx.userid)
    if (!user) {
      ctx.throw(400, 'Resources is forbidden.')
    }
  }
  const key = ctx.query.thumbnail ? 'thumbnail' : 'attachment'
  if (typeof message.meta[key] != 'object' || !message.meta[key].key) {
    ctx.throw(404, 'Page not found.')
  }
  await StorageStreamer(ctx, message.meta[key])
}

// this is for video
async function messageSignAttachment (ctx) {
  await ctx.validate({
    threadId: 'required|mongoId',
    messageId: 'required|mongoId'
  })
  const attrs = ctx.attrs()
  const [thread, message] = await Promise.all([
    ctx.db.Thread.findOne({
      _id: SchemaID(attrs.threadId),
      users: ctx.userid
    }),
    ctx.db.ThreadMessage.findOne({
      _id: SchemaID(attrs.messageId),
      threadId: SchemaID(attrs.threadId)
    })
  ])
  if (!thread || !message || !message.meta) {
    ctx.throw(404, !thread ? 'Thread not found.' : 'Message not found.')
  }
  if (thread.type != ThreadType.Global) {
    const user = thread.users.find(id => id === ctx.userid)
    if (!user) {
      ctx.throw(400, 'Resources forbidden.')
    }
  }
  if (
    (message.type !== 'ATTACHMENT' &&
      message.type !== 'MEDIA_VIDEO' &&
      message.type !== 'MEDIA_AUDIO') ||
    typeof message.meta.attachment != 'object' ||
    !message.meta.attachment.key
  ) {
    ctx.throw(404, 'Page not found.')
  }
  const token = await SignLink(
    ctx.db,
    message._id,
    ctx.userid,
    message.meta.attachment
  )
  ctx.reply({ token })
}
async function messageDelete (ctx) {
  const result = await DeleteMessage(
    ctx.db,
    ctx.user,
    ctx.params.id,
    ctx.params.message
  )
  if (!result.ok) {
    ctx.throw(result.error())
  }
  ctx.reply({ message: 'Message deleted.' })
}
// list thread messages.
async function messageList (ctx) {
  if (!ValidateID(ctx.query.id)) {
    ctx.throw(400, 'Thread id is missing.')
  }
  const thread = await ctx.db.Thread.findOne(
    { _id: SchemaID(ctx.query.id) },
    { projection: { _id: 1, type: 1, users: 1 } }
  )
  if (
    !thread ||
    (thread.type != ThreadType.Global && !thread.users.includes(ctx.userid))
  ) {
    ctx.throw(404, 'Thread not found')
  }
  const q = { threadId: thread._id }
  const sort = { _id: -1 }
  if (ctx.query.oldest) {
    sort._id = -1
    q._id = { $lt: SchemaID(ctx.query.oldest) }
  } else if (ctx.query.newest) {
    q._id = { $gt: SchemaID(ctx.query.newest) }
    sort._id = 1
  }
  const messages = await ctx.db.ThreadMessage.find(q, {
    sort,
    limit: 251
  }).toArray()
  if (sort._id == -1) {
    messages.reverse()
  }
  // let more = false
  // if (messages.length == 251) {
  //   more = true
  //   messages.pop()
  // }
  if (thread.type == ThreadType.Global && messages.length) {
    const uids = []
    for (const msg of messages) {
      uids.push(msg.senderUserId)
    }
    const result = await ctx.userProvider.get(ctx.token, uids)
    if (!result.ok) {
      ctx.throw(result.error())
    }
    const { users } = result.value()
    ctx.reply({ messages, users })
    // ctx.reply({ messages, more, users })
    return
  }
  // ctx.reply({ messages, more })
  ctx.reply({ messages })
}

module.exports = {
  messageSend,
  messageStreamAttachment,
  messageSignAttachment,
  messageDelete,
  messageList
}
