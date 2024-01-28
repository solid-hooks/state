<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=@solid-hooks/state&background=tiles&project=%20" alt="@solid-hooks/state">
</p>

# @solid-hooks/state

state management for solid.js

inspired by Pinia

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
import { GlobalStateProvider, defineState } from '@solid-hooks/state'

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
  persist: {
    enable: true,
    key: 'other key', // state.$id by default
    serializer: { write: JSON.stringify, read: JSON.parse, }, // JSON by default
    storage: localStorage, // localStorage by default, async storage available
    path: ['test'] // state access path type safe, support array
  },
}, true) // set true to enable DEV log

// usage
const [state, actions] = useTestState()

render(() => (
  <GlobalStateProvider> {/* optional */}
    state: <p>{state().value}</p>

    getter: <p>{state.doubleValue()}</p>
    getter: <p>{getters.doubleValue()}</p>

    action: <button onClick={actions.double}>double</button><br />
    action: <button onClick={() => actions.plus(2)}>plus 2</button>
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
import { createEffect, createMemo, createSignal } from 'solid-js'
import { defineState } from '@solid-hooks/state'

// like Pinia's Setup Store
export const useCustomState = defineState('custom', (name, log) => {
  const [plain, setPlain] = createSignal(1)
  createEffect(() => {
    log('defineState with custom function:', { name, newValue: plain() })
  })
  const plus2 = createMemo(plain() + 2) // recognized as 'getter' on type
  function add() { // recognized as 'action' on type
    setPlain(p => p + 1)
  }
  return { plain, plus2, add }
})
```
