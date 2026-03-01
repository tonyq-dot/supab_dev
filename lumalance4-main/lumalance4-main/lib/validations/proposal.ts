import { z } from 'zod';

// Proposal creation/edit form validation
export const proposalSchema = z.object({
  bid_amount: z
    .number({
      required_error: 'Bid amount is required',
      invalid_type_error: 'Bid amount must be a number',
    })
    .min(1, 'Bid amount must be at least $1')
    .max(1000000, 'Bid amount cannot exceed $1,000,000'),
  delivery_time: z
    .number({
      required_error: 'Delivery time is required',
      invalid_type_error: 'Delivery time must be a number',
    })
    .min(1, 'Delivery time must be at least 1 day')
    .max(365, 'Delivery time cannot exceed 365 days'),
  cover_letter: z
    .string()
    .min(1, 'Cover letter is required')
    .min(50, 'Cover letter must be at least 50 characters')
    .max(2000, 'Cover letter must be less than 2000 characters'),
});

// Proposal filter validation
export const proposalFilterSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'withdrawn']).optional(),
  project_id: z.number().optional(),
  freelancer_id: z.number().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

// Proposal response validation (for accepting/rejecting)
export const proposalResponseSchema = z.object({
  action: z.enum(['accept', 'reject']),
  message: z
    .string()
    .max(500, 'Message must be less than 500 characters')
    .optional(),
});

// Types derived from schemas
export type ProposalFormData = z.infer<typeof proposalSchema>;
export type ProposalFilterData = z.infer<typeof proposalFilterSchema>;
export type ProposalResponseData = z.infer<typeof proposalResponseSchema>; 