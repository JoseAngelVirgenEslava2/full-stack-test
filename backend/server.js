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
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Para manejar rutas de archivos

// Para depurar las rutas
console.log('__dirname:', __dirname);
const uploadDir = path.join(__dirname, 'uploads');
console.log('Directorio de subida (uploadDir):', uploadDir);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Directorio 'uploads' creado en: ${uploadDir}`);
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const JWT_SECRET = process.env.JWT_SECRET;

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
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
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

// Para servir archivos estaticos desde el directorio 'uploads'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


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

// Middleware para autorizar al usuario comun
function authorizeUserOrAdmin(req, res, next) {
  const userId = req.user.userId; // obtenido del payload del token
  const userRole = req.user.role;
  const targetId = req.params.id;

  if (userRole === 'USER' || userId === targetId) {
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

app.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, phoneNumber, street, number, city, postalCode } = req.body;
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

app.post('/users', authenticateToken, authorizeAdmin, upload.single('profilePicture'), async (req, res) => {
  try {
    const { firstName, lastName, email, password, phoneNumber, role, status, street, number, city, postalCode } = req.body;
    const profilePictureUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!firstName || !lastName || !email || !password || !phoneNumber || !role || !status) {
      return res.status(400).json({ message: 'Todos los campos requeridos deben ser completados.' });
    }

    // Validacion para el correo, si existe pues ya no se puede registrar
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'El correo electronico ya está registrado.' });
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
        profilePicture: profilePictureUrl,
      },
    });

    res.status(201).json({ message: 'Usuario creado exitosamente', user });
  } catch (error) {
    console.error('Error creando usuario:', error);
    if (error.code === 'P2002') { // Codigo de error de Prisma para violación de restricción unica
      return res.status(409).json({ message: 'El email ya está registrado.' });
    }
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.put('/users/:id', authenticateToken, authorizeUserOrAdmin, upload.single('profilePicture'), async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      phoneNumber, 
      role, 
      status, 
      address_street,
      address_number,
      address_city,
      address_postalCode
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
        street: address_street,
        number: address_number,
        city: address_city,
        postalCode: address_postalCode,
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