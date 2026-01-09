import { Bot, MessageSquare, Phone, Volume2, VolumeX } from 'lucide-react';

interface ChatHeaderProps {
  voiceMode: boolean;
  setVoiceMode: (value: boolean) => void;
  voiceOnlyMode: boolean;
  setVoiceOnlyMode: (value: boolean) => void;
}

export function ChatHeader({
  voiceMode,
  setVoiceMode,
  voiceOnlyMode,
  setVoiceOnlyMode,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center w-full justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: '#f1eefa',
              border: '2px solid #c4c8ee',
            }}
          >
            <Bot className="h-5 w-5" style={{ color: '#626edb' }} />
          </div>
          <div className="flex flex-col gap-0 justify-center">
            <h2 className="text-base font-semibold text-gray-900 leading-tight">
              AI Career Discussion
            </h2>
            <p className="text-xs text-gray-500 leading-tight">Online</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={() => setVoiceMode(!voiceMode)}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
            title={voiceMode ? 'Disable AI Voice' : 'Enable AI Voice'}
          >
            {voiceMode ? (
              <Volume2 className="h-4 w-4 text-gray-700" />
            ) : (
              <VolumeX className="h-4 w-4 text-gray-700" />
            )}
          </button>
          <button
            onClick={() => setVoiceOnlyMode(!voiceOnlyMode)}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
            title={voiceOnlyMode ? 'Switch to Chat' : 'Switch to Voice'}
          >
            {voiceOnlyMode ? (
              <MessageSquare className="h-4 w-4 text-gray-700" />
            ) : (
              <Phone className="h-4 w-4 text-gray-700" />
            )}
          </button>
        </div>
      </div>
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
        style={{ backgroundColor: '#10b981' }}
      ></div>
    </div>
  );
}
