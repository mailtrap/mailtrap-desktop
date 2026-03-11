import { useEffect, useState } from 'react'
import { useAppStore } from '../../stores/appStore'
import { Button } from '../ui/Button'

interface AppSettings {
  testingPollingIntervalMs: number
  sendingPollingIntervalMs: number
  launchAtStartup: boolean
  defaultView: 'sending' | 'testing'
  sendingEnabled: boolean
  sandboxEnabled: boolean
}

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const { setUnauthenticated } = useAppStore()

  useEffect(() => {
    window.electron.getSettings().then((s) => setSettings(s as unknown as AppSettings))
  }, [])

  const updateSetting = async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    if (!settings) return

    // Prevent disabling both views
    if (key === 'sendingEnabled' && value === false && !settings.sandboxEnabled) return
    if (key === 'sandboxEnabled' && value === false && !settings.sendingEnabled) return

    const updated = { ...settings, [key]: value }
    setSettings(updated)
    setSaving(true)
    try {
      await window.electron.saveSettings({ [key]: value })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await window.electron.logout()
      setUnauthenticated()
    } finally {
      setLoggingOut(false)
    }
  }

  if (!settings) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-neutral border-t-transparent" />
      </div>
    )
  }

  // Only show enabled views in the default view selector
  const defaultViewOptions: { value: string; label: string }[] = []
  if (settings.sandboxEnabled) defaultViewOptions.push({ value: 'testing', label: 'Sandboxes' })
  if (settings.sendingEnabled) defaultViewOptions.push({ value: 'sending', label: 'API/SMTP' })

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-8 text-heading-1 text-navy-air">Settings</h1>

      <div className="space-y-6">
        {/* Enabled Views */}
        <SettingRow
          label="API/SMTP"
          description="Show API/SMTP sending stats view"
        >
          <ToggleSwitch
            checked={settings.sendingEnabled}
            disabled={settings.sendingEnabled && !settings.sandboxEnabled}
            onChange={() => updateSetting('sendingEnabled', !settings.sendingEnabled)}
          />
        </SettingRow>

        <SettingRow
          label="Sandboxes"
          description="Show Sandboxes email testing view"
        >
          <ToggleSwitch
            checked={settings.sandboxEnabled}
            disabled={settings.sandboxEnabled && !settings.sendingEnabled}
            onChange={() => updateSetting('sandboxEnabled', !settings.sandboxEnabled)}
          />
        </SettingRow>

        {/* MTUI Separator */}
        <div className="h-px w-full bg-grey-shade" />

        {/* Sandboxes Polling */}
        {settings.sandboxEnabled && (
          <SettingRow
            label="Sandboxes refresh"
            description="How often to check for new test emails"
          >
            <select
              value={settings.testingPollingIntervalMs}
              onChange={(e) =>
                updateSetting('testingPollingIntervalMs', Number(e.target.value))
              }
              className="input w-auto"
            >
              <option value={30000}>30 seconds</option>
              <option value={60000}>1 minute</option>
              <option value={180000}>3 minutes</option>
              <option value={300000}>5 minutes</option>
              <option value={600000}>10 minutes</option>
            </select>
          </SettingRow>
        )}

        {/* API/SMTP Polling */}
        {settings.sendingEnabled && (
          <SettingRow
            label="API/SMTP refresh"
            description="How often to check for sending stats"
          >
            <select
              value={settings.sendingPollingIntervalMs}
              onChange={(e) =>
                updateSetting('sendingPollingIntervalMs', Number(e.target.value))
              }
              className="input w-auto"
            >
              <option value={60000}>1 minute</option>
              <option value={300000}>5 minutes</option>
              <option value={600000}>10 minutes</option>
              <option value={1800000}>30 minutes</option>
            </select>
          </SettingRow>
        )}

        {/* Default View */}
        {defaultViewOptions.length > 1 && (
          <SettingRow
            label="Default View"
            description="Which section to show when the app opens"
          >
            <select
              value={settings.defaultView}
              onChange={(e) =>
                updateSetting(
                  'defaultView',
                  e.target.value as AppSettings['defaultView']
                )
              }
              className="input w-auto"
            >
              {defaultViewOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </SettingRow>
        )}

        {/* Launch at Startup */}
        <SettingRow
          label="Launch at Startup"
          description="Automatically start Mailtrap when you log in"
        >
          <ToggleSwitch
            checked={settings.launchAtStartup}
            onChange={() => updateSetting('launchAtStartup', !settings.launchAtStartup)}
          />
        </SettingRow>

        {/* MTUI Separator — horizontal, border.light (dark) */}
        <div className="h-px w-full bg-grey-shade" />

        {/* Logout */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-item-label text-navy-air">
              Disconnect
            </p>
            <p className="text-body-s text-grey-muted">
              Log out and return to the sender list
            </p>
          </div>
          <Button
            variant="danger-outlined"
            onClick={handleLogout}
            disabled={loggingOut}
            loading={loggingOut}
          >
            {loggingOut ? 'Logging out...' : 'Log out'}
          </Button>
        </div>
      </div>

      {/* Save indicator */}
      {saving && (
        <p className="mt-4 text-center text-body-s text-grey-deep">
          Saving...
        </p>
      )}
    </div>
  )
}

function ToggleSwitch({
  checked,
  onChange,
  disabled = false
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-mtui ease-mtui ${
        checked
          ? 'bg-blue-neutral'
          : 'bg-grey-dark'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-mtui-box transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function SettingRow({
  label,
  description,
  children
}: {
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-item-label text-navy-air">{label}</p>
        <p className="text-body-s text-grey-muted">{description}</p>
      </div>
      {children}
    </div>
  )
}
