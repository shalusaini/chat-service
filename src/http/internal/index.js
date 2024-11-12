const { Router } = require('repulser')
const secret  = require('./middleware.js')
const thread = require('./thread.js')
const router = new Router({ prefix: '/internal' })
router.get('/', [
  secret(),
  ctx => {
    ctx.body = { ip: ctx.ip, secret: ctx.get('x-secret') }
  }
])
router.use(thread)
module.exports = router
//# sourceMappingURL=index.js.map
