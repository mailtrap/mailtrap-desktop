import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

import Port587Logo from '../ui/Port587Logo'
import VendorLogo from '../ui/vendor-logos'
import { useAppStore } from '../../stores/appStore'
import iconPng from '../../../resources/icon.png'
import type { VendorCapabilities } from '../../../electron/api/types'

function SandboxesIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M9.23951 1.79919C9.79167 1.79936 10.2395 2.247 10.2395 2.79919V4.14099C10.7605 4.32956 11.2062 4.67535 11.5188 5.12146L14.6174 3.33337C14.976 3.12643 15.4347 3.24936 15.6419 3.60779C15.8486 3.96638 15.7259 4.42511 15.3674 4.6322L11.9963 6.57751C11.997 6.60113 12.0002 6.62504 12.0002 6.6488V8.04822H14.5002C14.9141 8.04842 15.2499 8.38444 15.2502 8.79822C15.2502 9.21231 14.9143 9.54802 14.5002 9.54822H12.0012L12.0002 9.54724V9.61365C12.0002 10.0001 11.9402 10.3728 11.8303 10.723C12.5604 11.0833 13.3951 11.4662 14.0676 11.766C14.4271 11.9262 14.7389 12.0625 14.9602 12.1586C15.0706 12.2065 15.1597 12.245 15.22 12.2709C15.2495 12.2836 15.2729 12.2936 15.2883 12.3002C15.2958 12.3034 15.3021 12.3063 15.3059 12.308C15.3076 12.3086 15.3098 12.3087 15.3108 12.309L15.3118 12.3099L15.3811 12.3431C15.7136 12.5266 15.8599 12.9363 15.7083 13.2933C15.5561 13.6505 15.1591 13.8289 14.7961 13.7162L14.7239 13.6898L14.718 13.6869C14.7138 13.6851 14.7063 13.6824 14.6985 13.6791C14.6823 13.6722 14.6584 13.6618 14.6282 13.6488C14.5664 13.6223 14.4758 13.5833 14.3635 13.5345C14.1385 13.4369 13.8215 13.2989 13.4563 13.1361C12.7575 12.8246 11.8718 12.418 11.0989 12.0345C10.459 12.7743 9.53113 13.2582 8.48951 13.3109L8.29908 13.3158H7.70142L7.51099 13.3109C6.46996 13.258 5.54235 12.7748 4.90259 12.0355C4.13135 12.4186 3.25049 12.824 2.55591 13.1351C2.1923 13.298 1.8773 13.4359 1.65357 13.5336C1.5421 13.5822 1.45323 13.6213 1.39185 13.6478C1.36116 13.6611 1.33673 13.6721 1.32056 13.6791C1.31267 13.6825 1.30615 13.6851 1.30201 13.6869C1.3001 13.6877 1.29816 13.6884 1.29712 13.6888H1.29615C0.915552 13.8519 0.47407 13.6757 0.310797 13.2953C0.148001 12.9147 0.32479 12.474 0.705328 12.3109L0.706304 12.3099C0.707214 12.3095 0.7085 12.3087 0.710211 12.308C0.714036 12.3063 0.720204 12.3044 0.727789 12.3011C0.743242 12.2945 0.76625 12.2838 0.796148 12.2709C0.856049 12.245 0.943958 12.2076 1.05396 12.1595C1.27422 12.0634 1.58424 11.9266 1.94263 11.766C2.61147 11.4663 3.44178 11.0844 4.17115 10.724C4.06114 10.3735 4.00025 10.0004 4.00025 9.61365V9.54822H1.50025C1.08632 9.54789 0.75025 9.21223 0.75025 8.79822C0.750615 8.38452 1.08654 8.04855 1.50025 8.04822H4.00025V6.6488C4.00028 6.62801 4.0027 6.60699 4.00318 6.5863C3.86858 6.50711 3.73271 6.42847 3.59791 6.349C2.52976 5.71927 1.47 5.09165 0.65357 4.63806C0.291789 4.43687 0.160696 3.98048 0.361578 3.61853C0.562733 3.25666 1.0201 3.12661 1.38209 3.32751C2.21963 3.79284 3.30028 4.43247 4.35962 5.05701C4.39953 5.08053 4.4399 5.10384 4.47974 5.12732C4.7736 4.70562 5.18593 4.37308 5.66822 4.17712V2.79919C5.66822 2.2469 6.11592 1.79919 6.66822 1.79919C7.2204 1.79933 7.66822 2.24698 7.66822 2.79919V3.98181H8.23951V2.79919C8.23951 2.2469 8.68721 1.79919 9.23951 1.79919ZM5.33326 9.61365C5.33326 10.7671 6.15922 11.7271 7.25123 11.9379L7.25416 8.4281C7.07103 8.32904 6.83034 8.19913 6.5481 8.04626C6.18543 7.84984 5.77271 7.61575 5.33326 7.36267V9.61365ZM9.47095 8.0365L9.46314 8.04138L9.45533 8.04529L8.75416 8.42712L8.75123 11.9369C9.84279 11.7258 10.6672 10.7668 10.6672 9.61365V7.34509L9.47095 8.0365Z" fill="currentColor"/>
    </svg>
  )
}

function SendingIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M14.4789 1.3005C14.8204 1.24581 15.1555 1.43178 15.2894 1.7507C15.2955 1.76521 15.298 1.78092 15.3031 1.79562C15.3622 1.94917 15.3735 2.12111 15.3226 2.28585L11.6175 14.2839C11.334 15.2006 10.0476 15.2322 9.71909 14.3308L7.97495 9.5339C7.83373 9.14475 8.03505 8.71446 8.42417 8.57296C8.81325 8.43194 9.24365 8.63316 9.38511 9.02218L10.6214 12.4226L13.2191 4.01046L8.62241 7.38155C8.42645 7.525 8.17325 7.5657 7.94273 7.48898L1.41636 5.3132C0.422718 4.98198 0.539759 3.5413 1.57359 3.37472L14.4789 1.3005ZM5.68589 11.3825C6.00932 11.1238 6.48181 11.1763 6.74058 11.4997C6.99933 11.8232 6.94684 12.2956 6.62339 12.5544L5.35484 13.5691C5.03139 13.8278 4.55891 13.7753 4.30015 13.4519C4.0416 13.1285 4.09415 12.6569 4.41734 12.3982L5.68589 11.3825ZM5.21226 8.69112C5.53631 8.43332 6.00901 8.4863 6.26694 8.81027C6.52479 9.13434 6.47086 9.60702 6.14683 9.86495L2.40073 12.8464C2.07666 13.1043 1.60497 13.0503 1.34702 12.7263C1.08917 12.4022 1.14217 11.9305 1.46616 11.6726L5.21226 8.69112ZM2.73374 7.68234C3.05719 7.42358 3.52967 7.47608 3.78843 7.79952C4.04678 8.12284 3.99426 8.59451 3.67124 8.85323L2.40171 9.86886C2.07835 10.1273 1.60672 10.0748 1.348 9.75167C1.08924 9.42823 1.14174 8.95574 1.46519 8.69698L2.73374 7.68234Z" fill="currentColor"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M8.70677 0.249573C9.24914 0.249807 9.77489 0.602221 9.9304 1.17242H9.92942L10.1765 2.02008L10.1784 2.02692C10.3251 2.5473 10.8986 2.8276 11.4099 2.61676L11.4128 2.61578L12.2419 2.27594L12.2507 2.27203L12.2595 2.2691C12.7515 2.08185 13.3538 2.20909 13.7116 2.66168H13.7126L14.6228 3.80133H14.6218C14.9958 4.26086 14.9748 4.8755 14.6755 5.31305L14.6677 5.32477L14.1482 6.05133L14.1491 6.05231C13.8259 6.50937 13.9729 7.13048 14.449 7.39313L15.0681 7.73004H15.1189L15.2878 7.82281C15.7962 8.10262 16.0278 8.68708 15.9079 9.21539V9.21832L15.5779 10.648L15.57 10.6773C15.435 11.1718 14.996 11.5981 14.407 11.6275L14.4079 11.6285L13.5115 11.6773C12.9967 11.7088 12.6138 12.1564 12.6443 12.6519L12.656 12.7515V12.7545L12.8064 13.6451L12.8083 13.6568L12.8093 13.6685C12.8752 14.1525 12.6576 14.675 12.195 14.9459L12.0993 14.9966L10.78 15.6265H10.779C10.2742 15.8669 9.66083 15.7526 9.28392 15.3257V15.3248L8.68821 14.6597L8.61595 14.5875C8.27024 14.277 7.73324 14.2771 7.38743 14.5875L7.31517 14.6597L6.71849 15.3248L6.71946 15.3257C6.34266 15.7528 5.72911 15.8667 5.22435 15.6265H5.22337L3.90403 14.9966C3.40476 14.7588 3.09875 14.2189 3.19798 13.6431L3.34739 12.7545V12.7525C3.44047 12.2098 3.04177 11.7119 2.49095 11.6783V11.6773L1.59544 11.6285V11.6275C1.02922 11.599 0.550701 11.1904 0.426494 10.647L0.425517 10.648L0.0954391 9.21832L0.0973922 9.21735C-0.0422923 8.64248 0.238988 8.08493 0.715556 7.82281L0.718486 7.82086L1.50462 7.39313C1.98174 7.12955 2.12426 6.50039 1.80638 6.05621L1.8054 6.05426L1.28587 5.32477L1.27806 5.31305C0.961113 4.84982 0.987722 4.2427 1.32493 3.80914L1.33079 3.80133L2.24095 2.66168C2.59955 2.19783 3.21512 2.06245 3.72239 2.27985H3.72142L4.54075 2.61578L4.5427 2.61676C5.0483 2.82536 5.62029 2.55304 5.7761 2.02008L6.0261 1.16071L6.02903 1.15094L6.03196 1.14215C6.19818 0.619969 6.68093 0.249573 7.24681 0.249573H8.70677ZM7.21653 2.43903V2.44C6.81216 3.82557 5.30589 4.55193 3.97239 4.0025V4.00348L3.3054 3.73004L2.61106 4.60016L3.0261 5.18317L3.16966 5.40875C3.81712 6.56128 3.41244 8.05352 2.22923 8.7066L2.22532 8.70856L1.59642 9.05035L1.84739 10.1392L2.57786 10.1812H2.58177C4.0104 10.268 5.07253 11.5696 4.82591 13.0064L4.70579 13.7173L5.71458 14.1988L6.19798 13.6597C7.15614 12.5867 8.84736 12.5865 9.8054 13.6597L10.2878 14.1988L11.2966 13.7173L11.1775 13.0064V13.0074C10.9303 11.5814 11.9911 10.2679 13.4216 10.1812H13.4255L14.155 10.1392L14.4011 9.07379L13.7283 8.70856L13.7243 8.7066C12.4604 8.00925 12.0878 6.36905 12.9245 5.1861L12.9255 5.18414L13.3415 4.60016L12.6472 3.73004L11.9812 4.00348L11.9802 4.0025C10.6541 4.54869 9.13288 3.83266 8.73704 2.43805L8.73606 2.43903L8.53587 1.74957H7.41673L7.21653 2.43903ZM7.9763 4.82574C9.81718 4.8259 11.3092 6.31877 11.3093 8.15973C11.3091 10.0006 9.81713 11.4926 7.9763 11.4927C6.13539 11.4927 4.64248 10.0006 4.64231 8.15973C4.64238 6.31875 6.13533 4.82583 7.9763 4.82574ZM7.9763 6.32574C6.96377 6.32583 6.14238 7.1472 6.14231 8.15973C6.14248 9.17218 6.96383 9.99265 7.9763 9.99274C8.9887 9.99258 9.80914 9.17213 9.80931 8.15973C9.80924 7.14725 8.98876 6.3259 7.9763 6.32574Z" fill="currentColor"/>
    </svg>
  )
}

function EventsIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 3h12M2 6.5h12M2 10h8M2 13.5h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SuppressionsIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.75 12.25l8.5-8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  settingsKey?: 'sendingEnabled' | 'sandboxEnabled'
  capability?: keyof VendorCapabilities
}

const allNavItems: NavItem[] = [
  {
    label: 'Stats',
    to: '/sending',
    icon: <SendingIcon />,
    settingsKey: 'sendingEnabled',
    capability: 'sendingStats',
  },
  {
    label: 'Sandboxes',
    to: '/sandbox',
    icon: <SandboxesIcon />,
    settingsKey: 'sandboxEnabled',
    capability: 'sandbox',
  },
  {
    label: 'Events',
    to: '/events',
    icon: <EventsIcon />,
    capability: 'eventsLog',
  },
  {
    label: 'Suppressions',
    to: '/suppressions',
    icon: <SuppressionsIcon />,
    capability: 'suppressions',
  },
  {
    label: 'Settings',
    to: '/settings',
    icon: <SettingsIcon />,
  },
]

export default function Sidebar() {
  const [navItems, setNavItems] = useState<NavItem[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [capabilities, setCapabilities] = useState<VendorCapabilities | null>(null)
  const vendor = useAppStore((s) => s.vendor)

  useEffect(() => {
    // Fetch capabilities once and cache in component state (PERF_NOTES #7)
    window.electron.getCapabilities().then((caps) => {
      setCapabilities(caps)
    })
  }, [vendor])

  useEffect(() => {
    const filterItems = async () => {
      const [settings, caps] = await Promise.all([
        window.electron.getSettings(),
        capabilities ? Promise.resolve(capabilities) : window.electron.getCapabilities(),
      ])

      setNavItems(
        allNavItems.filter((item) => {
          // Check settings toggle
          if (item.settingsKey && settings[item.settingsKey] === false) return false
          // Check vendor capability
          if (item.capability && caps[item.capability] !== true) return false
          return true
        })
      )
    }

    filterItems()

    const cleanup = window.electron.onNavigate((route) => {
      if (route === '__settings_changed') {
        filterItems()
      }
    })
    return cleanup
  }, [capabilities])

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-grey-shade bg-navy-void transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-52'
      }`}
    >
      {/* Spacer for title bar drag area */}
      <div className="h-4 shrink-0" />

      {/* Logo */}
      <div className={`pb-4 pt-2 ${collapsed ? 'flex justify-center px-2' : 'px-4'}`}>
        {collapsed ? (
          <div className="relative">
            <img src={iconPng} alt="Port587" className="h-10 w-10 rounded-lg" />
            {vendor && (
              <div className="absolute bottom-0 right-0 ring-1 ring-navy-void rounded-[2px]">
                <VendorLogo vendor={vendor} className="h-4 w-4" />
              </div>
            )}
          </div>
        ) : (
          <Port587Logo vendor={vendor} />
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex flex-col gap-0.5 ${collapsed ? 'px-1.5' : 'px-2'}`}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `no-drag flex items-center rounded-mtui transition-colors duration-mtui ease-mtui ${
                collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-1.5'
              } ${
                isActive
                  ? 'bg-grey-shade text-white text-nav-item-active'
                  : 'text-grey-muted text-nav-item hover:bg-grey-shade hover:text-white'
              }`
            }
          >
            {item.icon}
            {!collapsed && item.label}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="mt-auto pb-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`no-drag flex w-full items-center rounded-mtui text-grey-muted transition-colors hover:text-white ${
            collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-5 py-1.5'
          }`}
        >
          <CollapseIcon collapsed={collapsed} />
          {!collapsed && <span className="text-nav-item">Hide</span>}
        </button>
      </div>
    </aside>
  )
}
