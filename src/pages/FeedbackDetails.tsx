import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Code,  
  ChevronLeft, 
  RotateCcw,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

/**
 * Props for the SkillBar component
 */
interface SkillBarProps {
  label: string;
  percentage: number;
}

const SkillBar: React.FC<SkillBarProps> = ({ label, percentage }) => (
  <div>
    <div className="flex justify-between items-end mb-2">
      <span className="text-foreground font-bold">{label}</span>
      <span className="text-accent font-bold">{percentage}%</span>
    </div>
    <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
      <div 
        className="h-full bg-accent rounded-full transition-all duration-1000" 
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  </div>
);

interface FeedbackData {
  id: string;
  interviewId: string;
  job_role: string;
  totalScore: number;
  communicationScore: number;
  technicalScore: number;
  dsaScore: number;
  strengths: string;
  weaknesses: string;
  aiFeedback: string;
  recommendation: string;
  createdAt: string;
}

const InterviewFeedback: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reset scroll position to layout boundaries automatically
    window.scrollTo(0, 0);

    const fetchFeedback = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/interview/feedback/${id}`);
        const result = await response.json();
        // Adjust for potential nested data structure like `result.feedback`
        setData(result.feedback || result);
      } catch (error) { 
        console.error("Failed to fetch feedback", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchFeedback();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading feedback report...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-2xl font-bold text-foreground">Report Not Found</h2>
        <p className="text-muted-foreground">We couldn't load the feedback for this interview.</p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-6 py-2 rounded-xl bg-accent text-accent-foreground font-bold shadow-lg hover:bg-accent/90 transition-all"
        >
          Return Home
        </button>
      </div>
    );
  }

  const score = data.totalScore || 0;
  const strokeDashoffset = 552.92 * (1 - score / 100);

  // Safe parsing for strengths and weaknesses
  const parseList = (textData: string) => {
    if (!textData) return [];
    try {
      const parsed = JSON.parse(textData);
      if (Array.isArray(parsed)) return parsed;
      return [textData];
    } catch {
      // If it's a markdown list, clean it up
      return textData.split('\n')
        .map(s => s.replace(/^-\s*/, '').trim())
        .filter(Boolean);
    }
  };

  const strengthsList = parseList(data.strengths);
  const weaknessesList = parseList(data.weaknesses);

  const formattedDate = new Date(data.createdAt || Date.now()).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Welcome Hero */}
      <header className="mb-12">
        <button 
          onClick={() => navigate('/feedback')}
          className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors group mb-8"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Feedback
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 size={14} />
              Report Generated • {formattedDate}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Interview Feedback for <span className="bg-linear-to-r from-accent to-accent/60 bg-clip-text text-transparent italic">{data.job_role || 'N/A'}</span>
            </h1>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Score & Skills */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Total Score */}
          <div className="relative overflow-hidden group bg-card backdrop-blur-sm border border-border rounded-xl p-8 flex flex-col items-center justify-center shadow-sm">
            <div className="absolute inset-0 bg-linear-to-br from-accent/5 to-transparent opacity-50"></div>
            <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase mb-8 relative z-10">Overall Performance</p>
            
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle className="text-muted/30" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeWidth="6"></circle>
                <circle 
                  className="text-accent drop-shadow-[0_0_12px_rgba(var(--accent),0.4)]" 
                  cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" 
                  strokeWidth="12"
                  strokeDasharray="552.92" 
                  style={{ strokeDashoffset, strokeLinecap: 'round', transition: 'stroke-dashoffset 1.5s ease-in-out' }}
                ></circle>
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-6xl font-black tracking-tighter text-foreground">
                  {score}<span className="text-2xl font-bold text-muted-foreground">%</span>
                </span>
              </div>
            </div>
            <p className="mt-8 text-accent font-bold text-sm bg-accent/10 px-5 py-2 rounded-full border border-accent/20 relative z-10">
              {score >= 80 ? 'Exceeds Benchmark' : score >= 60 ? 'Meets Benchmark' : 'Needs Improvement'}
            </p>
          </div>

          {/* DSA Score (if applicable) */}
          {data.dsaScore !== null && data.dsaScore !== undefined && (
            <div className="relative overflow-hidden group bg-card backdrop-blur-sm border border-border rounded-xl p-6 flex items-center justify-between shadow-sm">
              <div className="absolute inset-0 bg-linear-to-br from-purple-500/5 to-transparent opacity-50"></div>
              <div className="relative z-10 flex flex-col gap-1">
                <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">Problem Solving</p>
                <p className="text-lg font-extrabold text-foreground tracking-tight">DSA Score</p>
              </div>
              <div className="relative w-20 h-20 flex items-center justify-center text-purple-500 z-10">
                <svg className="w-full h-full transform -rotate-90">
                  <circle className="text-muted/30" cx="40" cy="40" fill="transparent" r="34" stroke="currentColor" strokeWidth="6"></circle>
                  <circle 
                    className="text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" 
                    cx="40" cy="40" fill="transparent" r="34" stroke="currentColor" 
                    strokeWidth="6"
                    strokeDasharray="213.63" 
                    style={{ strokeDashoffset: 213.63 * (1 - data.dsaScore / 100), strokeLinecap: 'round', transition: 'stroke-dashoffset 1.5s ease-in-out' }}
                  ></circle>
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-black tracking-tighter text-foreground">
                    {data.dsaScore}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Skill Breakdown */}
          <div className="bg-card backdrop-blur-sm border border-border rounded-xl p-6 flex flex-col gap-6 shadow-sm">
            <h3 className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">Skill Breakdown</h3>
            <div className="space-y-6">
              {data.communicationScore !== null && data.communicationScore !== undefined && (
                <SkillBar label="Communication" percentage={data.communicationScore} />
              )}
              {data.technicalScore !== null && data.technicalScore !== undefined && (
                <SkillBar label="Technical Proficiency" percentage={data.technicalScore} />
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Details & Insights */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* AI Feedback Canvas */}
          <div className="bg-card backdrop-blur-sm border border-border rounded-xl p-8 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] -mr-32 -mt-32"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground tracking-tight">AI Assessment</h3>
                  <p className="text-sm text-muted-foreground">Comprehensive evaluation of your performance.</p>
                </div>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed text-lg font-medium whitespace-pre-line">
                {data.aiFeedback || 'N/A'}
              </div>
            </div>
          </div>

          {/* Strengths & Weaknesses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="bg-card backdrop-blur-sm border border-border rounded-xl p-6 border-t-4 border-t-accent shadow-sm">
              <div className="flex items-center gap-3 mb-6 text-accent">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold tracking-widest uppercase">Core Strengths</span>
              </div>
              <ul className="space-y-4">
                {strengthsList.length > 0 ? strengthsList.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-card-foreground font-medium">
                    <span className="w-2 h-2 mt-2 shrink-0 bg-accent rounded-full"></span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                )) : (
                  <li className="text-muted-foreground italic">No specific strengths recorded.</li>
                )}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="bg-card backdrop-blur-sm border border-border rounded-xl p-6 border-t-4 border-t-orange-500 shadow-sm">
              <div className="flex items-center gap-3 mb-6 text-orange-500">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold tracking-widest uppercase">Areas for Growth</span>
              </div>
              <ul className="space-y-4">
                {weaknessesList.length > 0 ? weaknessesList.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-card-foreground font-medium">
                    <span className="w-2 h-2 mt-2 shrink-0 bg-orange-500 rounded-full"></span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                )) : (
                  <li className="text-muted-foreground italic">No specific weaknesses recorded.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Upskill Recommendations */}
          {data.recommendation && (
             <div className="bg-card backdrop-blur-sm border border-border rounded-xl p-8 relative overflow-hidden shadow-sm">
               <div className="absolute top-0 left-0 w-64 h-64 bg-accent/5 blur-[100px] -ml-32 -mt-32"></div>
               <div className="relative z-10">
                 <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                     <Code className="w-6 h-6" />
                   </div>
                   <div>
                     <h3 className="text-xl font-bold text-foreground tracking-tight">Personalized Upskill Plan</h3>
                     <p className="text-sm text-muted-foreground">Actionable suggestions on what to improve.</p>
                   </div>
                 </div>
                 <div className="space-y-4 text-foreground leading-relaxed text-[15px] font-medium whitespace-pre-line bg-muted/20 p-6 rounded-xl border border-border/50 text-left">
                   {data.recommendation}
                 </div>
               </div>
             </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <footer className="mt-12 flex flex-col md:flex-row gap-4 items-center justify-end">
        <button 
          onClick={() => navigate('/dashboard')}
          className="w-full md:w-auto px-6 py-3 flex items-center justify-center gap-2 rounded-xl font-bold text-muted-foreground hover:text-foreground border border-border bg-card hover:bg-muted/50 transition-all shadow-sm"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Dashboard
        </button>
        <button 
          onClick={() => navigate('/start-interview')}
          className="w-full md:w-auto px-8 py-3 flex items-center justify-center gap-2 rounded-xl font-bold text-accent-foreground bg-accent shadow-lg hover:bg-accent/90 transition-all"
        >
          <RotateCcw className="w-5 h-5" />
          Start Another Interview
        </button>
      </footer>
    </div>
  );
};

export default InterviewFeedback;