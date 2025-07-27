// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const app = express();
const PORT = 4000;
const multer = require('multer'); // Importa multer
const path = require('path');
const fs = require('fs'); // Para manejar rutas de archivos

console.log('__dirname:', __dirname);
const uploadDir = path.join(__dirname, 'uploads');
console.log('Directorio de subida (uploadDir):', uploadDir);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Directorio 'uploads' creado en: ${uploadDir}`);
}

app.use(cors());
app.use(express.json()); // Para parsear application/json
app.use(express.urlencoded({ extended: true })); // Para parsear application/x-www-form-urlencoded

const JWT_SECRET = process.env.JWT_SECRET;

// --- Configuración de Multer para la subida de archivos ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    
    const uploadDir = path.join(__dirname, 'uploads');
    // Asegura que el directorio exista
    require('fs').mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Genera un nombre de archivo único
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB por ejemplo
  fileFilter: (req, file, cb) => {
    // Permite solo imágenes
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif)!'));
    }
  }
});

// Sirve archivos estáticos desde el directorio 'uploads'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// --- Fin de la configuración de Multer ---


app.post('/login', async (req, res)=> {
  const {email, password} = req.body;
  try {
    const user = await prisma.user.findUnique({where: {email}});
    if (!user) return res.status(401).json({message: 'User not found'});
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({message: 'Incorrect password'});
    const token = jwt.sign({userId: user.id, role: user.role}, JWT_SECRET, {expiresIn: '1h'});
    res.json({token});
  } catch (error) {
    console.log(error);
    res.status(500).json({message: 'An internal error has occured'});
  }
})

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Middleware corregido para autorizar al usuario o al administrador
function authorizeUserOrAdmin(req, res, next) {
  const userId = req.user.userId; // obtenido del payload del token
  const userRole = req.user.role;
  const targetId = req.params.id;

  // Permite si es ADMIN o si el ID del usuario del token coincide con el ID del recurso
  if (userRole === 'ADMIN' || userId === targetId) {
    next();
  } else {
    return res.status(403).json({ message: 'Acceso denegado' });
  }
}

// Middleware solo para el rol de Administrador
function authorizeAdmin(req, res, next) {
    if (req.user.role === 'ADMIN') {
        next();
    } else {
        return res.status(403).json({ message: 'Acceso denegado: Solo administradores' });
    }
}


app.get('/users', authenticateToken, async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    const where = {};

    if (role) where.role = role;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        status: true,
      },
    });

    const total = await prisma.user.count({ where });

    res.json({ users, total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error obteniendo usuarios' });
  }
});

// La ruta /register no usa multer por defecto en este setup, si necesitas subir fotos
// al registrarte, deberías añadir upload.single('profilePicture') aquí también.
app.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, phoneNumber, street, number, city, postalCode } = req.body;
    // profilePicture se establece en null por ahora, ya que esta ruta no maneja subidas de archivos directamente con multer
    const profilePicture = null; 

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phoneNumber,
        role: 'USER',
        status: 'ACTIVE',
        createdAt: new Date(),
        address: {
          street: street,
          number: number,
          city: city,
          postalCode: postalCode
        },
        profilePicture: profilePicture
      },
    });

    res.status(201).json({ message: 'Usuario creado exitosamente', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creando usuario' });
  }
});

// --- RUTA POST /users MODIFICADA PARA MANEJAR SUBIDA DE ARCHIVOS ---
app.post('/users', authenticateToken, authorizeAdmin, upload.single('profilePicture'), async (req, res) => {
  try {
    // req.body contiene los campos de texto, req.file contiene la información del archivo
    const { firstName, lastName, email, password, phoneNumber, role, status, street, number, city, postalCode } = req.body;
    const profilePictureUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Validaciones básicas
    if (!firstName || !lastName || !email || !password || !phoneNumber || !role || !status) {
      return res.status(400).json({ message: 'Todos los campos requeridos deben ser completados.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phoneNumber,
        role,
        status,
        createdAt: new Date(),
        address: {
          street: street,
          number: number,
          city: city,
          postalCode: postalCode
        },
        profilePicture: profilePictureUrl, // Guarda la URL del archivo subido
      },
    });

    res.status(201).json({ message: 'Usuario creado exitosamente', user });
  } catch (error) {
    console.error('Error creando usuario:', error);
    if (error.code === 'P2002') { // Código de error de Prisma para violación de restricción única
      return res.status(409).json({ message: 'El email ya está registrado.' });
    }
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// --- RUTA PUT /users/:id MODIFICADA PARA MANEJAR SUBIDA DE ARCHIVOS ---
app.put('/users/:id', authenticateToken, authorizeUserOrAdmin, upload.single('profilePicture'), async (req, res) => {
  try {
    // CAMBIO AQUI: Destructura los campos de dirección con los nombres exactos que vienen del frontend
    const { 
      firstName, 
      lastName, 
      email, 
      phoneNumber, 
      role, 
      status, 
      address_street, // <-- CAMBIO
      address_number, // <-- CAMBIO
      address_city,   // <-- CAMBIO
      address_postalCode // <-- CAMBIO
    } = req.body;

    let profilePictureUrl = null;
    if (req.file) {
      profilePictureUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.profilePicture === 'null' || req.body.profilePicture === '') {
      profilePictureUrl = null;
    } else if (req.body.profilePicture) {
      profilePictureUrl = req.body.profilePicture;
    }

    const dataToUpdate = {
      firstName,
      lastName,
      email,
      phoneNumber,
      address: {
        // Usa los nuevos nombres para construir el objeto address para Prisma
        street: address_street, // <-- CAMBIO
        number: address_number, // <-- CAMBIO
        city: address_city,     // <-- CAMBIO
        postalCode: address_postalCode, // <-- CAMBIO
      },
      profilePicture: profilePictureUrl,
    };

    // Solo actualiza rol y estado si el usuario que hace la petición es un ADMIN
    if (req.user.role === 'ADMIN') {
      dataToUpdate.role = role;
      dataToUpdate.status = status;
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: dataToUpdate,
    });

    res.json({ message: 'Usuario actualizado', user: updated });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'El email ya está registrado.' });
    }
    res.status(500).json({ message: 'Error actualizando usuario' });
  }
});

app.delete('/users/:id', authenticateToken, authorizeUserOrAdmin, async (req, res) => {
  try {
    await prisma.user.delete({
      where: { id: req.params.id},
    });

    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error eliminando usuario' });
  }
});

app.get('/users/:id', authenticateToken, authorizeUserOrAdmin, async (req, res) => {
  console.log('recibido: ', req.params.id);
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id},
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        status: true,
        createdAt: true,
        address: true,
        profilePicture: true,
      },
    });

    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error obteniendo usuario' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});