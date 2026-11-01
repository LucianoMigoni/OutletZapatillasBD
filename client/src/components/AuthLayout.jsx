import Logo from "./Logo";

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-logo">
          <Logo />
        </div>
        <h1 className="auth-title">
          {title}
          <span>{subtitle}</span>
        </h1>
        {children}
        {footer && <div className="auth-footer">{footer}</div>}
      </section>
      <p className="auth-note">
        <LockIcon /> Tus datos viajan cifrados y las contraseñas se guardan
        hasheadas.
      </p>
    </main>
  );
}

function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
