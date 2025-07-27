'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import UserProfileCard from '@/components/UserProfileCard'

export default function UserProfilePage() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const editMode = searchParams?.get('edit') === 'true'

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.replace('/')
      return
    }

    setLoading(true)
    fetch(`http://localhost:4000/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text()
          console.error("Fetch error details:", text);
          throw new Error(`Error ${res.status}: ${text}`)
        }
        return res.json()
      })
      .then((data) => {
        setUser(data.user ?? data)
        setError('')
      })
      .catch((err) => {
        console.error('Error fetching user from API (frontend catch)', err)
        setError('Error cargando información del usuario.')
      })
      .finally(() => setLoading(false))
  }, [id, router])

  if (loading) return <p className="text-center mt-10">Cargando...</p>
  if (error) return <p className="text-center mt-10 text-red-600">{error}</p>
  if (!user) return <p className="text-center mt-10">Usuario no encontrado.</p>

  return <UserProfileCard user={user} editMode={editMode} />
}
