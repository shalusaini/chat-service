function auth () {
  return async (ctx, next) => {
    let token = ctx.get('Authorization')
    if (!token) {
      ctx.throw(401, 'Token is missing')
    }
    const result = await ctx.userProvider.token(token)
    if (!result.ok) {
      ctx.throw(result.value())
    }
    ctx.user = result.value()
    ctx.userid = String(ctx.user.id)
    ctx.token = token
    await next()
  }
}
module.exports = auth
//# sourceMappingURL=middlewares.js.map
