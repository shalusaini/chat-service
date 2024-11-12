const path = require('path')
const { log } = require('../../infra/support/log.js')
async function StorageStreamer (ctx, source) {
  log('stream', source)
  if (source.key[0] == '/') {
    source.key = source.key.slice(1)
  }
  const stats = await ctx.storage.stats(source.key)
  if (!stats) {
    ctx.throw(404)
  }
  let name = source.name
  if (!name) {
    const pinfo = path.parse(source.key)
    name = `${pinfo.name || 'media'}_${pinfo.ext}`
    console.log({ pinfo, name })
  }
  let total = stats.size
  let chunksize
  let options = {}
  if (ctx.get('range')) {
    const positions = ctx
      .get('range')
      .replace(/bytes=/, '')
      .split('-')
    const start = parseInt(positions[0], 10)
    const end = positions[1] ? parseInt(positions[1], 10) : total - 1
    chunksize = end - start + 1
    ctx.set('Content-Range', `bytes ${start}-${end}/${total}`)
    ctx.set('Accept-Ranges', 'bytes')
    options = { start, end, range: `bytes=${start}-${end}` }
    ctx.status = 206
  } else {
    console.log('else')
    ctx.set('Cache-Control', 'public,max-age=3600')
    const pinfo = path.parse(name)
    name = `${pinfo.name || 'media'}_${Date.now()}${pinfo.ext}`
  }
  const stream = await ctx.storage.stream(source.key, options)
  ctx.set(
    'content-type',
    ctx.query.as ||
      source.actual?.mime ||
      stats.type ||
      'application/octet-stream'
  )
  ctx.set('content-length', chunksize || total)
  if (ctx.query.download) {
    ctx.set('Content-Disposition', `attachment; filename="${name}"`)
  }
  ctx.body = stream
}
module.exports = StorageStreamer
