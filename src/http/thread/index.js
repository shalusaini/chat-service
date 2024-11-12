const { Router } = require('repulser')
const { SchemaID } = require('../../infra/db/mongo.js')
const {
  CreateTeamThread,
  BlockThreadUser,
  UnblockThreadUser,
  FindThread,
  FindUserThread,
  DeleteThread,
  CreateGlobalThread
} = require('../../app/thread/thread.js')
const {
  AddThreadMembers,
  LeaveThread,
  RemoveThreadMembers
} = require('../../app/thread/members.js')
const auth = require('../middlewares.js')
const {
  messageSend,
  messageSignAttachment,
  messageDelete,
  messageStreamAttachment,
  messageList
} = require('./message.js')
const provider = require('../storage/middleware.js')
const { StorageStreamer } = require('../storage/util.js')
const Conf = require('../../config.js')
const { FindOneToOneThread, ThreadList } = require('../../app/user/thread.js')
const { GetGroupProvider } = require('../../infra/services/group.js')
// thread list.
async function threadList (ctx) {
  const result = await ThreadList(
    ctx.token,
    ctx.db,
    ctx.userProvider,
    ctx.userid,
    ctx.query,
    true 
  )
  if (!result.ok) {
    ctx.throw(result.value())
  }
  ctx.reply(result.value())
}
// get thread by id.
async function show (ctx) {
  await ctx.validate(
    {
      id: 'required|mongoId'
    },
    ctx.query,
    { id: 'Thread id is required' }
  )
  const result = await FindThread(
    ctx.token,
    ctx.db,
    ctx.userProvider,
    ctx.userid,
    ctx.query.id
  )
  if (!result.ok) {
    ctx.throw(result.error())
  }
  ctx.reply(result.value())
}
async function showSingleType (ctx) {
  await ctx.validate(
    {
      id: 'required'
    },
    ctx.query,
    { id: 'User id is required' }
  )
  if (ctx.query.id == ctx.userid) {
    ctx.throw(400, 'Invalid request.')
  }
  const result = await FindOneToOneThread(
    ctx.token,
    ctx.db,
    ctx.userProvider,
    ctx.user,
    ctx.query.id
  )
  if (!result.ok) {
    ctx.throw(result.error())
  }
  const { thread, recipient } = result.value()
  ctx.reply({ thread, users: [ctx.user, recipient] })
}
async function showGlobalType (ctx) {
  await ctx.validate(
    {
      id: 'required'
    },
    ctx.query,
    { id: 'Group id is required' }
  )
  const result = await CreateGlobalThread(
    ctx.token,
    ctx.db,
    GetGroupProvider(),
    { groupId: ctx.query.id }
  )
  if (!result.ok) {
    ctx.throw(result.error())
  }
  ctx.reply(result.value())
}
async function createTeam (ctx) {
  await ctx.validate({
    name: 'required|string',
    users: 'required|arrayUnique',
    image: 'string|mongoId'
    // 'users.*': 'required|string'
  })
  const attrs = ctx.attrs()
  const result = await CreateTeamThread(
    ctx.token,
    ctx.db,
    ctx.event,
    ctx.userProvider,
    ctx.user,
    attrs
  )
  if (!result.ok) {
    ctx.throw(result.value())
  }
  const thread = result.value()
  ctx.reply({ thread })
}
async function blockUser (ctx) {
  await ctx.validate({
    threadId: 'required|mongoId',
    userId: 'required'
  })
  const attrs = ctx.attrs()
  const thread = await ctx.db.Thread.findOne({ _id: SchemaID(attrs.threadId) })
  if (!thread) {
    ctx.throw(404, 'Thread not found.')
  }
  const result = await BlockThreadUser(ctx.db, ctx.user, thread, attrs.userId)
  if (!result.ok) {
    ctx.throw(result.error())
  }
  ctx.reply({ message: 'User blocked.' })
}
async function unblockUser (ctx) {
  await ctx.validate({
    threadId: 'required|mongoId',
    userId: 'required'
  })
  const attrs = ctx.attrs()
  const thread = await ctx.db.Thread.findOne({ _id: SchemaID(attrs.threadId) })
  if (!thread) {
    ctx.throw(404, 'Thread not found.')
  }
  const result = await UnblockThreadUser(ctx.db, ctx.user, thread, attrs.userId)
  if (!result.ok) {
    ctx.throw(result.error())
  }
  ctx.reply({ message: 'user unblocked successfully.' })
}
async function modifyMember (ctx) {
  await ctx.validate({
    threadId: 'required|mongoId',
    users: 'required|arrayUnique'
  })
  const attrs = ctx.attrs()
  const result = await AddThreadMembers(
    ctx.token,
    ctx.db,
    ctx.userProvider,
    ctx.event,
    ctx.user,
    attrs.threadId,
    attrs.users
  )
  if (!result.ok) {
    ctx.throw(result.error())
  }
  ctx.reply({ message: 'Members added to team successfully.' })
}
async function threadStreamImage (ctx) {
  await ctx.validate(
    {
      threadId: 'required|mongoId'
    },
    ctx.query
  )
  const attrs = ctx.query
  const thread = await ctx.db.Thread.findOne({
    _id: SchemaID(attrs.threadId),
    users: ctx.userid
  })
  if (!thread || !thread.image) {
    ctx.throw(404, 'Page not found.')
  }
  const user = thread.users.find(id => id === ctx.userid)
  if (!user) {
    ctx.throw(400, 'Resources is forbidden.')
  }
  if (ctx.query.thumbnail) {
    thread.image.key = thread.image.key.replace('upload', 'thumb_upload')
    thread.image.actual.mime = Conf.storage.thumbnail.mime
  }
  await StorageStreamer(ctx, thread.image)
}
async function leaveThread (ctx) {
  await ctx.validate({
    thread: 'required|mongoId'
  })
  const attrs = ctx.attrs()
  const result = await LeaveThread(ctx.db, ctx.event, ctx.user, attrs.thread)
  if (!result.ok) {
    ctx.throw(result.error())
  }
  ctx.reply({ message: 'Team Left.' })
}
async function removeTeamMembers (ctx) {
  await ctx.validate({
    thread: 'required|mongoId',
    users: 'required|arrayUnique'
  })
  const attrs = ctx.attrs()
  const result = await RemoveThreadMembers(
    ctx.token,
    ctx.db,
    ctx.userProvider,
    ctx.event,
    ctx.user,
    attrs.thread,
    attrs.users
  )
  if (!result.ok) {
    ctx.throw(result.error())
  }
  ctx.reply({ message: 'Members removed = require( team successfully.' })
}
async function removeThread (ctx) {
  const result = await DeleteThread(ctx.db, ctx.user, ctx.params.id)
  if (!result.ok) {
    ctx.throw(result.error())
  }
  ctx.status = 204
}
async function userThread (ctx) {
  await ctx.validate(
    {
      id: 'required'
    },
    ctx.query,
    { id: 'Receiver id is required' }
  )
  const result = await FindUserThread(
    ctx.token,
    ctx.db,
    ctx.userProvider,
    ctx.userid,
    ctx.query.id
  )
  if (!result.ok) {
    ctx.throw(result.error())
  }
  ctx.reply(result.value())
}
const router = new Router({ prefix: '/threads' })

router.post('/messages', [auth(), messageSend])
router.get('/user', [auth(), userThread])
router.post('/team', [auth(), createTeam])
router.get('/', [auth(), threadList])
router.get('/show', [auth(), show])
router.get('/show/single', [auth(), showSingleType])
router.get('/show/global', [auth(), showGlobalType])
router.get('/messages', [auth(), messageList])
router.get('/messages/stream/attachment', [
  auth(),
  provider(),
  messageStreamAttachment
])
router.get('/stream/image', [auth(), provider(), threadStreamImage])
router.post('/messages/sign/attachment', [auth(), messageSignAttachment])
router.post('/users/block', [auth(), blockUser])
router.post('/users/unblock', [auth(), unblockUser])
router.patch('/users', [auth(), modifyMember])
router.post('/team/left', [auth(), leaveThread])
router.patch('/users/remove', [auth(), removeTeamMembers])
router.delete('/:id/messages/:message', [auth(), messageDelete])
router.delete('/:id', [auth(), removeThread])
module.exports = router
//# sourceMappingURL=index.js.map
