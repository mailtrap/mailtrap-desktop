import type { Config } from 'tailwindcss'

/**
 * MTUI Design System tokens extracted from Figma:
 * https://www.figma.com/design/LCsm2VOJlILFRUxv4TNWgA/MTUI-Library
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    fontFamily: {
      sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
    },
    extend: {
      colors: {
        // MTUI Blue palette (primary)
        blue: {
          50: '#F2F7FF',
          100: '#CEDEFF',
          200: '#93B7FC',
          300: '#5D93FC',
          400: '#4C83EE', // Primary action color
          500: '#3465C3',
          600: '#2B55A9',
          700: '#1A2E44'
        },
        // MTUI Grey palette
        grey: {
          50: '#F9FBFB',
          100: '#F8FAFA',
          200: '#EEEEEE',
          300: '#DFE3EA',
          400: '#A3ABB4',
          500: '#647A93'
        },
        // MTUI Navy palette (dark backgrounds, sidebar)
        navy: {
          50: '#D0D3D8',
          100: '#687A91',
          200: '#4D5A6A',
          300: '#2A394B',
          400: '#212D3C',
          500: '#172230',
          600: '#141E2A',
          700: '#131E2B',
          800: '#101A26',
          900: '#0D233B'
        },
        // MTUI Red palette (danger/error)
        red: {
          50: '#FFF1F1',
          100: '#F4D8D8',
          200: '#FF7171',
          300: '#FB5151',
          400: '#E73939',
          500: '#D90000'
        },
        // MTUI Orange palette (warning)
        orange: {
          50: '#FFF8EF',
          100: '#F9E4C1',
          200: '#FCBB5D',
          300: '#FFA726',
          400: '#DB7D15',
          500: '#B05E18'
        },
        // MTUI Green palette (success)
        green: {
          50: '#ECFFF5',
          100: '#B6FFC8',
          200: '#45E890',
          300: '#22D172',
          400: '#16BD62',
          500: '#088843'
        },
        // Semantic aliases
        primary: '#4C83EE',
        'primary-hover': '#3465C3',
        'primary-pressed': '#2B55A9',

        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F8FAFA',
          dark: '#131E2B',
          'dark-secondary': '#172230'
        },
        stroke: {
          DEFAULT: '#DFE3EA',
          dark: '#2A394B'
        },
        text: {
          DEFAULT: '#1A2E44',
          secondary: '#647A93',
          disabled: '#A3ABB4',
          placeholder: '#A3ABB4',
          inverse: '#FFFFFF',
          'dark-primary': '#FBFCFC',
          'dark-secondary': '#687A91'
        }
      },
      fontSize: {
        // MTUI Typography scale
        'heading-1': ['22px', { lineHeight: '30px', letterSpacing: '-0.44px', fontWeight: '600' }],
        'heading-2': ['16px', { lineHeight: '22px', letterSpacing: '-0.32px', fontWeight: '500' }],
        'heading-3': ['14px', { lineHeight: '20px', letterSpacing: '0px', fontWeight: '600' }],
        'body-l': ['16px', { lineHeight: '22px', letterSpacing: '0px', fontWeight: '400' }],
        'body': ['14px', { lineHeight: '20px', letterSpacing: '0px', fontWeight: '400' }],
        'body-s': ['12px', { lineHeight: '16px', letterSpacing: '0px', fontWeight: '400' }],
        'button-label': ['14px', { lineHeight: '20px', letterSpacing: '0px', fontWeight: '600' }],
        'item-label': ['14px', { lineHeight: '20px', letterSpacing: '0px', fontWeight: '500' }],
        'item-label-s': ['12px', { lineHeight: '16px', letterSpacing: '0px', fontWeight: '500' }]
      },
      borderRadius: {
        'mtui': '7px',      // buttons, nav items, cards
        'mtui-input': '6px' // inputs, selects
      },
      boxShadow: {
        'mtui-box': '0 2px 4px rgba(66, 73, 100, 0.10)',
        'mtui-tooltip': '0 4px 8px rgba(66, 73, 100, 0.10)',
        'mtui-dropdown': '0 6px 12px rgba(66, 73, 100, 0.10)',
        'mtui-modal': '0 8px 16px rgba(66, 73, 100, 0.10)'
      },
      spacing: {
        '4.5': '18px',
        '7': '28px',
        '7.5': '30px',
        '8.5': '34px',
        '13': '52px'
      }
    }
  },
  plugins: []
}

export default config
