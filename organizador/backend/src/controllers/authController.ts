import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/connection';

export const registro = async (req: Request, res: Response): Promise<void> => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    res.status(400).json({ error: true, mensaje: 'Todos los campos son obligatorios' });
    return;
  }

  try {
    const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      res.status(400).json({ error: true, mensaje: 'El email ya está registrado' });
      return;
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS as string);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id, nombre, email',
      [nombre, email, hashedPassword]
    );

    const usuario = result.rows[0];
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    res.status(201).json({ error: false, token, usuario });
  } catch (error) {
    res.status(500).json({ error: true, mensaje: 'Error interno del servidor' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: true, mensaje: 'Email y password son obligatorios' });
    return;
  }

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      res.status(401).json({ error: true, mensaje: 'Credenciales incorrectas' });
      return;
    }

    const usuario = result.rows[0];
    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      res.status(401).json({ error: true, mensaje: 'Credenciales incorrectas' });
      return;
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    res.json({ error: false, token, usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email } });
  } catch (error) {
    res.status(500).json({ error: true, mensaje: 'Error interno del servidor' });
  }
};
