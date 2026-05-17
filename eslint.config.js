import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: {
    css: true,
    html: true,
    markdown: false,
  },
  ignores: [
    'example/**',
  ],
})
