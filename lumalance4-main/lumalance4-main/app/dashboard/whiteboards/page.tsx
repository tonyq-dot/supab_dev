'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlusIcon, FolderIcon, ShareIcon, TrashIcon, EditIcon } from 'lucide-react';
import { Button } from '@/lib/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/lib/components/ui/Card';
import { Badge } from '@/lib/components/ui/Badge';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatDate } from '@/lib/utils';
import { Whiteboard } from '@/types';

export default function WhiteboardsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWhiteboards();
  }, []);

  const fetchWhiteboards = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/whiteboards', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch whiteboards');
      }

      const data = await response.json();
      setWhiteboards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWhiteboard = async () => {
    try {
      const response = await fetch('/api/whiteboards', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'New Whiteboard',
          description: 'A new whiteboard for project collaboration',
          is_public: false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create whiteboard');
      }

      const newWhiteboard = await response.json();
      router.push(`/dashboard/whiteboards/${newWhiteboard.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create whiteboard');
    }
  };

  const handleDeleteWhiteboard = async (id: number) => {
    if (!confirm('Are you sure you want to delete this whiteboard?')) {
      return;
    }

    try {
      const response = await fetch(`/api/whiteboards/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete whiteboard');
      }

      setWhiteboards(whiteboards.filter(wb => wb.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete whiteboard');
    }
  };

  const getPermissionBadge = (permission: string) => {
    switch (permission) {
      case 'owner':
        return <Badge variant="default">Owner</Badge>;
      case 'admin':
        return <Badge variant="destructive">Admin</Badge>;
      case 'edit':
        return <Badge variant="secondary">Editor</Badge>;
      case 'view':
        return <Badge variant="outline">Viewer</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Whiteboards</h1>
          <Button onClick={handleCreateWhiteboard} className="flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            New Whiteboard
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchWhiteboards}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Whiteboards</h1>
          <p className="text-gray-600 mt-2">
            Collaborate on projects with visual whiteboards
          </p>
        </div>
        <Button onClick={handleCreateWhiteboard} className="flex items-center gap-2">
          <PlusIcon className="w-4 h-4" />
          New Whiteboard
        </Button>
      </div>

      {whiteboards.length === 0 ? (
        <div className="text-center py-12">
          <FolderIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No whiteboards yet</h2>
          <p className="text-gray-600 mb-4">
            Create your first whiteboard to start collaborating visually
          </p>
          <Button onClick={handleCreateWhiteboard} className="flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            Create First Whiteboard
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {whiteboards.map((whiteboard) => (
            <Card key={whiteboard.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-1">
                      {whiteboard.title}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      by {whiteboard.owner?.email || 'Unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {getPermissionBadge(whiteboard.current_user_permission || 'view')}
                    {whiteboard.is_public && (
                      <ShareIcon className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {whiteboard.description && (
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                    {whiteboard.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>Updated {formatDate(whiteboard.updated_at)}</span>
                  <span>
                    {whiteboard.project_elements?.length || 0} projects
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    variant="default"
                    size="sm"
                    className="flex-1"
                  >
                    <Link href={`/dashboard/whiteboards/${whiteboard.id}`}>
                      Open
                    </Link>
                  </Button>
                  {whiteboard.current_user_permission === 'owner' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteWhiteboard(whiteboard.id)}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 