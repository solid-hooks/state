import { DEV } from 'solid-js'

export type PersistenceSyncData = {
  key: string
  newValue: string | null | undefined
  url?: string
}

export type PersistenceSyncCallback = (data: PersistenceSyncData) => void

export type PersistenceSyncAPI = [
  subscribe: (subscriber: PersistenceSyncCallback) => void,
  update: (key: string, value: string | null | undefined) => void,
]

/**
 * storageSync - synchronize localStorage
 */
export const storageSync: PersistenceSyncAPI = [
  (subscriber: PersistenceSyncCallback) => window.addEventListener(
    'storage',
    ev => subscriber(ev as PersistenceSyncData),
  ),
  () => { },
]

/**
 * messageSync - synchronize over post message or broadcast channel API
 */
export function messageSync(channel: Window | BroadcastChannel = window): PersistenceSyncAPI {
  return [
    (subscriber: PersistenceSyncCallback) =>
      channel.addEventListener('message', (ev) => {
        subscriber((ev as MessageEvent).data)
      }),
    (key, newValue) => channel.postMessage(
      { key, newValue, timeStamp: +new Date(), url: location.href },
      location.origin,
    ),
  ]
}
/**
 * wsSync - syncronize persisted storage via web socket
 */
export function wsSync(ws: WebSocket, warnOnError?: boolean): PersistenceSyncAPI {
  return [
    (subscriber: PersistenceSyncCallback) =>
      ws.addEventListener('message', (ev: MessageEvent) => {
        try {
          const data = JSON.parse(ev.data)
          if (['key', 'newValue', 'timeStamp'].every(item => Object.hasOwn(data, item))) {
            subscriber(data)
          }
        } catch (e) {
          DEV && warnOnError && console.warn(e)
        }
      }),
    (key, newValue) =>
      ws.send(JSON.stringify({ key, newValue, timeStamp: +new Date(), url: location.href })),
  ]
}

export function multiSync(...syncAPIs: PersistenceSyncAPI[]): PersistenceSyncAPI {
  return [
    subscriber => syncAPIs.forEach(([subscribe]) => subscribe(subscriber)),
    (key, value) => syncAPIs.forEach(([_, updater]) => updater(key, value)),
  ]
}
