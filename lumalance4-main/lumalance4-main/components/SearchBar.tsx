"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Button } from "@/lib/components/ui/Button"
import { Input } from "@/lib/components/ui/Input"
import { useState } from "react"

export function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/projects?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto">
      <div className="flex">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search for freelance services..."
            className="pl-10 pr-4 py-6 rounded-l-md rounded-r-none border-r-0 text-base"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button type="submit" className="rounded-l-none px-6 text-base">
          Search
        </Button>
      </div>
    </form>
  )
} 