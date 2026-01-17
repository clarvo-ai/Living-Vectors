import { useTranscriptions } from '@livekit/components-react';
import { useEffect, useRef } from 'react';

export function TranscriptionDisplay() {
  const transcriptions = useTranscriptions();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptions]);

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg max-w-md max-h-48 overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Live Transcription</h3>
      <div className="space-y-2">
        {transcriptions.length === 0 ? (
          <p className="text-xs text-gray-500 italic">Waiting for transcription...</p>
        ) : (
          transcriptions.map((transcription, idx) => {
            // Detect if this is user or agent based on participantInfo
            const isAgent = transcription.participantInfo?.identity
              ?.toLowerCase()
              .includes('agent');
            return (
              <div
                key={idx}
                className={`text-sm p-2 rounded ${
                  !isAgent ? 'bg-blue-100 text-blue-900 text-right' : 'bg-gray-200 text-gray-900'
                } ${!transcription.streamInfo?.isFinal ? 'opacity-60 italic' : ''}`}
              >
                <span className="font-semibold text-xs mr-1">{!isAgent ? 'You:' : 'Agent:'}</span>
                {transcription.text}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
