import type { VendorId } from '../../../electron/api/types'

export interface VendorFormConfig {
  vendorId: VendorId
  displayName: string
  tokenLabel: string
  tokenPlaceholder: string
  helpUrl: string
  helpLinkText: string
  /** If set, show a secondary token field (Postmark server token). */
  secondaryTokenLabel?: string
  secondaryTokenPlaceholder?: string
  secondaryTokenHelpText?: string
}

export const VENDOR_CONFIGS: Record<VendorId, VendorFormConfig> = {
  mailtrap: {
    vendorId: 'mailtrap',
    displayName: 'Mailtrap',
    tokenLabel: 'API Token',
    tokenPlaceholder: 'Enter your API token',
    helpUrl: 'https://mailtrap.io/api-tokens',
    helpLinkText: 'Settings \u2192 API Tokens',
  },
  sendgrid: {
    vendorId: 'sendgrid',
    displayName: 'SendGrid',
    tokenLabel: 'API Key',
    tokenPlaceholder: 'SG.xxxxxxxx...',
    helpUrl: 'https://app.sendgrid.com/settings/api_keys',
    helpLinkText: 'Settings \u2192 API Keys',
  },
  mailgun: {
    vendorId: 'mailgun',
    displayName: 'Mailgun',
    tokenLabel: 'API Key',
    tokenPlaceholder: 'key-xxxxxxxx...',
    helpUrl: 'https://app.mailgun.com/settings/api_security',
    helpLinkText: 'API Security',
  },
  postmark: {
    vendorId: 'postmark',
    displayName: 'Postmark',
    tokenLabel: 'Server Token',
    tokenPlaceholder: 'xxxxxxxx-xxxx...',
    helpUrl: 'https://account.postmarkapp.com/api_tokens',
    helpLinkText: 'Account \u2192 API Tokens',
    secondaryTokenLabel: 'Account Token (optional)',
    secondaryTokenPlaceholder: 'xxxxxxxx-xxxx...',
    secondaryTokenHelpText: 'Required to list servers and access account-level features.',
  },
  mailersend: {
    vendorId: 'mailersend',
    displayName: 'MailerSend',
    tokenLabel: 'API Token',
    tokenPlaceholder: 'mlsn.xxxxxxxx...',
    helpUrl: 'https://app.mailersend.com/api-tokens',
    helpLinkText: 'Tokens',
  },
}

/** Ordered list of vendors shown in the service picker. */
export const VENDOR_LIST: VendorId[] = [
  'mailtrap',
  'sendgrid',
  'mailgun',
]
