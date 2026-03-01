/**
 * Messages API Client
 * 
 * This file contains functions for interacting with the messages API
 */

import { apiRequest } from './client';

/**
 * Get all conversations for the authenticated user
 */
export const getConversations = async () => {
  return apiRequest('/messages/conversations');
};

/**
 * Get a specific conversation by ID
 */
export const getConversation = async (conversationId: string) => {
  return apiRequest(`/messages/conversations/${conversationId}`);
};

/**
 * Get messages for a specific conversation
 */
export const getMessages = async (conversationId: string, limit = 50, offset = 0) => {
  return apiRequest(`/messages/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`);
};

/**
 * Create a new conversation
 */
export const createConversation = async (data: {
  title?: string;
  participantIds: number[];
  projectId?: number;
  isGroup?: boolean;
}) => {
  return apiRequest('/messages/conversations', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

/**
 * Send a message to a conversation
 */
export const sendMessage = async (conversationId: string, content: string) => {
  return apiRequest(`/messages/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content })
  });
};

/**
 * Mark a conversation as read
 */
export const markConversationAsRead = async (conversationId: string) => {
  return apiRequest(`/messages/conversations/${conversationId}/read`, {
    method: 'POST'
  });
};

/**
 * Get unread message count for the authenticated user
 */
export const getUnreadCount = async () => {
  return apiRequest('/messages/unread-count');
};

/**
 * Create a conversation with a project client
 */
export const createProjectConversation = async (projectId: number, clientId: number) => {
  return createConversation({
    participantIds: [clientId],
    projectId,
    isGroup: false
  });
};

/**
 * Create a conversation with a freelancer
 */
export const createFreelancerConversation = async (freelancerId: number) => {
  return createConversation({
    participantIds: [freelancerId],
    isGroup: false
  });
};

export default {
  getConversations,
  getConversation,
  getMessages,
  createConversation,
  sendMessage,
  markConversationAsRead,
  getUnreadCount,
  createProjectConversation,
  createFreelancerConversation
};
