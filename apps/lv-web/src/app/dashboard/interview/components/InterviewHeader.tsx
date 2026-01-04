import { ArrowLeft } from 'lucide-react';

interface InterviewHeaderProps {
  onEndInterviewClick: () => void;
  userName?: string | null;
}

export function InterviewHeader({ onEndInterviewClick, userName }: InterviewHeaderProps) {
  return (
    <header
      className="bg-white"
      style={{
        boxShadow: `0 4px 100px 0 var(--shadow-blue-medium)`,
      }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center">
            <button
              onClick={onEndInterviewClick}
              className="flex items-center hover:underline focus:outline-none text-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="text-sm">End interview</span>
            </button>
          </div>
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-700">
              Logged in as{' '}
              <span className="font-light text-gray-600 text-lg">{userName}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
