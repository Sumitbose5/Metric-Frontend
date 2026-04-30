import { useState, useEffect } from "react";
import { Star, MessageSquare, Loader2 } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

export default function FeedbackDashboard() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("All");
  const [feedbackData, setFeedbackData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      if (!user?.id) return;
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/interview/feedbacks/${user.id}`);
        const data = await response.json();
        if (data.feedback && Array.isArray(data.feedback)) {
          const sorted = data.feedback.sort((a: any, b: any) => {
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          });
          setFeedbackData(sorted);
        } else {
          setFeedbackData([]);
        }
      } catch (error) {
        console.error("Failed to fetch feedbacks", error);
        setFeedbackData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, [user?.id]);

  const filteredData =
    activeTab === "All"
      ? feedbackData
      : feedbackData.filter((item) => {
          const type = item.interview_type?.toUpperCase() || "";
          return type === activeTab.toUpperCase();
        });

  // Calculate stars: 0 to 100 maps to 0 to 5 stars
  const getStars = (score: number | null | undefined) => {
    if (score === null || score === undefined) return 0;
    return Math.round(score / 20);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const getTitle = (item: any) => {
    if (item.job_role && item.job_role !== "Unknown") {
      return `${item.job_role} Interview`;
    }
    const type = item.interview_type || "Interview";
    return `${type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()} Interview`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading feedback history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-bold uppercase tracking-wider">
            <MessageSquare size={14} />
            Performance Insights
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            Interview Feedback
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Review your past interviews, evaluate your scores, and discover areas for improvement to ace your next round.
          </p>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border inline-flex">
        {["All", "DSA", "Resume"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 text-sm font-bold rounded-md transition-all ${
              activeTab === tab
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {feedbackData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card/50 border border-border rounded-xl">
          <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">No feedback found</h2>
          <p className="text-muted-foreground mb-6">You haven't completed any interviews yet. Take one to get started!</p>
          <button 
            onClick={() => navigate('/start-interview')}
            className="px-6 py-2 bg-accent text-accent-foreground font-bold rounded-lg hover:bg-accent/90 transition-colors"
          >
            Start an Interview
          </button>
        </div>
      ) : (
        <>
          {/* Recent Section */}
          {filteredData.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">Recent Feedback</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {filteredData.slice(0, 2).map((item, idx) => (
                  <div
                    key={item.interviewId || idx}
                    onClick={() => navigate(`/interview/feedback/resume/${item.interviewId}`)}
                    className="bg-card/50 backdrop-blur-sm border border-border p-6 rounded-xl shadow-sm hover:border-accent/30 hover:shadow-lg transition-all group flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                          {formatDate(item.createdAt)}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                            item.interview_type?.toUpperCase() === "DSA"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-purple-500/10 text-purple-400"
                          }`}
                        >
                          {item.interview_type || "N/A"}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg text-foreground group-hover:text-accent transition-colors">
                        {getTitle(item)}
                      </h3>
                      <p className="text-muted-foreground text-sm mt-2 leading-relaxed line-clamp-3">
                        {item.aiFeedback || "N/A"}
                      </p>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                      <div className="flex gap-1 text-accent">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < getStars(item.totalScore) ? "fill-accent text-accent" : "text-muted border-muted"}`} 
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">
                        {item.totalScore !== undefined && item.totalScore !== null ? `${item.totalScore}/100` : "N/A"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* All Feedback List */}
          {filteredData.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">All Feedback</h2>
              <div className="space-y-4">
                {filteredData.map((item, idx) => (
                  <div
                    key={item.interviewId || idx}
                    onClick={() => navigate(`/interview/feedback/resume/${item.interviewId}`)}
                    className="bg-card/50 backdrop-blur-sm border border-border p-5 rounded-xl shadow-sm flex flex-col md:flex-row md:justify-between md:items-center gap-4 hover:border-accent/30 transition-all group cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                            item.interview_type?.toUpperCase() === "DSA"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-purple-500/10 text-purple-400"
                          }`}
                        >
                          {item.interview_type || "N/A"}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          Score: {item.totalScore !== undefined && item.totalScore !== null ? item.totalScore : "N/A"}
                        </span>
                      </div>
                      <h3 className="font-bold text-foreground group-hover:text-accent transition-colors truncate">
                        {getTitle(item)}
                      </h3>
                      <p className="text-muted-foreground text-sm mt-1 truncate">
                        {item.aiFeedback || "N/A"}
                      </p>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${i < getStars(item.totalScore) ? "fill-accent text-accent" : "text-muted/30"}`} 
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              No feedback available for the "{activeTab}" category.
            </div>
          )}
        </>
      )}
    </div>
  );
}
