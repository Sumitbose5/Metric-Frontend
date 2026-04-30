import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { ThemeProvider } from "@/components/theme-provider"
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from '@clerk/clerk-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import Home from './pages/Home'
import StartInterview from './pages/StartInterview'
import Dashboard from './pages/Dashboard'
import DSAInterviewPage from './pages/DSAIntrvu'
import ProtectedLayout from './layout/ProtectedLayout'
import ResumeInterview from './pages/ResumeInterview'
import ResumeFeedback from './pages/FeedbackDetails'
import FeedbackDashboard from './pages/FeedbackPage'
import GeneratingFeedback from './pages/GeneratingFeedback' 
import Settings from './pages/Settings'
import BetaModal from './components/BetaModal'
import NotFound from './pages/NotFound'

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes
        },
    },
})

// Component to sync user with backend
function UserSync() {
    const { user, isLoaded } = useUser()

    useEffect(() => {
        const syncUser = async () => {
            if (isLoaded && user) {
                try {
                    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/sync`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            clerkUserId: user.id,
                            username: user.username || user.firstName || 'user',
                            email: user.primaryEmailAddress?.emailAddress || '',
                            profileImage: user.imageUrl || null,
                        }),
                    })

                    if (!response.ok) {
                        console.error('Failed to sync user with backend')
                        const errorData = await response.json()
                        console.error('Error details:', errorData)
                    } else {
                        const data = await response.json()
                        console.log('User synced successfully:', data)
                    }
                } catch (error) {
                    console.error('Error syncing user:', error)
                }
            }
        }

        syncUser()
    }, [user, isLoaded])

    return null
}

// ScrollToTop resets the window scroll position when the route changes
function ScrollToTop() {
    const { pathname } = useLocation()
    useEffect(() => {
        // reset scroll position to top on navigation
        try {
            window.scrollTo(0, 0)
        } catch (err) {
            // ignore
        }
    }, [pathname])

    return null
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                <Router>
                    <UserSync />
                    <ScrollToTop />
                    <Toaster />
                    <BetaModal />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        
                        {/* Protected Routes */}
                        <Route element={
                            <>
                                <SignedIn>
                                    <ProtectedLayout />
                                </SignedIn>
                                <SignedOut>
                                    <RedirectToSignIn />
                                </SignedOut>
                            </>
                        }>
                            <Route path="/interviews" element={<StartInterview />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/feedback" element={<FeedbackDashboard />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/interview/feedback/resume/:id" element={<ResumeFeedback />} />
                        </Route>

                        {/* Resume Interview pages */}
                        <Route path="/interview/resume" element={
                            <>
                                <SignedIn>
                                    <ResumeInterview />
                                </SignedIn>
                                <SignedOut>
                                    <RedirectToSignIn />
                                </SignedOut>
                            </>
                        } />

                        {/* Interview Pages - Full Screen (No ProtectedLayout) */}
                        <Route path="/interview/dsa" element={
                            <>
                                <SignedIn>
                                    <DSAInterviewPage />
                                </SignedIn>
                                <SignedOut>
                                    <RedirectToSignIn />
                                </SignedOut>
                            </>
                        } />

                        {/* Interview Feedback Generating Polling Page */}
                        <Route path="/interviews/:id/result" element={
                            <>
                                <SignedIn>
                                    <GeneratingFeedback />
                                </SignedIn>
                                <SignedOut>
                                    <RedirectToSignIn />
                                </SignedOut>
                            </>
                        } />

                        {/* Catch-all: render NotFound page for unknown/fault routes */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Router>
            </ThemeProvider>
        </QueryClientProvider>
    )
}

export default App
