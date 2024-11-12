const Result = require('../../base/result.js')
const { ThreadType } = require('../../base/thread.js')
const { SchemaID } = require('../../infra/db/mongo.js')
const { UnreadCountOfThreads } = require('./counter.js')
const Redis = require('../../infra/redis/index.js')
// directly used, no defination
const redis = Redis.create()
async function ThreadList (
  token,
  db,
  userProvider,
  userid,
  query,
  onlines = false
) {
  const q = {
    users: userid,
    deletedByUsers: { $ne: userid }
  }
  if (query.type) {
    q.type = query.type
  }
  // // Frontend Search requirement.
  // if (query.search) {
  //   q.$or = [
  //     { ownerName: new RegExp(`${query.search}`) },
  //     { receiverUserName: new RegExp(`${query.search}`) }
  //     // search by thread name in case group chat.
  //     // { name: new RegExp(`${query.q}`) },
  //   ]
  // }
  const threads = await db.Thread.find(q, {
    sort: { updatedAt: -1 },
    limit: 1000,
    projection: {
      _id: 1,
      name: 1,
      type: 1,
      ownerId: 1,
      messages: 1,
      createdAt: 1,
      updatedAt: 1,
      receiverUserId: 1
    }
  }).toArray()
  const totalRecords = await db.Thread.countDocuments(q)
  if (!threads.length) {
    return Result.ok({ threads, totalRecords })
  }
  const recipientMap = {}
  const threadMap = {}
  for (const thread of threads) {
    if (thread.type == ThreadType.Single && thread.receiverUserId) {
      const otherUserId =
        userid == thread.ownerId ? thread.receiverUserId : thread.ownerId
      recipientMap[otherUserId] = recipientMap[otherUserId] || []
      recipientMap[otherUserId].push(thread)
      // setting thread type.
      query.type = !query.type ? ThreadType.Single : query.type
    }
    thread.unreadCount = 0
    threadMap[thread._id.toString()] = thread
  }
  const uids = Object.keys(recipientMap)
  const tids = Object.keys(threadMap)
  if (uids.length) {
    const recipients = await userProvider.get(token, uids)
    if (!recipients.ok) {
      return recipients.value()
    }

    for (const recipient of recipients.value().users) {
      const uid = recipient.id.toString()
      if (recipientMap[uid]) {
        for (const t of recipientMap[uid]) {
          t.recipient = recipient
        }
      }
    }
  }
  if (tids.length) {
    const result = await UnreadCountOfThreads(db, tids.map(SchemaID), userid)
    for (const tid in result) {
      if (threadMap[tid] && result[tid].unreadCount) {
        threadMap[tid].unreadCount = result[tid].unreadCount
      }
    }
  }

  if (onlines && query.type && query.type == ThreadType.Single) {
    // fill online recipients
    const recipients = Object.keys(recipientMap)
    const recipientsOnlines = await redis.hmget('sio.onlines', ...recipients)

    for (let i = 0; i < recipients.length; i++) {
      const userId = recipients[i]
      for (const thread of recipientMap[userId]) {
        thread.recipientOnline = !!recipientsOnlines[i]
      }
    }
  }
  return Result.ok({ threads, totalRecords })
}
async function FindOneToOneThread (token, c, userProvider, user, otherUserId) {
  const senderUserId = user.id.toString()
  const receiverUserId = otherUserId.toString()
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
  const thread = await c.Thread.findOne(q)
  if (!thread) {
    return Result.error('Thread not found', 404)
  }
  // getting thread user details.
  const [recipientResult, recipientOnline] = await Promise.all([
    userProvider.get(token, [otherUserId]),
    redis.hget('sio.onlines', otherUserId)
  ])
  if (!recipientResult.ok) {
    return recipientResult
  }
  let [recipient] = recipientResult.value().users
  if (!recipient) {
    return Result.error('Recipient not found', 404)
  }
  thread.recipientOnline = !!recipientOnline
  return Result.ok({ thread, recipient })
}
module.exports = {
  ThreadList,
  FindOneToOneThread
}
