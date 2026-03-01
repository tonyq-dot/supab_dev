import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

function generateToken(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function Profile() {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [nickname, setNickname] = useState('')
  const [salary, setSalary] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Telegram linking state
  const [telegramLinked, setTelegramLinked] = useState(false)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [linkTokenExpiry, setLinkTokenExpiry] = useState<Date | null>(null)
  const [generatingToken, setGeneratingToken] = useState(false)
  const [copied, setCopied] = useState(false)

  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? 'kpi_bot'

  useEffect(() => {
    if (!user?.id) return
    supabase.from('user_profiles').select('display_name, nickname').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name ?? '')
        setNickname(data?.nickname ?? '')
      })
    supabase.from('user_salaries').select('monthly_salary').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setSalary(data?.monthly_salary ?? null))
      .finally(() => setLoading(false))

    // Check if Telegram is already linked
    supabase.from('telegram_links').select('telegram_id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setTelegramLinked(!!data))
  }, [user?.id])

  const handleGenerateToken = useCallback(async () => {
    if (!user?.id) return
    setGeneratingToken(true)
    setCopied(false)

    // Remove any existing tokens for this user
    await supabase.from('telegram_link_tokens').delete().eq('user_id', user.id)

    const token = generateToken()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    const { error } = await supabase.from('telegram_link_tokens').insert({
      token,
      user_id: user.id,
      expires_at: expiresAt.toISOString(),
    })

    setGeneratingToken(false)
    if (error) {
      setMessage('Ошибка генерации кода: ' + error.message)
      return
    }
    setLinkToken(token)
    setLinkTokenExpiry(expiresAt)
  }, [user?.id])

  const handleCopy = useCallback(async () => {
    if (!linkToken) return
    await navigator.clipboard.writeText(`/link ${linkToken}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [linkToken])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    setSaving(true)
    setMessage(null)
    const { error } = await supabase.from('user_profiles').upsert(
      { user_id: user.id, display_name: displayName || null, nickname: nickname || null },
      { onConflict: 'user_id' }
    )
    setSaving(false)
    setMessage(error ? error.message : 'Сохранено')
  }

  if (loading) return <p>Загрузка...</p>

  return (
    <div className="page">
      <h1>Профиль</h1>
      <form onSubmit={handleSubmit} className="form card">
        <h3>Данные для документов</h3>
        <label>
          Имя для документов (Фамилия и инициалы)
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Иванов И.И."
          />
        </label>
        <label>
          Никнейм (уникальный, для отчётов)
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="ivanov"
          />
        </label>
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
        {message && <p className={message === 'Сохранено' ? 'success' : 'error'}>{message}</p>}
      </form>
      <div className="card">
        <h3>Текущий оклад</h3>
        <p className="salary-value">
          {salary !== null ? `${salary.toLocaleString('ru-RU')} ₽` : 'Не задан'}
        </p>
        <p className="hint">Редактирование оклада доступно менеджеру в настройках.</p>
      </div>

      <div className="card">
        <h3>Telegram-бот</h3>
        {telegramLinked ? (
          <p className="success">✅ Аккаунт привязан к Telegram.</p>
        ) : (
          <p className="hint">Привяжите Telegram, чтобы добавлять работы и смотреть KPI прямо в боте.</p>
        )}

        <div style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGenerateToken}
            disabled={generatingToken}
          >
            {generatingToken ? 'Генерация...' : telegramLinked ? 'Сгенерировать новый код' : 'Привязать Telegram'}
          </button>
        </div>

        {linkToken && linkTokenExpiry && (
          <div style={{ marginTop: '1rem' }} className="telegram-link-block">
            <p>
              Откройте бота <strong>@{botUsername}</strong> и отправьте:
            </p>
            <div className="link-token-row">
              <code className="link-token">/link {linkToken}</code>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopy}>
                {copied ? '✅ Скопировано' : 'Копировать'}
              </button>
            </div>
            <p className="hint">
              Код действует до {linkTokenExpiry.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}.
              После отправки боту привязка произойдёт автоматически.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
