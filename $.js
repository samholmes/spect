import SelectorSet from 'selector-set'
import channel from './channel.js'
import store from './store.js'
import tuple from 'immutable-tuple'
import _observable from 'symbol-observable'

// global to avold multiple spect instances collision
const _callbacks = Symbol.for('@spect.callbacks'),
      _planned = Symbol.for('@spect.planned'),
      _observer = Symbol.for('@spect.observer'),
      _attrAspects = Symbol.for('@spect.attrAspects')

const set = new SelectorSet


export default function spect(context, target, callback) {
  // spect(target, '.a')
  if (typeof context === 'string') return $(document, context, target)
  // spect('.a', b)
  if (typeof target === 'string') return $(context, target, callback)

  // spect(target, fn)
  if (arguments.length < 3) {
    callback = target
    target = context
    context = document
  }

  let offs = [], collection = store([]), channel = collection[_observable](), { cancel } = channel

  // spect(list, fn)
  if (target[Symbol.iterator] && !target.nodeType) {
    collection.push(...target)
    offs = collection.map(target => spect(context, target, callback))
    collection.cancel = channel.cancel = () => (offs.map(c => c.cancel()), cancel())
  }

  // spect(target, fn)
  else {
    collection.push(target)
    matched(target, callback)
    collection.cancel = channel.cancel = () => (unmatched(target, callback), cancel())
  }

  return collection
}

// selector-based aspect
function $(scope, selector, callback) {
  if (!scope[_observer]) {
    const observer = scope[_observer] = new MutationObserver((list) => {
      for (let mutation of list) {
        let { addedNodes, removedNodes, target } = mutation
        if (mutation.type === 'childList') {
          removedNodes.forEach(target => {
            if (target.nodeType !== 1) return
            set.matches(target).forEach(rule => unmatched(target, rule.data))
            set.queryAll(target).forEach(rule => rule.elements.forEach(el => unmatched(el, rule.data)))
          })
          addedNodes.forEach(target => {
            if (target.nodeType !== 1) return
            set.matches(target).forEach(rule => matched(target, rule.data))
            set.queryAll(target).forEach(rule => rule.elements.forEach(el => matched(el, rule.data)))
          })
        }
        else if (mutation.type === 'attributes') {
          const attrName = mutation.attributeName
          if (!target[_attrAspects]) target[_attrAspects] = new Set

          const active = new WeakSet()
          // FIXME: here we should better instead index attr-based rules
          // match changed attrs against the index of attr rules, get possible attr rules
          // see if element or any sub-elements match the attr-defined rules
          set.matches(target).forEach(rule => {
            matched(target, rule.data)
            const t = tuple(target, attrName, rule.selector, rule.data)
            target[_attrAspects].add(t)
            active.add(t)
          })
          set.queryAll(target).forEach(rule => {
            rule.elements.forEach(el => {
              matched(el, rule.data)
              const t = tuple(el, attrName, rule.selector, rule.data)
              target[_attrAspects].add(t)
              active.add(t)
            })
          })

          // remove selectors not matching attr rules anymore
          for (let t of target[_attrAspects]) {
            if (active.has(t)) continue
            unmatched(t[0], t[3])
            target[_attrAspects].delete(t)
            if (!target[_attrAspects].size) delete target[_attrAspects]
          }
        }
      }
    })
    observer.observe(scope, {
      attributes: true,
      childList: true,
      subtree: true
    })
  }

  const collection = store([]),
        channel = collection[_observable](),
        { cancel } = channel

  const aspect = el => {
    let destroy
    if (el[_planned]) {
      window.cancelAnimationFrame(el[_planned])
      delete el[_planned]
    } else {
      destroy = callback && callback(el);
      collection.push(el)
      channel(el)
    }
    return () => {
      collection.splice(collection.indexOf(el) >>> 0, 1)
      el[_planned] = window.requestAnimationFrame(() => {
        delete el[_planned]
        destroy && destroy()
      })
    }
  }

  set.add(selector, aspect)

  collection.cancel = channel.cancel = () => {
    set.queryAll(scope).forEach(rule => rule.elements.forEach(el => unmatched(el, rule.data)))
    set.remove(selector, aspect)
    if (!set.size) {
      scope[_observer].disconnect()
      delete scope[_observer]
    }
    cancel()
  }

  // set.matches(scope).forEach(rule => matched(scope, rule.data))
  set.queryAll(scope).forEach(rule => rule.elements.forEach(el => matched(el, rule.data)))

  return collection
}

function matched(el, fn) {
  if (!el[_callbacks]) el[_callbacks] = new WeakMap
  if (el[_callbacks].has(fn)) return
  let cb = fn.bind(el)
  el[_callbacks].set(fn, cb)
  try { cb.destroy = cb(el) }
  catch (e) { console.error(e) }
}

function unmatched(el, fn) {
  if (!el[_callbacks]) return
  if (!el[_callbacks].has(fn)) return
  let cb = el[_callbacks].get(fn);
  if (cb.destroy && cb.destroy.call) cb.destroy();
  el[_callbacks].delete(fn);
}
