const path = require('path')
const Conf = require('../../config.js')
function pathToBase (relPath) {
  return path.relative(process.cwd(), relPath)
}
function pathToResources (relPath = '') {
  return path.join(pathToBase('src/resources'), relPath)
}
function pathToStorage (relPath = '') {
  return path.join(pathToBase(Conf.storage.basedir), relPath)
}
module.exports = {
  pathToBase,
  pathToResources,
  pathToStorage
}
//# sourceMappingURL=index.js.map
