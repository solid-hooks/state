import { defineState } from '../src/index'

export const useTestState = defineState('test', {
  init: { count: 0 },
  getters: state => ({
    double: () => state.count * 2,
  }),
  actions: setState => ({
    inc: () => setState('count', count => count + 1),
    dec: () => setState('count', count => count - 1),
  }),
  persist: {
    enable: true,
  },
})
