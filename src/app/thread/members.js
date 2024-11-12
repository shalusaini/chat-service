const { CreateError } = require('../../base/error.js')
const Result = require('../../base/result.js')
const {
  ThreadEvent,
  ThreadMessageType,
  ThreadType
} = require('../../base/thread.js')
const { SchemaID } = require('../../infra/db/mongo.js')
const { log } = require('../../infra/support/log.js')
async function AddThreadMembers (
  token,
  c,
  userProvider,
  events,
  user,
  thread,
  members
) {
  thread =
    typeof thread == 'string'
      ? await c.Thread.findOne({ _id: SchemaID(thread) })
      : thread
  if (thread.type != ThreadType.Team) {
    return Result.fail(
      CreateError('You are only allowed to modify team members.', 400)
    )
  }
  if (thread.ownerId.toString() != user.id.toString()) {
    return Result.fail(
      CreateError('Only owner of thread can modify its members.', 400)
    )
  }
  const uthreads = []
  log('add thread memebers %o', members)
  for (const member of members) {
    if (thread.users.includes(member) || thread.blockedUsers.includes(member)) {
      return Result.fail(
        CreateError(
          'Some of the selected users are already members of this thread',
          400
        )
      )
    }
    uthreads.push({ threadId: thread._id, userId: member.toString() })
  }
  const uresult = await userProvider.get(token, members)
  if (!uresult.ok) {
    return uresult
  }
  const musers = uresult.value().users
  if (musers.length != members.length) {
    return Result.fail(CreateError('Some of the members are invalid.', 400))
  }
  const memids = []
  const unames = []
  for (const mem of musers) {
    unames.push(mem.name)
    memids.push(mem.id.toString())
  }
  const d = new Date()
  const message = {
    threadId: thread._id,
    content: `${user.name} added ${unames.join(',')}`,
    type: ThreadMessageType.Info,
    meta: {},
    createdAt: d
  }
  await Promise.all([
    c.Thread.updateOne(
      { _id: thread._id },
      { $addToSet: { users: { $each: memids } }, $set: { updatedAt: d } }
    ),
    c.UserThread.insertMany(uthreads)
  ])
  thread.users.push(...memids)
  events.dispatch(ThreadEvent.Update, {
    thread,
    type: 'RECIPIENT_ADDED',
    users: musers,
    userids: memids,
    message,
    token
  })
  return Result.ok()
}
/**
 * only works with team thread
 * @param token
 * @param c
 * @param userProvider
 * @param events
 * @param user
 * @param thread
 * @param members
 * @returns
 */
async function RemoveThreadMembers (
  token,
  c,
  userProvider,
  events,
  user,
  thread,
  members
) {
  thread =
    typeof thread == 'string'
      ? await c.Thread.findOne({ _id: SchemaID(thread) })
      : thread
  if (thread.type != ThreadType.Team) {
    return Result.fail(
      CreateError('You are only allowed to modify team members.', 400)
    )
  }
  if (thread.ownerId.toString() != user.id.toString()) {
    return Result.fail(
      CreateError('Only owner of thread can modify its members.', 400)
    )
  }
  const memids = []
  log('remove thread memebers %o', members)
  for (const member of members) {
    if (
      !thread.users.includes(member) &&
      !thread.blockedUsers.includes(member)
    ) {
      return Result.fail(
        CreateError('Some of the selected users are not thread members', 400)
      )
    }
    const memid = member.toString()
    if (!memids.includes(memid)) {
      memids.push(memid)
    }
  }
  const uresult = await userProvider.get(token, members)
  if (!uresult.ok) {
    return uresult
  }
  const musers = uresult.value().users
  const unames = []
  for (const mem of musers) {
    unames.push(mem.name)
  }
  const d = new Date()
  const message = {
    threadId: thread._id,
    content: `${user.name} removed ${unames.join(',')}`,
    type: ThreadMessageType.Info,
    meta: {},
    createdAt: d
  }
  await Promise.all([
    c.Thread.updateOne(
      { _id: thread._id },
      {
        $pullAll: { users: memids, blockedUsers: memids },
        $set: { updatedAt: d }
      }
    ),
    c.UserThread.deleteMany({ threadId: thread._id, userId: { $in: memids } })
  ])
  // remove users  = require( thread model
  events.dispatch(ThreadEvent.Update, {
    thread,
    type: 'RECIPIENT_REMOVED',
    users: musers,
    message
  })
  return Result.ok()
}
/**
 * only works for team thread
 * @param c
 * @param events
 * @param user
 * @param thread
 * @returns
 */
async function LeaveThread (c, events, user, thread) {
  thread =
    typeof thread == 'string'
      ? await c.Thread.findOne({ _id: SchemaID(thread) })
      : thread
  if (thread.type != ThreadType.Team) {
    return Result.error('Thread is invalid.', 400)
  }
  const d = new Date()
  const message = {
    threadId: thread._id,
    content: `${user.name} left.`,
    type: ThreadMessageType.Info,
    meta: {},
    createdAt: d
  }
  const userId = user.id.toString()
  await Promise.all([
    c.Thread.updateOne(
      { _id: thread._id },
      { $pull: { users: userId }, $set: { updatedAt: d } }
    ),
    c.UserThread.deleteMany({ threadId: thread._id, userId })
  ])
  // remove users  = require( thread model
  events.dispatch(ThreadEvent.Update, {
    thread,
    type: 'RECIPIENT_LEFT',
    users: [user],
    message
  })
  return Result.ok()
}

module.exports = {
  AddThreadMembers,
  RemoveThreadMembers,
  LeaveThread
}
//# sourceMappingURL=members.js.map
