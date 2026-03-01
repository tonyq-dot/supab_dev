'use client';

import * as React from 'react';
import { projectSchema, type ProjectFormData } from '@/lib/validations/project';
import { Form, FormField, FormTextarea, FormSelect, FormSubmit, FormError } from './Form';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface ProjectFormProps {
  onSubmit: (data: ProjectFormData) => Promise<void>;
  defaultValues?: Partial<ProjectFormData>;
  categories?: { id: number; name: string }[];
  skills?: { id: number; name: string }[];
  isEditing?: boolean;
}

export function ProjectForm({
  onSubmit,
  defaultValues,
  categories = [],
  skills = [],
  isEditing = false,
}: ProjectFormProps) {
  const handleSubmit = async (data: ProjectFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? 'Edit Project' : 'Create New Project'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form
          schema={projectSchema}
          onSubmit={handleSubmit}
          defaultValues={defaultValues}
        >
          <FormField
            name="title"
            label="Project Title"
            placeholder="Enter a clear, descriptive title for your project"
          />

          <FormTextarea
            name="description"
            label="Project Description"
            placeholder="Describe your project in detail. Include requirements, expectations, and any specific instructions."
            rows={6}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              name="category_id"
              label="Category"
              placeholder="Select a category"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </FormSelect>

            <FormField
              name="deadline"
              label="Deadline (Optional)"
              type="date"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="budget_min"
              label="Minimum Budget (Optional)"
              type="number"
              placeholder="0"
            />

            <FormField
              name="budget_max"
              label="Maximum Budget (Optional)"
              type="number"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Required Skills
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto border border-input rounded-md p-3">
              {skills.map((skill) => (
                <label key={skill.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value={skill.id}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                    // Note: This would need custom handling in the form context
                  />
                  <span className="text-sm">{skill.name}</span>
                </label>
              ))}
            </div>
            <FormError name="skills" />
          </div>

          <FormError />

          <div className="flex justify-end space-x-4">
            <FormSubmit>
              {isEditing ? 'Update Project' : 'Create Project'}
            </FormSubmit>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
} 