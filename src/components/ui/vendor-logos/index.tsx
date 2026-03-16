import React from 'react'
import type { VendorId } from '../../../../electron/api/types'
import MailtrapLogo from './MailtrapLogo'
import SendGridLogo from './SendGridLogo'
import MailgunLogo from './MailgunLogo'
import PostmarkLogo from './PostmarkLogo'
import MailerSendLogo from './MailerSendLogo'

export { MailtrapLogo, SendGridLogo, MailgunLogo, PostmarkLogo, MailerSendLogo }

const VENDOR_LOGO_COMPONENTS: Record<VendorId, React.ComponentType<{ className?: string }>> = {
  mailtrap: MailtrapLogo,
  sendgrid: SendGridLogo,
  mailgun: MailgunLogo,
  postmark: PostmarkLogo,
  mailersend: MailerSendLogo,
}

interface VendorLogoProps {
  vendor: VendorId
  className?: string
}

/** Renders the correct vendor logo SVG for a given VendorId. */
const VendorLogo = React.memo(function VendorLogo({ vendor, className }: VendorLogoProps) {
  const LogoComponent = VENDOR_LOGO_COMPONENTS[vendor]
  return <LogoComponent className={className} />
})

export default VendorLogo
