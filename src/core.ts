import type { Accessor, Context, FlowProps, Owner } from 'solid-js'
import {
  DEV,
  createComponent,
  createContext,
  createRoot,
  getOwner,
  runWithOwner,
  useContext,
} from 'solid-js'
import { unwrap } from 'solid-js/store'
import type {
  ActionObject,
  GetterObject,
  StateReturn,
  StateSetupFunction,
  StateSetupObject,
} from './types'
import { createStateAction, createStateGetter, createStateWithUtils } from './utils'

type GlobalStateContext = {
  owner: Owner | null
  map: Map<string, any>
}

let STATE_CTX: Context<GlobalStateContext | undefined>
/**
 * initialize global state with setup object.
 * If you want to persist data, see {@link persistStateFn persistStateFn}
 * @param name state name
 * @param setup state setup object, see {@link StateSetupObject type}
 * @param _log whether to enable log when dev, default is `false`
 * @example
 * ```tsx
 * import { GlobalStateProvider } from '@solid-hooks/state'
 * import { defineState, storageSync } from '@solid-hooks/state/persist'
 *
 * // like Pinia's Option Store
 * const useTestState = defineState('test', {
 *   init: { value: 1, deep: { data: 'hello' } },
 *   getter: state => ({
 *     // without param, will auto wrapped with `createMemo`
 *     doubleValue() {
 *       return state.value * 2
 *     },
 *   }),
 *   action: (setState, state, utils) => ({
 *     plus(num: number) {
 *       setState('value', value => value + num)
 *     },
 *   }),
 * })
 *
 * // usage
 * const [state, actions] = useTestState()
 *
 * render(() => (
 *   <GlobalStateProvider> {optional}
 *     state: <p>{state().value}</p>
 *
 *     getter: <p>{state.doubleValue()}</p>
 *     getter: <p>{getters.doubleValue()}</p>
 *
 *     action: <button onClick={actions.double}>double</button><br />
 *     action: <button onClick={() => actions.plus(2)}>plus 2</button>
 *   </GlobalStateProvider>
 * ))
 *
 * // use produce
 * state.$patch((state) => {
 *   state.deep.data = 'patch'
 * })
 * // use reconcile but support partial state
 * state.$patch({
 *   test: 2
 * })
 *
 * // createEffect(on()), defer by default
 * state.$subscribe(
 *   s => s.deep.data, // or state access path ('deep.data')
 *   (state, oldState) => console.log(state, oldState),
 *   { defer: false },
 * )
 *
 * // reset
 * state.$reset()
 * ```
 */
export function defineState<
  State extends Record<string, any> = Record<string, any>,
  Getter extends GetterObject = {},
  Action extends ActionObject = {},
>(
  name: string,
  setup: StateSetupObject<State, Getter, Action>,
  _log?: boolean,
): Accessor<StateReturn<State, Getter, Action>>
/**
 * global-level context & provider
 * @param name state name
 * @param setup state setup function
 * @param _log whether to enable log when dev, default is `false`
 * @example
 * ```ts
 * import { createEffect, createMemo, createSignal } from 'solid-js'
 * import { defineState } from '@solid-hooks/state'
 *
 * export const useCustomState = defineState('custom', (name, log) => {
 *   const [plain, setPlain] = createSignal(1)
 *   createEffect(() => {
 *     log('defineState with custom function:', { name, newValue: plain() })
 *   })
 *   const plus2 = createMemo(() => plain() + 2)
 *   function add() {
 *     setPlain(p => p + 1)
 *   }
 *   return { plain, plus2, add }
 * })
 * ```
 */
export function defineState<State extends Record<string, any> = Record<string, any>>(
  name: string,
  setup: StateSetupFunction<State>,
  _log?: boolean,
): Accessor<State>
export function defineState<
  State extends Record<string, any> = Record<string, any>,
  Getter extends GetterObject = {},
  Action extends GetterObject = {},
>(
  name: string,
  setup: StateSetupObject<State, Getter, Action> | StateSetupFunction<State>,
): Accessor<State | StateReturn<State, Getter, Action>> {
  const stateName = `state-${name}`
  let build = typeof setup === 'function' ? setup : setupObject(setup)
  const log = (...args: any[]) => console.log(`[${stateName}]`, ...args)

  return () => {
    const ctx = useContext(STATE_CTX)
    const _map = ctx?.map
    if (DEV && !_map) {
      throw new Error('the state must be used inside <GlobalStateProvider />')
    }
    if (_map!.has(name)) {
      return _map!.get(name)
    }
    return runWithOwner(ctx!.owner, () => {
      const result = build(stateName, log)
      _map!.set(name, result)
      // @ts-expect-error for GC
      build = null
      return result
    })
  }
}

/**
 * initialize global state with setup object, no `GlobalProvider` needed.
 * If you want to persist data, see {@link persistStateFn persistStateFn}
 * @param name state name
 * @param setup state setup object, see {@link StateSetupObject type}
 * @param _log whether to enable log when dev, default is `false`
 * @example
 * ```tsx
 * import { GlobalStateProvider, defineGlobalState, storageSync } from '@solid-hooks/state'
 *
 * // like Pinia's Option Store
 * const useTestState = defineGlobalState('test', {
 *   init: { value: 1, deep: { data: 'hello' } },
 *   getter: state => ({
 *     // without param, will auto wrapped with `createMemo`
 *     doubleValue() {
 *       return state.value * 2
 *     },
 *   }),
 *   action: (setState, state, utils) => ({
 *     plus(num: number) {
 *       setState('value', value => value + num)
 *     },
 *   }),
 * })
 *
 * // usage
 * const [state, actions] = useTestState()
 *
 * render(() => (
 *   <>
 *     state: <p>{state().value}</p>
 *
 *     getter: <p>{state.doubleValue()}</p>
 *     getter: <p>{getters.doubleValue()}</p>
 *
 *     action: <button onClick={actions.double}>double</button><br />
 *     action: <button onClick={() => actions.plus(2)}>plus 2</button>
 *   </>
 * ))
 *
 * // use produce
 * state.$patch((state) => {
 *   state.deep.data = 'patch'
 * })
 * // use reconcile but support partial state
 * state.$patch({
 *   test: 2
 * })
 *
 * // createEffect(on()), defer by default
 * state.$subscribe(
 *   s => s.deep.data, // or state access path ('deep.data')
 *   (state, oldState) => console.log(state, oldState),
 *   { defer: false },
 * )
 *
 * // reset
 * state.$reset()
 * ```
 */
export function defineGlobalState<
  State extends Record<string, any> = Record<string, any>,
  Getter extends GetterObject = {},
  Action extends ActionObject = {},
>(
  name: string,
  setup: StateSetupObject<State, Getter, Action>,
  _log?: boolean,
): Accessor<StateReturn<State, Getter, Action>>
/**
 * global-level context & provider, no `GlobalProvider` needed
 * @param name state name
 * @param setup state setup function
 * @param _log whether to enable log when dev, default is `false`
 * @example
 * ```ts
 * import { createEffect, createMemo, createSignal } from 'solid-js'
 * import { defineGlobalState } from '@solid-hooks/state'
 *
 * export const useCustomState = defineGlobalState('custom', (name, log) => {
 *   const [plain, setPlain] = createSignal(1)
 *   createEffect(() => {
 *     log('defineState with custom function:', { name, newValue: plain() })
 *   })
 *   const plus2 = createMemo(() => plain() + 2)
 *   function add() {
 *     setPlain(p => p + 1)
 *   }
 *   return { plain, plus2, add }
 * })
 * ```
 */
export function defineGlobalState<State extends Record<string, any> = Record<string, any>>(
  name: string,
  setup: StateSetupFunction<State>,
  _log?: boolean,
): Accessor<State>
export function defineGlobalState<
  State extends Record<string, any> = Record<string, any>,
  Getter extends GetterObject = {},
  Action extends GetterObject = {},
>(
  name: string,
  setup: StateSetupObject<State, Getter, Action> | StateSetupFunction<State>,
): Accessor<State | StateReturn<State, Getter, Action>> {
  const stateName = `state-${name}`
  const log = (...args: any[]) => console.log(`[${stateName}]`, ...args)
  const _ = createRoot(() => (typeof setup === 'function' ? setup : setupObject(setup))(name, log))
  return () => _
}

/**
 * global state provider
 */
export function GlobalStateProvider(props: FlowProps) {
  const _owner = getOwner()
  if (DEV && !_owner) {
    throw new Error('<GlobalStateProvider /> must be set inside component')
  }
  STATE_CTX = createContext<GlobalStateContext>()
  return createComponent(STATE_CTX.Provider, {
    value: {
      owner: _owner!,
      map: new Map(),
    },
    get children() {
      return props.children
    },
  })
}

function setupObject<
  State extends Record<string, any> = Record<string, any>,
  Getter extends GetterObject = {},
  Action extends GetterObject = {},
>(
  setup: StateSetupObject<State, Getter, Action>,
): StateSetupFunction<StateReturn<State, Getter, Action>> {
  const { init, getters, actions, stateFn } = setup

  return (stateName, log) => {
    const initialState = typeof init === 'function' ? init() : init
    const [state, setState, utils] = createStateWithUtils(stateName, initialState, stateFn)

    DEV && log('initial state:', unwrap(state))

    return [
      Object.assign(() => state, utils, createStateGetter(getters?.(state))),
      createStateAction(actions?.(setState, state, { $patch: utils.$patch, $reset: utils.$reset })),
    ]
  }
}
