import { type Path, type PathValue, pathGet, pathSet } from 'object-path-access'
import { createStore, reconcile, unwrap } from 'solid-js/store'
import type { BaseOptions } from 'solid-js/types/reactive/signal.js'
import type { UseStore, del, get, set } from 'idb-keyval'
import { maybePromise } from './utils'
import type { PersistenceSyncAPI, PersistenceSyncData } from './sync'
import type { StateFn } from './types'

/**
 * use IndexedDB storage with `idb-keyval`
 * @example
 * ```ts
 * import { createIdbStorage, persistStateFn } from '@solid-hooks/state'
 * import { del, get, set } from 'idb-keyval'
 *
 * const idbStorage = createIdbStorage({ get, set, del })
 * const stateFn = persistStateFn({
 *   storage: idbStorage,
 *   // ...
 * }),
 * ```
 */
export function createIdbStorage(
  fn: { get: typeof get, set: typeof set, del: typeof del },
  customStore?: UseStore,
): AnyStorage {
  return {
    getItem: key => fn.get(key, customStore) as any,
    setItem: (key, val) => fn.set(key, val, customStore),
    removeItem: key => fn.del(key, customStore),
  }
}

export type PersistOptions<State extends object, Paths extends Path<State>[] = []> = {
  /**
   * localStorage like api, support async
   * @default localStorage
   */
  storage?: AnyStorage
  /**
   * serializer for persist state
   * @default { read: JSON.parse, write: JSON.stringify }
   */
  serializer?: Serializer<FlattenType<PartialObject<State, Paths>>>
  /**
   * object paths to persist
   * @example ['test.deep.data', 'idList[0]']
   */
  paths?: Paths | undefined
  /**
   * sync persisted data,
   * built-in: {@link storageSync}, {@link messageSync}, {@link wsSync}, {@link multiSync}
   */
  sync?: PersistenceSyncAPI
}

type PartialObject<
  T extends object,
  K extends Path<T>[],
  V = Record<string, any>,
> = K['length'] extends 0
  ? T
  : K['length'] extends 1
    ? { [P in K[0] & string]: PathValue<T, P> }
    : K extends [infer A, ...infer B]
    // eslint-disable-next-line style/indent-binary-ops
      ? V & {
        [P in A & string]: PathValue<T, A & string>
      } & (B extends any[] ? PartialObject<T, B, V> : {})
      : never
type FlattenType<T> = T extends infer U ? ConvertType<{ [K in keyof U]: U[K] }> : never

type ConvertType<T> = {
  [K in keyof T as K extends `${infer A}.${string}` ? A : K]: K extends `${string}.${infer B}`
    ? ConvertType<{ [P in B]: T[K] }>
    : T[K];
}

/**
 * serializer type for {@link PersistOptions}
 */
export type Serializer<State> = {
  /**
   * Serializes state into string before storing
   * @default JSON.stringify
   */
  write: (value: State) => string

  /**
   * Deserializes string into state before hydrating
   * @default JSON.parse
   */
  read: (value: string) => State
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type AnyStorage = StorageLike | {
  [K in keyof StorageLike]: (...args: Parameters<StorageLike[K]>) => Promise<ReturnType<StorageLike[K]>>
}

/**
 * persist state on storage
 */
export function useStorage<T extends object, Paths extends Path<T>[]>(
  initialValue: T,
  key: string,
  options: BaseOptions & PersistOptions<T, Paths> = {},
): ReturnType<typeof createStore<T>> {
  const {
    name,
    paths,
    serializer: { read, write } = {
      write: JSON.stringify,
      read: JSON.parse,
    },
    storage = localStorage,
    sync,
  } = options
  const [state, setState] = createStore(initialValue, { name })
  let unchanged = 1
  function serializeState() {
    const currentState = unwrap(state)
    let serializedState: string
    if (!paths?.length) {
      serializedState = write(currentState)
    } else {
      const obj = {}
      for (const path of paths) {
        pathSet(obj, path as any, pathGet(currentState, path))
      }
      serializedState = write(obj)
    }
    return serializedState
  }

  function readStorage(onRead: (data: string | null) => void) {
    maybePromise(storage.getItem(key), data => onRead(data))
  }

  readStorage(old => (old !== null && old !== undefined)
    ? unchanged && setState(reconcile(Object.assign({}, unwrap(state), read(old)), { merge: true }))
    : storage.setItem(key, serializeState()),
  )

  sync?.[0]((data: PersistenceSyncData) => {
    if (data.key === name && data.newValue && (!data.url || (data.url === globalThis.location.href))) {
      const old = serializeState()
      if (old !== data.newValue) {
        setState(reconcile(Object.assign({}, unwrap(state), read(data.newValue)), { merge: true }))
        storage.setItem(key, data.newValue)
      }
    }
  })

  return [
    state,
    (...args: any[]) => {
      setState(...args as [any])
      readStorage((old) => {
        const serialized = serializeState()

        if (old !== serialized) {
          sync?.[1](key, serialized)
          maybePromise(
            storage.setItem(key, serialized),
            () => unchanged && unchanged--,
          )
        }
      })
    },
  ]
}

/**
 * persist state function, if you want to persist state in IndexedDB, see {@link createIdbStorage createIdbStorage}
 * @example
 * ```ts
 * import { defineState, persistStateFn, storageSync } from '@solid-hooks/state'
 *
 * const useTestState = defineState('test', {
 *   init,
 *   // ...
 *   // custom state function
 *   stateFn: persistStateFn({
 *     key: 'other-key', // state.$id by default
 *     serializer: { write: JSON.stringify, read: JSON.parse, }, // JSON by default
 *     storage: localStorage, // localStorage by default, async storage available
 *     path: ['test'], // type-safe state access path for persisted state, support array
 *     sync: storageSync, // sync persisted data
 *   }),
 * })
 * ```
 */
export function persistStateFn<State extends object, Paths extends Path<State>[] = []>(
  persistOptions?: PersistOptions<State, Paths> & { key?: string },
): StateFn<State> {
  return (state: State, stateName: string) =>
    useStorage(
      state,
      persistOptions?.key ?? stateName,
      {
        ...persistOptions,
        name: stateName,
      },
    )
}
