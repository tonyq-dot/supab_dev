import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import ReactMarkdown from 'react-markdown';

interface TaskRecommendationsProps {
  className?: string;
}

const TaskRecommendations: React.FC<TaskRecommendationsProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/llm-assistant/recommendations');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get recommendations');
      }
      
      const data = await response.json();
      setRecommendations(data.recommendations);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user]);

  return (
    <div className={`task-recommendations bg-white rounded-lg shadow-md ${className}`}>
      <div className="recommendations-header bg-primary text-white p-4 rounded-t-lg flex justify-between items-center">
        <h3 className="text-lg font-semibold">Task Recommendations</h3>
        <button 
          onClick={fetchRecommendations} 
          disabled={isLoading}
          className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded disabled:opacity-50"
        >
          Refresh
        </button>
      </div>
      
      <div className="recommendations-content p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="loader flex space-x-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        ) : error ? (
          <div className="error-message bg-red-100 text-red-700 p-3 rounded-lg">
            Error: {error}
            <button 
              onClick={fetchRecommendations}
              className="ml-2 text-red-700 underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{recommendations}</ReactMarkdown>
            </div>
            
            {lastUpdated && (
              <div className="text-xs text-gray-500 mt-4 text-right">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TaskRecommendations;
