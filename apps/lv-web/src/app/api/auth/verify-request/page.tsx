import { Card } from '@repo/ui/components/card';

const VerifyRequest = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md p-8">
        <h1 className="mb-4 text-2xl font-bold">Development Mode</h1>
        <p className="mb-2 text-gray-600">Check your terminal for a sign-in URL</p>
        <p className="text-gray-600">Paste the URL in your browser to continue</p>
      </Card>
    </div>
  );
};

export default VerifyRequest;
