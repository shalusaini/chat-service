/**
 * Functionality that have maximum dependency on user, hosted here
 * @module
 */
const Result = require('../../base/result')
const { ThreadType } = require('../../base/thread')
const { FindOneToOneThread } = require('./thread')
async function BlockedUsers (token, c, userProvider, user) {
  // TODO: keep blocked users locally
  const q = {
    type: ThreadType.Single,
    users: user.id,
    $expr: { $gt: [{ $size: '$blockedUsers' }, 0] }
  }
  const docs = await c.Thread.find(q, {
    limit: 100,
    projection: { _id: 1, blockedUsers: 1 },
    sort: { updatedAt: -1 }
  }).toArray()
  const blockedUserIds = []
  for (const doc of docs) {
    if (doc.blockedUsers.length) {
      blockedUserIds.push(...doc.blockedUsers)
    }
  }
  if (!blockedUserIds.length) {
    return Result.ok([])
  }
  const result = await userProvider.get(token, blockedUserIds)
  if (!result.ok) {
    return result
  }
  return Result.ok(result.value().users)
}
/**
 * only works for one to one aka SINGLE thread
 * @param token
 * @param c
 * @param userProvider
 * @param user
 * @param blockedUserId
 * @returns
 */
async function UnblockUser (token, c, userProvider, user, blockedUserId) {
  const result = await FindOneToOneThread(
    token,
    c,
    userProvider,
    user,
    blockedUserId
  )
  if (!result.ok) {
    return result
  }
  const { thread, recipient } = result.value()
  if (
    !Array.isArray(thread.blockedUsers) ||
    !thread.blockedUsers.includes(blockedUserId)
  ) {
    return Result.error('User is not blocked.', 400)
  }
  const update = await c.Thread.updateOne(
    { _id: thread._id },
    { $pull: { blockedUsers: blockedUserId } }
  )
  if (!update.modifiedCount) {
    return Result.error('Failed to unblock user.', 500)
  }
  return Result.ok({ thread, recipient })
}
module.exports = {
  BlockedUsers,
  UnblockUser
}
//# sourceMappingURL=index.js.map
