import delegated from 'delegate-it'
import { fx } from './src/core.js'

const cbCache = new WeakMap

// we keep delegate a separate prop for now
// to let it be a set and to let events to have own classes
export default function on (evts, delegate, handler, deps) {
  if (typeof delegate === 'function') {
    deps = handler
    handler = delegate
    delegate = null
  }
  evts = evts.split(/\s+/)

  // FIXME: figure out if we can factor this element out

  fx.call(this, 'on', () => {
    let destroy = []

    if (delegate) {
      evts.forEach(evt => els.forEach(el => {
        const delegation = delegated(el, delegate, evt, handler)
        destroy.push(delegation.destroy)
      }))
    }
    else {
      evts.forEach(evt => els.forEach(el => {
        el.addEventListener(evt, handler)
        destroy.push(() => el.removeEventListener(evt, handler))
      }))
    }

    return () => destroy.forEach(fn => fn())
  }, deps)
}
