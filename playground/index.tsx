import { render } from 'solid-js/web'
import { GlobalStateProvider } from '../src/index'
import App from './App'

render(() => (
  <GlobalStateProvider>
    <App />
  </GlobalStateProvider>
), document.getElementById('root')!)
