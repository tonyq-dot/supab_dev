import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useProjects } from '@/hooks/useProjects'
import ProjectDetailsBlock from '@/components/projects/ProjectDetailsBlock'
import ProjectForm from '@/components/projects/ProjectForm'
import AllCommentsView from '@/components/projects/AllCommentsView'
import ProjectTimelineView from '@/components/projects/ProjectTimelineView'
import type { ProjectFormData } from '@/components/projects/ProjectForm'
import { getWorkflowStatusLabel } from '@/constants/projectStatus'

type ProjectType = { id: string; name: string; value: number }

type ViewMode = 'list' | 'comments' | 'timeline'

export default function Projects() {
  const { projects, loading, refetch } = useProjects(false)
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([])
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editSellerIds, setEditSellerIds] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  useEffect(() => {
    if (!editingProjectId) return
    supabase
      .from('project_sellers')
      .select('seller_id')
      .eq('project_id', editingProjectId)
      .then(({ data }) => setEditSellerIds((data ?? []).map((r) => r.seller_id)))
  }, [editingProjectId])

  useEffect(() => {
    supabase.from('project_types').select('id, name, value').then(({ data }) => {
      setProjectTypes(data ?? [])
    })
  }, [])

  const handleCreate = async (data: ProjectFormData) => {
    const { data: proj, error } = await supabase
      .from('projects')
      .insert({
        name: data.name,
        type_id: data.type_id || projectTypes[0]?.id,
        drone_count: data.drone_count,
        is_rework: data.is_rework,
        status: 'Active',
        client_id: data.client_id || null,
        workflow_status: data.workflow_status || null,
        global_deadline: data.global_deadline || null,
        pitch_deadline: data.pitch_deadline || null,
      })
      .select('id')
      .single()
    if (error) throw error
    if (proj && data.seller_ids.length > 0) {
      await supabase.from('project_sellers').insert(
        data.seller_ids.map((seller_id) => ({ project_id: proj.id, seller_id }))
      )
    }
    if (data.pitch_deadline) {
      await supabase.from('project_milestones').insert({
        project_id: proj!.id,
        pitch_date: data.pitch_deadline,
        sort_order: 0,
      })
    }
    setShowForm(false)
    refetch()
  }

  const handleEdit = async (projectId: string, data: ProjectFormData) => {
    const proj = projects.find((p) => p.id === projectId)
    if (!proj) return
    const oldPitch = proj.pitch_deadline
    const newPitch = data.pitch_deadline || null
    const { error } = await supabase
      .from('projects')
      .update({
        name: data.name,
        type_id: data.type_id,
        drone_count: data.drone_count,
        is_rework: data.is_rework,
        client_id: data.client_id || null,
        workflow_status: data.workflow_status || null,
        global_deadline: data.global_deadline || null,
        pitch_deadline: newPitch,
      })
      .eq('id', projectId)
    if (error) throw error
    if (newPitch && newPitch !== oldPitch) {
      const { data: maxOrder } = await supabase
        .from('project_milestones')
        .select('sort_order')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()
      await supabase.from('project_milestones').insert({
        project_id: projectId,
        pitch_date: newPitch,
        sort_order: (maxOrder?.sort_order ?? -1) + 1,
      })
    }
    await supabase.from('project_sellers').delete().eq('project_id', projectId)
    if (data.seller_ids.length > 0) {
      await supabase.from('project_sellers').insert(
        data.seller_ids.map((seller_id) => ({ project_id: projectId, seller_id }))
      )
    }
    setEditingProjectId(null)
    refetch()
  }

  const handleArchive = async (id: string) => {
    await supabase.from('projects').update({ status: 'Archived' }).eq('id', id)
    refetch()
  }

  const handleActivate = async (id: string) => {
    await supabase.from('projects').update({ status: 'Active' }).eq('id', id)
    refetch()
  }

  if (loading) return <p>Загрузка...</p>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Проекты</h1>
        <div className="btn-group">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}`}
          >
            Список
          </button>
          <button
            type="button"
            onClick={() => setViewMode('comments')}
            className={`btn ${viewMode === 'comments' ? 'btn-primary' : 'btn-outline'}`}
          >
            Все комментарии
          </button>
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`btn ${viewMode === 'timeline' ? 'btn-primary' : 'btn-outline'}`}
          >
            Таймлайн
          </button>
          <button type="button" onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? 'Отмена' : 'Новый проект'}
          </button>
        </div>
      </div>
      {showForm && (
        <ProjectForm
          projectTypes={projectTypes}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}
      {viewMode === 'comments' && <AllCommentsView />}
      {viewMode === 'timeline' && <ProjectTimelineView projects={projects} />}
      {viewMode === 'list' && editingProjectId && (() => {
        const p = projects.find((x) => x.id === editingProjectId)
        if (!p) return null
        return (
          <ProjectForm
            initial={{
              name: p.name,
              type_id: p.type_id,
              drone_count: p.drone_count,
              is_rework: p.is_rework,
              client_id: p.client_id,
              seller_ids: editSellerIds,
              workflow_status: p.workflow_status,
              global_deadline: p.global_deadline ?? '',
              pitch_deadline: p.pitch_deadline ?? '',
            }}
            projectTypes={projectTypes}
            onSubmit={(data) => handleEdit(editingProjectId, data)}
            onCancel={() => setEditingProjectId(null)}
          />
        )
      })()}
      {viewMode === 'list' && (
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Клиент</th>
              <th>Тип</th>
              <th>Статус</th>
              <th>Дедлайны</th>
              <th>Дроны</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <React.Fragment key={p.id}>
                <tr
                  className={expandedProjectId === p.id ? 'project-row-expanded' : ''}
                  onClick={() => setExpandedProjectId((prev) => (prev === p.id ? null : p.id))}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setExpandedProjectId((prev) => (prev === p.id ? null : p.id))}
                >
                  <td>{p.name}</td>
                  <td>{p.clients?.name ?? '-'}</td>
                  <td>{p.project_types?.name ?? '-'}</td>
                  <td>{p.workflow_status ? getWorkflowStatusLabel(p.workflow_status) : p.status}</td>
                  <td>
                    {p.global_deadline && <span title="Глобальный">{p.global_deadline}</span>}
                    {p.pitch_deadline && (
                      <span title="Подача">{(p.global_deadline ? ' / ' : '')}{p.pitch_deadline}</span>
                    )}
                    {!p.global_deadline && !p.pitch_deadline && '—'}
                  </td>
                  <td>{p.drone_count}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setEditingProjectId(p.id)}
                      className="btn btn-sm btn-outline"
                      style={{ marginRight: '0.25rem' }}
                    >
                      Изменить
                    </button>
                    {p.status === 'Active' ? (
                      <button type="button" onClick={() => handleArchive(p.id)} className="btn btn-sm">Архив</button>
                    ) : (
                      <button type="button" onClick={() => handleActivate(p.id)} className="btn btn-sm">Активировать</button>
                    )}
                  </td>
                </tr>
                {expandedProjectId === p.id && (
                  <tr>
                    <td colSpan={7} className="project-details-cell">
                      <ProjectDetailsBlock projectId={p.id} project={p} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}
