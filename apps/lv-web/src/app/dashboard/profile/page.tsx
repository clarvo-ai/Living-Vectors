'use client';

import { User } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="text-center">
        <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Profile</h2>
        <p className="text-gray-600">Your profile settings will appear here</p>
      </div>
    </div>
  );
}
