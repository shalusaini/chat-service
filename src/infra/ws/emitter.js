const { Emitter } = require('@socket.io/redis-emitter')
const  Conf = require('../../config.js')
const redis = require('../redis/index.js')
const siore = new Emitter(redis.create(`${Conf.socketio.key}.emitter`), {
  key: Conf.socketio.key
})
module.exports = siore
//# sourceMappingURL=emitter.js.map
