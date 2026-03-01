const { query } = require('../database/connection');

/**
 * Notification Service
 * Handles creating and managing in-app notifications
 */

class NotificationService {
  /**
   * Create a notification for a user
   */
  static async createNotification(userId, title, message, type = 'info', relatedType = null, relatedId = null) {
    try {
      const result = await query(
        `INSERT INTO notifications (user_id, title, message, type, related_type, related_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, title, message, type, relatedType, relatedId]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create notification for new proposal
   */
  static async notifyNewProposal(projectId, proposalId, freelancerName, projectTitle) {
    try {
      // Get project owner
      const projectResult = await query(
        'SELECT client_id FROM projects WHERE id = $1',
        [projectId]
      );
      
      if (projectResult.rows.length === 0) {
        throw new Error('Project not found');
      }
      
      const clientId = projectResult.rows[0].client_id;
      
      // Create notification for project owner
      await this.createNotification(
        clientId,
        'New Proposal Received',
        `${freelancerName} has submitted a proposal for "${projectTitle}"`,
        'proposal',
        'proposal',
        proposalId
      );
      
      return true;
    } catch (error) {
      console.error('Error creating proposal notification:', error);
      return false;
    }
  }

  /**
   * Create notification for proposal status change
   */
  static async notifyProposalStatusChange(proposalId, status, clientName, projectTitle) {
    try {
      // Get proposal details
      const proposalResult = await query(
        'SELECT freelancer_id FROM proposals WHERE id = $1',
        [proposalId]
      );
      
      if (proposalResult.rows.length === 0) {
        throw new Error('Proposal not found');
      }
      
      const freelancerId = proposalResult.rows[0].freelancer_id;
      
      let title, message;
      if (status === 'accepted') {
        title = 'Proposal Accepted!';
        message = `Your proposal for "${projectTitle}" has been accepted by ${clientName}`;
      } else if (status === 'rejected') {
        title = 'Proposal Update';
        message = `Your proposal for "${projectTitle}" was not selected`;
      } else {
        return false; // Don't notify for other status changes
      }
      
      // Create notification for freelancer
      await this.createNotification(
        freelancerId,
        title,
        message,
        'proposal',
        'proposal',
        proposalId
      );
      
      return true;
    } catch (error) {
      console.error('Error creating proposal status notification:', error);
      return false;
    }
  }

  /**
   * Create notification for new message
   */
  static async notifyNewMessage(conversationId, messageId, senderName, messagePreview) {
    try {
      // Get conversation participants (excluding sender)
      const participantsResult = await query(
        'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
        [conversationId]
      );
      
      if (participantsResult.rows.length === 0) {
        throw new Error('No participants found');
      }
      
      // Create notifications for all participants except sender
      for (const participant of participantsResult.rows) {
        await this.createNotification(
          participant.user_id,
          `New Message from ${senderName}`,
          messagePreview.length > 50 ? `${messagePreview.substring(0, 50)}...` : messagePreview,
          'message',
          'message',
          messageId
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error creating message notification:', error);
      return false;
    }
  }

  /**
   * Create notification for milestone status change
   */
  static async notifyMilestoneStatusChange(milestoneId, status, milestoneTitle, projectTitle, updatedBy) {
    try {
      // Get milestone details
      const milestoneResult = await query(
        `SELECT m.project_id, p.client_id, pa.freelancer_id
         FROM milestones m
         JOIN projects p ON m.project_id = p.id
         LEFT JOIN project_assignments pa ON p.id = pa.project_id
         WHERE m.id = $1`,
        [milestoneId]
      );
      
      if (milestoneResult.rows.length === 0) {
        throw new Error('Milestone not found');
      }
      
      const { project_id, client_id, freelancer_id } = milestoneResult.rows[0];
      
      let title, message;
      if (status === 'completed') {
        title = 'Milestone Completed';
        message = `Milestone "${milestoneTitle}" for project "${projectTitle}" has been completed`;
      } else if (status === 'in-progress') {
        title = 'Milestone Started';
        message = `Work has started on milestone "${milestoneTitle}" for project "${projectTitle}"`;
      } else {
        return false; // Don't notify for other status changes
      }
      
      // Notify both client and freelancer
      const notifications = [];
      
      if (client_id) {
        notifications.push(
          this.createNotification(
            client_id,
            title,
            message,
            'milestone',
            'milestone',
            milestoneId
          )
        );
      }
      
      if (freelancer_id) {
        notifications.push(
          this.createNotification(
            freelancer_id,
            title,
            message,
            'milestone',
            'milestone',
            milestoneId
          )
        );
      }
      
      await Promise.all(notifications);
      
      return true;
    } catch (error) {
      console.error('Error creating milestone notification:', error);
      return false;
    }
  }

  /**
   * Create notification for project status change
   */
  static async notifyProjectStatusChange(projectId, status, projectTitle, changedBy) {
    try {
      // Get project participants
      const projectResult = await query(
        `SELECT client_id, pa.freelancer_id
         FROM projects p
         LEFT JOIN project_assignments pa ON p.id = pa.project_id
         WHERE p.id = $1`,
        [projectId]
      );
      
      if (projectResult.rows.length === 0) {
        throw new Error('Project not found');
      }
      
      const { client_id, freelancer_id } = projectResult.rows[0];
      
      let title, message;
      if (status === 'in-progress') {
        title = 'Project Started';
        message = `Project "${projectTitle}" is now in progress`;
      } else if (status === 'completed') {
        title = 'Project Completed';
        message = `Project "${projectTitle}" has been completed`;
      } else if (status === 'cancelled') {
        title = 'Project Cancelled';
        message = `Project "${projectTitle}" has been cancelled`;
      } else {
        return false; // Don't notify for other status changes
      }
      
      // Notify both client and freelancer
      const notifications = [];
      
      if (client_id) {
        notifications.push(
          this.createNotification(
            client_id,
            title,
            message,
            'project',
            'project',
            projectId
          )
        );
      }
      
      if (freelancer_id) {
        notifications.push(
          this.createNotification(
            freelancer_id,
            title,
            message,
            'project',
            'project',
            projectId
          )
        );
      }
      
      await Promise.all(notifications);
      
      return true;
    } catch (error) {
      console.error('Error creating project status notification:', error);
      return false;
    }
  }
}

module.exports = NotificationService; 