-- 1. TABLA DE USUARIOS
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA DE CARPETAS
CREATE TABLE carpetas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#3498db',
  parent_id INT REFERENCES carpetas(id) ON DELETE CASCADE,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA DE TAREAS
CREATE TABLE tareas (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA')),
  orden INT NOT NULL DEFAULT 0,
  en_calendario BOOLEAN DEFAULT FALSE,
  fecha_vencimiento TIMESTAMP,
  carpeta_id INT REFERENCES carpetas(id) ON DELETE CASCADE,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA DE NOTAS
CREATE TABLE notas (
  id SERIAL PRIMARY KEY,
  contenido TEXT,
  carpeta_id INT REFERENCES carpetas(id) ON DELETE CASCADE,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA DE EVENTOS DE CALENDARIO
CREATE TABLE eventos_calendario (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  fecha_inicio TIMESTAMP NOT NULL,
  fecha_fin TIMESTAMP NOT NULL,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLA DE ARCHIVOS ADJUNTOS
CREATE TABLE archivos_adjuntos (
  id SERIAL PRIMARY KEY,
  nombre_original VARCHAR(255) NOT NULL,
  ruta_archivo VARCHAR(500) NOT NULL,
  tipo_mime VARCHAR(100) NOT NULL,
  tamano_bytes INT,
  tarea_id INT REFERENCES tareas(id) ON DELETE CASCADE,
  nota_id INT REFERENCES notas(id) ON DELETE CASCADE,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  subido_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_entidad_destino CHECK (
    (tarea_id IS NOT NULL AND nota_id IS NULL) OR
    (tarea_id IS NULL AND nota_id IS NOT NULL)
  )
);

-- 7. ÍNDICES DE RENDIMIENTO
CREATE INDEX idx_carpetas_usuario ON carpetas(usuario_id);
CREATE INDEX idx_tareas_carpeta ON tareas(carpeta_id);
CREATE INDEX idx_notas_carpeta ON notas(carpeta_id);
CREATE INDEX idx_eventos_usuario ON eventos_calendario(usuario_id);