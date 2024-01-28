import { describe, expect, it, vi } from 'vitest'
import { createRoot } from 'solid-js'
import { defineState } from '../src'

describe('test state', () => {
  it('defineState', async () => {
    const callback = vi.fn()
    const deepCallback = vi.fn()
    const cacheCount = vi.fn()
    const useState = defineState('test-utils', {
      init: { deep: { test: 1 }, foo: 'bar' },
      getters: state => ({
        doubleValue() {
          cacheCount()
          return state.deep.test * 2
        },
        getLarger(num: number) {
          return state.deep.test + num
        },
      }),
      actions: setState => ({
        doubleDeep() {
          setState('deep', 'test', test => test * 2)
        },
        plus(num: number) {
          setState('deep', 'test', test => test + num)
        },
      }),
    })

    const [state, actions] = useState()

    createRoot(() => state.$subscribe(state => state.foo, callback))
    state.$patch({ foo: 'test' })
    await Promise.resolve()
    expect(callback).toHaveBeenCalledTimes(1)

    createRoot(() => state.$subscribe('deep.test', deepCallback, { defer: false }))
    expect(state().deep.test).toBe(1)
    expect(state.doubleValue()).toBe(2)
    expect(deepCallback).toHaveBeenCalledWith(1, undefined, undefined)

    state.doubleValue()
    state.doubleValue()
    state.doubleValue()
    expect(cacheCount).toBeCalledTimes(1)
    expect(state.getLarger(4)).toBe(5)

    actions.doubleDeep()
    expect(state().deep.test).toBe(2)
    expect(state.doubleValue()).toBe(4)
    expect(deepCallback).toHaveBeenCalledWith(2, 1, undefined)

    actions.plus(200)
    expect(state().deep.test).toBe(202)
    expect(state.doubleValue()).toBe(404)
    expect(deepCallback).toHaveBeenCalledWith(202, 2, undefined)

    state.$reset()
    expect(state().deep.test).toBe(1)
    expect(state().foo).toBe('bar')
    expect(state.doubleValue()).toBe(2)
  })
  it('nest defineState', async () => {
    const initialState = { count: 0 }
    const useState = defineState('test-nest', {
      init: initialState,
      getters: state => ({
        fresh: () => {
          return state.count * 2 + 20
        },
      }),
      actions: setState => ({
        increment: () => setState('count', n => n + 1),
        decrement: () => setState('count', n => n - 1),
      }),
    })
    const [state, actions] = useState()
    const useTempState = defineState('test-nest-temp', {
      init: { ...initialState },
      actions: setState => ({
        generate: () => {
          actions.increment()
          setState('count', state.fresh())
        },
      }),
    })
    const [tempState, tempActions] = useTempState()

    tempActions.generate()
    await Promise.resolve()
    expect(state().count).toBe(1)
    expect(tempState().count).toBe(22)
  })

  it('should persist state to storage', async () => {
    const initialState = { count: 0 }
    const kv = new Map()
    const key = 'state-test-persist'
    const useState = defineState('test-persist', {
      init: initialState,
      actions: setState => ({
        increment: () => setState('count', n => n + 1),
        decrement: () => setState('count', n => n - 1),
      }),
      persist: {
        enable: true,
        key,
        storage: {
          getItem(key) {
            return kv.get(key)
          },
          setItem(key, value) {
            kv.set(key, value)
          },
          removeItem(key) {
            kv.delete(key)
          },
        },
      },
    }, true)
    const [, actions] = useState()

    await Promise.resolve()
    expect(kv.get(key)).toBe('{"count":0}')

    actions.increment()
    expect(kv.get(key)).toBe('{"count":1}')

    actions.decrement()
    expect(kv.get(key)).toBe('{"count":0}')
  })
  it('should persist state to storage by paths', async () => {
    const initialState = {
      persist: { count: 0, noPersist: 'data' },
      partialPersist: ['test', 'test1'],
    }
    const kv = new Map()
    const key = 'state-test-persist-optional'
    const useState = defineState('test-persist-optional', {
      init: initialState,
      actions: (setState, state) => ({
        increment: () => {
          setState('persist', 'count', n => n + 1)
          setState('partialPersist', ['increment', `${state.persist.count}`])
        },
        decrement: () => {
          setState('persist', 'count', n => n - 1)
          setState('partialPersist', ['decrement', `${state.persist.count}`])
        },
      }),
      persist: {
        enable: true,
        key,
        storage: {
          getItem(key) {
            return kv.get(key)
          },
          setItem(key, value) {
            kv.set(key, value)
          },
          removeItem(key) {
            kv.delete(key)
          },
        },
        paths: ['persist.count', 'partialPersist[0]'],
      },
    })
    const [,actions] = useState()

    await Promise.resolve()
    expect(kv.get(key)).toBe('{"persist":{"count":0},"partialPersist":["test"]}')

    actions.increment()
    expect(kv.get(key)).toBe('{"persist":{"count":1},"partialPersist":["increment"]}')

    actions.decrement()
    expect(kv.get(key)).toBe('{"persist":{"count":0},"partialPersist":["decrement"]}')
  })
})
