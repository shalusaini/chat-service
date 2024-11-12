const { timingSafeEqual } = require('crypto')
const { info } = require('../../infra/support/log.js')
const Conf = require('../../config.js')

function secret () {
  return async (ctx, next) => {
    const ip = ctx.ip
    const secret = ctx.get('x-secret') || ''
    const seclen = secret.length
    const secbuf = Buffer.from(secret) // Fixed syntax issue here
    console.log({ seclen, secbuf })
    if (!secret || !seclen) {
      ctx.throw(400, 'Secret is missing')
    }
    if (Conf.internal.ips !== '*' && !Conf.internal.ips.includes(ip)) {
      info('IP not allowed!')
      ctx.throw(403)
    }
    for (const sec of Conf.internal.secrets) {
      const can = sec.length === seclen
      if (!can) {
        continue
      }
      if (timingSafeEqual(Buffer.from(sec), secbuf)) {
        await next()
        return
      }
    }
    info('Secret not allowed!')
    ctx.throw(403)
  }
}

module.exports = secret
