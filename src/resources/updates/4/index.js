/**
 * Create missing user threads
 * @param db mongo collections
 * @returns
 */
async function init (db) {
  let upsertedCount = 0
  let modifiedCount = 0
  let failedCount = 0
  let totalRecords = 0
  const errors = []
  const result = await db.UserThread.deleteMany({
    $or: [{ threadId: { $exists: false } }, { threadId: { $eq: null } }]
  })
  console.info(`Deleted orphan user threads count: ${result.deletedCount}`)
  const promises = []
  const cursor = await db.Thread.aggregate([
    { $unwind: '$users' },
    {
      $lookup: {
        from: 'user_threads',
        as: 'user_threads',
        let: { threadId: '$_id', userId: '$users' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$userId', '$$userId'] },
                  { $eq: ['$threadId', '$$threadId'] }
                ]
              }
            }
          }
        ]
      }
    },
    {
      $match: {
        'user_threads.0': { $exists: false }
      }
    }
  ])
  for await (const doc of cursor) {
    totalRecords += 1
    promises.push(
      (async thread => {
        try {
          const result = await db.UserThread.updateOne(
            { userId: thread.users, threadId: thread._id },
            { $set: { userId: thread.users, threadId: thread._id } },
            { upsert: true }
          )
          if (!result.acknowledged) {
            failedCount += 1
          } else {
            if (result.modifiedCount) {
              modifiedCount += 1
            } else if (result.upsertedId) {
              upsertedCount += 1
            }
          }
        } catch (e) {
          errors.push(e)
        }
      })(doc)
    )
    if (promises.length >= 100) {
      await Promise.all(promises)
      promises.length = 0
      if (errors.length) {
        await cursor.close()
        break
      }
    }
  }
  if (promises.length) {
    await Promise.all(promises)
  }
  if (errors.length) {
    errors.forEach(console.error)
  }
  console.info(
    `Found:${totalRecords} | Upserted:${upsertedCount} | Modified:${modifiedCount} | Failed:${failedCount} | Errors: ${errors.length}`
  )
}
module.exports = init
//# sourceMappingURL=index.js.map
