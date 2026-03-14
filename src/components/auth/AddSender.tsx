import { useState } from 'react'
import { Button } from '../ui/Button'
import Port587Logo from '../ui/Port587Logo'
import VendorLogo from '../ui/vendor-logos'
import { VENDOR_CONFIGS, VENDOR_LIST } from './vendorConfig'
import type { VendorId } from '../../../electron/api/types'

import iconPng from '../../../resources/icon.png'

interface AddSenderProps {
  onBack: () => void
  onSuccess: (accountId: number, accountName: string, senderId: string, displayName: string, vendor: VendorId) => void
}

export default function AddSender({ onBack, onSuccess }: AddSenderProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedVendor, setSelectedVendor] = useState<VendorId>('mailtrap')
  const [displayName, setDisplayName] = useState('')
  const [token, setToken] = useState('')
  const [secondaryToken, setSecondaryToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const config = VENDOR_CONFIGS[selectedVendor]

  const handleContinue = () => {
    setStep(2)
    setError(null)
  }

  const handleBackToStep1 = () => {
    setStep(1)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = displayName.trim()
    const trimmedToken = token.trim()
    const trimmedSecondary = secondaryToken.trim()

    if (!trimmedName) {
      setError('Please enter a display name.')
      return
    }
    if (!trimmedToken) {
      setError(`Please enter your ${config.tokenLabel}.`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await window.electron.addSender(
        selectedVendor,
        trimmedName,
        trimmedToken,
        trimmedSecondary || undefined
      )
      if (result.success) {
        onSuccess(result.accountId, result.accountName, result.senderId, trimmedName, result.vendor)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Connection failed. Please check your internet connection.')
    } finally {
      setLoading(false)
    }
  }

  // Step 1: Service Picker
  if (step === 1) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-6 flex justify-center">
              <Port587Logo size="lg" />
            </div>
            <p className="text-body text-grey-muted">
              Choose a service to connect
            </p>
          </div>

          {/* Service Picker */}
          <div className="space-y-2" role="radiogroup" aria-label="Choose email service">
            {VENDOR_LIST.map((vendorId) => {
              const vendorConfig = VENDOR_CONFIGS[vendorId]
              const isSelected = selectedVendor === vendorId
              return (
                <button
                  key={vendorId}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedVendor(vendorId)}
                  className={`flex w-full items-center gap-3 rounded-mtui border px-4 py-3 cursor-pointer transition-colors duration-mtui ease-mtui ${
                    isSelected
                      ? 'border-blue-neutral bg-grey-shade'
                      : 'border-grey-shade bg-navy-700 hover:border-grey-dark'
                  }`}
                >
                  <VendorLogo vendor={vendorId} className="h-5 w-5 shrink-0 rounded-[4px]" />
                  <span className="flex-1 text-left text-item-label text-navy-air">
                    {vendorConfig.displayName}
                  </span>
                  {/* Radio dot */}
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      isSelected ? 'border-blue-neutral' : 'border-grey-dark'
                    }`}
                  >
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-blue-neutral" />
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-2">
            <Button className="w-full" onClick={handleContinue}>
              Continue
            </Button>
            <Button variant="ghost" className="w-full" onClick={onBack}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Credentials Form
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Back link */}
        <button
          type="button"
          onClick={handleBackToStep1}
          disabled={loading}
          className="mb-4 flex items-center gap-1 text-body text-blue-neutral hover:text-blue-medium transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        {/* Logo composition: Port587 icon + Vendor logo */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <img src={iconPng} alt="Port587" className="h-[50px] w-[50px] rounded-lg" />
          <VendorLogo vendor={selectedVendor} className="h-7 w-7 rounded-[4px]" />
        </div>

        {/* Description */}
        <div className="mb-8 text-center">
          <p className="text-body text-grey-muted">
            Give this account a name. Enter your {config.displayName}{' '}
            {config.tokenLabel} to get started.
            <br />
            You can find it in{' '}
            <a
              href={config.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-neutral hover:text-blue-medium underline"
            >
              {config.helpLinkText}
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
              {config.tokenLabel}
            </label>
            <input
              id="apiToken"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={config.tokenPlaceholder}
              className="input"
              disabled={loading}
            />
          </div>

          {/* Postmark secondary token */}
          {config.secondaryTokenLabel && (
            <div>
              <label
                htmlFor="secondaryToken"
                className="mb-1.5 block text-heading-3 text-navy-air"
              >
                {config.secondaryTokenLabel}
              </label>
              <input
                id="secondaryToken"
                type="password"
                value={secondaryToken}
                onChange={(e) => setSecondaryToken(e.target.value)}
                placeholder={config.secondaryTokenPlaceholder}
                className="input"
                disabled={loading}
              />
              {config.secondaryTokenHelpText && (
                <p className="mt-1 text-body-s text-grey-muted">
                  {config.secondaryTokenHelpText}
                </p>
              )}
            </div>
          )}

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
