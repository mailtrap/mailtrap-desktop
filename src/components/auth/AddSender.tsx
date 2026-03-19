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
  const [showToken, setShowToken] = useState(false)
  const [showSecondaryToken, setShowSecondaryToken] = useState(false)

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

        {/* Vendor logo + name */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <VendorLogo vendor={selectedVendor} className="h-10 w-10 rounded-lg" />
          <span className="text-lg font-semibold text-white">{config.displayName}</span>
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
            <div className="relative">
              <input
                id="apiToken"
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={config.tokenPlaceholder}
                className="input pr-10"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-grey-muted hover:text-navy-air transition-colors"
                aria-label={showToken ? 'Hide token' : 'Show token'}
                aria-pressed={showToken}
              >
                {showToken ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.092 1.092a4 4 0 00-5.558-5.558z" clipRule="evenodd" />
                    <path d="M10.748 13.93l2.523 2.523A9.987 9.987 0 0110 17c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 012.04-3.73l1.838 1.837A4 4 0 0010.748 13.93z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                    <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
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
              <div className="relative">
                <input
                  id="secondaryToken"
                  type={showSecondaryToken ? 'text' : 'password'}
                  value={secondaryToken}
                  onChange={(e) => setSecondaryToken(e.target.value)}
                  placeholder={config.secondaryTokenPlaceholder}
                  className="input pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowSecondaryToken((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-grey-muted hover:text-navy-air transition-colors"
                  aria-label={showSecondaryToken ? 'Hide token' : 'Show token'}
                  aria-pressed={showSecondaryToken}
                >
                  {showSecondaryToken ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.092 1.092a4 4 0 00-5.558-5.558z" clipRule="evenodd" />
                      <path d="M10.748 13.93l2.523 2.523A9.987 9.987 0 0110 17c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 012.04-3.73l1.838 1.837A4 4 0 0010.748 13.93z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
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
