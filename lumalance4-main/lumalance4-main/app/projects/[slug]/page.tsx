'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Clock, DollarSign, Users, MapPin, Calendar, ArrowLeft, Heart, Flag } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader'
import { Badge } from '@/lib/components/ui/Badge'
import { Button } from '@/lib/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/lib/components/ui/Card'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/AuthContext'
import type { Project } from '@/components/ProjectCard'

export default function ProjectDetailPage() {
  const { slug } = useParams()
  const { user, isAuthenticated } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)

  useEffect(() => {
    const fetchProject = async () => {
      if (!slug) return
      
      setLoading(true)
      setError(null)
      
      try {
        const response = await api.projects.getBySlug(slug as string)
        
        if (response.success && response.data) {
          setProject(response.data)
        } else {
          setError(response.error || 'Failed to fetch project details')
        }
      } catch (err) {
        setError('An error occurred while fetching project details')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProject()
  }, [slug])

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite)
    // TODO: Implement favorite functionality
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-3/4 mb-4"></div>
            <div className="h-64 bg-muted rounded mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
              <div className="h-4 bg-muted rounded w-4/6"></div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-muted-foreground mb-4">
              {error || 'Project not found'}
            </h1>
            <Button asChild>
              <Link href="/projects">Browse Projects</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const {
    title,
    description,
    image_url,
    budget,
    budget_min,
    budget_max,
    timeline_min,
    timeline_max,
    deadline,
    status,
    skills = [],
    categories = [],
    proposal_count = 0,
    location,
    client_display_name,
    created_at,
  } = project

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

  const isOpen = status === 'active' || status === 'open'

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <div className="mb-6">
            <Button variant="ghost" asChild>
              <Link href="/projects" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Projects
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Project Header */}
              <div className="mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2">{title}</h1>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>Posted {new Date(created_at).toLocaleDateString()}</span>
                      {location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {location}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={toggleFavorite}
                    >
                      <Heart className={`h-4 w-4 ${isFavorite ? "fill-primary text-primary" : ""}`} />
                    </Button>
                    <Button variant="outline" size="icon">
                      <Flag className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Status Badge */}
                {isOpen && (
                  <Badge className="mb-4">Open for Proposals</Badge>
                )}
              </div>

              {/* Project Image */}
              {image_url && (
                <div className="relative aspect-video mb-6 rounded-lg overflow-hidden">
                  <Image
                    src={image_url}
                    alt={title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Project Description */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Project Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {description}
                  </p>
                </CardContent>
              </Card>

              {/* Skills & Categories */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Skills & Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {skills.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Required Skills:</h4>
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill, index) => (
                            <Badge key={index} variant="secondary">
                              {skill.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {categories.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Categories:</h4>
                        <div className="flex flex-wrap gap-2">
                          {categories.map((category, index) => (
                            <Badge key={index} variant="outline">
                              {category.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Client Information */}
              {client_display_name && (
                <Card>
                  <CardHeader>
                    <CardTitle>About the Client</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{client_display_name}</p>
                        <p className="text-sm text-muted-foreground">Project Owner</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-4 space-y-6">
                {/* Project Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Budget</p>
                        <p className="font-medium">{budgetRange}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Timeline</p>
                        <p className="font-medium">{timelineRange}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Proposals</p>
                        <p className="font-medium">{proposal_count} received</p>
                      </div>
                    </div>
                    {deadline && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Deadline</p>
                          <p className="font-medium">{new Date(deadline).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {isAuthenticated ? (
                    <>
                      <Button className="w-full" size="lg">
                        Submit Proposal
                      </Button>
                      <Button variant="outline" className="w-full">
                        Send Message
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button className="w-full" size="lg" asChild>
                        <Link href="/login">Login to Submit Proposal</Link>
                      </Button>
                      <Button variant="outline" className="w-full" asChild>
                        <Link href="/register">Create Account</Link>
                      </Button>
                    </>
                  )}
                </div>

                {/* Similar Projects */}
                <Card>
                  <CardHeader>
                    <CardTitle>Similar Projects</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Browse more projects in similar categories
                    </p>
                    <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                      <Link href="/projects">View All Projects</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
