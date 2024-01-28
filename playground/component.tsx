import { useTestState } from './state'

export default function Component() {
  const [state] = useTestState()
  return (
    <div>
      <h3>Component with persist:</h3>
      <div>count: {state().count}</div>
      <div>double: {state.double()}</div>
    </div>
  )
}
