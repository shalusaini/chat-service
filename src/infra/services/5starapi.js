const bent = require('bent')
const Conf = require('../../config.js')
const { log, error } = require('../support/log.js')
const Result = require('../../base/result.js')
const { CreateError } = require('../../base/error.js')
async function request (method, path, body, options) {
  if (body) {
    body = JSON.stringify(body)
  }
  log('%s %s --data %o', method, path, body)
  const headers = {
    Accept: 'application/json',
    'content-type': 'application/json',
    'x-secret': Conf.chat.api.secret
  }
  if (options.token) {
    headers.Authorization = options.token
  }
  try {
    const json = bent(Conf.chat.api.endpoint, 'json', method, 200)
    const res = await json(path, body, headers)
    return Result.ok(res.data)
  } catch (e) {
    let message = e.message
    if (e.json) {
      const errJson = await e.json()
      if (errJson.message) {
        message = errJson.message
      }
    }
    const err = CreateError(message, e.statusCode || 500)
    error('error %o', err)
    return Result.fail(err)
  }
}
module.exports = request