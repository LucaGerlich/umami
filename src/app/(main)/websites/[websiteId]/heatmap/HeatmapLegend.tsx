export function HeatmapLegend() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12,
        userSelect: 'none',
      }}
    >
      <span>Low</span>
      <div
        style={{
          width: 120,
          height: 12,
          borderRadius: 4,
          background:
            'linear-gradient(to right, rgba(0,0,255,0.3), rgba(0,255,255,0.7), rgba(0,255,0,0.7), rgba(255,255,0,0.8), rgba(255,0,0,0.8))',
        }}
      />
      <span>High</span>
    </div>
  );
}
