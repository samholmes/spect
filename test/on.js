import t from 'tst'
import { $, state, fx, prop, store, calc, attr, on } from '../index.js'
import { tick, frame, idle, time } from 'wait-please'
import { augmentor, useState, useEffect, useMemo } from 'augmentor'
import Observable from 'zen-observable/esm'
import observable from './observable.js'


t('on: core', t => {
  var y = document.createElement('div')
	var x = document.createElement('div'), log = []
  y.appendChild(x)
  y.addEventListener('x', e => {
    t.fail('should prevent events')
  })

  on(x, 'x', e => {
    e.stopPropagation()
    log.push('x')
  })
  x.dispatchEvent(new Event('x', { bubbles: true }))
  t.is(log, ['x'])

	t.end()
});

t('on: space-separated events', async t => {
	var x = document.createElement('div'), log = []

  let xs = on(x, 'x y', e => log.push(e.type))
  x.dispatchEvent(new Event('x'))
  x.dispatchEvent(new Event('y'))
  await tick(8)
  t.is(log, ['x', 'y'])

  xs.cancel()
  x.dispatchEvent(new Event('x'))
  x.dispatchEvent(new Event('y'))
  await tick(8)
  t.is(log, ['x', 'y'])

	t.end()
});

t('on: delegated events', t => {
	var x = document.createElement('x'), log = []
  document.documentElement.appendChild(x)

  let xs = on('x', 'x', e => log.push(e.type))
  x.dispatchEvent(new Event('x', {bubbles: true}))
  x.dispatchEvent(new Event('y', {bubbles: true}))
  t.is(log, ['x'])

  xs.cancel()
  x.dispatchEvent(new Event('x', {bubbles: true}))
  x.dispatchEvent(new Event('y', {bubbles: true}))
  t.is(log, ['x'])

  document.documentElement.removeChild(x)

	t.end()
});

t('on: events list', async t => {
  on('x', ['x', 'y'], e => {})
})

t('on: observable', async t => {
  let el = document.createElement('div')
  let clicks = on(el, 'click')
  let log = []
  ;(async () => {
    // for await (const e of clicks) {
    //   log.push(e.type)
    // }
    clicks(e => log.push(e.type))
  })()
  el.click()
  await tick(6)
  t.is(log, ['click'], 'basic')
  el.click()
  el.click()
  await tick(8)
  // t.is(log, ['click', 'click'], 'skips events within same tick')
  t.is(log, ['click', 'click', 'click'], 'skips events within same tick')
  el.click()
  el.click()
  el.click()
  await tick(8)
  // t.is(log, ['click', 'click', 'click'], 'updates to latest value')
  t.is(log, ['click', 'click', 'click', 'click', 'click', 'click'], 'updates to latest value')

  clicks.cancel()
  // clicks(null)
  await tick(8)
  await tick(8)
  el.click()
  await tick(8)
  el.click()
  await tick(8)
  t.is(log.length, 6, 'end stops event stream')
})
t.todo('on: next-tick event should be discarded', async t => {
  let el = document.createElement('click')
  let resolve, p = new Promise(r => {resolve = r})
  let log = []

  fx((e) => {
    log.push(e ? true : false)
  }, [on(el, 'click'), p])

  el.click()
  await tick(12)
  t.is(log, [true])
  resolve()
  await tick(12)
  t.is(log, [true, false])
})
