const { error, log } = require('../support/log.js')
const { EventEmitter, captureRejectionSymbol } = require('events')
class EventService extends EventEmitter {
  constructor () {
    super({ captureRejections: true })
  }
  [captureRejectionSymbol] (err, event, ...args) {
    error('rejection happened for', event, 'with', err, ...args)
    this.destroy(err)
  }
  destroy (err) {}
  listen (event, listener, once) {
    let callback = null
    switch (typeof event) {
      case 'object':
        // callback = (event as IEventClass).toObject.call(listener);
        callback = event.handle.bind(event)
        event = event.event
        break
      default:
        switch (typeof listener) {
          case 'object':
            callback = listener.handle.bind(listener)
            break
          case 'function':
            callback = listener
            break
          default:
            throw new TypeError('unknown or invalid listener')
        }
        break
    }
    // extra safety
    if (typeof callback !== 'function') {
      throw new TypeError('invalid listener')
    }
    const name = guessEventName(event)
    log('adding listener for event ', name)
    if (once) {
      this.once(name, callback)
    }
    this.addListener(name, callback)
  }
  dispatch (event, data) {
    console.log({dispatch: event, data})
    if (!data) {
      data =
        typeof event.toObject === 'function' ? event.toObject() : event.data
    }
    const name = guessEventName(event)
    log('dispatching event ', name)
    return super.emit(name, data)
  }
}
function guessEventName (event) {
  switch (typeof event) {
    case 'symbol':
    case 'string':
      return event
    case 'object':
      return event.event || event.constructor.name
    default:
      throw new Error('unknown event')
  }
}
module.exports = {
  EventService,
  guessEventName
}

