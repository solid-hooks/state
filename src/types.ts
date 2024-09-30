import type { AnyFunction } from '@subframe7536/type-utils'
import type { Path, PathValue } from 'object-path-access'
import type { Accessor, OnEffectFunction, OnOptions } from 'solid-js'
import type { createStore, SetStoreFunction, Store } from 'solid-js/store'

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

export type StateFn<State extends object> = (state: State, stateName: string) => ReturnType<typeof createStore<State>>

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
  stateFn?: StateFn<State>
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

export type StateSetupFunction<T> = (stateName: string, log: AnyFunction<void>) => T
