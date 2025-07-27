'use client'

import Dashboard from '@/components/Dashboard'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) router.replace('/')
  }, [])

  return <Dashboard />
}
