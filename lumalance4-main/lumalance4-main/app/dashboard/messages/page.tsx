'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api/client';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';

interface Participant {
  id: number;
  email: string;
  display_name: string;
  avatar_url: string | null;
}

interface Conversation {
  id: number;
  title: string | null;
  project_id: number | null;
  project_title: string | null;
  project_slug: string | null;
  is_group: boolean;
  created_at: string;
  updated_at: string;
  unread_count: number;
  last_message: string | null;
  last_message_at: string | null;
  participants: Participant[];
}

export default function MessagesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Redirect if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/dashboard/messages');
    }
  }, [isAuthenticated, isLoading, router]);
  
  useEffect(() => {
    const fetchConversations = async () => {
      if (!isAuthenticated) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await api.messages.getConversations();
        
        if (response.data) {
          setConversations(response.data.conversations);
        } else {
          setError(response.error || 'Failed to fetch conversations');
        }
      } catch (err) {
        setError('An error occurred while fetching conversations');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchConversations();
  }, [isAuthenticated]);
  
  const getConversationTitle = (conversation: Conversation): string => {
    if (conversation.title) {
      return conversation.title;
    }
    
    if (conversation.project_title) {
      return `Project: ${conversation.project_title}`;
    }
    
    if (conversation.participants && conversation.participants.length > 0) {
      return conversation.participants
        .map(p => p.display_name || p.email)
        .join(', ');
    }
    
    return 'Untitled Conversation';
  };
  
  const getParticipantAvatar = (conversation: Conversation): string | null => {
    if (conversation.participants && conversation.participants.length > 0) {
      return conversation.participants[0].avatar_url;
    }
    
    return null;
  };
  
  const truncateMessage = (message: string | null, maxLength = 100): string => {
    if (!message) return 'No messages yet';
    
    if (message.length <= maxLength) return message;
    
    return `${message.substring(0, maxLength)}...`;
  };
  
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Messages</h1>
        <button
          onClick={() => router.push('/dashboard/messages/new')}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          New Message
        </button>
      </div>
      
      {/* Conversations list */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mb-2"></div>
            <p className="text-gray-600">Loading conversations...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md m-4">
            {error}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-medium text-gray-700 mb-2">No conversations yet</h3>
            <p className="text-gray-500 mb-4">
              Start a new conversation to connect with clients or freelancers
            </p>
            <button
              onClick={() => router.push('/dashboard/messages/new')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Start a Conversation
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/dashboard/messages/${conversation.id}`}
                className="block hover:bg-gray-50 transition-colors"
              >
                <div className="p-4 flex items-start">
                  <div className="flex-shrink-0 mr-4">
                    {getParticipantAvatar(conversation) ? (
                      <Image
                        src={getParticipantAvatar(conversation) as string}
                        alt={getConversationTitle(conversation)}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-500 text-lg">
                          {getConversationTitle(conversation).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-base font-medium text-gray-900 truncate">
                        {getConversationTitle(conversation)}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {conversation.last_message_at ? formatDate(conversation.last_message_at) : formatDate(conversation.created_at)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-500 truncate">
                      {truncateMessage(conversation.last_message)}
                    </p>
                    
                    {conversation.project_title && (
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Project: {conversation.project_title}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {conversation.unread_count > 0 && (
                    <div className="ml-4 flex-shrink-0">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-600 text-white text-xs font-medium">
                        {conversation.unread_count}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
