import { useState } from 'react'
import ClientSelector from './ClientSelector'
import SellersSelector from './SellersSelector'
import { WORKFLOW_STATUSES } from '@/constants/projectStatus'
import type { WorkflowStatusValue } from '@/constants/projectStatus'

export type ProjectFormData = {
  name: string
  type_id: string
  drone_count: number
  is_rework: boolean
  client_id: string | null
  seller_ids: string[]
  workflow_status: WorkflowStatusValue | null
  global_deadline: string
  pitch_deadline: string
}

type Props = {
  initial?: Partial<ProjectFormData>
  projectTypes: { id: string; name: string; value: number }[]
  onSubmit: (data: ProjectFormData) => Promise<void>
  onCancel?: () => void
}

const defaultForm: ProjectFormData = {
  name: '',
  type_id: '',
  drone_count: 500,
  is_rework: false,
  client_id: null,
  seller_ids: [],
  workflow_status: null,
  global_deadline: '',
  pitch_deadline: '',
}

export default function ProjectForm({ initial, projectTypes, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<ProjectFormData>({ ...defaultForm, ...initial, type_id: initial?.type_id ?? projectTypes[0]?.id ?? '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSubmit(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form card">
      <h3>{initial?.name ? 'Редактировать проект' : 'Новый проект'}</h3>
      <label>
        Название
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Дубай Аэрошоу"
          required
        />
      </label>
      <label>
        Тип проекта
        <select
          value={form.type_id}
          onChange={(e) => setForm({ ...form, type_id: e.target.value })}
        >
          {projectTypes.map((pt) => (
            <option key={pt.id} value={pt.id}>{pt.name} ({pt.value})</option>
          ))}
        </select>
      </label>
      <label>
        Клиент
        <ClientSelector
          value={form.client_id}
          onChange={(id) => setForm({ ...form, client_id: id })}
        />
      </label>
      <label>
        Продавали
        <SellersSelector
          selected={form.seller_ids}
          onChange={(ids) => setForm({ ...form, seller_ids: ids })}
        />
      </label>
      <label>
        Статус
        <select
          value={form.workflow_status ?? ''}
          onChange={(e) => setForm({ ...form, workflow_status: (e.target.value || null) as WorkflowStatusValue | null })}
        >
          <option value="">—</option>
          {WORKFLOW_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </label>
      <label>
        Глобальный дедлайн
        <input
          type="date"
          value={form.global_deadline}
          onChange={(e) => setForm({ ...form, global_deadline: e.target.value })}
        />
      </label>
      <label>
        Подача / Следующий дедлайн
        <input
          type="date"
          value={form.pitch_deadline}
          onChange={(e) => setForm({ ...form, pitch_deadline: e.target.value })}
        />
      </label>
      <label>
        Количество дронов
        <input
          type="number"
          min={1}
          value={form.drone_count}
          onChange={(e) => setForm({ ...form, drone_count: parseInt(e.target.value, 10) || 0 })}
        />
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={form.is_rework}
          onChange={(e) => setForm({ ...form, is_rework: e.target.checked })}
        />
        Переработка
      </label>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Сохранение...' : (initial?.name ? 'Сохранить' : 'Создать')}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-outline">
            Отмена
          </button>
        )}
      </div>
    </form>
  )
}
