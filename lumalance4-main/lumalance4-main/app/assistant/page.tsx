'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import AssistantChat from '@/components/llm-assistant/AssistantChat';
import { redirect } from 'next/navigation';

export default function AssistantPage() {
  const { user, loading } = useAuth();
  
  // Redirect to login if not authenticated
  if (!loading && !user) {
    redirect('/login?redirect=/assistant');
    return null;
  }
  
  return (
    <div className="assistant-page container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">LumaLance Assistant</h1>
        
        <div className="bg-white rounded-lg shadow-lg overflow-hidden h-[70vh]">
          <AssistantChat />
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          <p>
            The LumaLance Assistant can help you with:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Finding information about your projects</li>
            <li>Prioritizing your tasks</li>
            <li>Getting insights about specific projects</li>
            <li>Understanding platform features</li>
          </ul>
          <p className="mt-4">
            You have a limited number of queries per hour. The assistant uses AI to provide helpful information,
            but may occasionally provide incorrect information. Always verify important details.
          </p>
        </div>
      </div>
    </div>
  );
}
