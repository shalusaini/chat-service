const Result = require('../../base/result.js')
const { log } = require('../support/log.js')
const Conf = require('../../config.js')
const request  = require('./5starapi.js')
class PushProvider {
  send (token, data) {
    return request('POST', '/chat-notication', data, { token })
  }
}
class MockPushProvider {
  async send (token, data) {
    log('mock send push:', data)
    return Result.ok()
  }
}
function GetPushProvider () {
  return Conf.env.name == 'mock' ? new MockPushProvider() : new PushProvider()
}
module.exports = {
  PushProvider,
  MockPushProvider,
  GetPushProvider
}
//# sourceMappingURL=push.js.map
