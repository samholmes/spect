import t from 'tst'
import { $, state, fx, prop, store, calc, attr, on } from '../index.js'
import { tick, frame, idle, time } from 'wait-please'
import { augmentor, useState, useEffect, useMemo } from 'augmentor'
import Observable from 'zen-observable/esm'
import observable, { bind2, bind1 } from './observable.js'

t('state: core', async t => {
  let s = state(0)

  // observer 1
  let log = []
  // ;(async () => { for await (let value of s) log.push(value) })()
  s(value => log.push(value))

  // t.equal(+s, 0, 'toPrimitive')
  // t.equal(s.valueOf(), 0, 'valueOf')
  // t.equal(s.toString(), 0, 'toString')
  t.equal(s(), 0, 's()')

  await tick()
  t.deepEqual(log, [0], 'should publish the initial state')

  // s(1)
  // t.equal(+s, 1, 'state.current = value')

  s(2)
  // t.equal(+s, 2, 'state(value)')
  t.equal(s(), 2, 'state(value)')

  // DEPRECATED: functional setter is deprecated
  // s(c => (t.equal(c, 2, 'state(old => )'), 3))
  s(s() + 1)
  t.equal(s(), 3, 'state(state + value)')

  // observer 2
  let log2 = []
  // ;(async () => { for await (let value of s) log2.push(value) })()
  s(value => log2.push(value))

  await tick(8)
  t.deepEqual(log.slice(-1), [3], 'should track and notify first tick changes')
  await frame(10)
  t.deepEqual(log2, [3], 'should properly init set')
  s(4)
  await tick(8) // why 4 ticks delay?
  t.deepEqual(log.slice(-1), [4], 'arbitrary change 1')
  s(5)
  await tick(8)
  t.deepEqual(log.slice(-1), [5], 'arbitrary change 2')

  t.deepEqual(log2.slice(-1), [5], 'secondary observer is fine')

  t.end()
})

t('state: should not expose technical symbols', async t => {
  let s = state({x: 1})
  let log = []
  for(let p in s()) {
    log.push(p)
  }
  t.is(log, ['x'])
})

t.skip('state: function/other state gets subscribed', async t => {
  let s = state(1)
  let s2 = state(s)
  console.log(s2())

  t.is(s2(), 1)
  s(2)
  t.is(s2(), 2)
})
