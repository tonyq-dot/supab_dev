import { z } from 'zod';

// Project creation/edit form validation
export const projectSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .min(10, 'Title must be at least 10 characters')
    .max(100, 'Title must be less than 100 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .min(50, 'Description must be at least 50 characters')
    .max(5000, 'Description must be less than 5000 characters'),
  category_id: z
    .number({
      required_error: 'Please select a category',
      invalid_type_error: 'Please select a valid category',
    })
    .min(1, 'Please select a category'),
  budget_min: z
    .number({
      invalid_type_error: 'Budget must be a number',
    })
    .min(10, 'Minimum budget must be at least $10')
    .optional(),
  budget_max: z
    .number({
      invalid_type_error: 'Budget must be a number',
    })
    .min(10, 'Maximum budget must be at least $10')
    .optional(),
  deadline: z
    .string()
    .optional()
    .refine((date) => {
      if (!date) return true;
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    }, {
      message: 'Deadline must be in the future',
    }),
  skills: z
    .array(z.number())
    .min(1, 'Select at least one skill')
    .max(10, 'Maximum 10 skills allowed'),
}).refine((data) => {
  if (data.budget_min && data.budget_max) {
    return data.budget_max >= data.budget_min;
  }
  return true;
}, {
  message: 'Maximum budget must be greater than or equal to minimum budget',
  path: ['budget_max'],
});

// Project filter validation
export const projectFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'completed', 'closed', 'disputed']).optional(),
  category_id: z.number().optional(),
  budget_min: z.number().min(0).optional(),
  budget_max: z.number().min(0).optional(),
  skills: z.array(z.number()).optional(),
  sort: z.enum(['newest', 'oldest', 'budget_asc', 'budget_desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

// Milestone creation/edit form validation
export const milestoneSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be less than 100 characters'),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .min(1, 'Amount must be at least $1'),
  deadline: z
    .string()
    .optional()
    .refine((date) => {
      if (!date) return true;
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    }, {
      message: 'Deadline must be in the future',
    }),
});

// Types derived from schemas
export type ProjectFormData = z.infer<typeof projectSchema>;
export type ProjectFilterData = z.infer<typeof projectFilterSchema>;
export type MilestoneFormData = z.infer<typeof milestoneSchema>; 