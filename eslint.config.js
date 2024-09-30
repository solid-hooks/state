import { defineEslintConfig } from '@subframe7536/eslint-config'

export default defineEslintConfig({
  ignoreRuleOnFile: {
    files: './playground/**.*',
    rules: 'ts/explicit-function-return-type',
  },
  ignoreAll: 'playground/index.html',
})
