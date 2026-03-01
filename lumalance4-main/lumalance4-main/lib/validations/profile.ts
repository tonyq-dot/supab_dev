import { z } from 'zod';

// User profile form validation
export const profileSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters'),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters'),
  bio: z
    .string()
    .max(1000, 'Bio must be less than 1000 characters')
    .optional(),
  location: z
    .string()
    .max(100, 'Location must be less than 100 characters')
    .optional(),
  website: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')), // Allow empty string
  hourly_rate: z
    .number({
      invalid_type_error: 'Hourly rate must be a number',
    })
    .min(1, 'Hourly rate must be at least $1')
    .max(1000, 'Hourly rate cannot exceed $1000')
    .optional(),
  availability: z.enum(['available', 'busy', 'unavailable'], {
    required_error: 'Please select your availability status',
  }),
});

// Skills update validation
export const skillsUpdateSchema = z.object({
  skills: z
    .array(z.number())
    .min(1, 'Select at least one skill')
    .max(20, 'Maximum 20 skills allowed'),
});

// Avatar upload validation
export const avatarUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, 'File size must be less than 5MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'Only JPEG, PNG, and WebP images are allowed'
    ),
});

// Contact information validation
export const contactInfoSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')), // Allow empty string
  linkedin: z
    .string()
    .url('Please enter a valid LinkedIn URL')
    .optional()
    .or(z.literal('')), // Allow empty string
  github: z
    .string()
    .url('Please enter a valid GitHub URL')
    .optional()
    .or(z.literal('')), // Allow empty string
});

// Types derived from schemas
export type ProfileFormData = z.infer<typeof profileSchema>;
export type SkillsUpdateData = z.infer<typeof skillsUpdateSchema>;
export type AvatarUploadData = z.infer<typeof avatarUploadSchema>;
export type ContactInfoData = z.infer<typeof contactInfoSchema>; 