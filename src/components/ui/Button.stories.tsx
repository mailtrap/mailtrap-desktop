import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'primary', 'outlined', 'ghost',
        'danger', 'danger-outlined',
        'success', 'success-outlined',
        'dark', 'dark-outline'
      ]
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    children: { control: 'text' }
  },
  args: {
    children: 'Button'
  }
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = { args: { variant: 'primary' } }
export const Outlined: Story = { args: { variant: 'outlined' } }
export const Ghost: Story = { args: { variant: 'ghost' } }
export const Danger: Story = { args: { variant: 'danger' } }
export const DangerOutlined: Story = { args: { variant: 'danger-outlined' } }
export const Success: Story = { args: { variant: 'success' } }
export const SuccessOutlined: Story = { args: { variant: 'success-outlined' } }
export const Dark: Story = { args: { variant: 'dark' } }
export const DarkOutline: Story = { args: { variant: 'dark-outline' } }

export const Small: Story = { args: { variant: 'primary', size: 'sm', children: 'Small' } }
export const Medium: Story = { args: { variant: 'primary', size: 'md', children: 'Medium' } }
export const Large: Story = { args: { variant: 'primary', size: 'lg', children: 'Large' } }

export const Loading: Story = { args: { variant: 'primary', loading: true, children: 'Loading...' } }
export const Disabled: Story = { args: { variant: 'primary', disabled: true, children: 'Disabled' } }

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="outlined">Outlined</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="danger-outlined">Danger Outlined</Button>
      <Button variant="success">Success</Button>
      <Button variant="success-outlined">Success Outlined</Button>
      <Button variant="dark">Dark</Button>
      <Button variant="dark-outline">Dark Outline</Button>
    </div>
  )
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-3">
      <Button variant="primary" size="sm">Small</Button>
      <Button variant="primary" size="md">Medium</Button>
      <Button variant="primary" size="lg">Large</Button>
    </div>
  )
}

export const AllStates: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Button variant="primary">Default</Button>
        <Button variant="primary" disabled>Disabled</Button>
        <Button variant="primary" loading>Loading</Button>
      </div>
      <div className="flex gap-3">
        <Button variant="danger">Default</Button>
        <Button variant="danger" disabled>Disabled</Button>
        <Button variant="danger" loading>Loading</Button>
      </div>
      <div className="flex gap-3">
        <Button variant="success">Default</Button>
        <Button variant="success" disabled>Disabled</Button>
        <Button variant="success" loading>Loading</Button>
      </div>
    </div>
  )
}
