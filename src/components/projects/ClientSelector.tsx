import { useState, useRef, useEffect } from 'react'
import { useClients, type Client } from '@/hooks/useClients'

type Props = {
  value: string | null
  onChange: (clientId: string | null, client?: Client) => void
  placeholder?: string
  disabled?: boolean
}

export default function ClientSelector({ value, onChange, placeholder = 'Выберите или добавьте клиента', disabled }: Props) {
  const { clients, loading, addClient } = useClients()
  const [input, setInput] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [adding, setAdding] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedClient = value ? clients.find((c) => c.id === value) : null
  const filtered = input
    ? clients.filter((c) => c.name.toLowerCase().includes(input.toLowerCase()))
    : clients

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (c: Client) => {
    onChange(c.id, c)
    setInput('')
    setShowDropdown(false)
  }

  const handleAddNew = async () => {
    const name = input.trim()
    if (!name) return
    setAdding(true)
    try {
      const newClient = await addClient(name)
      onChange(newClient.id, newClient)
      setInput('')
      setShowDropdown(false)
    } finally {
      setAdding(false)
    }
  }

  const canAdd = input.trim().length > 0 && !clients.some((c) => c.name.toLowerCase() === input.trim().toLowerCase())

  return (
    <div className="client-selector" ref={containerRef}>
      <div className="client-selector-input-wrap">
        <input
          type="text"
          value={showDropdown ? input : selectedClient?.name ?? input}
          onChange={(e) => {
            setInput(e.target.value)
            setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="client-selector-input"
        />
        {selectedClient && !showDropdown && (
          <button
            type="button"
            onClick={() => {
              onChange(null)
              setInput('')
              setShowDropdown(true)
            }}
            className="client-selector-clear"
            title="Очистить"
          >
            ×
          </button>
        )}
      </div>
      {showDropdown && (
        <div className="client-selector-dropdown">
          {loading ? (
            <div className="client-selector-item client-selector-loading">Загрузка...</div>
          ) : (
            <>
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="client-selector-item"
                  onClick={() => handleSelect(c)}
                >
                  {c.name}
                </button>
              ))}
              {canAdd && (
                <button
                  type="button"
                  className="client-selector-item client-selector-add"
                  onClick={handleAddNew}
                  disabled={adding}
                >
                  {adding ? 'Добавляем...' : `+ Добавить «${input.trim()}»`}
                </button>
              )}
              {filtered.length === 0 && !canAdd && (
                <div className="client-selector-item client-selector-empty">Нет совпадений</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
