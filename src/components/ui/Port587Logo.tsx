import iconPng from '../../../resources/icon.png'
import type { VendorId } from '../../../electron/api/types'
import VendorLogo from './vendor-logos'

interface Port587LogoProps {
  size?: 'sm' | 'lg'
  vendor?: VendorId | null
}

export default function Port587Logo({ size = 'sm', vendor }: Port587LogoProps) {
  const iconClass = size === 'sm' ? 'h-10 w-10' : 'h-[50px] w-[50px]'
  const textClass = size === 'sm' ? 'text-2xl' : 'text-3xl'
  const vendorLogoClass = size === 'sm' ? 'h-[18px] w-[18px]' : 'h-7 w-7'

  return (
    <div className="flex items-center gap-2">
      <img src={iconPng} alt="" className={`${iconClass} rounded-lg`} />
      {vendor && (
        <VendorLogo vendor={vendor} className={`${vendorLogoClass} shrink-0 rounded-[3px]`} />
      )}
      <span className={`${textClass} font-black tracking-wide`} style={{ fontFamily: "'Libre Bodoni', serif", color: '#EEDFC8' }}>PORT587</span>
    </div>
  )
}
