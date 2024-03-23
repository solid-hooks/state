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
    (subscriber: PersistenceSyncCallback) => channel.addEventListener(
      'message',
      ev => subscriber(JSON.parse((ev as MessageEvent).data)),
    ),
    (key, newValue) => postMessage(
      JSON.stringify({ key, newValue, url: location.href }),
      location.origin,
    ),
  ]
}

/**
 * wsSync - syncronize persisted storage via web socket
 */
export function wsSync(ws: WebSocket): PersistenceSyncAPI {
  return [
    (cb: PersistenceSyncCallback) =>
      ws.addEventListener('message', (ev: MessageEvent) => {
        try {
          cb(JSON.parse(ev.data))
        } catch { }
      }),
    (key, newValue) => ws.send(JSON.stringify({ key, newValue, url: location.href })),
  ]
}

export function multiSync(...syncAPIs: PersistenceSyncAPI[]): PersistenceSyncAPI {
  return [
    subscriber => syncAPIs.forEach(([subscribe]) => subscribe(subscriber)),
    (key, value) => syncAPIs.forEach(([_, updater]) => updater(key, value)),
  ]
}
