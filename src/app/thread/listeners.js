const { SocketEvent, SocketNS } = require('../../base/socket.js')
const {
  ThreadEvent,
  ThreadMessageEvent,
  ThreadType
} = require('../../base/thread.js')
const { debug } = require('../../infra/support/log.js')
const { LeanThread } = require('./mapper.js')
class MessageSendListener {
  constructor (sioe, pushProvider) {
    this.sioe = sioe
    this.pushProvider = pushProvider
    this.event = ThreadMessageEvent.Send
    debug('message send event listerner constructed')
  }
  async handle ({ thread, sender, message, token, created }) {
    const reply = { sender, message, ts: Date.now() }
    debug('message send event listener called')
    if (Array.isArray(thread.users) && thread.users.length) {
      thread.users.forEach(user => {
        debug('send to user:', user)
        this.sioe
          .of(SocketNS.Chat)
          .to(user)
          .emit(SocketEvent.Message.default, reply)
      })
    }
    if (thread.type == ThreadType.Global) {
      this.sioe.emit(SocketEvent.Message.default, reply)
    }
    if (created || !token) {
      return
    }
    switch (thread.type) {
      case ThreadType.Single:
        !message.threadSubscribed && await this.pushProvider.send(token, {
          // merge this data with your notification data
          data: {
            thread_id: thread._id.toString(),
            created: false,
            type: 'THREAD_SINGLE_MESSAGE'
          },
          sender: message.senderUserId,
          receiver: message.receiverUserId // send push to this user
        })
        break
      case ThreadType.Global:
        await this.pushProvider.send(token, {
          // merge this data with your notification data
          data: {
            thread_id: thread._id.toString(),
            type: 'THREAD_GROUP_MESSAGE'
          },
          group: thread.groupId,
          thread: { name: thread.name, _id: thread._id }
        })
        break
    }
  }
}
class ThreadCreatedListener {
  constructor (sioe, pushProvider) {
    this.sioe = sioe
    this.pushProvider = pushProvider
    this.event = ThreadEvent.New
    debug('message send event listerner constructed')
  }
  async handle ({ thread, owner, token }) {
    const reply = { thread: LeanThread(thread), owner, ts: Date.now() }
    debug('message send event listener called')
    if (Array.isArray(thread.users) && thread.users.length) {
      thread.users.forEach(user => {
        debug('send to user:', user)
        this.sioe.of(SocketNS.Chat).to(user).emit(SocketEvent.Thread.new, reply)
      })
    }
    switch (thread.type) {
      case ThreadType.Single:
        await this.pushProvider.send(token, {
          // merge this data with your notification data
          data: {
            thread_id: thread._id.toString(),
            created: true,
            type: 'THREAD_SINGLE_MESSAGE'
          },
          sender: thread.ownerId,
          receiver: thread.receiverUserId // send push to this user
        })
        break
      case ThreadType.Team:
        await this.pushProvider.send(token, {
          // merge this data with your notification data
          data: {
            thread_id: thread._id.toString(),
            created: true,
            type: 'THREAD_TEAM_RECIPIENT'
          },
          thread: {
            name: thread.name,
            _id: thread._id
          },
          users: thread.users // send push to all users
        })
        break
    }
  }
}
class ThreadUpdateListener {
  constructor (sioe, pushProvider) {
    this.sioe = sioe
    this.pushProvider = pushProvider
    this.event = ThreadEvent.Update
    debug('message send event listerner constructed')
  }
  async handle ({ thread, type, users, message, userids, token }) {
    const reply = {
      type,
      users,
      message,
      thread: LeanThread(thread),
      ts: Date.now()
    }
    debug('message send event listener called')
    if (Array.isArray(thread.users) && thread.users.length) {
      thread.users.forEach(user => {
        debug('send to user:', user)
        this.sioe
          .of(SocketNS.Chat)
          .to(user)
          .emit(SocketEvent.Thread.update, reply)
      })
    }
    if (!userids || !token) {
      return
    }
    switch (type) {
      case 'RECIPIENT_ADDED':
        await this.pushProvider.send(token, {
          // merge this data with your notification data
          data: {
            thread_id: thread._id.toString(),
            created: false,
            type: 'THREAD_TEAM_RECIPIENT',
            update: 'RECIPIENT_ADDED'
          },
          thread: {
            name: thread.name,
            _id: thread._id
          },
          users: userids // send push to all users
        })
        break
    }
  }
}
module.exports = {
  MessageSendListener,
  ThreadCreatedListener,
  ThreadUpdateListener
}
//# sourceMappingURL=listeners.js.map
