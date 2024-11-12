const { CreateError } = require('../base/error.js')
const Result = require('../base/result.js')
const { StorageStatus } = require('../base/storage.js')
const { SchemaID } = require('../infra/db/mongo.js')
async function Aquire (db, id, owner) {
  const sq = {
    _id: SchemaID(id),
    status: StorageStatus.Draft
  }
  if (owner) {
    sq.ownerId = String(owner)
  }
  const stored = await db.Storage.findOneAndUpdate(sq, {
    $set: { status: StorageStatus.Pending }
  })
  if (!stored.ok || !stored.value) {
    return Result.fail(CreateError('File not found.', 400))
  }
  return Result.ok(stored.value)
}
async function Release (db, id) {
  await db.Storage.updateOne(
    { _id: SchemaID(id), status: StorageStatus.Pending },
    { $set: { status: StorageStatus.Draft } }
  )
}
async function Consume (db, id, releaseOnFailure = false) {
  const result = await db.Storage.updateOne(
    { _id: SchemaID(id), status: StorageStatus.Pending },
    { $set: { status: StorageStatus.Used } }
  )
  if (!result.modifiedCount) {
    if (releaseOnFailure) {
      await Release(db, id)
    }
    return false
  }
  return true
}
async function Remove (db, meta, file, thumbnail) {
  const saved = await db.Storage.insertOne({
    type: 'DELETED',
    meta,
    file,
    thumbnail,
    status: StorageStatus.Removed
  })
  return !!saved.insertedId
}

module.exports = {
  Aquire,
  Release,
  Consume,
  Remove
}
//# sourceMappingURL=storage.js.map
