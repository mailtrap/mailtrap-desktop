import type { Config } from 'tailwindcss'

/**
 * MTUI Design System tokens — sourced from:
 *   ~/Code/falcon/app/javascript/src/mtui/tokens/
 *
 * Core colors:   coreColors.js
 * Spacing:       spacing.js
 * Borders:       borders.js
 * Fonts:         fonts.js
 * Semantic:      semanticColors/dark.js
 * Transitions:   transitions.js
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    fontFamily: {
      sans: ['"Inter"', 'system-ui', 'sans-serif'],
      mono: ['"Fira Code"', 'monospace']
    },
    extend: {
      colors: {
        /* ── coreColors.grey ── */
        grey: {
          air: '#f9fbfb',
          light: '#f8fafa',
          soft: '#eeeeee',
          medium: '#dfe3ea',
          neutral: '#a3abb4',
          muted: '#687a91',
          dim: '#87877d',
          deep: '#4d5a6a',
          dark: '#2a394b',
          shade: '#212d3c',
          bold: '#172230',
          solid: '#141e2a',
          void: '#131e2b'
        },
        /* ── coreColors.navy ── */
        navy: {
          air: '#fbfcfc',
          light: '#f7f9f9',
          soft: '#d0d3d8',
          medium: '#c3cdd8',
          neutral: '#a3abb4',
          muted: '#6b7a8c',
          dim: '#647a93',
          deep: '#566583',
          dark: '#38445e',
          shade: '#1d334a',
          bold: '#1a2e44',
          solid: '#0d233b',
          void: '#101a26',
          // Numeric aliases (keep backward compat)
          50: '#d0d3d8',
          100: '#687a91',
          200: '#4d5a6a',
          300: '#2a394b',
          400: '#212d3c',
          500: '#172230',
          600: '#141e2a',
          700: '#131e2b',
          800: '#101a26',
          900: '#0d233b'
        },
        /* ── coreColors.blue ── */
        blue: {
          air: '#f2f7ff',
          light: '#cedeff',
          soft: '#93b7fc',
          medium: '#5d93fc',
          neutral: '#4c83ee',
          muted: '#338cf0',
          dim: '#2a79d3',
          deep: '#2261ad',
          dark: '#3465c3',
          shade: '#334e86',
          bold: '#213152',
          solid: '#0a1836',
          // Numeric aliases
          50: '#f2f7ff',
          100: '#cedeff',
          200: '#93b7fc',
          300: '#5d93fc',
          400: '#4c83ee',
          500: '#3465c3',
          600: '#2261ad',
          700: '#1a2e44'
        },
        /* ── coreColors.red ── */
        red: {
          air: '#fff1f1',
          light: '#f4d8d8',
          soft: '#ff7171',
          medium: '#fb5151',
          neutral: '#e73939',
          muted: '#fb2c2c',
          dim: '#d90000',
          deep: '#8b0000',
          dark: '#5c0000',
          shade: '#470000',
          bold: '#2d0000',
          solid: '#260000',
          // Numeric aliases
          50: '#fff1f1',
          100: '#f4d8d8',
          200: '#ff7171',
          300: '#fb5151',
          400: '#e73939',
          500: '#d90000'
        },
        /* ── coreColors.orange ── */
        orange: {
          air: '#fff8ef',
          light: '#f9e4c1',
          soft: '#fcbb5d',
          medium: '#ffa726',
          neutral: '#db7d15',
          muted: '#d36b00',
          dim: '#d56c13',
          deep: '#b05e18',
          dark: '#8b4600',
          shade: '#703600',
          bold: '#442600',
          solid: '#291901',
          // Numeric aliases
          50: '#fff8ef',
          100: '#f9e4c1',
          200: '#fcbb5d',
          300: '#ffa726',
          400: '#db7d15',
          500: '#b05e18'
        },
        /* ── coreColors.green ── */
        green: {
          air: '#ecfff5',
          light: '#b6ffc8',
          soft: '#45e890',
          medium: '#22d172',
          neutral: '#16bd62',
          muted: '#00d870',
          dim: '#00b85f',
          deep: '#00a04a',
          dark: '#088843',
          shade: '#00753a',
          bold: '#00391a',
          solid: '#001e0e',
          // Numeric aliases
          50: '#ecfff5',
          100: '#b6ffc8',
          200: '#45e890',
          300: '#22d172',
          400: '#16bd62',
          500: '#088843'
        },

        /* ── Semantic dark-theme aliases (from semanticColors/dark.js) ── */
        primary: '#4c83ee',
        'primary-hover': '#5d93fc',
        'primary-active': '#3465c3',

        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f8fafa',
          dark: '#131e2b',        // grey.void = background.primary
          'dark-secondary': '#172230' // grey.bold = background.secondary
        },
        stroke: {
          DEFAULT: '#dfe3ea',
          dark: '#2a394b'         // grey.dark
        },
        text: {
          DEFAULT: '#1a2e44',
          secondary: '#647a93',
          disabled: '#a3abb4',
          placeholder: '#a3abb4',
          inverse: '#ffffff',
          'dark-primary': '#fbfcfc',   // navy.air = foreground.primary (dark)
          'dark-secondary': '#687a91', // grey.muted = foreground.secondary (dark)
          'dark-tertiary': '#6b7a8c'   // navy.muted = foreground.tertiary (dark)
        }
      },

      /* ── MTUI spacing (spacing.js) ── */
      spacing: {
        'none': '0px',
        'xxxs': '2px',
        'xxs': '4px',
        'xs': '6px',
        'sm': '8px',
        'sm-lg': '12px',
        'md-sm': '16px',
        'md': '20px',
        'md-lg': '24px',
        'lg': '32px',
        'xl': '40px',
        'huge': '64px',
        // Table cell
        'table-cell': '10px',
        'table-cell-mobile': '6px',
        // Kept for backward compat
        '4.5': '18px',
        '7': '28px',
        '7.5': '30px',
        '8.5': '34px',
        '13': '52px'
      },

      /* ── MTUI typography (fonts.js) ── */
      fontSize: {
        /* Core font sizes (rem values from MTUI, using px equivalents) */
        'xs':   ['12px', { lineHeight: '16.56px', letterSpacing: '-0.02em', fontWeight: '400' }],
        'sm':   ['13px', { lineHeight: '17.94px', letterSpacing: '-0.02em', fontWeight: '400' }],
        'base': ['14px', { lineHeight: '19.32px', letterSpacing: '-0.02em', fontWeight: '400' }],
        'md':   ['16px', { lineHeight: '22.08px', letterSpacing: '-0.02em', fontWeight: '400' }],
        'md-lg': ['18px', { lineHeight: '24.84px', letterSpacing: '-0.02em', fontWeight: '400' }],
        'lg':   ['22px', { lineHeight: '30.36px', letterSpacing: '-0.02em', fontWeight: '400' }],
        'xl':   ['32px', { lineHeight: '44.16px', letterSpacing: '-0.02em', fontWeight: '400' }],

        /* Headings */
        'heading-1': ['22px', { lineHeight: '26.63px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'heading-2': ['16px', { lineHeight: '19.36px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'heading-3': ['14px', { lineHeight: '16.94px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'heading-4': ['13px', { lineHeight: '15.73px', letterSpacing: '-0.02em', fontWeight: '600' }],

        /* Body */
        'body-l': ['16px', { lineHeight: '22.08px', letterSpacing: '-0.02em', fontWeight: '400' }],
        'body':   ['14px', { lineHeight: '19.32px', letterSpacing: '-0.02em', fontWeight: '400' }],
        'body-m': ['13px', { lineHeight: '17.94px', letterSpacing: '-0.02em', fontWeight: '400' }],
        'body-s': ['12px', { lineHeight: '16.56px', letterSpacing: '-0.02em', fontWeight: '400' }],

        /* Button / Item labels (medium weight = 500) */
        'button-label': ['14px', { lineHeight: '16.1px', letterSpacing: '0', fontWeight: '600' }],
        'item-label':   ['14px', { lineHeight: '19.32px', letterSpacing: '-0.02em', fontWeight: '500' }],
        'item-label-m': ['13px', { lineHeight: '17.94px', letterSpacing: '-0.02em', fontWeight: '500' }],
        'item-label-s': ['12px', { lineHeight: '16.56px', letterSpacing: '-0.02em', fontWeight: '500' }],

        /* Bold variants (bold = 600 in MTUI) */
        'bold-base': ['14px', { lineHeight: '19.32px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'bold-sm':   ['13px', { lineHeight: '17.94px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'bold-xs':   ['12px', { lineHeight: '16.56px', letterSpacing: '-0.02em', fontWeight: '600' }],

        /* Nav / Tabs */
        'nav-item':        ['13px', { lineHeight: '17.94px', letterSpacing: '-0.02em', fontWeight: '500' }],
        'nav-item-active': ['13px', { lineHeight: '17.94px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'tab':             ['13px', { lineHeight: '17.94px', letterSpacing: '-0.02em', fontWeight: '500' }],

        /* Email list */
        'email-default': ['14px', { lineHeight: '19.32px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'email-active':  ['14px', { lineHeight: '19.32px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'email-read':    ['14px', { lineHeight: '19.32px', letterSpacing: '-0.02em', fontWeight: '400' }],

        /* Code (Fira Code) */
        'code': ['14px', { lineHeight: '20px', letterSpacing: '0', fontWeight: '400' }],

        /* Card number */
        'card-number': ['22px', { lineHeight: '22px', letterSpacing: '0', fontWeight: '500' }]
      },

      /* ── MTUI border radius (borders.js) ── */
      borderRadius: {
        'mtui-sm':    '4px',   // borderRadius.small
        'mtui':       '7px',   // borderRadius.base — buttons, cards, nav items
        'mtui-md':    '10px',  // borderRadius.medium
        'mtui-lg':    '14px',  // borderRadius.large
        'mtui-xl':    '21px',  // borderRadius.xLarge
        'mtui-input': '7px',   // inputs use base radius
        'mtui-table': '7px'    // tables use base radius
      },

      /* ── MTUI line heights (fonts.js) ── */
      lineHeight: {
        'mtui': '1.38'
      },

      /* ── MTUI font weights (fonts.js) ── */
      fontWeight: {
        'mtui-normal': '400',
        'mtui-medium': '500',
        'mtui-bold':   '600'
      },

      /* ── Box shadows ── */
      boxShadow: {
        'mtui-box':      '0 2px 4px rgba(66, 73, 100, 0.10)',
        'mtui-tooltip':  '0 4px 8px rgba(66, 73, 100, 0.10)',
        'mtui-dropdown': '0 6px 12px rgba(66, 73, 100, 0.10)',
        'mtui-modal':    '0 8px 16px rgba(66, 73, 100, 0.10)'
      },

      /* ── MTUI transition (transitions.js) ── */
      transitionTimingFunction: {
        'mtui': 'cubic-bezier(0.4, 0, 0.2, 1)'
      },
      transitionDuration: {
        'mtui': '150ms'
      }
    }
  },
  plugins: []
}

export default config
