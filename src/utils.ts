import type { AnyFunction } from '@subframe7536/type-utils'
import type { ActionObject, GetterObject, StateFn, StateUtils } from './types'
import { klona } from 'klona'
import { pathGet } from 'object-path-access'
import { batch, createEffect, createMemo, on, untrack } from 'solid-js'
import { createStore, produce, reconcile, type SetStoreFunction, unwrap } from 'solid-js/store'

export function defaultStateFn<T extends object>(state: T, stateName: string): ReturnType<typeof createStore<T>> {
  return createStore<T>(state, { name: stateName })
}

/**
 * `globalThis.structuredClone`, fallback to {@link klona}
 */
export function deepClone<T>(value: T): T {
  return (globalThis.structuredClone || klona)(value)
}

/**
 * create state with utils, use in {@link setupObject}
 */
export function createStateWithUtils<T extends object>(
  stateName: string,
  initialState: T,
  stateFn: StateFn<T> = defaultStateFn<T>,
): [state: T, setState: SetStoreFunction<T>, utils: StateUtils<T>] {
  const [state, setState] = stateFn(deepClone(initialState), stateName)
  const utils: StateUtils<T> = {
    $id: stateName,
    $patch: patcher => batch(() => setState(
      typeof patcher === 'function'
        ? produce(patcher as AnyFunction)
        : reconcile(Object.assign({}, unwrap(state), patcher), { merge: true }),
    )),
    $reset: () => {
      setState(reconcile(initialState, { merge: true }))
    },
    $subscribe: (access, callback, options = { defer: true }) => {
      const deps = typeof access === 'string'
        ? () => pathGet(state, access as any)
        : () => access(state)
      createEffect(on(deps, callback as AnyFunction, options))
    },
  }
  return [state, setState, utils]
}

/**
 * create getters, wrap non-param function with `createMemo`
 *
 * use in {@link setupObject}
 */
export function createStateGetter<T extends GetterObject>(getters?: T): T {
  if (!getters) {
    return {} as T
  }
  const _getters = {} as T
  for (const [key, getter] of Object.entries(getters)) {
    // @ts-expect-error assign
    _getters[key] = getter.length === 0
      ? createMemo(getter)
      : getter
  }
  return _getters
}

/**
 * create actions, wrap functions with `batch(() => untrack(() => ...))`
 *
 * use in {@link setupObject}
 */
export function createStateAction<T extends ActionObject>(actions?: T): T {
  if (!actions) {
    return {} as T
  }
  const _actions = {}
  for (const [name, fn] of Object.entries(actions)) {
    // @ts-expect-error assign
    _actions[name] = (...args) => batch(() => untrack(() => fn(...args)))
  }
  return _actions as T
}
