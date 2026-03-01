import { useState, useRef, useEffect } from 'react'
import { useSellers, type Seller } from '@/hooks/useSellers'

type Props = {
  selected: string[]
  onChange: (sellerIds: string[]) => void
  placeholder?: string
  disabled?: boolean
}

export default function SellersSelector({ selected, onChange, placeholder = 'Добавьте продавцов', disabled }: Props) {
  const { sellers, loading, addSeller } = useSellers()
  const [input, setInput] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [adding, setAdding] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedSellers = sellers.filter((s) => selected.includes(s.id))
  const available = sellers.filter((s) => !selected.includes(s.id))
  const filtered = input ? available.filter((s) => s.name.toLowerCase().includes(input.toLowerCase())) : available

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAdd = (s: Seller) => {
    onChange([...selected, s.id])
    setInput('')
    setShowDropdown(false)
  }

  const handleRemove = (id: string) => {
    onChange(selected.filter((sid) => sid !== id))
  }

  const handleAddNew = async () => {
    const name = input.trim()
    if (!name) return
    setAdding(true)
    try {
      const newSeller = await addSeller(name)
      onChange([...selected, newSeller.id])
      setInput('')
      setShowDropdown(false)
    } finally {
      setAdding(false)
    }
  }

  const canAdd = input.trim().length > 0 && !sellers.some((s) => s.name.toLowerCase() === input.trim().toLowerCase())

  return (
    <div className="sellers-selector" ref={containerRef}>
      <div className="sellers-selector-tags">
        {selectedSellers.map((s) => (
          <span key={s.id} className="sellers-selector-tag">
            {s.name}
            {!disabled && (
              <button type="button" onClick={() => handleRemove(s.id)} className="sellers-selector-tag-remove">
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      {!disabled && (
        <div className="sellers-selector-input-wrap">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder={placeholder}
            className="sellers-selector-input"
          />
          {showDropdown && (
            <div className="sellers-selector-dropdown">
              {loading ? (
                <div className="sellers-selector-item sellers-selector-loading">Загрузка...</div>
              ) : (
                <>
                  {filtered.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="sellers-selector-item"
                      onClick={() => handleAdd(s)}
                    >
                      {s.name}
                    </button>
                  ))}
                  {canAdd && (
                    <button
                      type="button"
                      className="sellers-selector-item sellers-selector-add"
                      onClick={handleAddNew}
                      disabled={adding}
                    >
                      {adding ? 'Добавляем...' : `+ Добавить «${input.trim()}»`}
                    </button>
                  )}
                  {filtered.length === 0 && !canAdd && (
                    <div className="sellers-selector-item sellers-selector-empty">Нет совпадений</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
