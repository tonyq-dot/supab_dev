import React, { useState, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { usePeriodConfig } from '@/hooks/usePeriodConfig'
import type { Database } from '@/lib/database.types'

type DetailedScore = Database['public']['Views']['detailed_scores']['Row']
type UserScore = {
  user_id: string
  quarter_start: string
  total_points: number
  work_count: number
  display_name?: string | null
  nickname?: string | null
}

function getQuarterRange(year: number, quarter: number) {
  const startMonth = (quarter - 1) * 3 + 1
  const endMonth = quarter * 3
  return {
    start: `${year}-${String(startMonth).padStart(2, '0')}-01`,
    end: `${year}-${String(endMonth).padStart(2, '0')}-${new Date(year, endMonth, 0).getDate()}`,
  }
}

function escapeCSVField(val: string | number): string {
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function exportToCSVWithDetails(
  summary: UserScore[],
  worksByUser: Map<string, DetailedScore[]>,
  filename: string
) {
  const rows: string[][] = []
  rows.push(['Сотрудник', 'ID', 'Баллы', 'Кол-во работ'])
  summary.forEach((s) => {
    const name = s.display_name || s.nickname || s.user_id
    rows.push([name, s.user_id, s.total_points.toFixed(2), String(s.work_count)])
  })
  rows.push([])
  rows.push(['Сотрудник', 'Дата', 'Проект', 'Вид работы', 'Кол-во', 'Base', 'K_type', 'K_drones', 'K_rework', 'Балл'])
  summary.forEach((s) => {
    const works = worksByUser.get(s.user_id) ?? []
    const name = s.display_name || s.nickname || s.user_id
    works.forEach((w) => {
      rows.push([
        name,
        w.date,
        w.project_name,
        w.work_type_name,
        String(w.quantity),
        String(w.base),
        String(w.k_type),
        String(w.k_drones),
        String(w.k_rework),
        Number(w.score).toFixed(2),
      ])
    })
  })
  const csv = rows.map((row) => row.map(escapeCSVField).join(',')).join('\r\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

async function exportToExcelWithDetails(
  summary: UserScore[],
  worksByUser: Map<string, DetailedScore[]>,
  filename: string
) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  const summaryHeader = ['Сотрудник', 'ID', 'Баллы', 'Кол-во работ']
  const summaryRows = summary.map((s) => ({
    [summaryHeader[0]]: s.display_name || s.nickname || s.user_id,
    [summaryHeader[1]]: s.user_id,
    [summaryHeader[2]]: s.total_points,
    [summaryHeader[3]]: s.work_count,
  }))
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows, { header: summaryHeader })
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Сводка')

  const detailHeader = ['Сотрудник', 'Дата', 'Проект', 'Вид работы', 'Кол-во', 'Base', 'K_type', 'K_drones', 'K_rework', 'Балл']
  const detailRows: Record<string, string | number>[] = []
  summary.forEach((s) => {
    const works = worksByUser.get(s.user_id) ?? []
    const name = String(s.display_name || s.nickname || s.user_id)
    works.forEach((w) => {
      detailRows.push({
        [detailHeader[0]]: name,
        [detailHeader[1]]: String(w.date ?? ''),
        [detailHeader[2]]: String(w.project_name ?? ''),
        [detailHeader[3]]: String(w.work_type_name ?? ''),
        [detailHeader[4]]: Number(w.quantity ?? 0),
        [detailHeader[5]]: Number(w.base ?? 0),
        [detailHeader[6]]: Number(w.k_type ?? 0),
        [detailHeader[7]]: Number(w.k_drones ?? 0),
        [detailHeader[8]]: Number(w.k_rework ?? 0),
        [detailHeader[9]]: Number(w.score ?? 0),
      })
    })
  })
  const wsDetail = XLSX.utils.json_to_sheet(detailRows, { header: detailHeader })
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Детализация')
  XLSX.writeFile(wb, filename, { bookType: 'xlsx' })
}

export default function Reports() {
  const { config } = usePeriodConfig()
  const now = new Date()
  const quarter = Math.floor(now.getMonth() / 3) + 1
  const year = now.getFullYear()
  const [period, setPeriod] = useState({ year, quarter })
  const [summary, setSummary] = useState<UserScore[]>([])
  const [worksByUser, setWorksByUser] = useState<Map<string, DetailedScore[]>>(new Map())
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const range = useMemo(() => getQuarterRange(period.year, period.quarter), [period])

  useEffect(() => {
    Promise.all([
      supabase
        .from('detailed_scores')
        .select('*')
        .gte('date', range.start)
        .lte('date', range.end)
        .order('date'),
      supabase.from('user_profiles').select('user_id, display_name, nickname'),
    ]).then(([scoresRes, profilesRes]) => {
      const data = (scoresRes.data as DetailedScore[]) ?? []
      const profiles = new Map<string, { display_name: string | null; nickname: string | null }>()
      ;(profilesRes.data ?? []).forEach((p: { user_id: string; display_name: string | null; nickname: string | null }) => {
        profiles.set(p.user_id, { display_name: p.display_name, nickname: p.nickname })
      })

      const byUser = new Map<string, { total: number; works: DetailedScore[] }>()
      data.forEach((r) => {
        const cur = byUser.get(r.user_id) ?? { total: 0, works: [] }
        cur.total += Number(r.score)
        cur.works.push(r)
        byUser.set(r.user_id, cur)
      })

      setSummary(
        Array.from(byUser.entries()).map(([user_id, v]) => {
          const p = profiles.get(user_id)
          return {
            user_id,
            quarter_start: range.start,
            total_points: v.total,
            work_count: v.works.length,
            display_name: p?.display_name ?? null,
            nickname: p?.nickname ?? null,
          }
        })
      )
      setWorksByUser(new Map(Array.from(byUser.entries()).map(([uid, v]) => [uid, v.works])))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [range])

  const handleExportCSV = () => {
    exportToCSVWithDetails(summary, worksByUser, `kpi_report_${period.year}_Q${period.quarter}.csv`)
  }

  const handleExportExcel = () => {
    exportToExcelWithDetails(summary, worksByUser, `kpi_report_${period.year}_Q${period.quarter}.xlsx`)
  }

  if (loading) return <p>Загрузка...</p>

  return (
    <div className="page reports-page">
      <div className="page-header">
        <h1>Отчёты</h1>
        <div className="btn-group">
          <button type="button" onClick={handleExportCSV} className="btn btn-primary">
            CSV
          </button>
          <button type="button" onClick={handleExportExcel} className="btn btn-outline">
            Excel
          </button>
        </div>
      </div>
      <div className="filters">
        <label>
          Год
          <select value={period.year} onChange={(e) => setPeriod((p) => ({ ...p, year: parseInt(e.target.value, 10) }))}>
            {[year, year - 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <label>
          Квартал
          <select value={period.quarter} onChange={(e) => setPeriod((p) => ({ ...p, quarter: parseInt(e.target.value, 10) }))}>
            {[1, 2, 3, 4].map((q) => (
              <option key={q} value={q}>Q{q}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 32 }} />
              <th>Сотрудник</th>
              <th>Баллы</th>
              <th>Кол-во работ</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((s) => {
              const isExpanded = expandedUserId === s.user_id
              const works = worksByUser.get(s.user_id) ?? []
              const displayName = s.display_name || s.nickname || s.user_id
              return (
                <React.Fragment key={s.user_id}>
                  <tr
                    className="reports-summary-row"
                    onClick={() => setExpandedUserId(isExpanded ? null : s.user_id)}
                  >
                    <td className="reports-expand-cell">
                      <span className={`reports-expand-icon ${isExpanded ? 'expanded' : ''}`}>
                        {works.length > 0 ? '▶' : ''}
                      </span>
                    </td>
                    <td>{displayName}</td>
                    <td>{s.total_points.toFixed(1)}</td>
                    <td>{s.work_count}</td>
                  </tr>
                  {isExpanded && works.length > 0 && (
                    <tr key={`${s.user_id}-detail`} className="reports-detail-row">
                      <td colSpan={4} className="reports-detail-cell">
                        <div className="reports-detail-inner">
                          <table className="table table-nested">
                            <thead>
                              <tr>
                                <th>Дата</th>
                                <th>Проект</th>
                                <th>Вид работы</th>
                                <th>Кол-во</th>
                                <th>Base</th>
                                <th>K_type</th>
                                <th>K_drones</th>
                                <th>K_rework</th>
                                <th>Балл</th>
                              </tr>
                            </thead>
                            <tbody>
                              {works.map((w) => (
                                <tr key={w.id}>
                                  <td>{w.date}</td>
                                  <td>{w.project_name}</td>
                                  <td>{w.work_type_name}</td>
                                  <td>{w.quantity}</td>
                                  <td>{w.base}</td>
                                  <td>{w.k_type}</td>
                                  <td>{w.k_drones}</td>
                                  <td>{w.k_rework}</td>
                                  <td>{Number(w.score).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      {summary.length === 0 && <p>Нет данных за выбранный период.</p>}
    </div>
  )
}
