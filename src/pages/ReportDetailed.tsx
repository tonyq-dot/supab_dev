import { useState, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { usePeriodConfig } from '@/hooks/usePeriodConfig'
import { calculateBonus } from '@/utils/bonus'
import type { Database } from '@/lib/database.types'

type DetailedScore = Database['public']['Views']['detailed_scores']['Row']

function getQuarterRange(year: number, quarter: number) {
  const startMonth = (quarter - 1) * 3 + 1
  const endMonth = quarter * 3
  return {
    start: `${year}-${String(startMonth).padStart(2, '0')}-01`,
    end: `${year}-${String(endMonth).padStart(2, '0')}-${new Date(year, endMonth, 0).getDate()}`,
  }
}

export default function ReportDetailed() {
  const { user } = useAuth()
  const { config } = usePeriodConfig()
  const now = new Date()
  const [period, setPeriod] = useState({
    year: now.getFullYear(),
    quarter: Math.floor(now.getMonth() / 3) + 1,
  })
  const [scores, setScores] = useState<DetailedScore[]>([])
  const [profile, setProfile] = useState<{ display_name: string | null; nickname: string | null } | null>(null)
  const [salary, setSalary] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const range = useMemo(() => getQuarterRange(period.year, period.quarter), [period])

  useEffect(() => {
    if (!user?.id) return
    Promise.all([
      supabase.from('detailed_scores').select('*').eq('user_id', user.id).gte('date', range.start).lte('date', range.end).order('date'),
      supabase.from('user_profiles').select('display_name, nickname').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_salaries').select('monthly_salary').eq('user_id', user.id).maybeSingle(),
    ]).then(([scoresRes, profileRes, salaryRes]) => {
      setScores((scoresRes.data as DetailedScore[]) ?? [])
      setProfile(profileRes.data as { display_name: string | null; nickname: string | null } | null)
      setSalary(salaryRes.data?.monthly_salary ?? null)
    }).finally(() => setLoading(false))
  }, [user?.id, range])

  const totalPoints = useMemo(() => scores.reduce((sum, s) => sum + Number(s.score), 0), [scores])
  const normPoints = config?.norm_points ?? 500
  const q1 = config?.company_profit_coef_q1 ?? 0.3
  const monthlySalary = salary ?? 0
  const bonus = calculateBonus(totalPoints, monthlySalary, normPoints, q1)
  const ki = totalPoints / normPoints

  const displayName = profile?.display_name || profile?.nickname || user?.email || '—'

  const handleExportXLSX = async () => {
    const formulaRows = [
      { section: 'Профиль', label: 'Сотрудник', value: displayName },
      { section: 'Профиль', label: 'Оклад (мес)', value: monthlySalary },
      { section: 'Формула балла', label: 'Score', value: 'Base × Qty × K_type × K_drones × K_rework' },
      { section: 'Формула балла', label: 'Base', value: 'из work_types' },
      { section: 'Формула балла', label: 'K_type', value: 'из project_types' },
      { section: 'Формула балла', label: 'K_drones', value: 'из drone_ranges' },
      { section: 'Формула балла', label: 'K_rework', value: '1.5 если переработка, иначе 1.0' },
      { section: 'Итоги', label: 'Total Points', value: totalPoints.toFixed(2) },
      { section: 'Итоги', label: 'Ki', value: ki.toFixed(4) },
      { section: 'Итоги', label: 'Bonus', value: `(B×0.7×Q1) + (B×0.3×Ki) = ${bonus.toFixed(2)} ₽` },
    ]
    const workRows = scores.map((s) => ({
      section: 'Работы',
      label: `${s.date} ${s.project_name} ${s.work_type_name}`,
      value: `${s.base} × ${s.quantity} × ${s.k_type} × ${s.k_drones} × ${s.k_rework} = ${Number(s.score).toFixed(2)}`,
    }))
    const allRows = [...formulaRows, ...workRows]
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(
      allRows.map((r) => ({ Секция: r.section, Параметр: r.label, Значение: String(r.value) }))
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Детальный отчёт')
    XLSX.writeFile(wb, `report_detailed_${period.year}_Q${period.quarter}.xlsx`)
  }

  const handleExportCSV = () => {
    const lines = [
      'Секция;Параметр;Значение',
      `Профиль;Сотрудник;${displayName}`,
      `Профиль;Оклад;${monthlySalary}`,
      `Итоги;Total Points;${totalPoints.toFixed(2)}`,
      `Итоги;Ki;${ki.toFixed(4)}`,
      `Итоги;Bonus;${bonus.toFixed(2)}`,
      '',
      'Дата;Проект;Вид работы;Кол-во;Base;K_type;K_drones;K_rework;Балл',
      ...scores.map((s) =>
        [s.date, s.project_name, s.work_type_name, s.quantity, s.base, s.k_type, s.k_drones, s.k_rework, Number(s.score).toFixed(2)].join(';')
      ),
    ]
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `report_detailed_${period.year}_Q${period.quarter}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (loading) return <p>Загрузка...</p>

  return (
    <div className="page report-detailed">
      <div className="page-header">
        <h1>Детальный отчёт по калькуляции прибыли</h1>
        <div className="btn-group">
          <button type="button" onClick={handleExportXLSX} className="btn btn-primary">
            Excel
          </button>
          <button type="button" onClick={handleExportCSV} className="btn btn-outline">
            CSV
          </button>
        </div>
      </div>
      <div className="filters">
        <label>
          Год
          <select value={period.year} onChange={(e) => setPeriod((p) => ({ ...p, year: parseInt(e.target.value, 10) }))}>
            {[period.year, period.year - 1].map((y) => (
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

      <div className="card">
        <h3>Профиль</h3>
        <p><strong>Сотрудник:</strong> {displayName}</p>
        <p><strong>Оклад (мес):</strong> {monthlySalary ? `${monthlySalary.toLocaleString('ru-RU')} ₽` : '—'}</p>
      </div>

      <div className="card">
        <h3>Формула расчёта балла за работу</h3>
        <p className="formula">Score = Base × Qty × K_type × K_drones × K_rework</p>
        <ul className="formula-desc">
          <li><strong>Base</strong> — базовый балл из справочника видов работ (work_types)</li>
          <li><strong>Qty</strong> — количество сцен/элементов</li>
          <li><strong>K_type</strong> — коэффициент типа проекта (ШОУ 2.0, ПРОМО 1.0 и т.д.)</li>
          <li><strong>K_drones</strong> — коэффициент по количеству дронов (диапазоны)</li>
          <li><strong>K_rework</strong> — 1.5 при переработке, 1.0 иначе</li>
        </ul>
      </div>

      <div className="card">
        <h3>Формула премии</h3>
        <p className="formula">Bonus = (B × 0.7 × Q1) + (B × 0.3 × Ki)</p>
        <ul className="formula-desc">
          <li><strong>B</strong> — бонусный пул = месячный оклад</li>
          <li><strong>Q1</strong> — коэффициент прибыли компании ({q1})</li>
          <li><strong>Ki</strong> = Total Points / Norm Points = {totalPoints.toFixed(1)} / {normPoints} = {ki.toFixed(4)}</li>
        </ul>
        <p className="result">Итого премия: <strong>{bonus.toLocaleString('ru-RU')} ₽</strong></p>
      </div>

      <div className="card">
        <h3>Таблица работ</h3>
        <div className="table-wrap">
          <table className="table">
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
              {scores.map((s) => (
                <tr key={s.id}>
                  <td>{s.date}</td>
                  <td>{s.project_name}</td>
                  <td>{s.work_type_name}</td>
                  <td>{s.quantity}</td>
                  <td>{s.base}</td>
                  <td>{s.k_type}</td>
                  <td>{s.k_drones}</td>
                  <td>{s.k_rework}</td>
                  <td>{Number(s.score).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="total-row"><strong>Всего баллов:</strong> {totalPoints.toFixed(2)}</p>
      </div>
    </div>
  )
}
