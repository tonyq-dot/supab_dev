import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useWorkLogs } from '@/hooks/useWorkLogs'
import { usePeriodConfig } from '@/hooks/usePeriodConfig'
import { useUserRole } from '@/hooks/useUserRole'
import { supabase } from '@/lib/supabase'
import { calculateBonus } from '@/utils/bonus'
import './Dashboard.css'

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

export default function Dashboard() {
  const { user } = useAuth()
  const { role } = useUserRole(user?.id)
  const { config } = usePeriodConfig()

  const now = new Date()
  const quarter = Math.floor(now.getMonth() / 3) + 1
  const year = now.getFullYear()

  const quarterRange = useMemo(() => getQuarterRange(year, quarter), [year, quarter])
  const monthRange = useMemo(() => getMonthRange(year, now.getMonth() + 1), [year, now.getMonth()])

  const { totalPoints: quarterPoints, loading: qLoading } = useWorkLogs(user?.id, quarterRange.start, quarterRange.end)
  const { totalPoints: monthPoints, loading: mLoading } = useWorkLogs(user?.id, monthRange.start, monthRange.end)

  const [salary, setSalary] = useState<number | null>(null)
  useEffect(() => {
    if (!user?.id) return
    supabase.from('user_salaries').select('monthly_salary').eq('user_id', user.id).single()
      .then(({ data }) => setSalary(data?.monthly_salary ?? null))
  }, [user?.id])

  const normPoints = config?.norm_points ?? 500
  const q1 = config?.company_profit_coef_q1 ?? 0.3
  const monthlySalary = salary ?? 0
  const quarterBonus = calculateBonus(quarterPoints, monthlySalary, normPoints, q1)
  const loading = qLoading || mLoading

  return (
    <div className="dashboard">
      <h1>Дашборд</h1>
      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <div className="dashboard-cards">
          <div className="card">
            <h3>Баллы за месяц</h3>
            <p className="big-number">{monthPoints.toFixed(1)}</p>
          </div>
          <div className="card">
            <h3>Баллы за квартал</h3>
            <p className="big-number">{quarterPoints.toFixed(1)}</p>
            <p className="hint">Норма: {normPoints}</p>
          </div>
          <div className="card">
            <h3>Прогноз премии</h3>
            <p className="big-number">{monthlySalary ? `${quarterBonus.toLocaleString('ru-RU')} ₽` : '—'}</p>
            {!salary && role !== 'manager' && (
              <p className="hint">Оклад не задан. Обратитесь к менеджеру.</p>
            )}
          </div>
        </div>
      )}
      <div className="dashboard-actions">
        <Link to="/add" className="btn btn-primary">Добавить работу</Link>
      </div>
    </div>
  )
}
