-- ============================================
-- SETUP SUPABASE PARA BITÁCORA DIGITAL UMSNH
-- ============================================
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- https://app.supabase.com/project/[TU_PROYECTO]/sql/new

-- 1. Habilitar UUID extension (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: users (perfiles de usuario)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'coordinator', 'technician', 'user')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  department TEXT,
  phone TEXT,
  profile_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ============================================
-- TABLA: activities (incidencias/registros)
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Fechas y tiempos
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME DEFAULT CURRENT_TIME,
  received_date DATE,
  delivery_date DATE,
  
  -- Información del reportante
  reporter_name TEXT,
  department TEXT,
  coordination TEXT,
  
  -- Ubicación dinámica (se mapea desde meta en observaciones)
  -- building/edificio -> coordination
  -- career/carrera -> department
  -- room/salón -> guardado en meta/observaciones
  -- shift/turno -> guardado en meta/observaciones
  
  -- Servicio y descripción
  service_type TEXT,
  description TEXT,
  observations TEXT,  -- Contiene metadata embebida: __meta__={...}
  
  -- Prioridad y estado
  priority TEXT DEFAULT 'media' CHECK (priority IN ('baja', 'media', 'alta', 'urgente')),
  task_status TEXT DEFAULT 'pendiente' CHECK (task_status IN ('pendiente', 'en_proceso', 'completado', 'cancelado')),
  
  -- Equipo técnico (opcional)
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  operating_system TEXT,
  ram TEXT,
  storage TEXT,
  user_equipo TEXT,
  
  -- Asignación y seguimiento
  assigned_to TEXT,
  diagnosis TEXT,
  evaluation NUMERIC,
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para activities
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date DESC);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(task_status);
CREATE INDEX IF NOT EXISTS idx_activities_priority ON activities(priority);
CREATE INDEX IF NOT EXISTS idx_activities_service ON activities(service_type);
CREATE INDEX IF NOT EXISTS idx_activities_department ON activities(department);

-- ============================================
-- TABLA: events (eventos/actividades)
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT,
  
  start_date DATE NOT NULL,
  start_time TIME,
  end_date DATE,
  end_time TIME,
  
  location TEXT,
  organizer TEXT,
  assigned_to TEXT,
  
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_proceso', 'completado', 'cancelado')),
  priority TEXT DEFAULT 'media',
  
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para events
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- ============================================
-- TABLA: reports (reportes generados)
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  report_type TEXT,  -- 'maintenance', 'dashboard', 'custom', etc.
  
  data JSONB DEFAULT '{}'::jsonb,
  filters JSONB DEFAULT '{}'::jsonb,
  
  status TEXT DEFAULT 'draft',
  shared_with TEXT[] DEFAULT '{}',
  
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para reports
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);

-- ============================================
-- TABLA: audit_log (registro de auditoría)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  action TEXT NOT NULL,  -- 'create', 'update', 'delete', 'login', etc.
  table_name TEXT,
  record_id UUID,
  
  old_values JSONB,
  new_values JSONB,
  
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para audit_log
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- ============================================
-- POLÍTICAS DE SEGURIDAD (RLS - Row Level Security)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS: users
-- ============================================

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Los admins pueden ver todos los usuarios
CREATE POLICY "Admins can view all users"
  ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Los admins pueden actualizar cualquier usuario
CREATE POLICY "Admins can update any user"
  ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Los admins pueden insertar usuarios
CREATE POLICY "Admins can insert users"
  ON users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- POLÍTICAS: activities
-- ============================================

-- Los usuarios pueden ver sus propias actividades
CREATE POLICY "Users can view own activities"
  ON activities
  FOR SELECT
  USING (auth.uid() = user_id);

-- Los coordinadores pueden ver todas las actividades
CREATE POLICY "Coordinators can view all activities"
  ON activities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- Los usuarios pueden crear actividades
CREATE POLICY "Users can create activities"
  ON activities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propias actividades (si no está completada)
CREATE POLICY "Users can update own activities"
  ON activities
  FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- Los admins pueden eliminar actividades
CREATE POLICY "Admins can delete activities"
  ON activities
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- POLÍTICAS: events
-- ============================================

-- Similar a activities
CREATE POLICY "Users can view own events"
  ON events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Coordinators can view all events"
  ON events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

CREATE POLICY "Users can create events"
  ON events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON events
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS: reports
-- ============================================

CREATE POLICY "Users can view own reports"
  ON reports
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create reports"
  ON reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS: audit_log
-- ============================================

-- Solo los admins pueden ver el audit log
CREATE POLICY "Admins can view audit log"
  ON audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- El sistema puede insertar en audit log
CREATE POLICY "System can insert audit log"
  ON audit_log
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Actualizar updated_at automáticamente en users
CREATE OR REPLACE FUNCTION update_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_timestamp();

-- Actualizar updated_at automáticamente en activities
CREATE OR REPLACE FUNCTION update_activities_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activities_updated_at BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_activities_timestamp();

-- Actualizar updated_at automáticamente en events
CREATE OR REPLACE FUNCTION update_events_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_events_timestamp();

-- ============================================
-- COMENTARIOS / DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE users IS 'Tabla de usuarios con roles (admin, coordinator, technician, user)';
COMMENT ON TABLE activities IS 'Incidencias y registros de mantenimiento correctivo/preventivo';
COMMENT ON TABLE events IS 'Eventos y actividades programadas';
COMMENT ON TABLE reports IS 'Reportes generados y compartidos';
COMMENT ON TABLE audit_log IS 'Registro de auditoría de todas las acciones';

COMMENT ON COLUMN activities.observations IS 'Campo para notas; contiene metadata embebida como __meta__={folio, edificio, carrera, salon, turno, mantenimiento, tipo, rapido, creado_por, creado_email}';

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- Una vez ejecutado este script:
-- 1. Ve a Configuración > Autenticación en Supabase
-- 2. Habilita "Email" si no está habilitado
-- 3. Obtén tu SUPABASE_URL y SUPABASE_ANON_KEY
-- 4. Configura esos valores en la aplicación
-- 5. ¡Listo! La app debería conectar y guardar datos en línea.
