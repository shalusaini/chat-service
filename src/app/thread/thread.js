const store = require('../storage.js')
const { CreateError } = require('../../base/error.js')
const Result = require('../../base/result.js')
const { ThreadEvent, ThreadType } = require('../../base/thread.js')
const { CreateSchemaID, SchemaID } = require('../../infra/db/mongo.js')
const { log } = require('../../infra/support/log.js')
const Redis = require('../../infra/redis/index.js')
// directly used, no defination
const redis = Redis.create()

async function FindThread (token, c, userProvider, userId, id) {
  const thread = await c.Thread.findOne({ _id: SchemaID(id) })
  if (!thread) {
    return Result.fail(CreateError('Thread not found', 404))
  }
  const totalMessages=await c.ThreadMessage.countDocuments({
    threadId: SchemaID(id)
  })
  let users = []
  if (Array.isArray(thread.users) && thread.users.length) {
    const userIds = []
    // getting thread users ids.
    for (const user of thread.users) {
      userIds.push(user)
    }
    // getting thread user details.
    const result = await userProvider.get(token, userIds)
    if (!result.ok) {
      return result
    }
    users = result.value().users
    if (thread.type == ThreadType.Single) {
      const otherUserId =
        thread.ownerId == userId ? thread.receiverUserId : userId
      thread.recipientOnline = !!(await redis.hget('sio.onlines', otherUserId));
      thread.totalMessages=totalMessages
    }
  }
  return Result.ok({ thread, users })
}

async function FindUserThread (token, c, userProvider, userId, id) {
  // this is only work in case of one to one chat
  const thread = await c.Thread.findOne({
    $or: [
      { receiverUserId: id, ownerId: userId },
      { receiverUserId: userId, ownerId: id }
    ]
  })
  if (!thread) {
    return Result.fail(CreateError('Thread not found', 404))
  }
  let users = []
  if (Array.isArray(thread.users) && thread.users.length) {
    const userIds = []
    // getting thread users ids.
    for (const user of thread.users) {
      userIds.push(user)
    }
    // getting thread user details.
    const result = await userProvider.get(token, userIds)
    if (!result.ok) {
      return result
    }
    users = result.value().users
    if (thread.type == ThreadType.Single) {
      const otherUserId =
        thread.ownerId == userId ? thread.receiverUserId : userId
      thread.recipientOnline = !!(await redis.hget('sio.onlines', otherUserId))
    }
  }
  return Result.ok({ thread, users })
}
async function CreateOneToOneThread (
  token,
  c,
  userProvider,
  eventS,
  user,
  attrs,
  receiver
) {
  if (!receiver) {
    const receiverResult = await userProvider.get(token, [attrs.receiverUserId])
    if (!receiverResult.ok) {
      return receiverResult
    }
    ;[receiver] = receiverResult.value().users
    if (!receiver) {
      return Result.fail(CreateError('Recipient is missing.', 400))
    }
  }

  const senderUserId = user.id.toString()
  const receiverUserId = receiver.id.toString()
  if (senderUserId == receiverUserId) {
    return Result.fail(CreateError('Recipient is missing.', 500))
  }
  const q = {
    $and: [
      {
        $or: [{ ownerId: senderUserId }, { ownerId: receiverUserId }]
      },
      {
        users: {
          $all: [
            { $elemMatch: { $eq: senderUserId } },
            { $elemMatch: { $eq: receiverUserId } }
          ]
        }
      }
    ],
    type: ThreadType.Single
  }
  const existing = await c.Thread.findOne(q)
  if (existing) {
    return Result.ok({ thread: existing, created: false })
  }
  const result = await c.Thread.findOneAndUpdate(
    q,
    {
      $setOnInsert: {
        name: attrs.name,
        type: ThreadType.Single,
        ownerId: senderUserId,
        ownerName: user.name,
        receiverUserId,
        users: [senderUserId, receiverUserId],
        blockedUsers: [],
        messages: [],
        createdAt: new Date()
      },
      $set: {
        updatedAt: new Date()
      }
    },
    { upsert: true }
  )
  if (!result.ok) {
    return Result.fail(CreateError('failed to create thread', 500))
  }
  const thread = await c.Thread.findOne(q)
  if (!thread) {
    return Result.fail(CreateError('Thread not found', 500))
  }
  log('create one-to-one thread %o', { thread, created: !result.value })
  const created = !result.value
  if (created) {
    const threadId = result.upsertedId || result.lastErrorObject.upserted
    await c.UserThread.insertMany([
      { userId: senderUserId, threadId },
      { userId: receiverUserId, threadId }
    ])
    console.log({eventS})
    eventS.dispatch(ThreadEvent.New, { thread, owner: user, token, created })
  }
  return Result.ok({ thread, created })
}
async function CreateTeamThread (token, c, events, userProvider, user, attrs) {
  const threadId = CreateSchemaID()
  let members = await userProvider.get(token, attrs.users)
  if (!members.ok) {
    return members
  }
  members = members.value().users
  if (members.length != attrs.users.length) {
    return Result.fail(CreateError('Some users are missing or are invalid'))
  }
  attrs.users = members.map(user => user.id.toString())
  const ownerId = user.id.toString()
  // adding ownerId to team Users.
  if (!attrs.users.includes(ownerId)) {
    attrs.users.push(ownerId)
  }
  const thread = {
    _id: threadId,
    name: attrs.name,
    type: ThreadType.Team,
    ownerId,
    users: attrs.users,
    blockedUsers: [],
    messages: [],
    createdAt: new Date()
  }
  let storeImage = null
  if (attrs.image) {
    const aquired = await store.Aquire(c, attrs.image, thread.ownerId)
    if (!aquired.ok) {
      return aquired
    }
    storeImage = aquired.value()
    thread.image = storeImage.file
  }
  const result = await c.Thread.insertOne(thread)
  if (!result.insertedId) {
    await store.Release(c, storeImage._id)
    return Result.fail(CreateError('failed to create thread', 500))
  }
  if (storeImage) {
    // can work in background
    store.Consume(c, storeImage._id)
  }
  const models = []
  thread.users.forEach(userId => {
    models.push({ userId, threadId: thread._id })
  })
  c.UserThread.insertMany(models)
  events.dispatch(ThreadEvent.New, { thread, owner: user, token })
  return Result.ok(thread)
}
async function CreateGlobalThread (token, c, groupProvider, attrs) {
  const groupId = attrs.groupId.toString()
  let group = await groupProvider.get(token, groupId)
  if (!group.ok) {
    return group
  }
  group = group.value()
  // no need to update in case of same name
  const existingGroup = await c.Thread.findOne({
    groupId,
    type: ThreadType.Global
  })
  if (
    existingGroup &&
    existingGroup.name == group.name &&
    existingGroup.classId == group.class_id
  ) {
    return Result.ok({ thread: existingGroup, created: false })
  }
  const result = await c.Thread.findOneAndUpdate(
    { groupId, type: ThreadType.Global },
    {
      $setOnInsert: {
        groupId,
        type: ThreadType.Global,
        messages: [],
        createdAt: new Date()
        // name: group.name,
        // classId: group.class_id,
      },
      $set: {
        name: group.name,
        classId: group.class_id,
        updatedAt: new Date()
      }
    },
    { upsert: true }
  )
  if (!result.ok) {
    return Result.fail(CreateError('failed to create thread', 500))
  }
  const thread = await c.Thread.findOne({ groupId, type: ThreadType.Global })
  if (!thread) {
    return Result.fail(CreateError('Thread not found', 500))
  }
  log('create group thread %o', { thread, created: !result.value })
  return Result.ok({ thread, created: !result.value })
}
async function BlockThreadUser (c, user, thread, blockUserId) {
  // TODO: use redis as frontend
  thread =
    typeof thread == 'string'
      ? await c.Thread.findOne({ _id: SchemaID(thread) })
      : thread
  if (!thread || thread.type == ThreadType.Global) {
    return Result.fail(CreateError('Thread not found', 400))
  }
  if (
    thread.type != ThreadType.Single &&
    user.id.toString() != thread.ownerId
  ) {
    return Result.fail(
      CreateError('You have no permission to block user of this thread', 403)
    )
  }
  if (thread.blockedUsers.includes(blockUserId)) {
    return Result.fail(CreateError('This user is already blocked', 400))
  }
  if (!thread.users.includes(blockUserId)) {
    return Result.fail(
      CreateError('This user is not a memeber of this thread', 400)
    )
  }
  const updates = {
    $pull: { users: blockUserId },
    $addToSet: { blockedUsers: blockUserId }
  }
  if (thread.type == ThreadType.Single) {
    // single thread should not remove user  = require( users
    delete updates.$pull
  }
  const result = await c.Thread.updateOne({ _id: thread._id }, updates)
  if (!result.modifiedCount) {
    return Result.fail(CreateError('internal server error', 500))
  }
  return Result.ok()
}
async function UnblockThreadUser (c, user, thread, unblockUserId) {
  // TODO: use redis as frontend
  thread =
    typeof thread == 'string'
      ? await c.Thread.findOne({ _id: SchemaID(thread) })
      : thread
  if (!thread || thread.type == ThreadType.Global) {
    return Result.fail(CreateError('Thread not found', 400))
  }
  if (
    thread.type != ThreadType.Single &&
    user.id.toString() != thread.ownerId
  ) {
    return Result.fail(
      CreateError('You have no permission to block user of this thread', 403)
    )
  }
  if (!thread.blockedUsers.includes(unblockUserId)) {
    return Result.fail(CreateError('This user is not blocked', 400))
  }
  const updates = {
    $addToSet: { users: unblockUserId },
    $pull: { blockedUsers: unblockUserId }
  }
  if (thread.type == ThreadType.Single) {
    // single thread should not remove user  = require( users
    delete updates.$addToSet
  }
  const result = await c.Thread.updateOne({ _id: thread._id }, updates)
  if (!result.modifiedCount) {
    return Result.fail(CreateError('internal server error', 500))
  }
  return Result.ok()
}
async function DeleteThread (c, user, threadId) {
  const thread = await c.Thread.findOne({ _id: SchemaID(threadId) })
  if (!thread) {
    return Result.error('Thread not found', 404)
  }
  if (
    !thread.users.includes(user.id) &&
    !thread.blockedUsers.includes(user.id)
  ) {
    return Result.error('Thread is invalid', 400)
  }
  if (
    Array.isArray(thread.deletedByUsers) &&
    thread.deletedByUsers.includes(user.id)
  ) {
    return Result.error('Thread not found', 400)
  }
  const result = await c.Thread.updateOne(
    { _id: thread._id },
    { $addToSet: { deletedByUsers: user.id } }
  )
  if (!result.modifiedCount) {
    return Result.error('Thread not found', 500)
  }
  return Result.ok()
}

module.exports = {
  FindThread,
  CreateOneToOneThread,
  CreateTeamThread,
  CreateGlobalThread,
  BlockThreadUser,
  UnblockThreadUser,
  DeleteThread,
  FindUserThread
}
//# sourceMappingURL=thread.js.map
