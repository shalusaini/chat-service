const { ThreadType } = require('../../../base/thread.js')
/**
 * Add receiver user id in one-to-one threads
 * @param db mongo collections
 * @returns
 */
async function init (db) {
  let modifiedCount = 0
  let failedCount = 0
  const errors = []
  const docs = await db.Thread.find({
    type: ThreadType.Single,
    receiverUserId: { $exists: false }
  }).toArray()
  const totalRecords = docs.length
  const promises = []
  for (const doc of docs) {
    const receiverUserId = doc.users.find(
      id => doc.ownerId.toString() != id.toString()
    )
    if (receiverUserId) {
      promises.push(
        (async (thread, receiverUserId) => {
          try {
            const result = await db.Thread.updateOne(
              { _id: thread._id },
              { $set: { receiverUserId } }
            )
            if (result.modifiedCount) {
              modifiedCount += 1
            } else {
              failedCount += 1
            }
          } catch (e) {
            errors.push(e)
          }
        })(doc, receiverUserId)
      )
    }
    if (promises.length >= 10) {
      await Promise.all(promises)
      promises.length = 0
      if (errors.length) {
        errors.forEach(console.error)
        console.info(
          `Found:${totalRecords} | Modified:${modifiedCount} | Failed:${failedCount} | Errors: ${errors.length}`
        )
        return
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
    `Found:${totalRecords} | Modified:${modifiedCount} | Failed:${failedCount} | Errors: ${errors.length}`
  )
}
module.exports = init
//# sourceMappingURL=index.js.map
