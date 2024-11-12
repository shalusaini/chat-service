// local-2-oit: http://localhost:3001/chat.html?endpoint=http://103.149.154.53&sock_path=/akilichat/socket.io&api_path=/akiliapis
// oit-to-oit : http://103.149.154.53/akiliapis/chat.html?endpoint=http://103.149.154.53&sock_path=/akilichat/socket.io&api_path=/akiliapis

const query = new URLSearchParams(window.location.search)

let apiToken = query.get('token') || '1'
let listerners = [
  'errored',
  'subscribed',
  'message',
  'thread:new',
  'thread:update'
]
const logEle = document.getElementById('logs')

// const endpoint = query.get('endpoint') || 'http://192.168.88.98:3000'
// const sock_endpoint = `${endpoint}/chat` //query.get('sock_endpoint') || `${endpoint}/chat`;
// const sock_path = '/socket.io' //query.get('sock_path');
// const api_path = query.get('api_path') || 'http://192.168.88.98:3001'
// // const api = api_path ? `${endpoint}${api_path}` : endpoint; // `${endpoint}/akiliapis`;
// const api = api_path;//'http://localhost:3001' || query.get('api_path')

const endpoint = query.get('endpoint') || 'http://192.168.88.98:3001';
const sock_endpoint = query.get('sock_endpoint') || `${endpoint}/chat`
const sock_path = query.get('sock_path') || '/socket.io' //'/akilichat/socket.io'
const api_path = query.get('api_path')
const api = api_path ? `${endpoint}${api_path}` : endpoint // `${endpoint}/akiliapis`;

log('config', {
  endpoint,
  api_path: api,
  sock_endpoint,
  sock_path,
  token: apiToken
})

let selectedThreadId = null
let socket
let oldMessage = JSON.stringify({ content: 'Hello there!' }, null, 2)
let messageTemplate = { content: 'Hello there!' }

function connect () {
  socket = io(sock_endpoint, {
    path: sock_path,
    transports: ['websocket'],
    upgrade: false,
    auth (cb) {
      cb({
        token: apiToken //`Bearer 838|AY2K3IdWYkJK3KMWs8JtCnuYKVlwx96OkCJP2bpz`
      })
    }
  })
  console.log(socket)
  socket.on('connect', () => {
    log('socket:', 'connected')
    connecting = connected = true
  })

  socket.on('disconnect', () => {
    log('socket:', 'disconnected')
    connecting = connected = false
  })

  listerners.forEach(listerner => {
    console.log({listerner})
    socket.on(listerner, listernerLogger.bind(null, listerner))
  })

  socket.on('message', ({ message }) => {
    if (
      !message ||
      !message.type ||
      !message.meta ||
      !message.meta.attachment
    ) {
      return
    }

    previewMessageAttachment(message)
  })
}

function listernerLogger (listerner, data) {
  log(`socket:on(${listerner})`, data)
}

function log (...args) {
  const p = document.createElement('pre')
  p.innerHTML = args
    .map(arg =>
      typeof arg == 'object'
        ? syntaxHighlight(JSON.stringify(arg, null, 2))
        : arg
    )
    .join(' ')
  logEle.append(p)
  console.log(...args)
}

function logHtml (...args) {
  const p = document.createElement('div')
  p.classList.add('log-ele')
  p.innerHTML = args.join(' ')
  logEle.append(p)
}

function apiSendMessage () {
  const message = parseMessageFromEditor(false)

  if (!message) {
    log('failed to send message!')
    return
  }

  if (!message.threadId && selectedThreadId) {
    message.threadId = selectedThreadId
  }

  if (!message.threadId && !message.receiverUserId) {
    alert(
      'Please select/provide thread id or receiver user id for one-to-one thread!'
    )
    log(
      'Please select/provide thread id or receiver user id for one-to-one thread!'
    )
    return
  }

  log('sending message:', message)

  apiRequest('POST', '/threads/messages', message).then(res => {
    if (res.error || res.message) {
      log(res.error || res.message)
      return
    }
    log('message posted!')
  })
}

function apiRequest (method, path, body, raw = false) {
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  }

  if (body) {
    opts.body = typeof body == 'string' ? body : JSON.stringify(body)
  }

  const promise = fetch(`${api}${path}`, opts)

  if (raw) {
    return promise
  }

  return promise
    .then(res => {
      if (res.status == 204) {
        return Promise.resolve({})
      }
      return res.json()
    })
    .then(res => Promise.resolve(res.data || res))
    .catch(log)
}

function previewMessageAttachment (message) {
  const attachment = message.meta.attachment

  if (!attachment) {
    log('message does not have an attachment to preview!')
    return
  }

  switch (message.type) {
    case 'MEDIA_AUDIO':
      signMessageAttachment(
        message.threadId,
        message._id,
        attachment.name || message._id,
        link => {
          logHtml(
            `<audio controls><source src="${link}" type="${
              message.meta.attachment.actual.mime || attachment.mime
            }"></audio>`
          )
        }
      )
      break
    case 'MEDIA_VIDEO':
      signMessageAttachment(
        message.threadId,
        message._id,
        attachment.name || message._id,
        link => {
          logHtml(
            `<video height="480" controls><source src="${link}" type="${
              message.meta.attachment.actual.mime || attachment.mime
            }"></video>`
          )
        }
      )
      break
    case 'MEDIA_IMAGE':
      apiRequest(
        'GET',
        `/threads/messages/stream/attachment?messageId=${message._id}&threadId=${message.threadId}`,
        null,
        true
      ).then(async res => {
        if (res.status == 200) {
          res.blob().then(blob => {
            const link = URL.createObjectURL(blob)
            logHtml(`<img src="${link}" heigth="480" alt="${attachment.name}">`)
          })
        }
      })
      break
    case 'ATTACHMENT':
      log(
        'Generate signed link:',
        generateLink(
          {
            onclick: `signMessageAttachment('${message.threadId}', '${message._id}', '${attachment.name}')`
          },
          attachment.name || message._id
        )
      )
      break
    default:
      log('message type is not supported by attachment parser!')
      break
  }
}

function apiListThreads () {
  const threadsEle = document.getElementById('threads')
  apiRequest('GET', '/threads').then(res => {
    console.log(res)
    res.threads.forEach(thread => {
      const c = document.createElement('div')
      c.classList.add('item')

      const t = document.createElement('h6')
      t.title = 'Click here to select this thread!'
      t.innerHTML = thread.name || thread.type
      t.setAttribute('data-thread', thread._id)
      c.append(t)

      const p = document.createElement('pre')
      c.append(p)

      p.innerHTML = syntaxHighlight(JSON.stringify(thread, null, 2))
      p.setAttribute('data-thread', thread._id)

      threadsEle.append(c)

      t.onclick = selectThread.bind(null, thread)
    })
  })
}

function openThread (threadId) {
  apiRequest('GET', `/threads/show?id=${threadId}`).then(res => {
    log('thread:', res.thread)
  })
}

function subThread (threadId) {
  socket.emit('subscribe:thread', { threadId })
}

function unSubThread (threadId) {
  socket.emit('unsubscribe:thread', { threadId })
}

function signMessageAttachment (threadId, messageId, name, cb) {
  apiRequest('POST', '/threads/messages/sign/attachment', {
    threadId,
    messageId
  }).then(res => {
    if (!res.token) {
      log('sign message attachment failed')
      return
    }

    const href = `${api_path}/storage/signed?token=${res.token}&signableId=${messageId}`

    log('download:', generateLink({ href }, name))

    if (cb) {
      cb(href)
    }
  })
}

// below functions are changing message content
function selectThread (thread) {
  const id = thread._id
  if (!id) {
    log('select thread: failed, id is missing!')
    return
  }

  log(
    'select thread:',
    id,
    generateLink({ onclick: `openThread('${id}')` }, 'Open'),
    generateLink({ onclick: `subThread('${id}')` }, 'Subscribe'),
    generateLink({ onclick: `unSubThread('${id}')` }, 'unSubscribe')
  )

  selectedThreadId = id

  const message = parseMessageFromEditor()

  if (thread.type == 'SINGLE' && !message.receiverUserId) {
    message.receiverUserId = '<receiver user id>'
  }

  updateMessageInEditor(message)
}

function recentMsg () {
  updateMessageInEditor(oldMessage)
}

function withMetaMsg () {
  const message = parseMessageFromEditor()

  message.type = 'ATTACHMENT'

  if (typeof message.meta != 'object' || Array.isArray(message.meta)) {
    message.meta = {}
  }

  const metas = ['attachment', 'url', 'thumbnail', 'uuid']

  for (const key of metas) {
    if (!message.meta[key]) {
      message.meta[key] = `<${key}>`
    }
  }

  updateMessageInEditor(message)
}

function receiverMsg () {
  const message = parseMessageFromEditor()

  if (!message.receiverUserId) {
    message.receiverUserId = '<receiver>'
  }

  updateMessageInEditor(message)
}

function updateMessageInEditor (msg) {
  try {
    const backup = document.getElementById('message-editor').value
    document.getElementById('message-editor').value =
      typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2)
    oldMessage = backup
  } catch (e) {
    alert(e.message)
    log('error in message json:', e.toString())
  }
}

function parseMessageFromEditor (template = true) {
  try {
    return JSON.parse(document.getElementById('message-editor').value)
  } catch (e) {
    if (template) {
      return { ...messageTemplate }
    }
    log('error in message json:', e.toString())
  }
}

function load () {
  document.getElementById('message-editor').value = JSON.stringify(
    messageTemplate,
    null,
    2
  )
  apiListThreads()
  connect()
}

window.onload = load

// helper function

function syntaxHighlight (json) {
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function (match) {
      var cls = 'number'
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'key'
        } else {
          cls = 'string'
        }
      } else if (/true|false/.test(match)) {
        cls = 'boolean'
      } else if (/null/.test(match)) {
        cls = 'null'
      }
      return '<span class="' + cls + '">' + match + '</span>'
    }
  )
}

function  generateLink (options, name) {
  const a = ['<a']

  if (!options.class) {
    options.class = 'link'
  } else if (options.class && !options.class.includes('link')) {
    options.class = `${options.class} link`
  }

  for (const key in options) {
    console.log({key, options})
    a.push(`${key}="${options[key]}"`)
  }

  return a.join(' ') + `>${name}</a>`
}
