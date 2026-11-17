// 颜色令牌。与 styles/main.css 中的 CSS 变量一一对应，测试检查两者一致并检查对比度（UI9-A11Y-05）。

export const COLORS = {
  text: '#1f2933',
  muted: '#52606d',
  background: '#ffffff',
  surface: '#f5f7fa',
  border: '#7b8794',
  primary: '#1d4ed8',
  onPrimary: '#ffffff',
  danger: '#b42318',
  warningText: '#8a4b00',
  warningBg: '#fff7e6',
  simulatedText: '#5b21b6',
  simulatedBg: '#ede9fe',
  successText: '#166534',
  successBg: '#dcfce7',
} as const

export type ColorName = keyof typeof COLORS

/** 文字与背景的组合，WCAG AA 正文要求对比度 ≥ 4.5。 */
export const TEXT_PAIRS: readonly [ColorName, ColorName][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['muted', 'background'],
  ['muted', 'surface'],
  ['primary', 'background'],
  ['onPrimary', 'primary'],
  ['danger', 'background'],
  ['warningText', 'warningBg'],
  ['simulatedText', 'simulatedBg'],
  ['successText', 'successBg'],
]

/** 非文字界面元素（输入框边框、焦点框）与背景，WCAG 1.4.11 要求对比度 ≥ 3。 */
export const UI_PAIRS: readonly [ColorName, ColorName][] = [
  ['border', 'background'],
  ['border', 'surface'],
  ['primary', 'background'],
]
