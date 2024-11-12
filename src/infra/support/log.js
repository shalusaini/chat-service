const util = require('util')
const Conf = require('../../config')

function log (message, ...args) {
  // if (!Conf.log) {
  //   return
  // }
  console.log(util.format(message, ...args))
  return
}
function info (message, ...args) {
  console.info(util.format(message, ...args))
  return
}
function error (message, ...args) {
  console.error(util.format(message, ...args))
  return
}
function debug (message, ...args) {
  // if (!Conf.debug) {
  //   return
  // }
  console.debug(util.format(message, ...args))
  return
}
module.exports = {
  log,
  info,
  error,
  debug
}
