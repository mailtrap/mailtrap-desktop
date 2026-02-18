import { useMemo } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-markup'
import 'prismjs/themes/prism-tomorrow.css'

interface SyntaxHighlightedCodeProps {
  code: string
  language: string
  fallback: string
}

export function SyntaxHighlightedCode({ code, language, fallback }: SyntaxHighlightedCodeProps) {
  const highlighted = useMemo(() => {
    if (!code) return ''
    try {
      return Prism.highlight(code, Prism.languages[language] || Prism.languages.markup, language)
    } catch {
      return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }
  }, [code, language])

  if (!code) {
    return (
      <pre className="p-5 font-mono text-body-s text-grey-deep">{fallback}</pre>
    )
  }

  return (
    <div className="overflow-auto p-5">
      <pre
        className="font-mono text-[13px] leading-[1.6]"
        style={{ background: 'transparent', margin: 0, padding: 0 }}
      >
        <code
          className={`language-${language}`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
          style={{ background: 'transparent' }}
        />
      </pre>
    </div>
  )
}
