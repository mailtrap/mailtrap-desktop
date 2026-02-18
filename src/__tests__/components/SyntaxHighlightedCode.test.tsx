import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SyntaxHighlightedCode } from '../../components/sandbox/SyntaxHighlightedCode'

const sampleHtml = '<html><body><p>Hello world</p></body></html>'

describe('SyntaxHighlightedCode', () => {
  it('renders the fallback when code is empty', () => {
    const { getByText } = render(
      <SyntaxHighlightedCode code="" language="markup" fallback="No HTML source available" />
    )
    expect(getByText('No HTML source available')).toBeInTheDocument()
  })

  it('renders code content when provided', () => {
    const { container } = render(
      <SyntaxHighlightedCode code={sampleHtml} language="markup" fallback="No content" />
    )
    expect(container.querySelector('code')).toBeInTheDocument()
  })

  it('uses overflow-auto (horizontal scroll) by default', () => {
    const { container } = render(
      <SyntaxHighlightedCode code={sampleHtml} language="markup" fallback="No content" />
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('overflow-auto')
    expect(wrapper.className).not.toContain('overflow-y-auto')
  })

  it('uses overflow-y-auto and wrap classes when wrap=true', () => {
    const { container } = render(
      <SyntaxHighlightedCode code={sampleHtml} language="markup" fallback="No content" wrap />
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('overflow-y-auto')
    expect(wrapper.className).not.toContain('overflow-auto')

    const pre = container.querySelector('pre') as HTMLElement
    expect(pre.className).toContain('whitespace-pre-wrap')
    expect(pre.className).toContain('break-all')
  })

  it('does not apply wrap classes when wrap is not set', () => {
    const { container } = render(
      <SyntaxHighlightedCode code={sampleHtml} language="markup" fallback="No content" />
    )
    const pre = container.querySelector('pre') as HTMLElement
    expect(pre.className).not.toContain('whitespace-pre-wrap')
    expect(pre.className).not.toContain('break-all')
  })
})
