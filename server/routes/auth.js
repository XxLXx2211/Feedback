const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Credenciales de usuario (en un entorno real, esto estaría en una base de datos)
const users = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    name: 'Administrador'
  },
  {
    id: 2,
    username: 'usuario',
    password: 'usuario123',
    role: 'user',
    name: 'Usuario Normal'
  }
];

// Ruta para iniciar sesión
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Buscar el usuario
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }

  // Generar token JWT
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET || 'feedback_system_secret_key',
    { expiresIn: '24h' }
  );

  // Devolver token y datos del usuario (sin la contraseña)
  const { password: _, ...userWithoutPassword } = user;
  res.json({
    message: 'Inicio de sesión exitoso',
    token,
    user: userWithoutPassword
  });
});

// Ruta para verificar token
router.get('/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No se proporcionó token' });
  }

  try {
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'feedback_system_secret_key');
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
});

// Ruta para cerrar sesión (en un entorno real, podríamos invalidar el token)
router.post('/logout', (req, res) => {
  // En un sistema real, aquí invalidaríamos el token
  res.json({ message: 'Sesión cerrada exitosamente' });
});

module.exports = router;
