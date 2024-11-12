const { readFileSync, existsSync } = require('fs')
const path = require('path')
const dotenv = require('dotenv')
const { info } = require('./infra/support/log.js')
dotenv.config()
const storageBasedir = existsSync(path.join(process.cwd(), 'storage'))
  ? 'storage'
  : '../storage'
const ENV_NAME = process.env.ENV_NAME
const DEFAULT_NODE_ENV =
  ENV_NAME === 'production' ? 'production' : 'development'
const NODE_ENV = process.env.NODE_ENV || DEFAULT_NODE_ENV
info(`env:${ENV_NAME}|node:${NODE_ENV}`)
const pkgJson = JSON.parse(readFileSync('package.json').toString())
const redisCluster = []
const REDIS_MODE = process.env.REDIS_MODE || ''
if (REDIS_MODE === 'cluster' && typeof process.env.REDIS_CLUSTER == 'string') {
  info('Reading redis cluster nodes.')
  process.env.REDIS_CLUSTER.split(',').forEach(host => {
    redisCluster.push({
      host,
      port: 6379
    })
  })
  info('Number of nodes', redisCluster.length)
}
module.exports = {
  name: '5Star Chat Service',
  version: pkgJson.version,
  env: { name: ENV_NAME, node: NODE_ENV },
  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT || '3001'),
  debug: process.env.DEBUG == 'true',
  log: true,
  rest: {},
  ws: {},
  tokenizer: {
    secret: 'secret'
  },
  storage: {
    disk: 'local',
    basedir: storageBasedir,
    thumbnail: {
      // note: this will effect storage api thumbnail generator logic
      mime: 'image/jpeg'
    }
  },
  mongo: {
    url: process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/5star_chat'
  },
  socketio: {
    key: 'sio'
  },
  redis: {
    mode: REDIS_MODE,
    url: process.env.REDIS_URL,
    cluster: redisCluster
  },
  chat: {
    api: {
      endpoint: process.env.STAR_API || 'http://192.168.88.34:9026/api/chat',
      secret: process.env.STAR_SECRET || 'secret'
    },
    thread: {
      maxUsersCount: 100,
      recentMessagesCount: 10
    }
  },
  internal: {
    ips:
      !process.env.INTERNAL_IPS || process.env.INTERNAL_IPS === '*'
        ? '*'
        : process.env.INTERNAL_IPS.split(',').map(ip => ip.trim()),
    secrets: (process.env.INTERNAL_SECRETS
      ? process.env.INTERNAL_SECRETS.split(',').map(s => s.trim())
      : ['secret']
    ).map(s => Buffer.from(s))
  }
}