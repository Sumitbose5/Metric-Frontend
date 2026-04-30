import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react"
import { Button } from "@/components/ui/button"
import { Sun, Moon, Menu, X } from "lucide-react"

const navLinks = [
  { href: "#", label: "Home" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#about", label: "About" },
]

export function Navbar() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const navigate = useNavigate()

  // Avoid hydration mismatch by only rendering theme toggle after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img
            src="https://res.cloudinary.com/dgxc8nspo/image/upload/v1769330002/logo2_ah607m.png"
            alt="Metric Logo"
            className="h-8 w-8 object-contain rounded-sm"
          />

          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight">Metric</span>

            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-black border border-gray-300">
              BETA
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 md:flex">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
              className="h-9 w-9"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          )}

          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl="/interviews">
              <Button variant="ghost" className="text-sm font-medium">
                Login
              </Button>
            </SignInButton>
            <SignUpButton mode="modal" forceRedirectUrl="/interviews">
              <Button className="text-sm font-medium">
                Sign Up
              </Button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <Button
              variant="ghost"
              className="text-sm font-medium"
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </Button>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
              className="h-9 w-9"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border/40 bg-background md:hidden">
          <div className="space-y-1 px-4 py-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block rounded-lg px-3 py-2 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-4">
              <SignedOut>
                <SignInButton mode="modal" forceRedirectUrl="/interviews">
                  <Button variant="ghost" className="w-full justify-center">
                    Login
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal" forceRedirectUrl="/interviews">
                  <Button className="w-full justify-center">
                    Sign Up
                  </Button>
                </SignUpButton>
              </SignedOut>

              <SignedIn>
                <Button
                  variant="ghost"
                  className="w-full justify-center"
                  onClick={() => {
                    navigate('/dashboard')
                    setMobileMenuOpen(false)
                  }}
                >
                  Dashboard
                </Button>
                <div className="flex justify-center pt-2">
                  <UserButton afterSignOutUrl="/" />
                </div>
              </SignedIn>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
