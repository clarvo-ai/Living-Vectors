'use client';

import { Briefcase } from 'lucide-react';

export default function OpportunitiesPage() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="text-center">
        <Briefcase className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Opportunities</h2>
        <p className="text-gray-600">Your career opportunities will appear here</p>
      </div>
    </div>
  );
}
