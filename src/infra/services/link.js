const { randomBytes } = require('crypto')
async function SignLink (c, signableId, signedForId, source) {
  const token = randomBytes(32).toString('base64url')
  signableId = signableId.toString()
  signedForId = signedForId.toString()
  const query = {
    signableId,
    signedForId,
    source
  }
  const updates = {
    $setOnInsert: {
      signableId,
      signedForId,
      source,
      createdAt: new Date()
    },
    $set: {
      token,
      issuedAt: new Date(),
      updatedAt: new Date()
    },
    $inc: {
      counter: 1
    }
  }
  const result = await c.SignedLink.updateOne(query, updates, { upsert: true })
  if (!result.upsertedId && !result.modifiedCount) {
    return false
  }
  return token
}
module.exports = SignLink
