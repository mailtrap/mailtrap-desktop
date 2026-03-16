import type { VendorId, VendorConnector } from '../types'
import { mailtrapConnector } from './mailtrap'
import { sendgridConnector } from './sendgrid'
import { mailgunConnector } from './mailgun'
import { postmarkConnector } from './postmark'
import { mailersendConnector } from './mailersend'

const CONNECTORS: Record<VendorId, VendorConnector> = {
  mailtrap: mailtrapConnector,
  sendgrid: sendgridConnector,
  mailgun: mailgunConnector,
  postmark: postmarkConnector,
  mailersend: mailersendConnector,
}

export function getConnector(vendor: VendorId): VendorConnector {
  return CONNECTORS[vendor]
}
