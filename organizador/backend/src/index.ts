import express from 'express';
import dotenv from 'dotenv';
import pool from './db/connection';
import authRoutes from './routes/authRoutes';
import carpetasRoutes from './routes/carpetasRoutes';
import tareasRoutes from './routes/tareasRoutes';
import notasRoutes from './routes/notasRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/carpetas', carpetasRoutes);
app.use('/api/tareas', tareasRoutes);
app.use('/api/notas', notasRoutes);

// Ruta de prueba
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', mensaje: 'Servidor y base de datos funcionando' });
  } catch (error) {
    res.status(500).json({ status: 'error', mensaje: 'Error conectando a la base de datos' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});