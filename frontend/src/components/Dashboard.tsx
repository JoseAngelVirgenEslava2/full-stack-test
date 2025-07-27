"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { GoogleMap, useJsApiLoader, Autocomplete, Marker } from '@react-google-maps/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  profilePicture?: string;
}

interface NewUserFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  role: string;
  status: string;
  street: string;
  number: string;
  city: string;
  postalCode: string;
}

const libraries: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ["places"];
const mapContainerStyle = {
  width: '100%',
  height: '300px'
};
const center = {
  lat: -34.6037,
  lng: -58.3816  // Use la latitud y longitud aproximada de Buenos Aires jeje, por cuestiones personales
};

const Dashboard = () => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [newUserData, setNewUserData] = useState<NewUserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phoneNumber: '',
    role: 'USER',
    status: 'ACTIVE',
    street: '',
    number: '',
    city: '',
    postalCode: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [createMessage, setCreateMessage] = useState('');
  const [createError, setCreateError] = useState('');

  // --- Estados y manejadores de Google Maps ---
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_MAPS_KEY as string,
    libraries,
  });

  const onLoadMap = (mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    mapInstance.setCenter(center);
  };

  const onUnmountMap = () => {
    setMap(null);
  };

  const onLoadAutocomplete = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onUnmountAutocomplete = () => {
    setAutocomplete(null);
  };

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      console.log("Place selected:", place);

      if (place.geometry && place.geometry.location) {
        const location = place.geometry.location;
        setMarkerPosition({
          lat: location.lat(),
          lng: location.lng()
        });
        map?.panTo({ lat: location.lat(), lng: location.lng() });
        map?.setZoom(17);

        let street = '';
        let number = '';
        let city = '';
        let postalCode = '';

        for (const component of place.address_components || []) {
          if (component.types.includes('route')) {
            street = component.long_name;
          }
          if (component.types.includes('street_number')) {
            number = component.long_name;
          }
          if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
            city = component.long_name;
          }
          if (component.types.includes('postal_code')) {
            postalCode = component.long_name;
          }
        }

        setNewUserData(prev => ({
          ...prev,
          street: street,
          number: number,
          city: city,
          postalCode: postalCode,
        }));
      } else {
        console.error("Place has no geometry or location");
      }
    }
  };

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPosition({ lat, lng });

      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const place = results[0];
          console.log("Geocoded place:", place);

          let street = '';
          let number = '';
          let city = '';
          let postalCode = '';

          for (const component of place.address_components || []) {
            if (component.types.includes('route')) {
              street = component.long_name;
            }
            if (component.types.includes('street_number')) {
              number = component.long_name;
            }
            if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
              city = component.long_name;
            }
            if (component.types.includes('postal_code')) {
              postalCode = component.long_name;
            }
          }

          setNewUserData(prev => ({
            ...prev,
            street: street,
            number: number,
            city: city,
            postalCode: postalCode,
          }));
        } else {
          console.error('Geocoder failed due to: ' + status);
        }
      });
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        router.replace("/");
        return;
      }

      try {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserRole(decodedToken.role);
        setCurrentUserId(decodedToken.userId);
      } catch (e) {
        console.error("Error decoding token:", e);
        localStorage.removeItem('token');
        router.replace("/");
        return;
      }

      const response = await axios.get("http://localhost:4000/users", {
        params: {
          page,
          limit,
          role: roleFilter,
          status: statusFilter,
          search,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const total = response.data.total ?? 0;
      const userList = response.data.users ?? [];

      setUsers(userList);
      setTotalPages(Math.max(1, Math.ceil(total / limit)));
    } catch (error) {
      console.error("Error fetching users:", error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        router.replace('/');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter, statusFilter, router]);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:4000/users/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Error al eliminar usuario.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.replace("/");
  };

  const handleNewUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUserData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMessage('');
    setCreateError('');
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.replace("/");
        return;
      }

      // Uso del FormData para enviar el archivo y los datos
      const formDataToSend = new FormData();
      formDataToSend.append('firstName', newUserData.firstName);
      formDataToSend.append('lastName', newUserData.lastName);
      formDataToSend.append('email', newUserData.email);
      formDataToSend.append('password', newUserData.password);
      formDataToSend.append('phoneNumber', newUserData.phoneNumber);
      formDataToSend.append('role', newUserData.role);
      formDataToSend.append('status', newUserData.status);
      formDataToSend.append('street', newUserData.street);
      formDataToSend.append('number', newUserData.number);
      formDataToSend.append('city', newUserData.city);
      formDataToSend.append('postalCode', newUserData.postalCode);

      if (selectedFile) {
        formDataToSend.append('profilePicture', selectedFile); // Con esto se adjunta el archivo
      }

      const response = await axios.post("http://localhost:4000/users", formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setCreateMessage('Usuario creado exitosamente!');
      setNewUserData({ // Para resetear el formulario
        firstName: '', lastName: '', email: '', password: '', phoneNumber: '',
        role: 'USER', status: 'ACTIVE', street: '', number: '', city: '', postalCode: ''
      });
      setSelectedFile(null); // Para resetear el campo del archivo seleccionado
      setCreating(false);
      fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || error.message || 'Error al crear usuario.';
        setCreateError(errorMessage);
      } else {
        setCreateError('Error desconocido al crear usuario.');
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard de Usuarios</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>

      <div className="mb-4 flex space-x-4 items-center">
        <input
          type="text"
          placeholder="Buscar por nombre, apellido o email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-2 border rounded w-full md:w-1/3"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Todos los Roles</option>
          <option value="ADMIN">Administradores</option>
          <option value="USER">Usuarios</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Todos los Estados</option>
          <option value="ACTIVE">Activo</option>
          <option value="INACTIVE">Inactivo</option>
        </select>

        {currentUserRole === 'ADMIN' && (
          <button
            onClick={() => {
              setCreating(true);
              setCreateMessage('');
              setCreateError('');
              setNewUserData({
                firstName: '', lastName: '', email: '', password: '', phoneNumber: '',
                role: 'USER', status: 'ACTIVE', street: '', number: '', city: '', postalCode: ''
              });
              setSelectedFile(null); // Limpiamos el archivo seleccionado
              setMarkerPosition(null); // Limpiamos el marcador del mapa
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            Crear Nuevo Usuario
          </button>
        )}
      </div>

      {creating && currentUserRole === 'ADMIN' && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-2xl font-bold mb-4">Crear Nuevo Usuario</h2>
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre" name="firstName" value={newUserData.firstName} onChange={handleNewUserChange} required />
            <Input label="Apellido" name="lastName" value={newUserData.lastName} onChange={handleNewUserChange} required />
            <Input label="Email" name="email" value={newUserData.email} onChange={handleNewUserChange} type="email" required />
            <Input label="Contraseña" name="password" value={newUserData.password} onChange={handleNewUserChange} type="password" required />
            <Input label="Teléfono" name="phoneNumber" value={newUserData.phoneNumber} onChange={handleNewUserChange} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                name="role"
                value={newUserData.role}
                onChange={handleNewUserChange}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              >
                <option value="USER">Usuario</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                name="status"
                value={newUserData.status}
                onChange={handleNewUserChange}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              >
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
              </select>
            </div>

            {/*Google Maps*/}
            <div className="md:col-span-2">
              <h3 className="text-xl font-semibold mb-2">Dirección</h3>
              {loadError && <div className="text-red-500 mb-4">Error al cargar Google Maps: {loadError.message}</div>}
              {!isLoaded ? (
                <div className="flex items-center justify-center h-full min-h-[300px] bg-gray-200 rounded">
                  Cargando mapa...
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Buscar dirección (Google Maps)</label>
                    <Autocomplete
                      onLoad={onLoadAutocomplete}
                      onUnmount={onUnmountAutocomplete}
                      onPlaceChanged={onPlaceChanged}
                      options={{ types: ['address'] }}
                    >
                      <input
                        type="text"
                        placeholder="Escribe una dirección aquí para autocompletar..."
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      />
                    </Autocomplete>
                  </div>
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={markerPosition || center}
                    zoom={markerPosition ? 17 : 12}
                    onLoad={onLoadMap}
                    onUnmount={onUnmountMap}
                    onClick={onMapClick}
                  >
                    {markerPosition && <Marker position={markerPosition} />}
                  </GoogleMap>
                </>
              )}
            </div>

            {/* Campos de direccion que se llenaran automáticamente */}
            <Input label="Calle" name="street" value={newUserData.street} onChange={handleNewUserChange} />
            <Input label="Número" name="number" value={newUserData.number} onChange={handleNewUserChange} />
            <Input label="Ciudad" name="city" value={newUserData.city} onChange={handleNewUserChange} />
            <Input label="Código Postal" name="postalCode" value={newUserData.postalCode} onChange={handleNewUserChange} />

            {/* Campo para subir de Foto de Perfil*/}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Foto de Perfil</label>
              <input
                type="file"
                name="profilePicture"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  } else {
                    setSelectedFile(null);
                  }
                }}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
              {selectedFile && <p className="text-sm text-gray-500 mt-1">Archivo seleccionado: {selectedFile.name}</p>}
            </div>

            <div className="md:col-span-2 flex justify-end space-x-4 mt-4">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Creando...' : 'Guardar Usuario'}
              </button>
            </div>
          </form>
          {createMessage && <p className="mt-4 text-center text-green-600 font-semibold">{createMessage}</p>}
          {createError && <p className="mt-4 text-center text-red-600 font-semibold">{createError}</p>}
        </div>
      )}


      {loading && !creating ? (
        <p className="text-center mt-10">Cargando usuarios...</p>
      ) : (
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr>
              <th className="p-2 border">Nombre</th>
              <th className="p-2 border">Apellido</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Teléfono</th>
              <th className="p-2 border">Rol</th>
              <th className="p-2 border">Estado</th>
              <th className="p-2 border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="p-2 border">{user.firstName}</td>
                <td className="p-2 border">{user.lastName}</td>
                <td className="p-2 border">{user.email}</td>
                <td className="p-2 border">{user.phoneNumber}</td>
                <td className="p-2 border">{user.role}</td>
                <td className="p-2 border">{user.status}</td>
                <td className="p-2 border space-x-2">
                  {(currentUserRole === 'ADMIN' || currentUserId === user.id) && (
                    <button
                      className="text-blue-500 hover:underline"
                      onClick={() => router.push(`/users/${user.id}?edit=true`)}
                    >
                      Editar
                    </button>
                  )}
                  {(currentUserRole === 'ADMIN' || currentUserId === user.id) && (
                    <button
                      className="text-red-500 hover:underline ml-2"
                      onClick={() => handleDelete(user.id)}
                    >
                      Delete
                    </button>
                  )}
                  {!(currentUserRole === 'ADMIN' || currentUserId === user.id) && (
                     <button
                       className="text-gray-500 hover:underline"
                       onClick={() => router.push(`/users/${user.id}`)}
                     >
                       Ver
                     </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex justify-between mt-4">
        <button
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          disabled={page === 1}
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Dashboard;

function Input({ label, name, value, onChange, type = "text", required = false }: {
  label: string,
  name: string,
  value: string | undefined,
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void,
  type?: string,
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
      />
    </div>
  );
}