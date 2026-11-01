import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

// Ejecuta una llamada a la API cada vez que cambian sus dependencias. Mientras recarga conserva los datos anteriores (la pantalla no
// "salta") e ignora las respuestas viejas si se cambió un filtro antes de que llegaran.
export function useApi(cargar, deps) {
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState({
    clave: null,
    data: null,
    error: null,
  });
  const clave = `${JSON.stringify(deps)}#${intento}`;

  // La función cambia en cada render: se guarda la última para usarla en el efecto
  const cargarRef = useRef(cargar);
  useLayoutEffect(() => {
    cargarRef.current = cargar;
  });

  useEffect(() => {
    let vigente = true;
    cargarRef
      .current()
      .then((data) => {
        if (vigente) setResultado({ clave, data, error: null });
      })
      .catch((error) => {
        if (vigente) setResultado((r) => ({ clave, data: r.data, error }));
      });
    return () => {
      vigente = false;
    };
  }, [clave]);

  const recargar = useCallback(() => setIntento((i) => i + 1), []);
  const loading = resultado.clave !== clave;
  return {
    data: resultado.data,
    error: loading ? null : resultado.error,
    loading,
    recargar,
  };
}
