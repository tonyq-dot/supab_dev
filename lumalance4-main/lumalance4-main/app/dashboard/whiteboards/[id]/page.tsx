'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Excalidraw } from '@excalidraw/excalidraw';
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import { AppState } from '@excalidraw/excalidraw/types/types';
import { ArrowLeftIcon, PlusIcon, ShareIcon, SettingsIcon, XIcon } from 'lucide-react';
import { Button } from '@/lib/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/lib/components/ui/Card';
import { Badge } from '@/lib/components/ui/Badge';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Whiteboard, WhiteboardProjectElement, Project } from '@/types';

export default function WhiteboardPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const whiteboardId = params.id as string;
  
  const [whiteboard, setWhiteboard] = useState<Whiteboard | null>(null);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  useEffect(() => {
    fetchWhiteboard();
    fetchAvailableProjects();
  }, [whiteboardId]);

  const fetchWhiteboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/whiteboards/${whiteboardId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch whiteboard');
      }

      const data = await response.json();
      setWhiteboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableProjects = async () => {
    try {
      const response = await fetch(`/api/whiteboards/${whiteboardId}/available-projects`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch available projects');
      }

      const data = await response.json();
      setAvailableProjects(data);
    } catch (err) {
      console.error('Error fetching available projects:', err);
    }
  };

  const handleChange = useCallback((elements: ExcalidrawElement[], appState: AppState) => {
    // Auto-save whiteboard data
    if (whiteboard && excalidrawAPI) {
      const sceneData = excalidrawAPI.getSceneElements();
      const appStateData = excalidrawAPI.getAppState();
      
      // Debounce the save operation
      const saveData = {
        elements: sceneData,
        appState: appStateData
      };
      
      updateWhiteboard({ excalidraw_data: saveData });
    }
  }, [whiteboard, excalidrawAPI]);

  const updateWhiteboard = async (updateData: any) => {
    try {
      const response = await fetch(`/api/whiteboards/${whiteboardId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error('Failed to update whiteboard');
      }

      const updatedWhiteboard = await response.json();
      setWhiteboard(updatedWhiteboard);
    } catch (err) {
      console.error('Error updating whiteboard:', err);
    }
  };

  const handleAddProject = async (project: Project) => {
    try {
      // Create a project element in Excalidraw
      const elementId = `project-${project.id}-${Date.now()}`;
      
      // Get current viewport center
      const appState = excalidrawAPI?.getAppState();
      const centerX = appState?.scrollX ? -appState.scrollX + 400 : 400;
      const centerY = appState?.scrollY ? -appState.scrollY + 300 : 300;
      
      // Add project to whiteboard backend
      const response = await fetch(`/api/whiteboards/${whiteboardId}/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: project.id,
          excalidraw_element_id: elementId,
          position_x: centerX,
          position_y: centerY
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add project to whiteboard');
      }

      // Create rectangle element for project
      const projectElement = {
        type: 'rectangle',
        id: elementId,
        x: centerX,
        y: centerY,
        width: 200,
        height: 120,
        angle: 0,
        strokeColor: '#1e40af',
        backgroundColor: '#3b82f6',
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: null,
        seed: Math.floor(Math.random() * 1000000),
        versionNonce: Math.floor(Math.random() * 1000000),
        isDeleted: false,
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false,
        customData: {
          projectId: project.id,
          projectTitle: project.title,
          isProjectCard: true
        }
      };

      // Add text element for project title
      const textElement = {
        type: 'text',
        id: `text-${elementId}`,
        x: centerX + 10,
        y: centerY + 10,
        width: 180,
        height: 25,
        angle: 0,
        strokeColor: '#ffffff',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: null,
        seed: Math.floor(Math.random() * 1000000),
        versionNonce: Math.floor(Math.random() * 1000000),
        isDeleted: false,
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false,
        text: project.title,
        fontSize: 14,
        fontFamily: 1,
        textAlign: 'left',
        verticalAlign: 'top',
        containerId: null,
        originalText: project.title,
        customData: {
          projectId: project.id,
          isProjectText: true
        }
      };

      // Add elements to Excalidraw
      const currentElements = excalidrawAPI?.getSceneElements() || [];
      excalidrawAPI?.updateScene({
        elements: [...currentElements, projectElement, textElement]
      });

      // Update local state
      setShowProjectSelector(false);
      await fetchWhiteboard();
      await fetchAvailableProjects();
    } catch (err) {
      console.error('Error adding project:', err);
      alert('Failed to add project to whiteboard');
    }
  };

  const handleElementClick = async (element: ExcalidrawElement) => {
    // Check if clicked element is a project card
    if (element.customData?.isProjectCard) {
      const projectId = element.customData.projectId;
      
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch project details');
        }

        const project = await response.json();
        setSelectedProject(project);
        setShowProjectDetails(true);
      } catch (err) {
        console.error('Error fetching project details:', err);
        alert('Failed to fetch project details');
      }
    }
  };

  const renderProjectDetails = () => {
    if (!selectedProject) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">{selectedProject.title}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProjectDetails(false)}
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-gray-700">{selectedProject.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Budget</h3>
                  <p className="text-gray-700">
                    {selectedProject.budget_min && selectedProject.budget_max
                      ? `${formatCurrency(selectedProject.budget_min)} - ${formatCurrency(selectedProject.budget_max)}`
                      : 'Not specified'}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Status</h3>
                  <Badge variant={selectedProject.status === 'open' ? 'default' : 'secondary'}>
                    {selectedProject.status}
                  </Badge>
                </div>
              </div>
              
              {selectedProject.deadline && (
                <div>
                  <h3 className="font-semibold mb-2">Deadline</h3>
                  <p className="text-gray-700">{formatDate(selectedProject.deadline)}</p>
                </div>
              )}
              
              {selectedProject.skills && selectedProject.skills.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.skills.map((skill) => (
                      <Badge key={skill.id} variant="outline">
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 pt-4">
                <Button asChild className="flex-1">
                  <a href={`/projects/${selectedProject.slug}`} target="_blank" rel="noopener noreferrer">
                    View Full Project
                  </a>
                </Button>
                <Button variant="outline" onClick={() => setShowProjectDetails(false)}>
                  Close
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderProjectSelector = () => {
    if (!showProjectSelector) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Add Project to Whiteboard</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProjectSelector(false)}
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableProjects.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No available projects to add
                </p>
              ) : (
                availableProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleAddProject(project)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{project.title}</h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {project.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{project.status}</Badge>
                            {project.budget_min && (
                              <span className="text-sm text-gray-500">
                                {formatCurrency(project.budget_min)}
                                {project.budget_max && ` - ${formatCurrency(project.budget_max)}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading whiteboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/dashboard/whiteboards')}>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Whiteboards
          </Button>
        </div>
      </div>
    );
  }

  if (!whiteboard) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Whiteboard Not Found</h2>
          <Button onClick={() => router.push('/dashboard/whiteboards')}>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Whiteboards
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/whiteboards')}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{whiteboard.title}</h1>
            <p className="text-sm text-gray-600">
              {whiteboard.project_elements?.length || 0} projects
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowProjectSelector(true)}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Project
          </Button>
          <Button variant="outline" size="sm">
            <ShareIcon className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <SettingsIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Excalidraw */}
      <div className="flex-1">
        <Excalidraw
          initialData={{
            elements: whiteboard.excalidraw_data?.elements || [],
            appState: whiteboard.excalidraw_data?.appState || {}
          }}
          onChange={handleChange}
          onPointerUpdate={(payload) => {
            if (payload.button === 'up' && payload.pointersMap.size === 0) {
              // Check if we clicked on an element
              const clickedElement = excalidrawAPI?.getSceneElements().find(
                (element: any) => {
                  const bounds = excalidrawAPI?.getSceneElementBounds(element);
                  return bounds && 
                    payload.pointer.x >= bounds.x && 
                    payload.pointer.x <= bounds.x + bounds.width &&
                    payload.pointer.y >= bounds.y && 
                    payload.pointer.y <= bounds.y + bounds.height;
                }
              );
              
              if (clickedElement) {
                handleElementClick(clickedElement);
              }
            }
          }}
          ref={(api) => setExcalidrawAPI(api)}
        />
      </div>

      {/* Modals */}
      {renderProjectSelector()}
      {renderProjectDetails()}
    </div>
  );
} 