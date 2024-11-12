const  StorageService  = require('../../infra/services/storage.js')
const storage = new StorageService()
function provider () {
  return (ctx, next) => {
    ctx.storage = storage
    return next()
  }
}

module.exports = provider;

//# sourceMappingURL=middleware.js.map
