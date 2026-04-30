import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  Bolt, 
  PlusCircle, 
  History, 
  BarChart3, 
  Trophy, 
  Flame, 
  CheckCircle2, 
  TrendingUp, 
  Sparkles
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useUser();
  const userId = user?.id;
  const [activeTab, setActiveTab] = useState<'All' | 'RESUME' | 'DSA'>('All');

  const { data, isLoading, isError } = useQuery<any, Error>({
    queryKey: ['dashboard', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/dash/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      return res.json();
    },
    staleTime: 1000 * 60 * 1, // 1 minute
    enabled: !!userId,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const perfData = useMemo(() => {
    if (!data?.performanceOverTime) return [];
    // normalize to a Date, sort ascending (past -> left, recent -> right)
    const normalized = (data.performanceOverTime as any[])
      .map((p: any) => ({
        ...p,
        datetime: new Date(`${p.date}T${p.time}`),
      }))
      .filter(Boolean)
      .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

    const filtered = activeTab === 'All' ? normalized : normalized.filter((p: any) => p.type === activeTab);

    // map to chart-friendly shape
    return filtered.map((p: any) => ({
      ...p,
      dateLabel: p.datetime.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      score: p.score,
    }));
  }, [data, activeTab]);

  const formattedName = data?.name || user?.username || 'User';
  console.log("data : ", data);
  const navigate = useNavigate();

  // helper to format relative time like '2h ago', '3d ago', '15 min ago', or 'a moment ago'
  const formatRelativeTime = (d: Date) => {
    const now = Date.now();
    const diff = now - d.getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 45) return 'a moment ago';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const lastInterview = data?.recentInterviews && data.recentInterviews.length > 0
    ? data.recentInterviews.reduce((a: any, b: any) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b)
    : null;
  const lastInterviewTrend = lastInterview ? formatRelativeTime(new Date(lastInterview.createdAt)) : '';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-bold uppercase tracking-wider">
            <Bolt size={14} />
            {data?.attemptsRemaining ?? 0} Free Interviews Remaining
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            Welcome back, {formattedName} 👋
          </h1>
          <p className="text-muted-foreground max-w-xl">
            You’re leveling up with every interview. Keep the momentum going and take on your next challenge.
          </p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-xl font-bold hover:bg-accent/90 transition-all shadow-lg cursor-pointer"
        onClick={() => navigate('/interviews')}>
          <PlusCircle size={20} />
          Start New Interview
        </button>
      </section>

      {/* Stats Overview */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard icon={<History className="text-muted-foreground group-hover:text-accent transition-colors" />} label="Interviews Taken" value={isLoading ? '—' : String(data?.interviewsTaken ?? '0')} trend={lastInterviewTrend} />
        <StatCard icon={<BarChart3 className="text-muted-foreground group-hover:text-accent transition-colors" />} label="Average Score" value={isLoading ? '—' : `${data?.averageScore ?? 0}%`} trend="All-time" />
        <StatCard icon={<Trophy className="text-muted-foreground group-hover:text-accent transition-colors" />} label="Best Score" value={isLoading ? '—' : `${data?.bestScore ?? 0}%`} trend="All-time" />
        <StatCard icon={<Flame className="text-orange-500 fill-orange-500/20" />} label="Current Streak" value={isLoading ? '—' : `${data?.currentStreak ?? 0} Days`} trend="Hot streak" isOrange />
      </section>

      {/* Performance Chart */}
      <section className="bg-card/50 backdrop-blur-sm border border-border p-8 rounded-xl relative overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold text-foreground">Performance Over Time</h2>
            <p className="text-muted-foreground text-sm">Monthly progression of your interview scores</p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border">
            {(['All', 'RESUME', 'DSA'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${tab === activeTab ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64 w-full relative">
          {perfData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-sm text-muted-foreground">No trends to display</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={perfData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.06} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={3} dot={{ r: 3 }} fill="url(#chartGradient)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Strengths & Weaknesses */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkillCard
          title="Your Strengths"
          icon={<CheckCircle2 className="text-accent" />}
          skills={data?.strengths?.map((s: any) => ({ name: s.area, score: s.avgScore, color: 'bg-accent' })) ?? []}
        />
        <SkillCard
          title="Areas to Improve"
          icon={<TrendingUp className="text-orange-500" />}
          isWarning
          skills={data?.areaToImprove ? [{ name: data?.areaToImprove?.area, score: data?.areaToImprove?.avgScore, color: 'bg-orange-500' }] : []}
        />
      </section>

      {/* Recent Interviews Table */}
      <section className="bg-card/50 backdrop-blur-sm border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Recent Interviews</h3>
          <button onClick={() => navigate('/feedback')} className="text-accent text-sm font-bold hover:underline cursor-pointer">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                <th className="px-8 py-4">Date</th>
                <th className="px-8 py-4">Type</th>
                <th className="px-8 py-4">Score</th>
                <th className="px-8 py-4">Difficulty</th>
                <th className="px-8 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-8 py-5 text-sm text-muted-foreground">Loading...</td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={5} className="px-8 py-5 text-sm text-orange-500">Failed to load recent interviews</td>
                </tr>
              )}
              {!isLoading && !isError && (data?.recentInterviews ?? []).slice(0, 3).map((r: any) => (
                <InterviewRow key={r.id} id={r.id} date={r.createdAt} type={r.type} score={`${r.totalScore}%`} duration={r.difficulty} isLow={r.totalScore < 50} />
              ))}
            </tbody>
          </table> 
        </div>
      </section>

      {/* Upgrade Banner */}
      <section className="relative rounded-2xl overflow-hidden p-8 border border-accent/30 bg-linear-to-r from-accent/10 to-transparent backdrop-blur-sm shadow-sm">
        <div className="absolute top-0 right-0 p-8 opacity-20 hidden md:block">
          <Sparkles size={96} className="text-accent" />
        </div>
        <div className="relative z-10 space-y-4 max-w-2xl">
          <h3 className="text-2xl font-bold text-foreground">Master your next interview with Metric Pro</h3>
          <p className="text-muted-foreground text-lg">Get unlimited practice sessions, advanced AI feedback on tone, and curated company question banks.</p>
          <button onClick={() => window.dispatchEvent(new Event('open-beta-modal'))} className="px-6 py-3 bg-accent text-accent-foreground font-bold rounded-xl hover:bg-accent/90 transition-all shadow-lg cursor-pointer">
            Upgrade Now
          </button>
        </div>
      </section>
    </div>
  );
};

// --- Helper Components ---

const StatCard = ({ icon, label, value, trend, isGrayTrend, isOrange }: any) => (
  <div className="bg-card/50 backdrop-blur-sm border border-border p-6 rounded-xl transition-all group hover:shadow-lg hover:border-accent/30">
    <div className="flex items-center justify-between mb-4">
      {icon}
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isOrange ? 'text-orange-500 bg-orange-500/10' : isGrayTrend ? 'text-muted-foreground bg-muted/50' : 'text-accent bg-accent/10'}`}>
        {trend}
      </span>
    </div>
    <p className="text-muted-foreground text-sm font-medium">{label}</p>
    <p className="text-3xl font-extrabold text-foreground mt-1">{value}</p>
  </div>
);

const SkillCard = ({ title, icon, skills, isWarning }: any) => (
  <div className="bg-card/50 backdrop-blur-sm border border-border p-6 rounded-xl shadow-sm">
    <div className="flex items-center gap-2 mb-6">
      <div className={`size-8 rounded-lg flex items-center justify-center ${isWarning ? 'bg-orange-500/10' : 'bg-accent/10'}`}>
        {icon}
      </div>
      <h3 className="font-bold text-foreground">{title}</h3>
    </div>
    <div className="space-y-6">
      {skills.map((skill: any) => (
        <div key={skill.name} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-card-foreground font-medium">{skill.name}</span>
            <span className={`${isWarning ? 'text-orange-500' : 'text-accent'} font-bold`}>{skill.score}%</span>
          </div>
          <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
            <div className={`h-full ${skill.color} rounded-full transition-all duration-1000`} style={{ width: `${skill.score}%` }}></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const InterviewRow = ({ id, date, type, score, duration, isLow }: any) => {
  // date: full locale string passed; expect JS Date string
  let dt = new Date(date);
  if (isNaN(dt.getTime())) dt = new Date();

  const dateLabel = dt.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }); // e.g. 2 April, 2026
  const timeLabel = dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }); // e.g. 11:22 PM

  const difficultyClass = duration === 'beginner' ? 'bg-green-500/10 text-green-500' : duration === 'intermediate' ? 'bg-yellow-500/10 text-yellow-500' : duration === 'advanced' ? 'bg-red-500/10 text-red-500' : 'bg-muted/10 text-muted-foreground';

  const navigate = useNavigate();

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-8 py-5 text-sm font-medium text-card-foreground">
        <div>{dateLabel}</div>
        <div className="text-[12px] text-muted-foreground mt-1">{timeLabel}</div>
      </td>
      <td className="px-8 py-5">
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${type === 'DSA' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
          {type}
        </span>
      </td>
      <td className={`px-8 py-5 text-sm font-bold ${isLow ? 'text-orange-500' : 'text-accent'}`}>{score}</td>
      <td className="px-8 py-5 text-sm text-muted-foreground">
        <span className={`px-2 py-1 rounded text-[12px] font-bold ${difficultyClass}`}>{duration}</span>
      </td>
      <td className="px-8 py-5 text-right">
        <button onClick={() => navigate(`/interview/feedback/resume/${id}`)} className="text-xs font-bold px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted text-foreground transition-colors cursor-pointer">
          View Report
        </button>
      </td>
    </tr>
  );
};

export default Dashboard;