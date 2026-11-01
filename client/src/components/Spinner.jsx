export default function Spinner({ label = "Cargando…" }) {
  return (
    <div className="spinner-page" role="status">
      <span className="spinner" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
