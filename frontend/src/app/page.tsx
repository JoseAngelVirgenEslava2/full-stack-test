'use client'

import LoginForm from '@/components/LoginForm'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) router.replace('/Dashboard/')
  }, [])

  return <LoginForm onLogin={() => router.push('/Dashboard/')} />
}
