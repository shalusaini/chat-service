function CreateError (message, status = 400, flag, meta) {
  const err = new Error(message)
  err.status = status
  err.flag = flag
  err.meta = meta
  return err
}
function InternalError (message, flag, meta) {
  return CreateError(message, 500, flag, meta)
}
module.exports = {
  CreateError,
  InternalError
}
//# sourceMappingURL=error.js.map
