import { DEV, batch, createMemo, untrack } from 'solid-js'
import type { Promisable } from '@subframe7536/type-utils'
import type { ActionObject, GetterObject, StateGetter } from './types'

export function createGetters<
  State extends object = Record<string, any>,
  Getter extends GetterObject = {},
>(
  getters: StateGetter<State, Getter> | undefined,
  store: State,
  stateName: string,
) {
  const _getters = {} as Readonly<Getter>
  for (const [key, getter] of Object.entries(getters?.(store) || {})) {
    // @ts-expect-error assign
    _getters[key] = getter.length === 0
      ? createMemo(getter, undefined, DEV ? { name: `${stateName}-${key}` } : {})
      : getter
  }
  return _getters
}

export function createActions<T extends ActionObject>(functions?: T): T {
  if (!functions) {
    return {} as T
  }
  const actions = {}
  for (const [name, fn] of Object.entries(functions)) {
    // @ts-expect-error assign
    actions[name] = (...args) => batch(() => untrack(() => fn(...args)))
  }
  return actions as T
}

export function maybePromise<T>(maybePromise: Promisable<T>, cb?: (data: T) => void) {
  maybePromise instanceof Promise ? maybePromise.then(cb) : cb?.(maybePromise)
}
