'use client'

interface GridBackgroundProps {
  gridSize: number
  zoom: number
}

export function GridBackground({ gridSize, zoom }: GridBackgroundProps) {
  const effectiveGridSize = gridSize * zoom

  return (
    <div
      className="absolute inset-0 opacity-20 pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(to right, #e5e7eb 1px, transparent 1px),
          linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
        `,
        backgroundSize: `${effectiveGridSize}px ${effectiveGridSize}px`,
      }}
    />
  )
}