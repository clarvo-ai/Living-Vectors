import { Button } from '@/components/ui/button';
import { Mic, Square } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  disabled?: boolean;
}

export function VoiceRecorder({
  onRecordingComplete,
  onRecordingStateChange,
  disabled,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onRecordingCompleteRef = useRef(onRecordingComplete);
  const onRecordingStateChangeRef = useRef(onRecordingStateChange);

  useEffect(() => {
    onRecordingCompleteRef.current = onRecordingComplete;
    onRecordingStateChangeRef.current = onRecordingStateChange;
  }, [onRecordingComplete, onRecordingStateChange]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        console.log('Recording stopped, blob size:', blob.size);
        onRecordingCompleteRef.current(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      onRecordingStateChangeRef.current?.(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      onRecordingStateChangeRef.current?.(false);
    }
  }, [isRecording]);

  useEffect(() => {
    if (disabled && isRecording) {
      stopRecording();
    }
  }, [disabled, isRecording, stopRecording]);

  return (
    <Button
      variant={isRecording ? 'destructive' : 'secondary'}
      size="icon"
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled}
      type="button"
      className="rounded-full flex-shrink-0 border-2 h-12 w-12 p-0 self-center"
      style={{
        background: isRecording
          ? 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #dc2626 0%, #991b1b 100%) border-box'
          : 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%) border-box',
        borderColor: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
