const path = require('path')
const fs = require('fs/promises')
const mime = require('mime-lite')
// const { fileTypeFromFile } = require( 'file-type/index.js');
const { Router } = require('repulser')
const sharp = require('sharp')
const { StorageStatus } = require('../../base/storage.js')
const { ValidateID, SchemaID } = require('../../infra/db/mongo.js')
const { log, info } = require('../../infra/support/log.js')
const { storageProfile, ImageRules } = require('./profile.js')
const auth = require('../middlewares.js')
const provider = require('./middleware.js')
const  StorageStreamer  = require('./util.js')
const Conf = require('../../config.js')
async function put (ctx) {
  const typ = ctx.get('x-type')
  const profile = storageProfile[typ]
  if (!profile) {
    log('profile not found')
    ctx.throw(404)
  }
  await ctx.validate(
    {
      file: profile.rules,
      thumbnail: ImageRules
    },
    { file: ctx.file.path, thumbnail: ctx.thumbnail?.path }
  )
  // Function to get MIME type and extension of a file
  function getFileTypeAndExtension (filePath) {
    try {
      // Get MIME type
      const mimeType = mime.getType(filePath)
      // Get file extension
      const ext = mime.getExtension(mimeType)
      console.log('insdie', { mime: mimeType, ext })
      return { mime: mimeType, ext }
    } catch (error) {
      console.error('Error:', error)
      return null
    }
  }
  const finfo = await getFileTypeAndExtension(ctx.file.path)

  if (!finfo) {
    ctx.throw(500)
    console.log('MIME Type:', finfo.mime)
    console.log('Extension:', finfo.ext)
  }
  console.log({ finfo })
  // const finfo = await fileTypeFromFile(ctx.file.path);
  // if (!finfo) {
  //     ctx.throw(500);
  // }
  const file = await ctx.storage.put(ctx.file.path, {
    type: finfo.mime,
    folder: profile.folder
  })
  const model = {
    type: profile.type,
    file: {
      name: ctx.file.originalName,
      ext: ctx.file.extension,
      mime: ctx.file.type,
      size: ctx.file.size,
      actual: {
        ext: finfo?.ext,
        mime: finfo?.mime
      },
      key: file.key
    },
    status: StorageStatus.Draft,
    ownerId: ctx.userid
  }
  let pinfof = file.key
  let srcf = ctx.file.path
  console.log({ pinfof, srcf, profile, thumb: ctx.thumbnail })
  if (ctx.thumbnail && profile.customThumb) {
    pinfof = ctx.thumbnail.path
    srcf = ctx.thumbnail.path
  }
  // my changes for video
  if (profile.type !== 'MESSAGE_VIDEO' && profile.thumbnail) {
    const pinfo = path.parse(pinfof)
    const thumbfile = `/tmp/thumb_${pinfo.name}.jpeg`
    await sharp(srcf)
      .resize(profile.thumbnail)
      .jpeg({
        quality: 80,
        chromaSubsampling: '4:4:4'
      })
      .toFile(thumbfile)
    const fstat = await fs.stat(thumbfile)
    const thumb = await ctx.storage.put(thumbfile, {
      type: Conf.storage.thumbnail.mime,
      folder: profile.folder
    })
    model.thumbnail = {
      size: fstat.size,
      width: profile.thumbnail.width,
      height: profile.thumbnail.height,
      key: thumb.key
    }
  }
  const result = await ctx.db.Storage.insertOne(model)
  if (!result.insertedId) {
    ctx.throw(500)
  }
  ctx.reply({ key: result.insertedId })
}
const router = new Router({ prefix: '/storage' })
router.put('/', [auth(), provider(), put])
router.put('/formdata', [
  auth(),
  provider(),
  ctx => {
    const files = ['file', 'thumbnail']
    for (const key of files) {
      const file = ctx.request.files[key]
      //console.log(file);
      if (file) {
        ctx[key] = {
          path: file.filepath,
          originalName: file.originalFilename,
          extension: path.extname(file.originalFilename).replace(/^./, ''),
          type: file.mimetype,
          size: file.size
        }
      }
    }
    return put(ctx)
  }
])

// this is not in use.
router.get('/', [
  auth(),
  provider(),
  async function get (ctx) {
    if (!ValidateID(ctx.query.id)) {
      ctx.throw(422, { message: 'Invalid Id' })
    }
    const { file } = await ctx.db.Storage.findOne({
      _id: SchemaID(ctx.query.id),
      status: StorageStatus.Draft
    })
    if (!file) {
      ctx.throw(400, 'Image not found')
    }
    const { stream, size } = await ctx.storage.readStream(file.key)
    ctx.length = size
    ctx.type = file.actual.mime
    ctx.body = stream
  }
])

router.get('/signed', [
  provider(),
  async ctx => {
    const link = await ctx.db.SignedLink.findOne({
      token: ctx.query.token,
      signableId: ctx.query.signableId
    })
    log('link %o', link)
    if (!link || !link.source) {
      info('link or its source is missing')
      ctx.throw(404)
    }
    const expirems =
      (link.issuedAt || link.createdAt).getTime() + 1 * 60 * 60 * 1000
    if (Date.now() >= expirems) {
      info('link is expired')
      ctx.throw(404)
      return
    }
    await StorageStreamer(ctx, link.source)
  }
])

module.exports = router
