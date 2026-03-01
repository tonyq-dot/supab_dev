// Core entity types
export interface User {
  id: number;
  email: string;
  profile?: UserProfile;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  website?: string;
  hourly_rate?: number;
  availability: 'available' | 'busy' | 'unavailable';
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  title: string;
  slug: string;
  description: string;
  client_id: number;
  category_id: number;
  status: ProjectStatus;
  budget_min?: number;
  budget_max?: number;
  deadline?: string;
  created_at: string;
  updated_at: string;
  client?: User;
  category?: Category;
  skills?: Skill[];
  proposals?: Proposal[];
  _count?: {
    proposals: number;
  };
}

export type ProjectStatus = 'open' | 'in_progress' | 'completed' | 'closed' | 'disputed';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: number;
  name: string;
  slug: string;
  category_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Proposal {
  id: number;
  project_id: number;
  freelancer_id: number;
  bid_amount: number;
  delivery_time: number;
  cover_letter: string;
  status: ProposalStatus;
  created_at: string;
  updated_at: string;
  project?: Project;
  freelancer?: User;
}

export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface Milestone {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  amount: number;
  deadline?: string;
  status: MilestoneStatus;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'disputed';

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  read_at?: string;
  created_at: string;
  updated_at: string;
  sender?: User;
}

export interface Conversation {
  id: number;
  project_id: number;
  client_id: number;
  freelancer_id: number;
  created_at: string;
  updated_at: string;
  project?: Project;
  client?: User;
  freelancer?: User;
  messages?: Message[];
  last_message?: Message;
}

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export type NotificationType = 
  | 'project_created'
  | 'proposal_received'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'milestone_completed'
  | 'message_received'
  | 'payment_received'
  | 'dispute_created';

export interface Review {
  id: number;
  project_id: number;
  reviewer_id: number;
  reviewee_id: number;
  rating: number;
  comment?: string;
  created_at: string;
  updated_at: string;
  reviewer?: User;
  reviewee?: User;
  project?: Project;
}

export interface Whiteboard {
  id: number;
  title: string;
  description?: string;
  owner_id: number;
  excalidraw_data: Record<string, any>;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  owner?: User;
  collaborators?: WhiteboardCollaborator[];
  project_elements?: WhiteboardProjectElement[];
  current_user_permission?: WhiteboardPermission;
}

export interface WhiteboardCollaborator {
  id: number;
  whiteboard_id: number;
  user_id: number;
  permission_level: WhiteboardPermission;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface WhiteboardProjectElement {
  id: number;
  whiteboard_id: number;
  project_id: number;
  excalidraw_element_id: string;
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
  project?: Project;
}

export type WhiteboardPermission = 'view' | 'edit' | 'admin' | 'owner';

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Form types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

export interface ProjectFormData {
  title: string;
  description: string;
  category_id: number;
  budget_min?: number;
  budget_max?: number;
  deadline?: string;
  skills: number[];
}

export interface ProposalFormData {
  bid_amount: number;
  delivery_time: number;
  cover_letter: string;
}

export interface ProfileFormData {
  first_name: string;
  last_name: string;
  bio?: string;
  location?: string;
  website?: string;
  hourly_rate?: number;
  availability: 'available' | 'busy' | 'unavailable';
}

export interface WhiteboardFormData {
  title: string;
  description?: string;
  is_public: boolean;
}

export interface WhiteboardUpdateData {
  title?: string;
  description?: string;
  excalidraw_data?: Record<string, any>;
  is_public?: boolean;
}

// Filter types
export interface ProjectFilters {
  status?: ProjectStatus;
  category_id?: number;
  budget_min?: number;
  budget_max?: number;
  search?: string;
  skills?: number[];
  sort?: 'newest' | 'oldest' | 'budget_asc' | 'budget_desc';
  page?: number;
  limit?: number;
}

export interface ProposalFilters {
  status?: ProposalStatus;
  project_id?: number;
  freelancer_id?: number;
  page?: number;
  limit?: number;
}

// Auth types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginResponse {
  user: User;
  token: string;
  expires_at: string;
}

// Component prop types
export interface ProjectCardProps {
  project: Project;
  showActions?: boolean;
  onPropose?: (project: Project) => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

export interface ProposalCardProps {
  proposal: Proposal;
  showActions?: boolean;
  onAccept?: (proposal: Proposal) => void;
  onReject?: (proposal: Proposal) => void;
  onWithdraw?: (proposal: Proposal) => void;
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Error types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: ValidationError[];
} 