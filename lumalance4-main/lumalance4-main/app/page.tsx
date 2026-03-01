'use client'

import { SearchBar } from "@/components/SearchBar"
import { ProjectCard } from "@/components/ProjectCard"
import { SiteHeader } from "@/components/SiteHeader"
import { Button } from "@/lib/components/ui/Button"
import Link from "next/link"
import { api } from "@/lib/api"
import { useEffect, useState } from "react"
import type { Project } from "@/components/ProjectCard"

// Sample project data for fallback
const sampleProjects = [
  {
    id: 1,
    title: "Modern Website Design & Development",
    description: "Looking for a skilled developer to create a modern, responsive website with clean UI/UX design. Must include contact forms, blog functionality, and SEO optimization.",
    image_url: "/placeholder.svg?height=400&width=600",
    status: "active",
    budget_min: 800,
    budget_max: 1500,
    timeline_min: 14,
    timeline_max: 21,
    created_at: new Date().toISOString(),
    skills: [
      { id: 1, name: "Web Development" },
      { id: 2, name: "UI/UX Design" },
      { id: 3, name: "SEO" }
    ],
    categories: [
      { id: 1, name: "Web Development" }
    ],
    proposal_count: 12,
    client_display_name: "Sarah Johnson",
    location: "Remote"
  },
  {
    id: 2,
    title: "Mobile App Development - iOS & Android",
    description: "Need an experienced mobile developer to build a cross-platform app for food delivery. Features include user authentication, payment integration, and real-time tracking.",
    image_url: "/placeholder.svg?height=400&width=600",
    status: "active",
    budget_min: 2000,
    budget_max: 4000,
    timeline_min: 28,
    timeline_max: 42,
    created_at: new Date().toISOString(),
    skills: [
      { id: 4, name: "Mobile Development" },
      { id: 5, name: "React Native" },
      { id: 6, name: "Payment Integration" }
    ],
    categories: [
      { id: 2, name: "Mobile Development" }
    ],
    proposal_count: 8,
    client_display_name: "Tech Startup Inc.",
    location: "San Francisco, CA"
  },
  {
    id: 3,
    title: "Brand Identity & Logo Design",
    description: "Startup company seeking creative designer for complete brand identity including logo, color scheme, typography, and brand guidelines for digital and print media.",
    image_url: "/placeholder.svg?height=400&width=600",
    status: "active",
    budget_min: 500,
    budget_max: 1200,
    timeline_min: 7,
    timeline_max: 14,
    created_at: new Date().toISOString(),
    skills: [
      { id: 7, name: "Graphic Design" },
      { id: 8, name: "Branding" },
      { id: 9, name: "Adobe Creative Suite" }
    ],
    categories: [
      { id: 3, name: "Design" }
    ],
    proposal_count: 15,
    client_display_name: "Creative Agency",
    location: "New York, NY"
  },
]

const popularProjects = [
  {
    id: 4,
    title: "E-commerce Platform Development",
    description: "Build a comprehensive e-commerce platform with admin dashboard, inventory management, payment processing, and customer support features.",
    image_url: "/placeholder.svg?height=400&width=600",
    status: "active",
    budget_min: 3000,
    budget_max: 6000,
    timeline_min: 35,
    timeline_max: 50,
    created_at: new Date().toISOString(),
    skills: [
      { id: 10, name: "E-commerce" },
      { id: 11, name: "Full Stack Development" },
      { id: 12, name: "Database Design" }
    ],
    categories: [
      { id: 4, name: "E-commerce" }
    ],
    proposal_count: 22,
    client_display_name: "Retail Business",
    location: "Chicago, IL"
  },
  {
    id: 5,
    title: "Content Marketing & SEO Strategy",
    description: "Experienced digital marketer needed to develop and implement comprehensive content marketing strategy with SEO optimization for B2B SaaS company.",
    image_url: "/placeholder.svg?height=400&width=600",
    status: "active",
    budget_min: 1000,
    budget_max: 2500,
    timeline_min: 21,
    timeline_max: 35,
    created_at: new Date().toISOString(),
    skills: [
      { id: 13, name: "Digital Marketing" },
      { id: 14, name: "SEO" },
      { id: 15, name: "Content Strategy" }
    ],
    categories: [
      { id: 5, name: "Marketing" }
    ],
    proposal_count: 18,
    client_display_name: "SaaS Company",
    location: "Remote"
  },
  {
    id: 6,
    title: "Data Analysis & Visualization Dashboard",
    description: "Create interactive dashboard for sales data analysis with charts, graphs, and real-time reporting capabilities. Experience with Python, R, or Tableau required.",
    image_url: "/placeholder.svg?height=400&width=600",
    status: "active",
    budget_min: 1500,
    budget_max: 3000,
    timeline_min: 21,
    timeline_max: 28,
    created_at: new Date().toISOString(),
    skills: [
      { id: 16, name: "Data Analysis" },
      { id: 17, name: "Python" },
      { id: 18, name: "Tableau" }
    ],
    categories: [
      { id: 6, name: "Data Science" }
    ],
    proposal_count: 14,
    client_display_name: "Analytics Corp",
    location: "Austin, TX"
  },
]

export default function Home() {
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>(sampleProjects)
  const [popularProjectsData, setPopularProjectsData] = useState<Project[]>(popularProjects)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Fetch featured projects (active status)
        const featuredResponse = await api.projects.getAll({ limit: 3 })
        
        // Fetch popular projects (most proposals)
        const popularResponse = await api.projects.getAll({ limit: 6 })

        // If successful, use the data, otherwise keep sample data
        if (featuredResponse.success && featuredResponse.data && Array.isArray(featuredResponse.data)) {
          setFeaturedProjects(featuredResponse.data.slice(0, 3))
        }

        if (popularResponse.success && popularResponse.data && Array.isArray(popularResponse.data)) {
          setPopularProjectsData(popularResponse.data.slice(0, 6))
        }
      } catch (error) {
        console.error("Error fetching projects:", error)
        // Keep sample data as fallback
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Compact Search Section */}
        <section className="py-6 px-4 border-b">
          <div className="container mx-auto max-w-3xl">
            <SearchBar />
          </div>
        </section>

        {/* Featured Projects Section */}
        <section className="container mx-auto max-w-7xl px-4 py-12">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-semibold">Featured Projects</h2>
            <Button variant="outline" asChild>
              <Link href="/projects">View All Projects</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredProjects.map((project: Project) => (
              <ProjectCard key={project.id} project={project} variant="default" />
            ))}
          </div>
        </section>

        {/* Popular Projects Section */}
        <section className="bg-muted/20 py-12">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-semibold">Popular Projects</h2>
              <Button variant="outline" asChild>
                <Link href="/projects">Explore More</Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularProjectsData.map((project: Project) => (
                <ProjectCard key={project.id} project={project} variant="default" />
              ))}
            </div>
          </div>
        </section>

        {/* Hero Section moved to bottom */}
        <section className="bg-primary/5 py-12 px-4">
          <div className="container mx-auto max-w-5xl">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-6">
              Find the Perfect Freelance Services for Your Project
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-3xl">
              Connect with skilled professionals to complete your projects or find work that matches your expertise. 
              Join our community of talented freelancers and innovative clients.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <Link href="/projects">Find Projects</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/register">Post a Project</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} LUMALANCE. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/about" className="text-sm text-muted-foreground hover:text-primary">
                About
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary">
                Contact
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
