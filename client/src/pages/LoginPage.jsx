import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import FormField from "../components/FormField";
import SubmitButton from "../components/SubmitButton";
import { APP_NAME } from "../config";
import { compactErrors, validateEmail } from "../utils/validation";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((errs) => ({ ...errs, [name]: null }));
    setServerError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = compactErrors({
      email: validateEmail(form.email),
      password: form.password ? null : "Ingresá tu contraseña.",
    });
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setLoading(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate("/resumen", { replace: true });
    } catch (err) {
      setServerError(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Qué bueno verte de nuevo."
      subtitle={`Ingresá al tablero de ${APP_NAME}`}
      footer={
        <>
          ¿Todavía no tenés cuenta? <Link to="/registro">Registrate</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <div className="alert" role="alert">
            {serverError}
          </div>
        )}
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          autoFocus
        />
        <FormField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Tu contraseña"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
        />
        <SubmitButton loading={loading}>
          {loading ? "Ingresando…" : "Ingresar"}
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
