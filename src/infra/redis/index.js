// const Conf = require('../../config.js')
// const Redis = require('ioredis')
// export default new (class {
//   constructor () {
//     this.clients = {}
//     this.clusters = {}
//   }
//   client (name = 'defaut') {
//     if (!this.clients[name]) {
//       this.clients[name] = new Redis(Conf.redis.url)
//     }
//     return this.clients[name]
//   }
//   cluster (name = 'defaut') {
//     if (!this.clusters[name]) {
//       this.clusters[name] = new Redis.Cluster(Conf.redis.cluster)
//     }
//     return this.clusters[name]
//   }
//   create (name = 'defaut') {
//     if (Conf.redis.cluster.length) {
//       return this.cluster(name)
//     }
//     return this.client(name)
//   }
// })()
// //# sourceMappingURL=index.js.map

const Conf = require('../../config.js')
const Redis = require('ioredis')

class RedisManager {
  constructor () {
    this.clients = {}
    this.clusters = {}
  }

  client (name = 'defaut') {
    if (!this.clients[name]) {
      this.clients[name] = new Redis(Conf.redis.url)
    }
    return this.clients[name]
  }

  cluster (name = 'defaut') {
    if (!this.clusters[name]) {
      this.clusters[name] = new Redis.Cluster(Conf.redis.cluster)
    }
    return this.clusters[name]
  }

  create (name = 'defaut') {
    if (Conf.redis.cluster.length) {
      return this.cluster(name)
    }
    return this.client(name)
  }
}

module.exports = new RedisManager()
