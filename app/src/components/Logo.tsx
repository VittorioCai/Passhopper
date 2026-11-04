/** Station P logo (1a), simplified form for small sizes. See design/logo/. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#00A37A" />
      <g transform="translate(6.4 6.4) scale(.8)">
        <path
          d="M19 54V15h12.5a11.5 11.5 0 0 1 0 23H19"
          fill="none"
          stroke="#fff"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="19" cy="38" r="5.5" fill="#00A37A" stroke="#fff" strokeWidth="4" />
        <circle cx="50" cy="11.5" r="8.5" fill="#FFD43B" />
      </g>
    </svg>
  );
}
