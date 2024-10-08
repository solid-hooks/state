import type { Path } from 'object-path-access'
import type { StateFn } from './types'
import { type PersistStoreOptions, usePersistStore } from '@solid-hooks/persist'
import { DEV } from 'solid-js'
import { createStore } from 'solid-js/store'

export * from '@solid-hooks/persist'

/**
 * persist state function
 * @example
 * ```ts
 * import { defineState } from '@solid-hooks/state'
 * import { persistStateFn, storageSync } from '@solid-hooks/state/persist'
 *
 * const useTestState = defineState('test', {
 *   init,
 *   // ...
 *   // custom state function
 *   stateFn: persistStateFn({
 *     key: 'other-key', // state.$id by default
 *     serializer: { write: JSON.stringify, read: JSON.parse }, // JSON by default
 *     storage: localStorage, // localStorage by default, async storage available
 *     path: ['test'], // type-safe state access path for persisted state, support array
 *     sync: storageSync, // sync persisted data
 *   }),
 * })
 * ```
 * #### IndexedDB example
 *
 * make sure `idb-keyval` installed
 *
 * ```ts
 * import { createIdbStorage, persistStateFn } from '@solid-hooks/state/persist'
 *
 * const idbStorage = createIdbStorage('db-name')
 * const stateFn = persistStateFn({
 *   storage: idbStorage,
 *   // ...
 * })
 * ```
 */
export function persistStateFn<State extends object, Paths extends Path<State>[] = []>(
  persistOptions?: PersistStoreOptions<State, Paths> & { key?: string },
): StateFn<State> {
  return (state: State, stateName: string) =>
    usePersistStore(
      createStore(state, DEV ? { name: stateName } : undefined),
      persistOptions?.key ?? stateName,
      persistOptions,
    )
}
