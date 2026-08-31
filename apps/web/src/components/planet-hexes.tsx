export function PlanetHexes() {
  const hexes = Array.from({ length: 61 }, (_, index) => {
    const row = Math.floor(index / 9) - 3;
    const column = index % 9 - 4;
    const x = 200 + column * 38 + (row % 2) * 19;
    const y = 202 + row * 34;
    const distance = Math.hypot(column / 4.8, row / 4.1);
    const scale = Math.max(0.36, 1 - distance * 0.26);
    return { index, x, y, scale, opacity: Math.max(0.12, 1 - distance * 0.58) };
  });

  return (
    <div className="hex-sphere" aria-label="Living curved field of hexagon tiles">
      <svg viewBox="0 0 400 400" role="img" aria-hidden="true">
        <defs>
          <radialGradient id="sphere-glow">
            <stop offset="0" stopColor="#dfff34" stopOpacity=".34" />
            <stop offset=".62" stopColor="#dfff34" stopOpacity=".04" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <clipPath id="sphere-clip"><circle cx="200" cy="200" r="178" /></clipPath>
        </defs>
        <circle cx="200" cy="200" r="190" fill="url(#sphere-glow)" />
        <g clipPath="url(#sphere-clip)">
          {hexes.map(({ index, x, y, scale, opacity }) => (
            <g key={index} className="sphere-tile" style={{ "--delay": `${(index % 13) * -0.31}s` } as React.CSSProperties} transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
              <polygon points="0,-20 17.32,-10 17.32,10 0,20 -17.32,10 -17.32,-10" />
            </g>
          ))}
        </g>
      </svg>
      <span className="sphere-orbit" />
    </div>
  );
}
