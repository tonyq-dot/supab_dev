/** Workflow status codes and display labels */
export const WORKFLOW_STATUSES = [
  { value: 'preview', label: 'ПРЕВЬЮ' },
  { value: 'preproduction', label: 'ПРЕПРОДАКШН' },
  { value: 'assembly', label: 'СБОРКА' },
  { value: 'final_stretch', label: 'ФИНИШНАЯ ПРЯМАЯ' },
  { value: 'show', label: 'ШОУ' },
  { value: 'stop', label: 'СТОП' },
  { value: 'awaiting_response', label: 'ЖДЕМ ОТВЕТА' },
] as const

export type WorkflowStatusValue = (typeof WORKFLOW_STATUSES)[number]['value']

export function getWorkflowStatusLabel(value: WorkflowStatusValue | null | undefined): string {
  if (!value) return '—'
  const found = WORKFLOW_STATUSES.find((s) => s.value === value)
  return found?.label ?? value
}
