import { createTheme } from '@mantine/core'

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 6,
  defaultRadius: 'md',
  fontFamily: '"Aptos", "Segoe UI Variable", "Segoe UI", sans-serif',
  black: '#111111',
  headings: {
    fontFamily: '"Aptos Display", "Aptos", "Segoe UI Variable", "Segoe UI", sans-serif',
  },
  colors: {
    brand: [
      '#f7f1ff',
      '#eee5ff',
      '#d9c8fb',
      '#bca2ea',
      '#a87cf4',
      '#9f5eff',
      '#9A41FE',
      '#8430dc',
      '#6d24b7',
      '#561a90',
    ],
    beta: [
      '#eff6fd',
      '#dfecfa',
      '#c2daf3',
      '#a6c9ed',
      '#8EBFED',
      '#73acd9',
      '#5a95bf',
      '#45769a',
      '#325777',
      '#223a50',
    ],
  },
  shadows: {
    md: '0 16px 40px rgba(154, 65, 254, 0.14)',
  },
})
