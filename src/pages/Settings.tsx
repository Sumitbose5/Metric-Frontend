import React, { useEffect, useMemo, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useTheme } from 'next-themes'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sun, Moon } from "lucide-react"

const fetchSettings = async (userId: string) => {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/settings/${userId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Failed to fetch settings')
  return await res.json()
}

const updateUsername = async ({ userId, username }: { userId: string; username: string }) => {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/update-username`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clerkUserId: userId, username }),
  })
  if (!res.ok) throw new Error('Failed to update username')
  return res.json()
}

const updateFullname = async ({ userId, fullName }: { userId: string; fullName: string }) => {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/update-fullname`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clerkUserId: userId, fullName }),
  })
  if (!res.ok) throw new Error('Failed to update full name')
  return res.json()
}

const Settings: React.FC = () => {
  const { user } = useUser()
  const userId = user?.id
  const queryClient = useQueryClient()

  const { data } = useQuery<any, Error>({
    queryKey: ['userSettings', userId],
    queryFn: async () => fetchSettings(userId as string),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  })

  const usernameFromServer = data?.user?.username ?? ''
  const fullNameFromServer = data?.user?.fullname ?? ''

  const [username, setUsername] = useState(usernameFromServer)
  const [fullName, setFullName] = useState(fullNameFromServer)

  useEffect(() => setUsername(usernameFromServer), [usernameFromServer])
  useEffect(() => setFullName(fullNameFromServer), [fullNameFromServer])

  const usernameMutation = useMutation({
    mutationFn: updateUsername,
    onSuccess: () => {
      toast.success('Username updated')
      queryClient.invalidateQueries({ queryKey: ['userSettings', userId] })
    },
    onError: () => toast.error('Failed to update username'),
  })

  const fullnameMutation = useMutation({
    mutationFn: updateFullname,
    onSuccess: () => {
      toast.success('Full name updated')
      queryClient.invalidateQueries({ queryKey: ['userSettings', userId] })
    },
    onError: () => toast.error('Failed to update full name'),
  })

  const dirty = useMemo(() => {
    return username !== usernameFromServer || fullName !== fullNameFromServer
  }, [username, fullName, usernameFromServer, fullNameFromServer])

  const onSave = async () => {
    if (!userId) return toast.error('No user')
    try {
      if (username !== usernameFromServer) {
        await usernameMutation.mutateAsync({ userId, username })
      }
      if (fullName !== fullNameFromServer) {
        await fullnameMutation.mutateAsync({ userId, fullName })
      }
    } catch {}
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <section className="space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and preferences</p>
      </section>

      {/* Main Card */}
      <section className="relative bg-card/60 backdrop-blur-xl border border-border p-10 rounded-2xl shadow-lg overflow-hidden">

        {/* subtle gradient glow */}
        <div className="absolute inset-0 bg-linear-to-br from-accent/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Profile */}
          <div className="flex flex-col items-center md:items-start gap-5">
            <div className="relative">
              <img
                src={data?.profileImage || user?.imageUrl || '/placeholder-user.jpg'}
                className="w-28 h-28 rounded-full object-cover border-2 border-border shadow-md"
              />
              <div className="absolute inset-0 rounded-full ring-2 ring-accent/20" />
            </div>

            <div className="text-center md:text-left">
              <p className="font-semibold">{data?.user?.username || 'User'}</p>
              <p className="text-xs text-muted-foreground">Profile picture</p>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-2 space-y-6">

            <div className="grid md:grid-cols-2 gap-6">

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Email</label>
                <div className="p-3 rounded-lg bg-muted/20 border border-border text-sm">
                  {data?.user?.email || user?.primaryEmailAddress?.emailAddress || ''}
                </div>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent outline-none transition-all"
                />
              </div>

              {/* Full Name */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm text-muted-foreground">Full name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent outline-none transition-all"
                />
              </div>
            </div>

            {/* Theme Toggle */}
            <div className="flex items-center justify-between border-t border-border pt-6">
              <div>
                <p className="font-medium">Appearance</p>
                <p className="text-sm text-muted-foreground">Switch between light and dark mode</p>
              </div>
              <ThemeToggle />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <button
                disabled={!dirty || usernameMutation.status === 'pending' || fullnameMutation.status === 'pending'}
                onClick={onSave}
                className={`px-6 py-3 rounded-xl font-semibold transition-all shadow-md ${
                  !dirty
                    ? 'opacity-40 cursor-not-allowed'
                    : 'bg-accent text-accent-foreground hover:scale-[1.02] hover:bg-accent/90'
                }`}
              >
                {usernameMutation.status === 'pending' || fullnameMutation.status === 'pending'
                  ? 'Saving...'
                  : 'Save Changes'}
              </button>

              <button
                onClick={() => {
                  setUsername(usernameFromServer)
                  setFullName(fullNameFromServer)
                }}
                className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/30 transition"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}

export default Settings

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="px-4 py-2 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition font-medium"
    >
      {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
    </button>
  )
}