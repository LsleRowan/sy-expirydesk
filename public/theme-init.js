// 提前应用暗色主题，避免刷新时白屏闪烁（与 src/composables/useTheme.ts 的键保持一致）
// 独立成文件而非内联脚本：CSP 可用严格的 script-src 'self'，无需 hash 或 unsafe-inline
;(function () {
  try {
    var saved = localStorage.getItem('expirydesk-theme')
    var dark = saved
      ? saved === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches
    if (dark) document.documentElement.classList.add('dark')
  } catch (e) {}
})()
