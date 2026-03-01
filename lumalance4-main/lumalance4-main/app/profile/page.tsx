'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/AuthContext';
import api from '@/lib/api/client';
import ProtectedRoute from '@/lib/auth/ProtectedRoute';
import TelegramLinkAccount from '@/components/TelegramLinkAccount';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  displayName: string;
  bio: string;
  location: string;
  website: string;
}

export default function ProfilePage() {
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    displayName: '',
    bio: '',
    location: '',
    website: '',
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { user, updateUser } = useAuth();
  const router = useRouter();

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await api.users.getCurrentProfile();
        
        if (error) {
          setError('Failed to load profile data');
          return;
        }
        
        if (data) {
          setFormData({
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            displayName: data.display_name || '',
            bio: data.bio || '',
            location: data.location || '',
            website: data.website || '',
          });
          
          if (data.avatar_url) {
            setAvatarUrl(data.avatar_url);
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should not exceed 5MB');
        return;
      }
      
      // Check file type
      if (!file.type.match(/image\/(jpeg|jpg|png|gif)/)) {
        setError('Only image files (JPEG, PNG, GIF) are allowed');
        return;
      }
      
      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      setError(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Update profile
      const { data: profileData, error: profileError } = await api.users.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        displayName: formData.displayName || `${formData.firstName} ${formData.lastName}`,
        bio: formData.bio,
        location: formData.location,
        website: formData.website,
      });
      
      if (profileError) {
        setError(profileError);
        return;
      }
      
      // Upload avatar if selected
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        
        const { data: avatarData, error: avatarError } = await api.users.uploadAvatar(formData);
        
        if (avatarError) {
          setError(avatarError);
          return;
        }
        
        if (avatarData && avatarData.avatarUrl) {
          setAvatarUrl(avatarData.avatarUrl);
          setAvatarPreview(null);
          setAvatarFile(null);
        }
      }
      
      // Update user context if needed
      if (user) {
        const { data: userData } = await api.auth.me();
        if (userData) {
          updateUser(userData);
        }
      }
      
      setSuccess('Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-card shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-8 sm:p-10">
              <h1 className="text-3xl font-bold text-foreground">Your Profile</h1>
              
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="mt-4 bg-destructive/10 text-destructive p-3 rounded-md">
                      {error}
                    </div>
                  )}
                  
                  {success && (
                    <div className="mt-4 bg-green-100 text-green-800 p-3 rounded-md">
                      {success}
                    </div>
                  )}
                  
                  <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
                    {/* Avatar Section */}
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="relative h-32 w-32 rounded-full overflow-hidden bg-gray-200">
                        {avatarPreview ? (
                          <Image
                            src={avatarPreview}
                            alt="Avatar Preview"
                            fill
                            className="object-cover"
                          />
                        ) : avatarUrl ? (
                          <Image
                            src={avatarUrl}
                            alt="User Avatar"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full w-full bg-gray-200 text-gray-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        <label className="block text-sm font-medium">
                          Profile Picture
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-medium
                            file:bg-primary file:text-white
                            hover:file:bg-primary/90"
                        />
                        <p className="text-xs text-muted-foreground">
                          Recommended: Square image, max 5MB (JPEG, PNG, GIF)
                        </p>
                      </div>
                    </div>
                    
                    {/* Personal Information */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium">
                          First Name
                        </label>
                        <input
                          id="firstName"
                          name="firstName"
                          type="text"
                          required
                          className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                          value={formData.firstName}
                          onChange={handleChange}
                          disabled={isSubmitting}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium">
                          Last Name
                        </label>
                        <input
                          id="lastName"
                          name="lastName"
                          type="text"
                          required
                          className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                          value={formData.lastName}
                          onChange={handleChange}
                          disabled={isSubmitting}
                        />
                      </div>
                      
                      <div className="sm:col-span-2">
                        <label htmlFor="displayName" className="block text-sm font-medium">
                          Display Name
                        </label>
                        <input
                          id="displayName"
                          name="displayName"
                          type="text"
                          className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                          value={formData.displayName}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          placeholder={`${formData.firstName} ${formData.lastName}`}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Leave blank to use your full name
                        </p>
                      </div>
                      
                      <div className="sm:col-span-2">
                        <label htmlFor="bio" className="block text-sm font-medium">
                          Bio
                        </label>
                        <textarea
                          id="bio"
                          name="bio"
                          rows={4}
                          className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                          value={formData.bio}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          placeholder="Tell us about yourself..."
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="location" className="block text-sm font-medium">
                          Location
                        </label>
                        <input
                          id="location"
                          name="location"
                          type="text"
                          className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                          value={formData.location}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          placeholder="City, Country"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="website" className="block text-sm font-medium">
                          Website
                        </label>
                        <input
                          id="website"
                          name="website"
                          type="url"
                          className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                          value={formData.website}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                  
                  {/* Telegram Integration */}
                  <div className="mt-12">
                    <h2 className="text-xl font-semibold mb-4">Telegram Integration</h2>
                    <TelegramLinkAccount 
                      onSuccess={() => setSuccess('Telegram account linked successfully')}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
