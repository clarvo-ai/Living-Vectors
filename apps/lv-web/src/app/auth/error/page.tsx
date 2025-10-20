'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');

  const getErrorDetails = () => {
    switch (error) {
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          description: 'You do not have permission to access this application.',
          icon: AlertTriangle,
        };
      default:
        return {
          title: 'Authentication Error',
          description: 'An error occurred during authentication. Please try again.',
          icon: AlertTriangle,
        };
    }
  };

  const errorDetails = getErrorDetails();
  const IconComponent = errorDetails.icon;

  const handleReturnToSignIn = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <IconComponent className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            {errorDetails.title}
          </CardTitle>
          <CardDescription className="text-gray-600">{errorDetails.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleReturnToSignIn} className="w-full" variant="default">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AuthErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <AlertTriangle className="h-6 w-6 text-gray-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">Loading...</CardTitle>
          <CardDescription className="text-gray-600">
            Please wait while we load the error details.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<AuthErrorFallback />}>
      <AuthErrorContent />
    </Suspense>
  );
}
