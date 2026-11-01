-- Outlet de Zapatillas - Creación de tablas (PostgreSQL)
-- Modelo canónico según el DER (docs/img/der.png) y el diccionario de datos.
--
-- Se puede ejecutar varias veces ya que solo crea lo que todavía no existe.
-- La API lo ejecuta automáticamente al arrancar y también se puede correr
-- a mano desde psql o pgAdmin sobre la base outlet_zapatillas.

-- Locales del outlet
CREATE TABLE IF NOT EXISTS sucursales (
    id_sucursal    serial       PRIMARY KEY,
    nombre         varchar(80)  NOT NULL,
    direccion      varchar(150) NOT NULL,
    ciudad         varchar(80)  NOT NULL,
    provincia      varchar(80)  NOT NULL,
    telefono       varchar(30),
    fecha_apertura date,

    CONSTRAINT uq_sucursales_nombre UNIQUE (nombre)
);

-- Cuentas con acceso al tablero (contra esta tabla se valida el login)
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario    serial       PRIMARY KEY,
    nombre        varchar(60)  NOT NULL,
    apellido      varchar(60)  NOT NULL,
    email         varchar(120) NOT NULL,
    password_hash varchar(255) NOT NULL,   -- hash PBKDF2 con sal (PasswordHasher): nunca la contraseña
    rol           varchar(20)  NOT NULL DEFAULT 'consulta',
    id_sucursal   int          REFERENCES sucursales (id_sucursal),   -- solo gerentes
    activo        boolean      NOT NULL DEFAULT true,
    fecha_alta    timestamp    NOT NULL DEFAULT now(),

    CONSTRAINT uq_usuarios_email UNIQUE (email),
    CONSTRAINT ck_usuarios_email_minusculas CHECK (email = lower(email)),
    CONSTRAINT ck_usuarios_rol CHECK (rol IN ('admin', 'gerente', 'consulta'))
);

-- Meta de facturación mensual de cada sucursal (semáforo de cumplimiento)
CREATE TABLE IF NOT EXISTS objetivos_venta (
    id_objetivo    serial        PRIMARY KEY,
    id_sucursal    int           NOT NULL REFERENCES sucursales (id_sucursal),
    anio           smallint      NOT NULL,
    mes            smallint      NOT NULL,
    monto_objetivo numeric(14,2) NOT NULL,

    CONSTRAINT ck_objetivos_mes CHECK (mes BETWEEN 1 AND 12),
    CONSTRAINT ck_objetivos_monto CHECK (monto_objetivo > 0),
    CONSTRAINT uq_objetivos_sucursal_mes UNIQUE (id_sucursal, anio, mes)
);

-- Clasificación de productos
CREATE TABLE IF NOT EXISTS marcas (
    id_marca serial      PRIMARY KEY,
    nombre   varchar(60) NOT NULL,

    CONSTRAINT uq_marcas_nombre UNIQUE (nombre)
);

CREATE TABLE IF NOT EXISTS categorias (
    id_categoria serial      PRIMARY KEY,
    nombre       varchar(60) NOT NULL,

    CONSTRAINT uq_categorias_nombre UNIQUE (nombre)
);

-- Modelos de zapatilla que vende el outlet
CREATE TABLE IF NOT EXISTS productos (
    id_producto   serial        PRIMARY KEY,
    sku           varchar(30)   NOT NULL,
    modelo        varchar(100)  NOT NULL,
    id_marca      int           NOT NULL REFERENCES marcas (id_marca),
    id_categoria  int           NOT NULL REFERENCES categorias (id_categoria),
    genero        varchar(10)   NOT NULL,
    precio_lista  numeric(12,2) NOT NULL,
    precio_outlet numeric(12,2) NOT NULL,
    activo        boolean       NOT NULL DEFAULT true,

    CONSTRAINT uq_productos_sku UNIQUE (sku),
    CONSTRAINT ck_productos_genero CHECK (genero IN ('hombre', 'mujer', 'unisex', 'niños')),
    CONSTRAINT ck_productos_precio_lista CHECK (precio_lista > 0),
    CONSTRAINT ck_productos_precio_outlet CHECK (precio_outlet > 0)
);

-- Pares disponibles por producto, talle y sucursal (semáforo de stock)
CREATE TABLE IF NOT EXISTS stock (
    id_stock     serial       PRIMARY KEY,
    id_sucursal  int          NOT NULL REFERENCES sucursales (id_sucursal),
    id_producto  int          NOT NULL REFERENCES productos (id_producto),
    talle        numeric(3,1) NOT NULL,
    cantidad     int          NOT NULL DEFAULT 0,
    stock_minimo int          NOT NULL DEFAULT 0,

    CONSTRAINT ck_stock_cantidad CHECK (cantidad >= 0),
    CONSTRAINT ck_stock_minimo CHECK (stock_minimo >= 0),
    CONSTRAINT uq_stock_sucursal_producto_talle UNIQUE (id_sucursal, id_producto, talle)
);

-- Compradores registrados (semáforo de actividad)
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente serial       PRIMARY KEY,
    nombre     varchar(60)  NOT NULL,
    apellido   varchar(60)  NOT NULL,
    dni        varchar(12),
    email      varchar(120),
    telefono   varchar(30),
    fecha_alta date         NOT NULL DEFAULT current_date,

    CONSTRAINT uq_clientes_dni UNIQUE (dni)
);

-- Cabecera de cada venta (ticket)
CREATE TABLE IF NOT EXISTS ventas (
    id_venta    serial        PRIMARY KEY,
    numero      varchar(20)   NOT NULL,
    id_sucursal int           NOT NULL REFERENCES sucursales (id_sucursal),
    id_cliente  int           NOT NULL REFERENCES clientes (id_cliente),
    fecha       timestamp     NOT NULL,
    medio_pago  varchar(20)   NOT NULL,
    total       numeric(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT uq_ventas_numero UNIQUE (numero),
    CONSTRAINT ck_ventas_medio_pago CHECK (medio_pago IN ('efectivo', 'debito', 'credito', 'transferencia', 'billetera')),
    CONSTRAINT ck_ventas_total CHECK (total >= 0)
);

-- Líneas de cada venta
CREATE TABLE IF NOT EXISTS detalle_ventas (
    id_detalle      serial        PRIMARY KEY,
    id_venta        int           NOT NULL REFERENCES ventas (id_venta),
    id_producto     int           NOT NULL REFERENCES productos (id_producto),
    talle           numeric(3,1)  NOT NULL,
    cantidad        int           NOT NULL,
    precio_unitario numeric(12,2) NOT NULL,
    subtotal        numeric(14,2) NOT NULL,   -- cantidad × precio_unitario

    CONSTRAINT ck_detalle_cantidad CHECK (cantidad > 0),
    CONSTRAINT ck_detalle_precio CHECK (precio_unitario > 0),
    CONSTRAINT uq_detalle_venta_producto_talle UNIQUE (id_venta, id_producto, talle)
);

-- Bases creadas antes de agregar uq_detalle_venta_producto_talle: CREATE TABLE IF NOT EXISTS
-- no modifica una tabla que ya existe, así que la restricción se agrega acá si todavía falta.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_detalle_venta_producto_talle') THEN
        ALTER TABLE detalle_ventas
            ADD CONSTRAINT uq_detalle_venta_producto_talle UNIQUE (id_venta, id_producto, talle);
    END IF;
END $$;
