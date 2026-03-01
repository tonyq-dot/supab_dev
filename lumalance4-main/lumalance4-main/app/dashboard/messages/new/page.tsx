'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';

interface User {
  id: number;
  email: string;
  display_name: string;
  avatar_url: string | null;
}

interface Project {
  id: number;
  title: string;
  slug: string;
}

export default function NewMessagePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [initialMessage, setInitialMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    // Redirect if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/dashboard/messages/new');
    }
  }, [isAuthenticated, isLoading, router]);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch users
        const usersResponse = await api.request('/users/list');
        
        if (usersResponse.data) {
          // Filter out current user
          const filteredUsers = usersResponse.data.users.filter(
            (u: User) => u.id !== user?.id
          );
          setUsers(filteredUsers);
        }
        
        // Fetch projects
        const projectsResponse = await api.projects.getAll();
        
        if (projectsResponse.data) {
          setProjects(projectsResponse.data.projects);
        }
      } catch (err) {
        setError('An error occurred while fetching data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isAuthenticated, user]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      setError('Please select a recipient');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Create conversation
      const conversationData = {
        participantIds: [selectedUserId],
        projectId: selectedProjectId || undefined,
        isGroup: false
      };
      
      const response = await api.messages.createConversation(conversationData);
      
      if (response.error) {
        setError(response.error);
        return;
      }
      
      const conversationId = response.data?.conversation?.id;
      
      if (!conversationId) {
        setError('Failed to create conversation');
        return;
      }
      
      // Send initial message if provided
      if (initialMessage.trim()) {
        await api.messages.sendMessage(conversationId.toString(), initialMessage);
      }
      
      // Redirect to the conversation
      router.push(`/dashboard/messages/${conversationId}`);
    } catch (err) {
      setError('An error occurred while creating the conversation');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };
  
  const filteredUsers = searchTerm
    ? users.filter(user => 
        user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : users;
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mb-2"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/dashboard/messages" className="text-primary-600 hover:text-primary-800">
          ← Back to Messages
        </Link>
        <h1 className="text-2xl font-bold mt-2">New Message</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}
          
          <div className="space-y-6">
            {/* Recipient selection */}
            <div>
              <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-1">
                Recipient <span className="text-red-500">*</span>
              </label>
              
              <div className="mb-2">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-600 mb-2"></div>
                    <p className="text-gray-600">Loading users...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    {searchTerm ? 'No users found matching your search' : 'No users available'}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`p-3 cursor-pointer hover:bg-gray-50 ${
                          selectedUserId === user.id ? 'bg-primary-50' : ''
                        }`}
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="recipient"
                            id={`user-${user.id}`}
                            checked={selectedUserId === user.id}
                            onChange={() => setSelectedUserId(user.id)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                          />
                          <label
                            htmlFor={`user-${user.id}`}
                            className="ml-3 block text-sm font-medium text-gray-700"
                          >
                            {user.display_name || user.email}
                            {user.display_name && (
                              <span className="text-gray-500 ml-1">({user.email})</span>
                            )}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Project selection (optional) */}
            <div>
              <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-1">
                Related Project (optional)
              </label>
              <select
                id="project"
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">None</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Linking a project helps organize conversations related to specific work
              </p>
            </div>
            
            {/* Initial message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                id="message"
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Type your message here..."
              />
            </div>
            
            <div className="flex justify-end space-x-4">
              <Link
                href="/dashboard/messages"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting || !selectedUserId}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Start Conversation'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
