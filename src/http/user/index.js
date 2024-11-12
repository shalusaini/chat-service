const { BlockedUsers, UnblockUser } = require('../../app/user/index.js')
const { Router } = require('repulser')
const auth= require('../middlewares.js')
async function blockedUsers (ctx) {
  const result = await BlockedUsers(
    ctx.token,
    ctx.db,
    ctx.userProvider,
    ctx.user
  )
  if (!result.ok) {
    ctx.throw(result.value())
  }
  ctx.reply(result.value())
}
async function unblockUsers (ctx) {
  if (typeof ctx.query.id != 'string') {
    ctx.throw(400, 'Recipient is missing.')
  }
  const result = await UnblockUser(
    ctx.token,
    ctx.db,
    ctx.userProvider,
    ctx.user,
    ctx.query.id
  )
  if (!result.ok) {
    ctx.throw(result.error())
  }
  ctx.reply(result.value())
}
const router = new Router({ prefix: '/users' })
router.get('/blocked', [auth(), blockedUsers])
router.get('/unblock', [auth(), unblockUsers])
module.exports = router
//# sourceMappingURL=index.js.map
