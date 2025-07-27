'use client'

import Image from 'next/image'
import { useState } from 'react'

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  createdAt: string;
  address: {
    street: string;
    number: string;
    city: string;
    postalCode: string;
  };
  profilePicture?: string | null;
}

interface Props {
  user: User;
  editMode?: boolean;
}

const UserProfileCard: React.FC<Props> = ({ user, editMode = false }) => {
  const [formData, setFormData] = useState<User>(user)
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null) // Estado para el archivo de imagen
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name.startsWith('address.')) {
      const addressKey = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressKey]: value,
        },
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfilePictureFile(e.target.files[0])
    } else {
      setProfilePictureFile(null)
    }
  }

  const handleUpdate = async () => {
    setLoading(true)
    setMessage('')
    try {
      const data = new FormData()
      data.append('firstName', formData.firstName)
      data.append('lastName', formData.lastName)
      data.append('email', formData.email)
      data.append('phoneNumber', formData.phoneNumber)
      data.append('role', formData.role)
      data.append('status', formData.status)
      
      data.append('address_street', formData.address.street || '')
      data.append('address_number', formData.address.number || '')
      data.append('address_city', formData.address.city || '')
      data.append('address_postalCode', formData.address.postalCode || '')

      // Logica para profilePicture:
      if (profilePictureFile) {
        data.append('profilePicture', profilePictureFile);
      } else if (formData.profilePicture === null) {
        data.append('profilePicture', 'null');
      } else if (formData.profilePicture) {
        data.append('profilePicture', formData.profilePicture);
      } else {

      }
      
      const res = await fetch(`http://localhost:4000/users/${formData.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: data,
      })

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error actualizando usuario: ${errorText}`)
      }

      const result = await res.json()
      setMessage('Usuario actualizado correctamente')
      
      if (result.user && 'profilePicture' in result.user) {
        setFormData(prev => ({ ...prev, profilePicture: result.user.profilePicture }));
      }
      setProfilePictureFile(null);
      
    } catch (error: any) {
      console.error(error)
      setMessage(`Hubo un error al actualizar: ${error.message || ''}`)
    } finally {
      setLoading(false)
    }
  }

  // Determina la URL de la imagen a mostrar
  const imageUrlToDisplay = profilePictureFile 
    ? URL.createObjectURL(profilePictureFile)
    : (formData.profilePicture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0");

  return (
    <div className="p-8 w-full max-w-lg mx-auto rounded-3xl bg-gray-100">
      <div className="-mb-20 -translate-y-1/2 transform">
        <Image
          width={300}
          height={300}
          src={imageUrlToDisplay}
          alt={`${formData.firstName} ${formData.lastName}`}
          className="mx-auto h-64 object-cover rounded-full border-4 border-white shadow"
          unoptimized={true}
        />
      </div>

      <div className="mt-24 space-y-4">
        {editMode ? (
          <>
            <Input label="Nombre" name="firstName" value={formData.firstName} onChange={handleChange} />
            <Input label="Apellido" name="lastName" value={formData.lastName} onChange={handleChange} />
            <Input label="Email" name="email" value={formData.email} onChange={handleChange} />
            <Input label="Teléfono" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} />
            <Input label="Calle" name="address.street" value={formData.address.street} onChange={handleChange} />
            <Input label="Número" name="address.number" value={formData.address.number} onChange={handleChange} />
            <Input label="Ciudad" name="address.city" value={formData.address.city} onChange={handleChange} />
            <Input label="Código Postal" name="address.postalCode" value={formData.address.postalCode} onChange={handleChange} />
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Foto de Perfil</label>
              <input
                type="file"
                name="profilePicture"
                accept="image/jpeg,image/png,image/gif"
                onChange={handleFileChange}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              />
              {/* Solo se muestra el boton si hay una foto de perfil actual */}
              {formData.profilePicture && (
                <button 
                  onClick={() => {
                    setFormData(prev => ({ ...prev, profilePicture: null }));
                    setProfilePictureFile(null); // Limpia el archivo seleccionado en memoria
                  }}
                  className="text-red-500 text-sm mt-1"
                >
                  Eliminar foto actual
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center space-y-2">
            <p><strong>Nombre:</strong> {formData.firstName}</p>
            <p><strong>Apellido:</strong> {formData.lastName}</p>
            <p><strong>Email:</strong> {formData.email}</p>
            <p><strong>Teléfono:</strong> {formData.phoneNumber}</p>
            <p><strong>Dirección:</strong> {formData.address.street} #{formData.address.number}, {formData.address.city}, CP {formData.address.postalCode}</p>
          </div>
        )}
      </div>

      {editMode && (
        <div className="text-center mt-6">
          <button
            onClick={handleUpdate}
            className="rounded-xl bg-black px-8 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Actualizando...' : 'Actualizar usuario'}
          </button>
          {message && <p className="mt-3 text-sm text-blue-600">{message}</p>}
        </div>
      )}
    </div>
  )
}

function Input({ label, name, value, onChange }: {
  label: string,
  name: string,
  value: string,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
      />
    </div>
  )
}

export default UserProfileCard;