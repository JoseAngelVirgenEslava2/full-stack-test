import { useEffect, useState } from "react";
import axios from "axios";

interface UserFormProps {
  userId?: string;
  onSuccess?: () => void;
}

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  password?: string;
  address: {
    street: string;
    number: string;
    city: string;
    postalCode: string;
  }
}

const UserForm: React.FC<UserFormProps> = ({ userId, onSuccess }) => {
  const [form, setForm] = useState<UserData>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    role: "USER",
    status: "ACTIVE",
    password: "",
    address: {
      street: '',
      number: '',
      city: '',
      postalCode: ''
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = !!userId;

  useEffect(() => {
    if (isEditMode) {
      axios
        .get(`http://localhost:4000/users/${userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .then((res) => {
          const { user } = res.data;
          setForm({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            phoneNumber: user.phoneNumber || '',
            role: user.role || 'USER',
            status: user.status || 'ACTIVE',
            password: '',
            address: {
              street: user.address?.street || '',
              number: user.address?.number || '',
              city: user.address?.city || '',
              postalCode: user.address?.postalCode || '',
            },
          });
        })
        .catch(console.error);
    }
  }, [userId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
  
    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1];
      setForm((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
  
    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      };
  
      // Se crea un payload para garantizar que la
      // informacion tenga la estructura correcta
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phoneNumber: form.phoneNumber,
        role: form.role,
        status: form.status,
        password: form.password,
        address: {
          street: form.address.street,
          number: form.address.number,
          city: form.address.city,
          postalCode: form.address.postalCode,
        },
      };
  
      if (isEditMode) {
        await axios.put(`http://localhost:4000/users/${userId}`, payload, config);
      } else {
        await axios.post(`http://localhost:4000/users`, payload, config);
      }
  
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Error al guardar usuario", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4 bg-white rounded shadow-md max-w-md mx-auto"
    >
      <h2 className="text-xl font-bold">
        {isEditMode ? "Editar usuario" : "Crear nuevo usuario"}
      </h2>

      <input
        className="w-full border p-2"
        name="firstName"
        value={form.firstName}
        onChange={handleChange}
        placeholder="Nombre"
        required
      />

      <input
        className="w-full border p-2"
        name="lastName"
        value={form.lastName}
        onChange={handleChange}
        placeholder="Apellido"
        required
      />

      <input
        className="w-full border p-2"
        name="email"
        type="email"
        value={form.email}
        onChange={handleChange}
        placeholder="Correo electrónico"
        required
      />

      <input
        className="w-full border p-2"
        name="phoneNumber"
        value={form.phoneNumber}
        onChange={handleChange}
        placeholder="Teléfono"
        required
      />

      <input
        className="w-full border p-2"
        name="address.street"
        value={form.address.street}
        onChange={handleChange}
        placeholder="Calle"
        required
      />

      <input
        className="w-full border p-2"
        name="address.number"
        value={form.address.number}
        onChange={handleChange}
        placeholder="Numero de casa"
        required
      />

      <input
        className="w-full border p-2"
        name="address.city"
        value={form.address.city}
        onChange={handleChange}
        placeholder="Ciudad"
        required
      />

      <input
        className="w-full border p-2"
        name="address.postalCode"
        value={form.address.postalCode}
        onChange={handleChange}
        placeholder="Codigo postal"
        required
      />

      {!isEditMode && (
        <input
          className="w-full border p-2"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Contraseña"
          required
        />
      )}

      <select
        name="role"
        className="w-full border p-2"
        value={form.role}
        onChange={handleChange}
      >
        <option value="USER">Usuario</option>
        <option value="ADMIN">Administrador</option>
      </select>

      <select
        name="status"
        className="w-full border p-2"
        value={form.status}
        onChange={handleChange}
      >
        <option value="ACTIVE">Activo</option>
        <option value="INACTIVE">Inactivo</option>
      </select>

      <button
        type="submit"
        disabled={isLoading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {isLoading ? "Guardando..." : isEditMode ? "Actualizar" : "Crear"}
      </button>
    </form>
  );
};

export default UserForm;
