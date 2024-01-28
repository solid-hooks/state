import Component from './component'
import { useTestState } from './state'

export default function App() {
  const [state, { dec, inc }] = useTestState()
  state.$subscribe('count', console.log)
  return (
    <div>
      <h1>Playground</h1>
      <Component />
      <hr />
      <button onClick={inc}>+</button>
      <button onClick={dec}>-</button>
      <button onClick={state.$reset}>reset</button>
      <button onClick={() => localStorage.clear()}>clear persist</button>
      <br />
      <div>see <code>$subscribe</code> in console</div>
    </div>
  )
}
