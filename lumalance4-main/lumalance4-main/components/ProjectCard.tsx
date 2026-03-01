"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart, Clock, ArrowRight, DollarSign, Users, MapPin } from "lucide-react"
import { Badge } from "@/lib/components/ui/Badge"
import { Button } from "@/lib/components/ui/Button"
import { Card, CardContent, CardFooter } from "@/lib/components/ui/Card"
import { cn } from "@/lib/utils"

// Define project interface that matches the current project structure
export interface Project {
  id: number
  title: string
  slug?: string
  description: string
  image_url?: string
  budget?: number
  budget_min?: number
  budget_max?: number
  timeline_min?: number
  timeline_max?: number
  deadline?: string
  status: string
  created_at: string
  skills?: Array<{ id: number; name: string; slug?: string }>
  categories?: Array<{ id: number; name: string; slug?: string }>
  proposal_count?: number
  location?: string
  client_display_name?: string
  client_avatar_url?: string
  is_public?: boolean
}

export interface ProjectCardProps {
  project: Project
  variant?: "default" | "horizontal" | "minimal"
  className?: string
}

export function ProjectCard({ project, variant = "default", className }: ProjectCardProps) {
  const [isFavorite, setIsFavorite] = useState(false)

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFavorite(!isFavorite)
  }

  const {
    id,
    title,
    slug,
    description,
    image_url,
    skills = [],
    budget,
    budget_min,
    budget_max,
    timeline_min,
    timeline_max,
    deadline,
    proposal_count = 0,
    status,
    location,
    client_display_name,
    categories = [],
  } = project

  // Format budget range
  const budgetRange = 
    budget_min && budget_max
      ? `$${budget_min.toLocaleString()} - $${budget_max.toLocaleString()}`
      : budget
        ? `$${budget.toLocaleString()}`
        : budget_min
          ? `From $${budget_min.toLocaleString()}`
          : budget_max
            ? `Up to $${budget_max.toLocaleString()}`
            : "Budget not specified"

  // Format timeline
  const timelineRange = 
    timeline_min && timeline_max
      ? `${timeline_min}-${timeline_max} days`
      : timeline_min
        ? `From ${timeline_min} days`
        : timeline_max
          ? `Up to ${timeline_max} days`
          : deadline
            ? `By ${new Date(deadline).toLocaleDateString()}`
            : "Timeline not specified"

  // Create a slug from the title if not provided
  const projectSlug = slug || title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "-")

  // Get tag names from skills and categories
  const tagNames = [
    ...skills.map(skill => skill.name),
    ...categories.map(category => category.name)
  ]

  const isOpen = status === 'active' || status === 'open'

  if (variant === "horizontal") {
    return (
      <Card className={cn("overflow-hidden", isOpen && "border-primary/50 shadow-md", className)}>
        <div className="flex flex-col sm:flex-row">
          <div className="relative w-full sm:w-[240px] h-[180px]">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
            {isOpen && (
              <div className="absolute top-2 left-2 z-20">
                <Badge className="bg-primary text-primary-foreground">Open</Badge>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full h-8 w-8 z-20"
              onClick={toggleFavorite}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-primary text-primary" : ""}`} />
              <span className="sr-only">Add to favorites</span>
            </Button>
            <Image
              src={image_url || "/placeholder.svg?height=400&width=600"}
              alt={title}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 p-5">
            <div className="flex items-center gap-1 mb-2">
              <DollarSign className="h-3 w-3 text-primary" />
              <span className="text-sm font-medium">{budgetRange}</span>
            </div>

            <Link href={`/projects/${projectSlug}`} className="group">
              <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors mb-2">
                {title}
              </h3>
            </Link>

            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{description}</p>

            <div className="flex flex-wrap gap-1 mb-3">
              {tagNames.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tagNames.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{tagNames.length - 3} more
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  {timelineRange}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Users className="h-3 w-3 mr-1" />
                  {proposal_count} proposals
                </div>
              </div>
              <Button size="sm" asChild>
                <Link href={`/projects/${projectSlug}`}>
                  View Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (variant === "minimal") {
    return (
      <Card className={cn("overflow-hidden", isOpen && "border-primary/50", className)}>
        <div className="relative aspect-[4/3] overflow-hidden">
          {isOpen && (
            <div className="absolute top-2 left-2 z-20">
              <Badge className="bg-primary text-primary-foreground">Open</Badge>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full h-8 w-8 z-20"
            onClick={toggleFavorite}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-primary text-primary" : ""}`} />
            <span className="sr-only">Add to favorites</span>
          </Button>
          <Image
            src={image_url || "/placeholder.svg?height=400&width=600"}
            alt={title}
            fill
            className="object-cover transition-transform hover:scale-105 duration-300"
          />
        </div>
        <CardContent className="p-3">
          <Link href={`/projects/${projectSlug}`} className="group">
            <h3 className="font-medium line-clamp-1 group-hover:text-primary transition-colors">{title}</h3>
          </Link>
          <div className="flex items-center gap-1 mt-1">
            <DollarSign className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium">{budgetRange}</span>
          </div>
        </CardContent>
        <CardFooter className="p-3 pt-0 flex justify-between items-center">
          <div className="text-xs text-muted-foreground flex items-center">
            <Users className="h-3 w-3 mr-1" />
            {proposal_count} proposals
          </div>
          <div className="text-xs text-muted-foreground flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {timelineRange}
          </div>
        </CardFooter>
      </Card>
    )
  }

  // Default variant
  return (
    <Card className={cn("overflow-hidden h-full flex flex-col", isOpen && "border-primary/50 shadow-md", className)}>
      <div className="relative">
        <div className="relative aspect-[4/3] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
          {isOpen && (
            <div className="absolute top-2 left-2 z-20">
              <Badge className="bg-primary text-primary-foreground">Open</Badge>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full h-8 w-8 z-20"
            onClick={toggleFavorite}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-primary text-primary" : ""}`} />
            <span className="sr-only">Add to favorites</span>
          </Button>
          <Image
            src={image_url || "/placeholder.svg?height=400&width=600"}
            alt={title}
            fill
            className="object-cover transition-transform hover:scale-105 duration-300"
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
          <div className="flex flex-wrap gap-1 mb-2">
            {tagNames.slice(0, 2).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs bg-background/80 backdrop-blur-sm">
                {tag}
              </Badge>
            ))}
            {tagNames.length > 2 && (
              <Badge variant="secondary" className="text-xs bg-background/80 backdrop-blur-sm">
                +{tagNames.length - 2}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-4 flex-grow">
        <div className="flex items-center gap-1 mb-2">
          <DollarSign className="h-3 w-3 text-primary" />
          <span className="text-sm font-medium">{budgetRange}</span>
        </div>

        <Link href={`/projects/${projectSlug}`} className="group">
          <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors mb-2">{title}</h3>
        </Link>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{description}</p>

        <div className="flex items-center text-xs text-muted-foreground mb-2">
          <Clock className="h-3 w-3 mr-1" />
          Timeline: {timelineRange}
        </div>

        {location && (
          <div className="flex items-center text-xs text-muted-foreground mb-2">
            <MapPin className="h-3 w-3 mr-1" />
            {location}
          </div>
        )}

        {client_display_name && (
          <div className="text-xs text-muted-foreground">
            by {client_display_name}
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0 flex justify-between items-center mt-auto">
        <div className="text-xs text-muted-foreground flex items-center">
          <Users className="h-3 w-3 mr-1" />
          {proposal_count} proposals
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/projects/${projectSlug}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  )
} 