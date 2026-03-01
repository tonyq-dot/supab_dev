'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  participants: Participant[];
}

interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  is_system_message: boolean;
  created_at: string;
  updated_at: string;
  sender: {
    id: number;
    email: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export default function ConversationPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Redirect if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/dashboard/messages');
    }
  }, [isAuthenticated, isLoading, router]);
  
  useEffect(() => {
    const fetchConversation = async () => {
      if (!isAuthenticated || !id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch conversation details
        const conversationResponse = await api.messages.getConversation(id as string);
        
        if (conversationResponse.error) {
          setError(conversationResponse.error);
          return;
        }
        
        setConversation(conversationResponse.data?.conversation);
        
        // Fetch messages
        const messagesResponse = await api.messages.getMessages(id as string);
        
        if (messagesResponse.error) {
          setError(messagesResponse.error);
          return;
        }
        
        // Sort messages by created_at in ascending order
        const sortedMessages = messagesResponse.data?.messages.sort(
          (a: Message, b: Message) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        setMessages(sortedMessages || []);
      } catch (err) {
        setError('An error occurred while fetching the conversation');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchConversation();
    
    // Set up polling for new messages
    const intervalId = setInterval(() => {
      if (isAuthenticated && id) {
        fetchNewMessages();
      }
    }, 10000); // Poll every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [isAuthenticated, id]);
  
  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);
  
  const fetchNewMessages = async () => {
    if (!isAuthenticated || !id || messages.length === 0) return;
    
    try {
      const latestMessageTime = new Date(messages[messages.length - 1].created_at).getTime();
      
      const messagesResponse = await api.messages.getMessages(id as string);
      
      if (messagesResponse.data?.messages) {
        const newMessages = messagesResponse.data.messages
          .filter((msg: Message) => new Date(msg.created_at).getTime() > latestMessageTime)
          .sort((a: Message, b: Message) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        if (newMessages.length > 0) {
          setMessages(prev => [...prev, ...newMessages]);
        }
      }
    } catch (err) {
      console.error('Error fetching new messages:', err);
    }
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !id) return;
    
    setSendingMessage(true);
    
    try {
      const response = await api.messages.sendMessage(id as string, newMessage);
      
      if (response.error) {
        setError(response.error);
      } else if (response.data?.message) {
        setMessages(prev => [...prev, response.data.message]);
        setNewMessage('');
      }
    } catch (err) {
      setError('Failed to send message');
      console.error(err);
    } finally {
      setSendingMessage(false);
    }
  };
  
  const getConversationTitle = (): string => {
    if (!conversation) return 'Loading...';
    
    if (conversation.title) {
      return conversation.title;
    }
    
    if (conversation.project_title) {
      return `Project: ${conversation.project_title}`;
    }
    
    if (conversation.participants && conversation.participants.length > 0) {
      const otherParticipants = conversation.participants.filter(p => p.id !== user?.id);
      
      return otherParticipants
        .map(p => p.display_name || p.email)
        .join(', ');
    }
    
    return 'Conversation';
  };
  
  const isOwnMessage = (message: Message): boolean => {
    return message.sender_id === user?.id;
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
      <div className="mb-6">
        <Link href="/dashboard/messages" className="text-primary-600 hover:text-primary-800">
          ← Back to Messages
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Conversation header */}
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold">{getConversationTitle()}</h1>
            
            {conversation?.project_title && conversation?.project_slug && (
              <Link
                href={`/projects/${conversation.project_slug}`}
                className="ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
              >
                View Project
              </Link>
            )}
          </div>
          
          {error && (
            <div className="mt-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}
        </div>
        
        {/* Messages */}
        <div className="p-4 h-[60vh] overflow-y-auto bg-gray-50">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mb-2"></div>
              <p className="text-gray-600">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
                >
                  {!isOwnMessage(message) && !message.is_system_message && (
                    <div className="flex-shrink-0 mr-3">
                      {message.sender.avatar_url ? (
                        <Image
                          src={message.sender.avatar_url}
                          alt={message.sender.display_name || message.sender.email}
                          width={36}
                          height={36}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-500 text-sm">
                            {(message.sender.display_name || message.sender.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className={`max-w-[70%] ${message.is_system_message ? 'mx-auto' : ''}`}>
                    {message.is_system_message ? (
                      <div className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm text-center">
                        {message.content}
                      </div>
                    ) : (
                      <>
                        <div
                          className={`px-4 py-2 rounded-lg ${
                            isOwnMessage(message)
                              ? 'bg-primary-600 text-white rounded-br-none'
                              : 'bg-gray-200 text-gray-800 rounded-bl-none'
                          }`}
                        >
                          {message.content}
                        </div>
                        <div
                          className={`text-xs text-gray-500 mt-1 ${
                            isOwnMessage(message) ? 'text-right' : 'text-left'
                          }`}
                        >
                          {!isOwnMessage(message) && (
                            <span className="font-medium mr-1">
                              {message.sender.display_name || message.sender.email}
                            </span>
                          )}
                          <span>{formatDate(message.created_at, true)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Message input */}
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={sendingMessage}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              disabled={sendingMessage || !newMessage.trim()}
            >
              {sendingMessage ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
