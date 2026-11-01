export default function SubmitButton({ loading, children }) {
  return (
    <button
      type="submit"
      className="btn-primary"
      disabled={loading}
      aria-busy={loading}
    >
      {loading && <span className="spinner spinner-sm" aria-hidden="true" />}
      {children}
    </button>
  );
}
