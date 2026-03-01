import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AssistantChatProps {
  className?: string;
  initialMessage?: string;
}

const AssistantChat: React.FC<AssistantChatProps> = ({ 
  className = '',
  initialMessage = "Hi! I'm your LumaLance assistant. I can help you with your projects, tasks, and provide recommendations. How can I assist you today?"
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: initialMessage }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingQueries, setRemainingQueries] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    // Add user message to chat
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/llm-assistant/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userMessage }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get response from assistant');
      }
      
      const data = await response.json();
      
      // Check for rate limit headers
      const remaining = response.headers.get('X-RateLimit-Remaining');
      if (remaining) {
        setRemainingQueries(parseInt(remaining, 10));
      }
      
      // Add assistant response to chat
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      console.error('Error querying assistant:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`assistant-chat flex flex-col h-full ${className}`}>
      <div className="chat-header bg-primary text-white p-4 rounded-t-lg">
        <h2 className="text-xl font-semibold">LumaLance Assistant</h2>
        {remainingQueries !== null && (
          <p className="text-xs opacity-80">
            {remainingQueries} queries remaining this hour
          </p>
        )}
      </div>
      
      <div className="chat-messages flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${
              message.role === 'user' 
                ? 'user-message ml-auto bg-blue-100 rounded-lg p-3 max-w-[80%]' 
                : 'assistant-message mr-auto bg-white border border-gray-200 rounded-lg p-3 max-w-[80%]'
            }`}
          >
            <ReactMarkdown className="prose prose-sm max-w-none">
              {message.content}
            </ReactMarkdown>
          </div>
        ))}
        
        {isLoading && (
          <div className="assistant-message mr-auto bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex space-x-2 items-center">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="error-message bg-red-100 text-red-700 p-3 rounded-lg">
            Error: {error}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="chat-input p-4 border-t border-gray-200 bg-white rounded-b-lg">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your projects or tasks..."
            disabled={isLoading}
            className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            {isLoading ? 'Thinking...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssistantChat;
