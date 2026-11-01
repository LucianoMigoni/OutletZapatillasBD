import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import FormField from "../components/FormField";
import SubmitButton from "../components/SubmitButton";
import { APP_NAME, PASSWORD_MIN_LENGTH } from "../config";
import {
  compactErrors,
  validateEmail,
  validateName,
  validateNewPassword,
} from "../utils/validation";

const EMPTY_FORM = {
  nombre: "",
  apellido: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
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
      nombre: validateName(form.nombre, "nombre"),
      apellido: validateName(form.apellido, "apellido"),
      email: validateEmail(form.email),
      password: validateNewPassword(form.password),
      confirmPassword:
        form.confirmPassword !== form.password
          ? "Las contraseñas no coinciden."
          : null,
    });
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setLoading(true);
    try {
      await register({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate("/resumen", { replace: true });
    } catch (err) {
      setServerError(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Creá tu cuenta."
      subtitle={`Accedé al tablero de ${APP_NAME}`}
      footer={
        <>
          ¿Ya tenés cuenta? <Link to="/login">Ingresá</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <div className="alert" role="alert">
            {serverError}
          </div>
        )}
        <div className="field-row">
          <FormField
            label="Nombre"
            name="nombre"
            autoComplete="given-name"
            placeholder="Juan"
            value={form.nombre}
            onChange={handleChange}
            error={errors.nombre}
            autoFocus
          />
          <FormField
            label="Apellido"
            name="apellido"
            autoComplete="family-name"
            placeholder="Pérez"
            value={form.apellido}
            onChange={handleChange}
            error={errors.apellido}
          />
        </div>
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
        />
        <FormField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder={`Al menos ${PASSWORD_MIN_LENGTH} caracteres`}
          hint="Combiná letras y números."
          value={form.password}
          onChange={handleChange}
          error={errors.password}
        />
        <FormField
          label="Repetir contraseña"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Repetí la contraseña"
          value={form.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />
        <SubmitButton loading={loading}>
          {loading ? "Creando cuenta…" : "Crear cuenta"}
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
