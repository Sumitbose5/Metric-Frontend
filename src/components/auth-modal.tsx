"use client"

import React from "react"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"

type AuthMode = "login" | "signup"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: AuthMode
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="relative">
      <Input
        id={id}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

function Divider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-2 text-muted-foreground">or</span>
      </div>
    </div>
  )
}

export function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Login form state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  // Signup form state
  const [signupUsername, setSignupUsername] = useState("")
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("")

  // Error state
  const [error, setError] = useState("")

  // Reset form when mode changes
  useEffect(() => {
    setError("")
  }, [mode])

  // Update mode when initialMode prop changes
  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  const handleLoginSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!loginEmail || !loginPassword) {
      setError("Please fill in all fields")
      return
    }

    setIsSubmitting(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSubmitting(false)

    // Dummy handler - replace with actual API integration
    console.log("Login submitted:", { email: loginEmail, password: loginPassword })
    onClose()
  }, [loginEmail, loginPassword, onClose])

  const handleSignupSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!signupUsername || !signupEmail || !signupPassword || !signupConfirmPassword) {
      setError("Please fill in all fields")
      return
    }

    if (signupPassword !== signupConfirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (signupPassword.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setIsSubmitting(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSubmitting(false)

    // Dummy handler - replace with actual API integration
    console.log("Signup submitted:", {
      username: signupUsername,
      email: signupEmail,
      password: signupPassword,
    })
    onClose()
  }, [signupUsername, signupEmail, signupPassword, signupConfirmPassword, onClose])

  const handleGoogleAuth = useCallback(() => {
    // Dummy handler - replace with actual OAuth integration
    console.log("Google OAuth clicked")
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader className="items-center text-center">
          {/* Logo */}
          <img
            src="https://res.cloudinary.com/dgxc8nspo/image/upload/v1769340150/logo_-removebg-preview_ncazxr.png"
            alt="Metric Logo"
            className="mb-2 h-12 w-12 object-contain rounded-sm"
          />
          <DialogTitle className="text-xl">
            {mode === "login" ? "Welcome back to Metric" : "Create your Metric account"}
          </DialogTitle>
          <DialogDescription>
            {mode === "login"
              ? "Sign in to continue your interview preparation"
              : "Start your journey to acing technical interviews"}
          </DialogDescription>
        </DialogHeader>

        {/* OAuth Button */}
        <Button
          variant="outline"
          className="w-full gap-2 bg-transparent"
          onClick={handleGoogleAuth}
          type="button"
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        <Divider />

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Login Form */}
        {mode === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email or Username</Label>
              <Input
                id="login-email"
                type="text"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Enter your email or username"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <PasswordInput
                id="login-password"
                value={loginPassword}
                onChange={setLoginPassword}
                placeholder="Enter your password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Login"}
            </Button>
          </form>
        )}

        {/* Signup Form */}
        {mode === "signup" && (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-username">Username</Label>
              <Input
                id="signup-username"
                type="text"
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
                placeholder="Choose a username"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <PasswordInput
                id="signup-password"
                value={signupPassword}
                onChange={setSignupPassword}
                placeholder="Create a password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-confirm-password">Confirm Password</Label>
              <PasswordInput
                id="signup-confirm-password"
                value={signupConfirmPassword}
                onChange={setSignupConfirmPassword}
                placeholder="Confirm your password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        )}

        {/* Toggle Mode */}
        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Login
              </button>
            </>
          )}
        </p>
      </DialogContent>
    </Dialog>
  )
}
