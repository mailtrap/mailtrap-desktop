import iconPng from '../../../resources/icon.png'

interface Port587LogoProps {
  size?: 'sm' | 'lg'
}

export default function Port587Logo({ size = 'sm' }: Port587LogoProps) {
  const iconClass = size === 'sm' ? 'h-10 w-10' : 'h-[50px] w-[50px]'
  const textClass = size === 'sm' ? 'text-2xl' : 'text-3xl'

  return (
    <div className="flex items-center gap-2">
      <img src={iconPng} alt="" className={`${iconClass} rounded-lg`} />
      <span className={`${textClass} font-black tracking-wide`} style={{ fontFamily: "'Bodoni Moda', serif", color: '#EEDFC8' }}>PORT587</span>
    </div>
  )
}
