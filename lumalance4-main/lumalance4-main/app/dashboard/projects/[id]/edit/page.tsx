"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";

// Add interfaces for Skill and Category
interface Skill {
  id: number;
  name: string;
  slug: string;
}
interface Category {
  id: number;
  name: string;
  slug: string;
}

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [isPublic, setIsPublic] = useState(true);

  // Skills and categories
  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/dashboard/projects/" + id + "/edit");
    }
  }, [isAuthenticated, authLoading, router, id]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [projectRes, skillsRes, categoriesRes] = await Promise.all([
          api.request(`/projects/${id}`),
          api.request("/skills"),
          api.request("/categories"),
        ]);
        if (projectRes.data) {
          const p = projectRes.data;
          setTitle(p.title || "");
          setDescription(p.description || "");
          setBudget(p.budget ? String(p.budget) : "");
          setDeadline(p.deadline ? p.deadline.split("T")[0] : "");
          setSelectedSkills(p.skills?.map((s: Skill) => s.id) || []);
          setSelectedCategories(p.categories?.map((c: Category) => c.id) || []);
          setIsPublic(p.is_public !== false);
        } else {
          setError(projectRes.error || "Failed to load project");
        }
        if (skillsRes.data) setSkills(skillsRes.data);
        if (categoriesRes.data) setCategories(categoriesRes.data);
      } catch (err) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated) fetchData();
  }, [id, isAuthenticated]);

  const handleSkillToggle = (skillId: number) => {
    setSelectedSkills((prev: number[]) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
  };
  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories((prev: number[]) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    try {
      const response = await api.projects.update(id, {
        title,
        description,
        budget: budget ? parseFloat(budget) : undefined,
        deadline: deadline || undefined,
        skills: selectedSkills,
        categories: selectedCategories,
        is_public: isPublic,
      });
      if (response.error) {
        setError(response.error as string);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/projects/${response.data.slug || id}`);
        }, 1200);
      }
    } catch (err) {
      setError("An error occurred while updating the project.");
    }
  };

  const handleDelete = async () => {
    setDeleteError(null);
    setDeleting(true);
    try {
      const response = await api.projects.delete(id);
      if (response.error) {
        setDeleteError(response.error as string);
      } else {
        // Redirect to dashboard/projects with a success message
        router.push("/dashboard/projects?deleted=1");
      }
    } catch (err) {
      setDeleteError("An error occurred while deleting the project.");
    } finally {
      setDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mb-2"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return null;
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Link href="/dashboard/projects" className="text-primary-600 hover:text-primary-800">
          ← Back to My Projects
        </Link>
      </div>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Edit Project</h1>
        {success ? (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-4">
            Project updated! Redirecting...
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">{error}</div>
            )}
            <form onSubmit={handleSubmit}>
              {/* Title */}
              <div className="mb-6">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Project Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              {/* Description */}
              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Project Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {/* Budget & Deadline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
                    Budget ($)
                  </label>
                  <input
                    type="number"
                    id="budget"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    id="deadline"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              {/* Categories */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {categories.length > 0 ? (
                    categories.map((category) => (
                      <div key={category.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`category-${category.id}`}
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => handleCategoryToggle(category.id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`category-${category.id}`} className="ml-2 text-sm text-gray-700">
                          {category.name}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 col-span-3">Loading categories...</p>
                  )}
                </div>
              </div>
              {/* Skills */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Required Skills</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {skills.length > 0 ? (
                    skills.map((skill) => (
                      <div key={skill.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`skill-${skill.id}`}
                          checked={selectedSkills.includes(skill.id)}
                          onChange={() => handleSkillToggle(skill.id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`skill-${skill.id}`} className="ml-2 text-sm text-gray-700">
                          {skill.name}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 col-span-3">Loading skills...</p>
                  )}
                </div>
              </div>
              {/* Visibility */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Project Visibility</label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is-public"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is-public" className="ml-2 text-sm text-gray-700">
                    Make this project public (visible to all freelancers)
                  </label>
                </div>
              </div>
              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
      {/* Delete Project Section */}
      <div className="mt-10">
        <hr className="my-8" />
        <h2 className="text-lg font-semibold mb-4 text-red-700">Danger Zone</h2>
        {deleteError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">{deleteError}</div>
        )}
        <button
          type="button"
          className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
          onClick={() => setShowConfirmDelete(true)}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete Project"}
        </button>
        {/* Confirmation Dialog */}
        {showConfirmDelete && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full">
              <h3 className="text-lg font-bold mb-4 text-red-700">Confirm Deletion</h3>
              <p className="mb-6">Are you sure you want to delete this project? This action cannot be undone.</p>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
