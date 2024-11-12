const {
  MessageSendListener,
  ThreadCreatedListener,
  ThreadUpdateListener
} = require('./listeners.js')
function init (eventS, sioe, pushProvider) {
  eventS.listen(new MessageSendListener(sioe, pushProvider))
  eventS.listen(new ThreadCreatedListener(sioe, pushProvider))
  eventS.listen(new ThreadUpdateListener(sioe, pushProvider))
}
module.exports = init
