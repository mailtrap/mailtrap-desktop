import { useAppStore } from '../../stores/appStore'

export default function TitleBar() {
  const senderDisplayName = useAppStore((s) => s.senderDisplayName)

  const title = senderDisplayName ? `Port587 - ${senderDisplayName}` : 'Port587'

  return (
    <header className="drag-region flex h-12 shrink-0 items-center border-b border-grey-shade bg-navy-void">
      {/* macOS traffic lights occupy the left ~70px */}
      <div className="w-[70px]" />
      <div className="flex flex-1 items-center justify-center">
        <span className="truncate text-item-label-s text-grey-muted">
          {title}
        </span>
      </div>
      <div className="w-[70px]" />
    </header>
  )
}
