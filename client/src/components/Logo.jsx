export default function Logo({ size = 44 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="12" fill="var(--accent)" />
      <path
        d="M9 30.5c0-1.6 1.1-2.8 2.7-3l7.6-1.1 4.8-7.7c.6-.9 1.8-1.2 2.7-.6l1.7 1.1c.8.5 1 1.5.5 2.2l-.9 1.4c1.9 1.2 4.4 2 7 2.3 1.7.2 2.9 1.6 2.9 3.3v2.1H9z"
        fill="#fff"
      />
      <rect
        x="9"
        y="33.5"
        width="30"
        height="3.6"
        rx="1.8"
        fill="var(--accent-soft)"
      />
      <path
        d="M21.5 24.2l2 1.3M23.4 21.4l2 1.3"
        stroke="var(--accent)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
