'use client';

import * as React from 'react';
import { useForm, UseFormReturn, FieldValues, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '@/lib/utils';

// Generic form context
interface FormContextValue<T extends FieldValues> {
  form: UseFormReturn<T>;
}

const FormContext = React.createContext<FormContextValue<any> | null>(null);

// Generic form component
interface FormProps<T extends FieldValues> {
  schema: z.ZodSchema<T>;
  onSubmit: SubmitHandler<T>;
  defaultValues?: Partial<T>;
  children: React.ReactNode;
  className?: string;
}

export function Form<T extends FieldValues>({
  schema,
  onSubmit,
  defaultValues,
  children,
  className,
}: FormProps<T>) {
  const form = useForm<T>({
    // ✅ FIX: Type assertion to resolve zodResolver compatibility issue
    resolver: zodResolver(schema as any),
    // ✅ FIX: Type assertion for defaultValues compatibility
    defaultValues: defaultValues as any,
  });

  return (
    <FormContext.Provider value={{ form }}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('space-y-6', className)}
      >
        {children}
      </form>
    </FormContext.Provider>
  );
}

// Hook to use form context
export function useFormContext<T extends FieldValues>() {
  const context = React.useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a Form component');
  }
  return context as FormContextValue<T>;
}

// Form field component
interface FormFieldProps {
  name: string;
  label?: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function FormField({
  name,
  label,
  type = 'text',
  placeholder,
  disabled,
  className,
  children,
}: FormFieldProps) {
  const { form } = useFormContext();
  const error = form.formState.errors[name]?.message as string;

  if (children) {
    return (
      <div className={cn('space-y-2', className)}>
        {label && (
          <label htmlFor={name} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        {React.cloneElement(children as React.ReactElement, {
          id: name,
          ...form.register(name),
          disabled: disabled || form.formState.isSubmitting,
        })}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Input
        id={name}
        label={label}
        type={type}
        placeholder={placeholder}
        disabled={disabled || form.formState.isSubmitting}
        error={error}
        {...form.register(name)}
      />
    </div>
  );
}

// Form textarea component
interface FormTextareaProps {
  name: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
}

export function FormTextarea({
  name,
  label,
  placeholder,
  disabled,
  rows = 4,
  className,
}: FormTextareaProps) {
  const { form } = useFormContext();
  const error = form.formState.errors[name]?.message as string;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <textarea
        id={name}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled || form.formState.isSubmitting}
        className={cn(
          'w-full px-3 py-2 bg-background border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus:ring-destructive'
        )}
        {...form.register(name)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// Form select component
interface FormSelectProps {
  name: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormSelect({
  name,
  label,
  placeholder,
  disabled,
  className,
  children,
}: FormSelectProps) {
  const { form } = useFormContext();
  const error = form.formState.errors[name]?.message as string;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <select
        id={name}
        disabled={disabled || form.formState.isSubmitting}
        className={cn(
          'w-full px-3 py-2 bg-background border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus:ring-destructive'
        )}
        {...form.register(name)}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// Form submit button
interface FormSubmitProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function FormSubmit({
  children,
  variant = 'default',
  size = 'default',
  className,
}: FormSubmitProps) {
  const { form } = useFormContext();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      loading={form.formState.isSubmitting}
      disabled={form.formState.isSubmitting}
      className={className}
    >
      {children}
    </Button>
  );
}

// Form error display
interface FormErrorProps {
  name?: string;
  className?: string;
}

export function FormError({ name, className }: FormErrorProps) {
  const { form } = useFormContext();
  
  if (name) {
    const error = form.formState.errors[name]?.message as string;
    if (!error) return null;
    
    return (
      <p className={cn('text-sm text-destructive', className)}>
        {error}
      </p>
    );
  }

  // Display general form errors
  const errors = Object.values(form.formState.errors).filter(Boolean);
  if (errors.length === 0) return null;

  return (
    <div className={cn('space-y-1', className)}>
      {errors.map((error, index) =>
        error?.message ? (
          <p key={index} className="text-sm text-destructive">
            {error.message as string}
          </p>
        ) : null
      )}
    </div>
  );
} 