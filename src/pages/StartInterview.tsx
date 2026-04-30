import React, { useState } from 'react';
import OutOfAttemptsModal from '@/components/out-of-attempts-modal';
import { Ticket, ArrowRightLeft, ExternalLink, Bot, Terminal, Clock, MessageSquare, ArrowRight } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DsaLevelModal } from '@/components/dsa-level-modal';
import { DsaFullNameModal } from '@/components/dsa-fullname-modal';
import { ResumeSelectionModal } from '@/components/resume-selection-modal';
import { ResumeUploadModal } from '@/components/resume-upload-modal';
import { RoleSelectionModal } from '@/components/role-selection-modal';
import { toast } from 'sonner';

// ...existing code...

const StartInterview: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const userId = user?.id;
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [isFullNameModalOpen, setIsFullNameModalOpen] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [isOutOfAttemptsModalOpen, setIsOutOfAttemptsModalOpen] = useState(false);

  const [isResumeSelectionModalOpen, setIsResumeSelectionModalOpen] = useState(false);
  const [isResumeUploadModalOpen, setIsResumeUploadModalOpen] = useState(false);
  const [resumeRefreshTrigger, setResumeRefreshTrigger] = useState(0);

  const [isRoleSelectionModalOpen, setIsRoleSelectionModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleStartResumeInterviewClick = () => {
    if (!user?.id) {
      toast.error('Please sign in to start an interview');
      return;
    }
    setIsRoleSelectionModalOpen(true);
  };

  const handleProceedWithRole = (role: string) => {
    setSelectedRole(role);
    setIsRoleSelectionModalOpen(false);
    setIsResumeSelectionModalOpen(true);
  };

  const checkAttempts = async () => {
    const userId = user?.id;

    if (!userId) {
      toast.error('User not found');
      return false;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/interview/check-attempts/${userId}`);
      const data = await response.json();

      if (!data.hasAttempts) {
        console.log("No interview attempts remaining");
        // open modal here to inform user
        setIsOutOfAttemptsModalOpen(true);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking attempts:', error);
      toast.error('Failed to check interview attempts');
      return false;
    }
  };

  // Fetch dashboard data to show attempts remaining on this page
  const { data: dashboardData } = useQuery<any, Error>({
    queryKey: ['dashboard', userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/dash/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      return res.json();
    },
    enabled: !!userId,
  });

  const handleProceedWithResume = async (resumeId: string) => {
    setIsResumeSelectionModalOpen(false);

    // Check attempts before navigating
    const hasAttempts = await checkAttempts();
    if (!hasAttempts) {
      // Modal already opened in checkAttempts
      return;
    }

    toast.success(`Proceeding with resume ID: ${resumeId}`);
    navigate('/interview/resume', { state: { resumeId, role: selectedRole } });
  };

  const handleStartDsaInterview = async () => {
    if (!user?.id) {
      toast.error('Please sign in to start an interview');
      return;
    }

    setIsCheckingUser(true);
    try {
      // Make API call to check if fullName is available
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/check-fullname`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkUserId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check user information');
      }

      const data = await response.json();

      if (data.fullNameAvailable) {
        // Show level selection modal
        setIsLevelModalOpen(true);
      } else {
        // Show full name input modal
        setIsFullNameModalOpen(true);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      toast.error('Failed to start interview. Please try again.');
    } finally {
      setIsCheckingUser(false);
    }
  };

  const handleFullNameSubmit = async (fullName: string) => {
    try {
      // Dummy API call - adjust endpoint as needed
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/update-fullname`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkUserId: user?.id,
          fullName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update full name');
      }

      toast.success('Profile updated successfully!');
      setIsFullNameModalOpen(false);
      // After updating, show level selection modal
      setIsLevelModalOpen(true);
    } catch (error) {
      console.error('Error updating full name:', error);
      toast.error('Failed to update profile. Please try again.');
    }
  };

  const handleStartInterviewWithLevel = async (level: 'beginner' | 'intermediate' | 'advanced') => {
    try {
      console.log('Starting interview for user:', user?.id, 'level:', level);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/interview/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user?.id,
          difficulty: level,
        }),
      });
      // Handle explicit status codes before attempting to parse body
      console.log('Interview start response status:', response.status);
      if (response.status === 403) {
        setIsOutOfAttemptsModalOpen(true);
        return;
      }

      // For other non-OK statuses, read the body for diagnostics but don't throw -- show a toast instead
      if (!response.ok) {
        let bodyText = '';
        try {
          bodyText = await response.text();
        } catch (e) {
          console.warn('Failed to read error body:', e);
        }
        console.error('Failed to start interview:', response.status, bodyText);
        toast.error('Failed to start interview. Please try again.');
        return;
      }

      const data = await response.json();
      console.log('Interview started:', data);

      const { interviewId, token, livekitUrl } = data;

      if (!interviewId) {
        throw new Error('Invalid response from server: missing required data');
      }

      try {
        sessionStorage.setItem('currentInterviewId', interviewId);
        // We no longer receive problem_metadata on start, the LiveKit agent fetches it.
        sessionStorage.removeItem('currentProblemMetadata');
        if (token && livekitUrl) {
          console.log("Livekit token received in StartInterview.tsx: ", token);
          sessionStorage.setItem('livekitToken', token);
          sessionStorage.setItem('livekitUrl', livekitUrl);
        }
      } catch (storageError) {
        console.error('Failed to store data in sessionStorage:', storageError);
      }

      toast.success(`Starting ${level} interview!`);
      setIsLevelModalOpen(false);
      
      navigate('/interview/dsa', {
        state: {
          interviewId,
          token,
          livekitUrl
        }
      });
    } catch (error) {
      // Network/CORS or unexpected runtime error
      console.error('Error starting interview (network or unexpected):', error);
      toast.error('Failed to start interview. Please try again.');
      // Don't open the out-of-attempts modal here; only open it for explicit 403 responses
      return;
    }
  };

  return (
    <>
      {/* Modals */}
      <DsaLevelModal
        isOpen={isLevelModalOpen}
        onClose={() => setIsLevelModalOpen(false)}
        onStartInterview={handleStartInterviewWithLevel}
      />
      <DsaFullNameModal
        isOpen={isFullNameModalOpen}
        onClose={() => setIsFullNameModalOpen(false)}
        onSubmit={handleFullNameSubmit}
      />
      <OutOfAttemptsModal
        isOpen={isOutOfAttemptsModalOpen}
        onClose={() => setIsOutOfAttemptsModalOpen(false)}
      />
      
      {/* Role and Resume Modals */}
      <RoleSelectionModal
        isOpen={isRoleSelectionModalOpen}
        onClose={() => setIsRoleSelectionModalOpen(false)}
        onProceed={handleProceedWithRole}
      />
      <ResumeSelectionModal
        isOpen={isResumeSelectionModalOpen}
        onClose={() => setIsResumeSelectionModalOpen(false)}
        userId={user?.id}
        onUploadClick={() => {
          setIsResumeSelectionModalOpen(false);
          setIsResumeUploadModalOpen(true);
        }}
        onProceed={handleProceedWithResume}
        refreshTrigger={resumeRefreshTrigger}
      />
      <ResumeUploadModal
        isOpen={isResumeUploadModalOpen}
        onClose={() => setIsResumeUploadModalOpen(false)}
        userId={user?.id}
        onSuccess={() => {
          // Refresh list by updating trigger
          setResumeRefreshTrigger(prev => prev + 1);
          setIsResumeSelectionModalOpen(true);
        }}
      />

      {/* Hero Section */}
      <section className="text-center mb-16 space-y-6">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-xs font-bold uppercase tracking-widest text-accent">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
          AI-Powered Interview Practice
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-linear-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
          Ready to Practice?
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Simulate real-world interviews with our advanced AI models. Get instant feedback and sharpen your skills.
        </p>
        <div className="pt-4">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-accent text-accent-foreground font-bold shadow-lg">
            <Ticket className="w-5 h-5" />
            {dashboardData?.attemptsRemaining ?? 0} Free Interviews Remaining
          </div>
        </div>
      </section>

      {/* Interview Selection Cards */}
      <section className="grid md:grid-cols-2 gap-8 mb-20">
        <InterviewCard 
          title="Resume-Based Interview"
          description="A conversational mock interview tailored specifically to your work experience, projects, and role-specific skills."
          icon={Bot}
          duration="15–20 mins"
          type="Conversational"
          variant="primary"
          onClick={handleStartResumeInterviewClick}
        />
        <InterviewCard 
          title="DSA Coding Interview"
          description="A technical round focused on algorithms, data structures, and problem-solving. Practice on a live code editor."
          icon={Terminal}
          duration="45–60 mins"
          type="Technical"
          variant="secondary"
          onClick={handleStartDsaInterview}
          isLoading={isCheckingUser}
        />
      </section>

      {/* Comparison Table */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 text-foreground">
          <ArrowRightLeft className="w-6 h-6 text-accent" />
          Choose your track
        </h2>
        <div className="bg-card rounded-xl overflow-hidden border border-border shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-muted-foreground">Features</th>
                <th className="px-6 py-4 text-sm font-bold text-accent">Resume Interview</th>
                <th className="px-6 py-4 text-sm font-bold text-foreground">DSA Interview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <TableRow label="Core Topics" val1="Experience, Projects, Soft Skills" val2="Logic, Algos, Big O Notation" />
              <TableRow label="Difficulty" val1="Intermediate" val2="Advanced" />
              <TableRow label="Feedback Style" val1="Behavioral analysis" val2="Efficiency & optimization" />
              <TableRow label="AI Model" val1="llama-3.1-8b-instant" val2="llama-3.3-70b-versatile" isMono />
            </tbody>
          </table>
        </div>
      </section>

      {/* Performance Summary */}
      <section className="mb-20">
        <div className="bg-card rounded-xl p-8 border border-accent/20 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] -mr-32 -mt-32"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <h2 className="text-2xl font-bold mb-1 text-foreground">Your Performance</h2>
                <p className="text-muted-foreground text-sm">Based on your last 30 days of activity</p>
              </div>
              <a className="inline-flex items-center gap-2 text-accent font-bold hover:underline" href="#">
                View Full Dashboard <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <PerformanceStats userId={user?.id} />
          </div>
        </div>
      </section>

      {/* Upgrade Banner */}
      <section className="text-center">
        <div className="bg-card py-8 px-6 rounded-2xl border border-border shadow-sm inline-block w-full max-w-4xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <div className="text-left">
              <h3 className="text-xl font-bold mb-2 text-foreground">Unlock Unlimited Mock Interviews</h3>
              <p className="text-muted-foreground text-sm">Get real-time hints and custom company prep tracks.</p>
            </div>
            <button onClick={() => window.dispatchEvent(new Event('open-beta-modal'))} className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-3 rounded-xl font-extrabold shadow-lg whitespace-nowrap transition-colors cursor-pointer">
              Upgrade to Premium
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

// Helper Components for StartInterview
const InterviewCard = ({ title, description, icon: Icon, duration, type, variant, onClick, isLoading }: any) => (
  <div className={`bg-card rounded-xl p-8 flex flex-col justify-between group border transition-all duration-300 hover:shadow-lg ${variant === 'primary' ? 'border-accent/30 hover:border-accent/50' : 'border-border hover:border-accent/30'}`}>
    <div>
      <div className={`size-14 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${variant === 'primary' ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-2xl font-bold mb-3 text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed mb-6">{description}</p>
      <div className="flex items-center gap-4 mb-8">
        <Badge icon={Clock} text={duration} />
        <Badge icon={MessageSquare} text={type} />
      </div>
    </div>
    <button 
      onClick={onClick}
      disabled={isLoading}
      className={`w-full py-4 rounded-lg font-extrabold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variant === 'primary' ? 'bg-accent text-accent-foreground hover:bg-accent/90' : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border'}`}
    >
      {isLoading ? 'Loading...' : (
        <>
          Start {title.split(' ')[0]} Interview <ArrowRight className="w-5 h-5" />
        </>
      )}
    </button>
  </div>
);

const Badge = ({ icon: Icon, text }: any) => (
  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-md">
    <Icon className="w-4 h-4" /> {text}
  </div>
);

const TableRow = ({ label, val1, val2, isMono }: any) => (
  <tr>
    <td className="px-6 py-4 text-sm text-muted-foreground">{label}</td>
    <td className={`px-6 py-4 text-sm text-card-foreground ${isMono ? 'font-mono' : ''}`}>{val1}</td>
    <td className={`px-6 py-4 text-sm text-card-foreground ${isMono ? 'font-mono' : ''}`}>{val2}</td>
  </tr>
);

const StatCard = ({ label, value, highlight, dotColor }: any) => (
  <div className="p-4 rounded-lg bg-muted/50 border border-border">
    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
    {dotColor ? (
      <p className="text-lg font-bold text-foreground flex items-center gap-2">
        <span className={`size-2 rounded-full ${dotColor}`}></span> {value}
      </p>
    ) : (
      <p className={`text-3xl font-extrabold ${highlight ? 'text-accent' : 'text-foreground'}`}>{value}</p>
    )}
  </div>
);

// PerformanceStats component: fetches interview-page data and shows skeleton while loading
const PerformanceStats = ({ userId }: { userId?: string }) => {
  const { data, isLoading } = useQuery<any, Error>({
    queryKey: ['interviewPage', userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/interview-page/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!userId,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border animate-pulse h-28" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      <StatCard label="Interviews Taken" value={String(data.interviewsTaken ?? 0)} />
      <StatCard label="Average Score" value={`${data.averageScore ?? 0}%`} highlight />
      <StatCard label="Strength" value={data.strengths ?? '-'} dotColor="bg-accent" />
      <StatCard label="Weakness" value={data.weakness ?? '-'} dotColor="bg-orange-400" />
    </div>
  )
}

export default StartInterview;
 