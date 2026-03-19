'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ProfileGetResponse, UserProfile } from '../../api/profile/route';

const PROFILE_FIELD_LIMITS = {
  firstName: 50,
  lastName: 50,
  displayName: 100,
  phone: 20,
  bio: 500,
} as const;

const PHONE_ALLOWED_CHARS_REGEX = /^[+\-()0-9]*$/;

const normalizePhoneInput = (value: string) => {
  return value.replace(/[^+\-()0-9]/g, '').slice(0, PROFILE_FIELD_LIMITS.phone);
};

const normalizePhoneForDisplay = (value: string | null | undefined) => {
  if (!value) return '';

  return normalizePhoneInput(value);
};

const normalizePhoneForStorage = (value: string | null | undefined) => {
  if (!value) return null;

  const normalizedPhone = normalizePhoneInput(value);
  return normalizedPhone === '' ? null : normalizedPhone;
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      const data: ProfileGetResponse = await response.json();

      if (response.ok && 'body' in data) {
        setProfile({
          ...data.body,
          phone: normalizePhoneForDisplay(data.body.phone),
        });
      } else if ('error' in data) {
        toast.error(data.error);
      } else {
        toast.error('Failed to load profile');
      }
    } catch (error) {
      toast.error('Error loading profile');
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      const normalizedPhone = normalizePhoneForStorage(profile.phone);

      if (normalizedPhone && !PHONE_ALLOWED_CHARS_REGEX.test(normalizedPhone)) {
        toast.error('Phone number can only contain +, -, (, ) and digits');
        return;
      }

      const payload = {
        name: profile.name || null,
        first_name: profile.first_name || null,
        last_name: profile.last_name || null,
        phone: normalizedPhone,
        bio: profile.bio || null,
      };

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const updatedProfile: UserProfile = await response.json();
        setProfile({
          ...updatedProfile,
          phone: normalizePhoneForDisplay(updatedProfile.phone),
        });
        toast.success('Profile updated successfully');
      } else {
        const errorResponse =
          typeof response.json === 'function' ? await response.json().catch(() => null) : null;
        const errorMessage =
          errorResponse && typeof errorResponse.error === 'string'
            ? errorResponse.error
            : 'Failed to update profile';
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('Error updating profile');
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof NonNullable<UserProfile>, value: string) => {
    if (!profile) return;

    if (field === 'phone') {
      const normalizedPhone = normalizePhoneForDisplay(value);
      setProfile({
        ...profile,
        phone: normalizedPhone,
      });
      return;
    }

    setProfile({
      ...profile,
      [field]: value || null,
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session || !profile) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal information and contact details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="first_name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  First Name
                </label>
                <Input
                  id="first_name"
                  type="text"
                  value={profile.first_name || ''}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="Enter your first name"
                  maxLength={PROFILE_FIELD_LIMITS.firstName}
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <Input
                  id="last_name"
                  type="text"
                  value={profile.last_name || ''}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Enter your last name"
                  maxLength={PROFILE_FIELD_LIMITS.lastName}
                />
              </div>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <Input
                id="name"
                type="text"
                value={profile.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your display name"
                maxLength={PROFILE_FIELD_LIMITS.displayName}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed. Contact support if you need to update it.
              </p>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <Input
                id="phone"
                type="tel"
                value={profile.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+358(0)123-456789"
                inputMode="tel"
                pattern="[+\-()0-9]*"
                maxLength={PROFILE_FIELD_LIMITS.phone}
              />
              <p className="text-xs text-gray-500 mt-1">
                Allowed characters: +, -, (, ) and digits.
              </p>
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                id="bio"
                rows={4}
                value={profile.bio || ''}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
                maxLength={PROFILE_FIELD_LIMITS.bio}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
