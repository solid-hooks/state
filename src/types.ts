import type { Path, PathValue } from 'object-path-access'
import type { SetStoreFunction, Store, createStore } from 'solid-js/store'
import type { AnyFunction } from '@subframe7536/type-utils'
import type { Accessor, OnEffectFunction, OnOptions } from 'solid-js'

/**
 * create effect dep
 * @param state reactive state
 */
export type StateUtils<State> = {
  /**
   * state name
   */
  $id: string
  /**
   * update state
   * - `Partial<State>`: using `reconcile` with `merge: true`, merged with previous state
   * - `((state: State) => void)`: using `produce`
   */
  $patch: (state: Partial<State> | ((state: State) => void)) => void
  /**
   * reset state
   */
  $reset: VoidFunction
  /**
   * `createEffect(on())`, defer by default
   * @param accessPath on deps path
   * @param callback on callback
   * @param options on options
   */
  $subscribe: <
    Prev,
    Data,
    P extends Path<State> | ((state: State) => Data),
    Next extends Prev = Prev,
  >(
    accessPath: P,
    callback: OnEffectFunction<P extends Path<State> ? PathValue<State, P> : Data, Prev, Next>,
    options?: OnOptions
  ) => void
}

/**
 * retrun type of {@link $state}
 */
export type StateReturn<
  State,
  Getter = GetterObject,
  Action = ActionObject,
> = [state: StateUtils<State> & Accessor<State> & Getter, actions: Action]

export type InitialState<State extends object> = State | Accessor<State>

export type StateSetupObject<
  State extends object,
  Getter extends GetterObject,
  Action extends ActionObject,
> = {
  /**
   * initial state, support object or Store (return of `createStore`)
   *
   * if is Store, maybe built-in `$patch` and `$reset`
   * will not work as expect
   */
  init: InitialState<State>
  /**
   * functions to get state
   *
   * if the function param is none, use {@link createMemo}
   */
  getters?: StateGetter<State, Getter>
  /**
   * functions to manage state
   */
  actions?: StateAction<State, Action>
  /**
   * custom state function
   */
  stateFn?: (state: State, stateName: string) => ReturnType<typeof createStore<State>>
}

export type StateAction<
  State extends object,
  Return extends ActionObject,
> = (
  setState: SetStoreFunction<State>,
  state: Store<State>,
  utils: Pick<StateUtils<State>, '$patch' | '$reset'>,
) => Return
export type StateGetter<
  State extends object,
  Getter extends GetterObject,
> = (state: State) => Getter

export type GetterObject = Record<string, AnyFunction>
export type ActionObject = Record<string, AnyFunction>

/**
 * persist options for {@link $state}
 */
export type PersistOptions<State extends object, Paths extends Path<State>[] = []> = {
  /**
   * whether to enable persist
   */
  enable: boolean
  /**
   * localStorage like api, support async
   * @default localStorage
   */
  storage?: AnyStorage
  /**
   * identifier in storage
   */
  key?: string
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

export type StateSetupFunction<T> = (stateName: string, log: AnyFunction<void>) => T
