const _deps = Symbol.for('spect.deps')

export default function fx(fn, deps) {
  // check [meta] deps
  if (this[_deps]) if (!this[_deps](deps, () => {
    destroy.forEach(
      fn => fn && (fn.call && fn()) ||
      fn.then && fn.then(fn => fn && fn.call && fn())
    )
  })) return this

  let destroy = []

  destroy.push(Promise.resolve().then(() => fn.call(this)))

  return this
}
