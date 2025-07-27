### Prueba Tecnica Full-Stack

🚀 Características Principales

    Autenticación y Autorización: Inicio de sesión seguro con JWT, roles de usuario (Admin, Usuario).

    Gestión de Usuarios: CRUD (Crear, Leer, Actualizar, Eliminar) de usuarios con paginación, búsqueda y filtros.

    Perfiles de Usuario: Visualización y edición de perfiles individuales.

    Subida de Imágenes: Los usuarios pueden subir una foto de perfil.

    Integración con Maps: Muestra mapas interactivos con geolocalización o marcadores.

    Persistencia de Datos: Utiliza MongoDB Atlas para la base de datos.

🛠️ Tecnologías Utilizadas

    Frontend:

        Next.js (React Framework)

        TypeScript

        Tailwind CSS

        Axios para solicitudes HTTP

    Backend:

        Node.js

        Express.js

        Prisma (ORM para MongoDB)

        JWT (JSON Web Tokens) para autenticación

        Bcryptjs para hashing de contraseñas

        Multer para subida de archivos

    Base de Datos:

        MongoDB Atlas (en la nube)

📋 Prerrequisitos

Antes de comenzar, asegúrate de tener instalado lo siguiente en tu sistema:

    Git: Para clonar el repositorio.

    Node.js: Versión 18 o superior.

🔑 Obtención de Claves API y Configuración de Entorno

1. Clave de MongoDB Atlas (para el Backend)

    Ve a MongoDB Atlas y crea una cuenta si aún no tienes una.

    Crea un nuevo clúster (el nivel gratuito "M0" es suficiente para empezar).
   
   (El paso anterior no es necesario, en el archivo backend/.env.example incluyo mi string para conectar a mi propio cluster, pero funcionara por tiempo limitado).

    Configura la Conexión de Red (IP Access List):

        En tu clúster, ve a "Security" > "Network Access".

        Haz clic en "ADD IP ADDRESS".

        Selecciona "Add Current IP Address" o las IPs que tendran acceso.

    Crea un Usuario de Base de Datos:

        En "Security" > "Database Access", haz clic en "ADD NEW DATABASE USER".

        Crea un usuario con una contraseña segura y asígnale los roles adecuados (ej. "Read and write to any database"). Guarda esta contraseña.

    Obtén tu Cadena de Conexión (Connection String):

        En la página principal de tu clúster, haz clic en "Connect".

        Selecciona "Connect your application".

        Elige "Node.js" y la versión de tu driver.

        Copia la cadena de conexión. Deberá verse similar a:
        mongodb+srv://<username><password>@<cluster-name>.mongodb.net/<database-name>?retryWrites=true&w=majority

        Reemplaza <username> y <password> con el usuario y la contraseña que creaste. En database-name pon el nombre de la base de datos a usar.

3. Clave de Maps (para el Frontend)

    Ve a Google Cloud Console e inicia sesion con una cuenta de Google

    Ve a la seccion de APIs y Servicios

    Busca las siguientes APIs y habilitalas (hay que tener un proyecto creado, si no lo tienes pues crealo jeje): Maps JavaScript API, Places API y Geocoding API

    Alguna de las APIs te pedira configurar el proyecto para el cual se va a usar, ahi se tiene que buscar el proyecto y restringir el acceso a la IP que podra usar el servicio

⚙️ Configuración del Proyecto
    
    
```
git clone https://github.com/JoseAngelVirgenEslava2/full-stack-test.git
cd full-stack-test
```

Configurar Variables de Entorno (.env files):

    Para el Backend:
    
        cd backend
        
Ahi veras un archivo .env.example, incluye mi string para el cluster Atlas y un JWT_SECRET junto con las instrucciones para generarlo

Crea un .env en la misma ruta y rellenalo con tus datos generados

```
DATABASE_URL="tu_cadena_de_conexion_mongodb_atlas"
JWT_SECRET="una_clave_secreta_fuerte_para_jwt"
```

Vuelve a la raíz del proyecto:
    ```
    cd ..
    ```
    
Para el Frontend:

    cd frontend
    
Crea el archivo .env.local y rellenalo con la API key obtenida de Google Cloud Console

```
NEXT_PUBLIC_MAPS_KEY=tu_clave
```


Vuelve a la raíz del proyecto:
      ```
        cd ..
      ```
      
Instalar Dependencias de Node.js:

    cd backend
    
    npm install express cors dotenv jsonwebtoken bcryptjs mongoose multer
    
    cd ..

Frontend:

        cd frontend
        npm install 
        cd ...
        
▶️ Ejecutar la Aplicación

Una vez que hayas configurado las variables de entorno e instalado las dependencias, puedes iniciar el backend y el frontend por separado:

    Iniciar el Backend:

        Abre una nueva ventana de terminal.

        Navega a la carpeta backend/:

        cd backend

        npx prisma init

Generar cliente de Prisma: Esto es crucial para que Prisma funcione con tu base de datos.

```
npx prisma generate
```

Inicia el servidor backend:

```
node server.js
```

Deberías ver un mensaje en la consola indicando que el servidor está escuchando en el puerto 4000


Iniciar el Frontend:

    Abre otra nueva ventana de terminal:
    
    cd frontend

Inicia la aplicación Next.js:

```
npm run dev
```


Deberías ver mensajes de Next.js indicando que el servidor se ha iniciado en http://localhost:3000.


Acceder a la Aplicación:

    
Una vez que ambos servidores estén en marcha, abre tu navegador web y visita:

    
```
http://localhost:3000
```


Deberías ver tu aplicación frontend cargándose y funcionando.



⚠️ Notas Importantes y Solución de Problemas

    Variables de Entorno: Cada vez que cambies algo en tu backend/.env o frontend/.env.local, deberás reiniciar el servidor correspondiente para que los cambios surtan efecto.

    Problemas de Conexión a MongoDB Atlas:

        Verifica tu DATABASE_URL en backend/.env (asegurándote de que el nombre de usuario, contraseña y el nombre del clúster sean correctos).

        Revisa la Lista de Acceso IP en tu configuración de MongoDB Atlas para asegurarte de que tu IP pública actual esté permitida.

        En caso de usar tu propio cluster, deberas de hacer esto:

        pwd (asegurate que estas en la carpeta backend/)
        npx prisma generate
        npx prisma db seed (para llenar la base de datos)        
