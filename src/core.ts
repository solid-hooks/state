import { type Path, pathGet, pathSet } from 'object-path-access'
import type { Accessor, FlowProps, Owner } from 'solid-js'
import {
  DEV,
  batch,
  createComponent,
  createContext,
  createEffect,
  createRoot,
  getOwner,
  on,
  runWithOwner,
  useContext,
} from 'solid-js'
import { createStore, produce, reconcile, unwrap } from 'solid-js/store'
import { klona as deepClone } from 'klona'
import type { AnyFunction, Promisable } from '@subframe7536/type-utils'
import type {
  ActionObject,
  GetterObject,
  StateReturn,
  StateSetupFunction,
  StateSetupObject,
  StateUtils,
} from './types'
import { createActions, createGetters } from './utils'

type GlobalStateContext = {
  owner: Owner | null
  map: Map<string, any>
}

const STATE_CTX = createContext<GlobalStateContext>({ owner: null, map: new Map() })
/**
 * initialize global state with setup object
 * @param name state name
 * @param setup state setup object
 * @param _log whether to enable log when dev, default is `false`
 * @see https://github.com/subframe7536/solid-dollar#state
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
 * initialize global state with function
 * @param name state name
 * @param setup state setup function
 * @param _log whether to enable log when dev, default is `false`
 */
export function defineState<
  State extends Record<string, any> = Record<string, any>,
>(
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
    const _map = ctx.map
    if (_map.has(name)) {
      return _map.get(name)
    }
    function attach(result: State | StateReturn<State, Getter, Action>) {
      _map.set(name, result)
      // @ts-expect-error for GC
      build = null
      return result
    }
    return ctx.owner
      ? runWithOwner(ctx.owner, () => attach(build(stateName, log)))
      : attach(createRoot(() => build(stateName, log)))
  }
}

/**
 * global state provider
 */
export function GlobalStateProvider(props: FlowProps) {
  const _owner = getOwner()
  if (DEV && !_owner) {
    throw new Error('<GlobalStateProvider /> must be set inside component')
  }
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
  const {
    init,
    getters,
    actions,
    stateFn = (state, stateName) => createStore<State>(state, { name: stateName }),
  } = setup

  return (stateName, log) => {
    const initialState = typeof init === 'function' ? init() : init
    const [state, setState] = stateFn(deepClone(initialState), stateName)
    const utils: StateUtils<State> = {
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

    DEV && log('initial state:', unwrap(state))

    return [
      Object.assign(() => state, utils, createGetters(getters, state, stateName)),
      createActions(actions?.(setState, state, { $patch: utils.$patch, $reset: utils.$reset })),
    ]
  }
}
