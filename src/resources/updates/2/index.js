/**
 * Remove duplicate members from each thread
 * @param db mongo collections
 * @returns
 */
async function init (db) {
  let modifiedCount = 0
  let failedCount = 0
  const errors = []
  const docs = await db.Thread.find({}).toArray()
  const totalRecords = docs.length
  const promises = []
  for (const doc of docs) {
    if (doc.users && doc.users.length) {
      const uids = Array.from(new Set(doc.users.map(id => id.toString())))
      promises.push(
        (async (thread, users) => {
          try {
            const result = await db.Thread.updateOne(
              { _id: thread._id },
              { $set: { users } }
            )
            if (result.modifiedCount) {
              modifiedCount += 1
            } else {
              failedCount += 1
            }
          } catch (e) {
            errors.push(e)
          }
        })(doc, uids)
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
