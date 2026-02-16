import type { Preview } from '@storybook/react'
import '../src/styles/globals.css'

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#101A26' },
        { name: 'card', value: '#141E2A' },
        { name: 'light', value: '#FFFFFF' }
      ]
    }
  }
}

export default preview
