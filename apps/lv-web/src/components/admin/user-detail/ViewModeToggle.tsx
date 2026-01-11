interface ViewModeToggleProps {
  viewMode: 'list' | 'visual';
  onViewModeChange: (mode: 'list' | 'visual') => void;
}

export function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <div className="mt-6 flex items-center gap-4">
      <span className="text-sm font-medium text-muted-foreground">View:</span>
      <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
        <button
          onClick={() => onViewModeChange('list')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
            viewMode === 'list'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            List
          </span>
        </button>
        <button
          onClick={() => onViewModeChange('visual')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
            viewMode === 'visual'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            Visual
          </span>
        </button>
      </div>
      {viewMode === 'visual' && (
        <span className="text-xs text-muted-foreground">
          Click a learning card to see connected messages
        </span>
      )}
    </div>
  );
}
