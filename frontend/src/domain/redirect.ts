// 登录后的回跳地址只接受站内路径，防止开放重定向。依据：架构文档 01 第 5 节、02 第 7 节。

export function safeRedirect(target: unknown, fallback = '/'): string {
  const value = Array.isArray(target) ? target[0] : target
  if (typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  // 反斜杠在部分浏览器中会被当作 "/"；控制字符可能绕过前缀判断。
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback
  // 回到登录页本身没有意义，还可能形成循环。
  if (value === '/login' || value.startsWith('/login?') || value.startsWith('/login#')) return fallback
  return value
}
