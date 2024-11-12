const Conf = require('../../config.js')
const Result = require('../../base/result.js')
const { CreateError } = require('../../base/error.js')
const request = require('./5starapi.js')
class UserProvider {
  async get (token, ids) {
    const result = await request(
      'POST',
      '/user-listing',
      { user_ids: ids.map(id => parseInt(id)) },
      { token }
    )
    if (result.ok) {
      for (const user of result.value().users) {
        user.id = user.id.toString()
      }
    }
    // console.log({'user-listing': result })
    return result
  }
  async token (token) {
    const result = await request('GET', '/user-details', undefined, { token })
    if (result.ok) {
      const user = result.value()
      user.id = user.id.toString()
    }
    return result
  }
}
const mockingUsers = [
  { name: 'A' },
  { name: 'B' },
  { name: 'C' },
  { name: 'D' },
  { name: 'E' },
  { name: 'F' }
]
class MockUserProvider {
  async get (token, ids) {
    const auth = await this.token(token)
    if (!auth.ok) {
      return auth
    }
    const users = []
    const missingUserIds = []
    ids.forEach(id => {
      const no = parseInt(id)
      const index = no - 1
      if (mockingUsers[index]) {
        users.push({ ...mockingUsers[index], id })
        return
      }
      missingUserIds.push(id)
    })
    if (!users.length) {
      return Result.fail(CreateError('Some of user may be invalid.'))
    }
    return Result.ok({ users, missingUserIds })
  }
  async token (token) {
    token = token.replace('Bearer', '').trim()
    const no = parseInt(token)
    const index = no - 1
    if (mockingUsers[index]) {
      return Result.ok({ ...mockingUsers[index], id: no.toString() })
    }
    return Result.fail(CreateError('Session is invalid or expired.', 401))
  }
}
var UserEvent
;(function (UserEvent) {
  UserEvent['Online'] = 'ONLINE'
  UserEvent['Offline'] = 'OFFLINE'
  UserEvent['Connected'] = 'CONNECTED'
  UserEvent['Disconnected'] = 'DISCONNECTED'
})(UserEvent || (UserEvent = {}))
function GetUserProvider () {
  return Conf.env.name == 'mock' ? new MockUserProvider() : new UserProvider()
}
module.exports = {
  UserProvider,
  MockUserProvider,
  UserEvent,
  GetUserProvider
}
//# sourceMappingURL=user.js.map
