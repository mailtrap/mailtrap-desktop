import type { StatsRow } from '../../../electron/api/types'
import { formatCount, formatPercent } from '../../utils/formatters'

interface StatsTableProps {
  title: string
  rows: StatsRow[]
  linkLabel: string
  linkUrl: string
  bounceThreshold: number
  rowLinkBuilder?: (name: string) => string
}

export function StatsTable({ title, rows, linkLabel, linkUrl, bounceThreshold, rowLinkBuilder }: StatsTableProps) {
  if (rows.length === 0) return null

  return (
    <div>
      <div className="mtui-table-wrap">
        <table className="mtui-table table-fixed">
          <thead>
            <tr>
              <th className="w-[28%] truncate">{title}</th>
              <th className="text-right">Delivered</th>
              <th className="text-right">Unique ...</th>
              <th className="text-right">Click Rate</th>
              <th className="text-right">Bounce...</th>
              <th className="text-right">Spam C...</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <td className="truncate" title={row.name}>
                  {rowLinkBuilder ? (
                    <a
                      href={rowLinkBuilder(row.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="!text-blue-neutral hover:!text-blue-medium hover:underline"
                    >
                      {row.name}
                    </a>
                  ) : (
                    <span className="!text-blue-neutral">{row.name}</span>
                  )}
                </td>
                <td className="text-right">{formatCount(row.delivered)}</td>
                <td className="text-right">{formatPercent(row.uniqueOpenRate)}</td>
                <td className="text-right">{formatPercent(row.clickRate)}</td>
                <td className={`text-right ${row.bounceRate * 100 > bounceThreshold ? '!text-red-400' : ''}`}>
                  {formatPercent(row.bounceRate)}
                </td>
                <td className={`text-right ${row.spamCount > 0 ? '!text-red-400' : ''}`}>
                  {row.spamCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end px-1 py-2">
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-body-s text-blue-neutral hover:text-blue-medium"
        >
          {linkLabel}
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </a>
      </div>
    </div>
  )
}
