/**
 * Remove invalid threads
 * @param db mongo collections
 * @returns
 */
async function init (db) {
  const result = await db.Thread.deleteMany({
    $expr: { $lt: [{ $size: '$users' }, 2] }
  })
  console.info(
    `Threads with members count less then 2, Deleted:${result.deletedCount}.`
  )
  await removeOrphanMessages(db)
}
async function removeOrphanMessages (db) {
  const docs = await db.ThreadMessage.aggregate([
    {
      $lookup: {
        from: 'threads',
        let: { threadId: '$threadId' },
        as: 'thread',
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$_id', '$$threadId'] }
            }
          }
        ]
      }
    },
    { $unwind: '$thread' },
    { $match: { thread: { $exists: false } } },
    { $project: { _id: 1 } }
  ]).toArray()
  const result = await db.ThreadMessage.deleteMany({
    threadId: { $in: docs.map(doc => doc._id) }
  })
  console.info(
    `Orphan messages, Total:${docs.length} | Deleted:${result.deletedCount}.`
  )
}
module.exports = {
  init,
  removeOrphanMessages
}
//# sourceMappingURL=index.js.map
