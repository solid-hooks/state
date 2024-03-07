import type { Promisable } from '@subframe7536/type-utils'
import { type Path, type PathValue, pathGet, pathSet } from 'object-path-access'
import { createStore, reconcile, unwrap } from 'solid-js/store'
import type { BaseOptions } from 'solid-js/types/reactive/signal.js'

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
type FlattenType<T> = T extends infer U
  ? ConvertType<{ [K in keyof U]: U[K] }>
  : never
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
  [K in keyof StorageLike]: (
    ...args: Parameters<StorageLike[K]>
  ) => Promise<ReturnType<StorageLike[K]>>
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

  function maybePromise<T>(maybePromise: Promisable<T>, cb: (data: T) => void) {
    maybePromise instanceof Promise ? maybePromise.then(cb) : cb(maybePromise)
  }

  function readStorage(onRead: (data: string | null) => void) {
    maybePromise(storage.getItem(key), data => onRead(data))
  }

  readStorage(old => (old !== null && old !== undefined)
    ? unchanged && setState(reconcile(Object.assign({}, unwrap(state), read(old)), { merge: true }))
    : storage.setItem(key, serializeState()),
  )
  return [
    state,
    (...args: any[]) => {
      setState(...args as [any])
      readStorage((old) => {
        const serialized = serializeState()

        old !== serialized && maybePromise(
          storage.setItem(key, serialized),
          () => {
            unchanged && unchanged--
          },
        )
      })
    },
  ]
}

/**
 * persist state function
 */
export function persistStateFn<State extends object, Paths extends Path<State>[] = []>(
  persistOptions?: PersistOptions<State, Paths> & { key?: string },
) {
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
