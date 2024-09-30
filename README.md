<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=@solid-hooks/state&background=tiles&project=%20" alt="@solid-hooks/state">
</p>

# @solid-hooks/state

Pinia like global state management for solid.js

## Install

```shell
npm i @solid-hooks/state
```
```shell
yarn add @solid-hooks/state
```
```shell
pnpm add @solid-hooks/state
```

## Usage

support run without provider (use `createRoot`)

```tsx
import { defineState, GlobalStateProvider, persistStateFn, storageSync } from '@solid-hooks/state'

// like Pinia's Option Store
const useTestState = defineState('test', {
  init: { value: 1, deep: { data: 'hello' } },
  getter: state => ({
    // without param, will auto wrapped with `createMemo`
    doubleValue() {
      return state.value * 2
    },
  }),
  action: (setState, state, utils) => ({
    plus(num: number) {
      setState('value', value => value + num)
    },
  }),
})

// usage
const [state, actions] = useTestState()

render(() => (
  <GlobalStateProvider>
    state:
    {' '}
    <p>{state().value}</p>

    getter:
    {' '}
    <p>{state.doubleValue()}</p>
    getter:
    {' '}
    <p>{getters.doubleValue()}</p>

    action:
    {' '}
    <button onClick={actions.double}>double</button>
    <br />
    action:
    {' '}
    <button onClick={() => actions.plus(2)}>plus 2</button>
  </GlobalStateProvider>
))

// use produce
state.$patch((state) => {
  state.deep.data = 'patch'
})
// use reconcile but support partial state
state.$patch({
  test: 2
})

// createEffect(on()), defer by default
state.$subscribe(
  s => s.deep.data, // or state access path ('deep.data')
  (state, oldState) => console.log(state, oldState),
  { defer: false },
)

// reset
state.$reset()
```

or just a global-level context & provider

```ts
import { defineState } from '@solid-hooks/state'
import { createEffect, createMemo, createSignal } from 'solid-js'

export const useCustomState = defineState('custom', (name, log) => {
  const [plain, setPlain] = createSignal(1)
  createEffect(() => {
    log('defineState with custom function:', { name, newValue: plain() })
  })
  const plus2 = createMemo(() => plain() + 2)
  function add() {
    setPlain(p => p + 1)
  }
  return { plain, plus2, add }
})
```

### Without provider

```ts
import { defineGlobalState } from '@solid-hooks/state'

const useTestState = defineGlobalState('test', {
  init: { value: 1, deep: { data: 'hello' } },
  getter: state => ({
    doubleValue() {
      return state.value * 2
    },
  }),
  action: (setState, state, utils) => ({
    plus(num: number) {
      setState('value', value => value + num)
    },
  }),
})
```

### Persist

```ts
import { defineState } from '@solid-hooks/state'
import { persistStateFn, storageSync } from '@solid-hooks/state/persist'

const useTestState = defineState('test', {
  init,
  // ...
  // custom state function
  stateFn: persistStateFn({
    key: 'other-key', // state.$id by default
    serializer: { write: JSON.stringify, read: JSON.parse, }, // JSON by default
    storage: localStorage, // localStorage by default, async storage available
    path: ['test'], // type-safe state access path for persisted state, support array
    sync: storageSync, // sync persisted data
  }),
})
```

#### IndexedDB

```ts
import { createIdbStorage, persistStateFn } from '@solid-hooks/state/persist'

const idbStorage = createIdbStorage('db-name')
const stateFn = persistStateFn({
  storage: idbStorage,
  // ...
})
```

## Utils

### Functions used in `defineState` with object

```ts
/**
 * create state with utils, use in `SetupObject`
 */
function createStateWithUtils<T extends object>(
  stateName: string,
  initialState: T,
  stateFn?: StateFn<T>
): [state: T, setState: SetStoreFunction<T>, utils: StateUtils<T>]
/**
 * create getters, wrap non-param function with `createMemo`
 *
 * use in `SetupObject`
 */
function createStateGetter<T extends GetterObject>(getters?: T): T
/**
 * create actions, wrap functions with `batch(() => untrack(() => ...))`
 *
 * use in `SetupObject`
 */
function createStateAction<T extends ActionObject>(actions?: T): T
```

### `deepClone`

`globalThis.structuredClone`, fallback to `klona`

## Credit

- [Pinia](https://github.com/vuejs/pinia)
- [@solid-primitives/storage](https://github.com/solidjs-community/solid-primitives/tree/main/packages/storage)
