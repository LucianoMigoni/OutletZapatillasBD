import { useLayoutEffect, useState } from "react";

// Ancho en píxeles de un elemento. Se actualiza cuando cambia el tamaño de la ventana
export function useAncho(ref) {
  const [ancho, setAncho] = useState(0);

  useLayoutEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;
    setAncho(elemento.clientWidth);
    const observer = new ResizeObserver(([entrada]) =>
      setAncho(Math.floor(entrada.contentRect.width)),
    );
    observer.observe(elemento);
    return () => observer.disconnect();
  }, [ref]);

  return ancho;
}
