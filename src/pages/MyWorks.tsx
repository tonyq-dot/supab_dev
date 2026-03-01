import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useWorkLogs } from '@/hooks/useWorkLogs'
import { usePeriodConfig } from '@/hooks/usePeriodConfig'
import { calculateBonus } from '@/utils/bonus'
import { supabase } from '@/lib/supabase'

function getQuarterRange(year: number, quarter: number) {
  const startMonth = (quarter - 1) * 3 + 1
  const endMonth = quarter * 3
  return {
    start: `${year}-${String(startMonth).padStart(2, '0')}-01`,
    end: `${year}-${String(endMonth).padStart(2, '0')}-${new Date(year, endMonth, 0).getDate()}`,
  }
}

function getMonthRange(year: number, month: number) {
  const lastDay = new Date(year, month, 0).getDate()
  return {
    start: `${year}-${String(month).padStart(2, '0')}-01`,
    end: `${year}-${String(month).padStart(2, '0')}-${lastDay}`,
  }
}

export default function MyWorks() {
  const { user } = useAuth()
  const { config } = usePeriodConfig()
  const now = new Date()
  const [periodType, setPeriodType] = useState<'quarter' | 'month'>('quarter')
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const range = useMemo(() => {
    if (periodType === 'quarter') return getQuarterRange(year, quarter)
    return getMonthRange(year, month)
  }, [periodType, year, quarter, month])

  const { scores, totalPoints, loading } = useWorkLogs(user?.id, range.start, range.end)

  const [salary, setSalary] = useState<number | null>(null)
  useEffect(() => {
    if (!user?.id) return
    supabase.from('user_salaries').select('monthly_salary').eq('user_id', user.id).single()
      .then(({ data }) => setSalary(data?.monthly_salary ?? null))
  }, [user?.id])

  const normPoints = config?.norm_points ?? 500
  const q1 = config?.company_profit_coef_q1 ?? 0.3
  const bonus = salary ? calculateBonus(totalPoints, salary, normPoints, q1) : null

  if (loading) return <p>Загрузка...</p>

  return (
    <div className="page">
      <h1>Мои работы</h1>
      <div className="filters">
        <label>
          Период
          <select value={periodType} onChange={(e) => setPeriodType(e.target.value as 'quarter' | 'month')}>
            <option value="quarter">Квартал</option>
            <option value="month">Месяц</option>
          </select>
        </label>
        {periodType === 'quarter' && (
          <>
            <label>
              Год
              <select value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))}>
                {[now.getFullYear(), now.getFullYear() - 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label>
              Квартал
              <select value={quarter} onChange={(e) => setQuarter(parseInt(e.target.value, 10))}>
                {[1, 2, 3, 4].map((q) => (
                  <option key={q} value={q}>Q{q}</option>
                ))}
              </select>
            </label>
          </>
        )}
        {periodType === 'month' && (
          <>
            <label>
              Год
              <select value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))}>
                {[now.getFullYear(), now.getFullYear() - 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label>
              Месяц
              <select value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>
      <div className="payments-summary card">
        <div className="payments-row">
          <span>Баллы:</span>
          <strong>{totalPoints.toFixed(1)}</strong>
        </div>
        <div className="payments-row">
          <span>Прогноз премии:</span>
          <strong>{bonus !== null ? `${bonus.toLocaleString('ru-RU')} ₽` : '—'}</strong>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Проект</th>
              <th>Вид работы</th>
              <th>Кол-во</th>
              <th>Баллы</th>
              <th>Превью</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => (
              <tr key={s.id}>
                <td>{s.date}</td>
                <td>{s.project_name}</td>
                <td>{s.work_type_name}</td>
                <td>{s.quantity}</td>
                <td>{Number(s.score).toFixed(1)}</td>
                <td>
                  {s.image_url ? (
                    <>
                      <a href={s.image_url} target="_blank" rel="noreferrer">Просмотр</a>
                      {' · '}
                      <Link to={`/gallery?work=${s.id}`}>В галерею</Link>
                    </>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {scores.length === 0 && <p>Нет записей за этот период.</p>}
    </div>
  )
}
