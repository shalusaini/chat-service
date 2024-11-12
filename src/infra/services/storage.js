const { Initiate } = require('@ukab/storage')
const Conf = require('../../config.js')
const { info } = require('../support/log.js')
class StorageService {
  constructor () {
    // const config = ukab.DEFAULT_CONF
    // config.default = Conf.storage.disk
    // if (!config.disks[Conf.storage.disk]) {
    //   throw new Error(`Disk ${Conf.storage.disk} not configured.`)
    // }
    // console.log('config', config.disks[Conf.storage.disk],'------',Conf.storage.disk,config.disks[Conf.storage.disk].root )
    // config.disks[Conf.storage.disk].root = Conf.storage.basedir
    this.storage = Initiate()
    //info(`Using storage dir: ${config.rootResolver(Conf.storage.basedir, '')}`)
  }
  put (source, file) {
    return this.storage.disk().put(source, file)
  }
  async readStream (key, options = {}) {
    let stats
    try {
      stats = await this.storage.disk().stat(key)
    } catch {
      return false
    }
    if (!stats || !stats.size) {
      return false
    }
    const stream = await this.storage.disk().stream(key, options)
    return {
      stream,
      size: stats.size,
      type: stats.type || 'application/octet-stream'
    }
  }
  async stats (key) {
    let stats
    try {
      stats = await this.storage.disk().stat(key)
    } catch {
      return false
    }
    if (!stats || !stats.size) {
      return false
    }
    return stats
  }
  async stream (key, options = {}) {
    return await this.storage.disk().stream(key, options)
  }
}
module.exports = StorageService
//# sourceMappingURL=storage.js.map
