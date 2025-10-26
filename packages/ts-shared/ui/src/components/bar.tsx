'use client';

interface BarProps {
  value: number;
}

export function Bar({ value }: BarProps) {
  return (
    <div className="w-full h-full relative min-h-[200px]">
      <div
        className="absolute bottom-0 w-full bg-blue-500 hover:bg-blue-600 transition-all duration-200 rounded-t"
        style={{ height: `${Math.max(value, 1)}%` }}
      />
    </div>
  );
}
