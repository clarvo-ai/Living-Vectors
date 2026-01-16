interface ConnectionLinesProps {
  svgLines: { x1: number; y1: number; x2: number; y2: number; messageId: string }[];
  svgContainerRef: React.RefObject<SVGSVGElement>;
}

export function ConnectionLines({ svgLines, svgContainerRef }: ConnectionLinesProps) {
  return (
    <svg
      ref={svgContainerRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {svgLines.map((line, idx) => {
        // Calculate control points for a smooth curve
        const midX = (line.x1 + line.x2) / 2;
        const path = `M ${line.x2} ${line.y2} C ${midX} ${line.y2}, ${midX} ${line.y1}, ${line.x1} ${line.y1}`;

        return (
          <g key={`${line.messageId}-${idx}`}>
            <path
              d={path}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="2"
              strokeDasharray="6 4"
              className="transition-opacity duration-300"
            />
            {/* Small dot at message end */}
            <circle cx={line.x2} cy={line.y2} r="4" fill="#10b981" opacity="0.6" />
          </g>
        );
      })}
    </svg>
  );
}
