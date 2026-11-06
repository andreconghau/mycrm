'use client'

import { useMemo, useState } from 'react'

export function RecordsTable({
  columns,
  rows,
  label,
  locale = 'en',
}: Readonly<{
  columns: string[]
  rows: string[][]
  label: string
  locale?: 'en' | 'vi'
}>) {
  const [query, setQuery] = useState('')
  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (!normalized) return rows
    return rows.filter((row) =>
      row.join(' ').toLocaleLowerCase().includes(normalized),
    )
  }, [query, rows])

  return (
    <>
      <div className="bg-muted/50 flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <label className="sr-only" htmlFor={`${label}-search`}>
          {locale === 'vi' ? `Tìm kiếm ${label}` : `Search ${label}`}
        </label>
        <input
          className="bg-card placeholder:text-muted-foreground focus-visible:ring-ring min-h-9 min-w-52 flex-1 rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
          id={`${label}-search`}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            locale === 'vi'
              ? `Tìm kiếm ${label.toLocaleLowerCase()}…`
              : `Search ${label.toLocaleLowerCase()}…`
          }
          type="search"
          value={query}
        />
        <button
          className="bg-card text-muted-foreground min-h-9 rounded-md border px-3 text-sm"
          disabled
          type="button"
        >
          {locale === 'vi' ? 'Tất cả bản ghi' : 'All records'}
        </button>
        <button
          className="bg-card text-muted-foreground min-h-9 rounded-md border px-3 text-sm"
          disabled
          type="button"
        >
          {locale === 'vi' ? 'Thêm bộ lọc' : 'Add filter'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <caption className="sr-only">
            {locale === 'vi'
              ? `Bản ghi minh họa ${label.toLocaleLowerCase()}`
              : `Illustrative ${label.toLocaleLowerCase()} records`}
          </caption>
          <thead className="bg-muted/60 text-muted-foreground text-xs tracking-wide uppercase">
            <tr>
              {columns.map((column) => (
                <th
                  className="px-4 py-3 font-semibold whitespace-nowrap"
                  key={column}
                  scope="col"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr
                className="hover:bg-muted/40 border-t"
                key={`${row[0]}-${index}`}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    className={`px-4 py-3 whitespace-nowrap ${cellIndex === 0 ? 'font-medium' : 'text-muted-foreground'}`}
                    key={`${cell}-${cellIndex}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td
                  className="text-muted-foreground px-4 py-10 text-center"
                  colSpan={columns.length}
                >
                  {locale === 'vi'
                    ? `Không có bản ghi phù hợp với “${query}”.`
                    : `No example records match “${query}”.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
