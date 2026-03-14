import { useState } from 'react'
import { Button } from '../ui/Button'
import Port587Logo from '../ui/Port587Logo'

interface AddSenderProps {
  onBack: () => void
  onSuccess: (accountId: number, accountName: string, senderId: string, displayName: string) => void
}

export default function AddSender({ onBack, onSuccess }: AddSenderProps) {
  const [displayName, setDisplayName] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = displayName.trim()
    const trimmedToken = token.trim()

    if (!trimmedName) {
      setError('Please enter a display name.')
      return
    }
    if (!trimmedToken) {
      setError('Please enter your API token.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await window.electron.addSender(trimmedName, trimmedToken)
      if (result.success) {
        onSuccess(result.accountId, result.accountName, result.senderId, trimmedName)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Connection failed. Please check your internet connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex justify-center">
            <Port587Logo size="lg" />
          </div>
          <p className="text-body text-grey-muted">
            Give this account a name. Enter the API token to get started.
            <br />
            You can find it in{' '}
            <a
              href="https://mailtrap.io/api-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-neutral hover:text-blue-medium underline"
            >
              Settings &rarr; API Tokens
            </a>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="displayName"
              className="mb-1.5 block text-heading-3 text-navy-air"
            >
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Work, Personal, Client A"
              className="input"
              maxLength={80}
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="apiToken"
              className="mb-1.5 block text-heading-3 text-navy-air"
            >
              API Token
            </label>
            <input
              id="apiToken"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your API token"
              className="input"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="rounded-mtui border border-red-shade bg-red-solid px-4 py-3 text-body text-red-medium">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            className="w-full"
          >
            {loading ? 'Connecting...' : 'Connect'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onBack}
            disabled={loading}
          >
            Cancel
          </Button>
        </form>
      </div>
    </div>
  )
}
