import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from "@livekit/components-react";
import { RoomEvent, TranscriptionSegment, Participant } from "livekit-client";
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useInterviewData } from "../hooks/useInterviewData";
import { toast } from "sonner";
import { Loader2, Bot, User as UserIcon, Square, Play, Mic, MicOff } from "lucide-react";
import { CodeEditor } from "./CodeEditor";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ProblemMetadata {
  problem: {
    id: string;
    metricId: string;
    title: string;
    difficulty: string;
    description: string;
    constraints: string[];
    hints: string[];
    followUps: string[];
  };
  examples: any[];
  test_cases: any[];
  codeSnippets: {
    python?: string;
    java?: string;
    cpp?: string;
    javascript?: string;
  };
}

type Message = {
  role: "assistant" | "user";
  text: string;
};

// ─── Helper: safely extract a plain string token ──────────────────────────────
// Guards against accidentally storing { token: "eyJ..." } instead of "eyJ..."
function extractToken(raw: any): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  // Backend returned a JSON object — extract the token field
  if (typeof raw === "object") {
    return raw.token || raw.accessToken || raw.livekit_token || "";
  }
  return "";
}

// ─── Transcription Sync Component ────────────────────────────────────────────
function TranscriptionSync({
  addMessage,
  setInterimAgentTranscript,
  setInterimUserTranscript,
}: {
  addMessage: (msg: Message) => void;
  setInterimAgentTranscript: (text: string) => void;
  setInterimUserTranscript: (text: string) => void;
}) {
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;
    const onTranscription = (
      segments: TranscriptionSegment[],
      participant?: Participant
    ) => {
      const isAgent =
        participant?.identity === "Aria" || participant?.isAgent;
      const text = segments.map((s) => s.text).join(" ");
      const hasFinal = segments.some((s) => s.final);

      if (isAgent) {
        if (hasFinal) {
          addMessage({ role: "assistant", text });
          setInterimAgentTranscript("");
        } else {
          setInterimAgentTranscript(text);
        }
      } else {
        if (hasFinal) {
          addMessage({ role: "user", text });
          setInterimUserTranscript("");
        } else {
          setInterimUserTranscript(text);
        }
      }
    };

    room.on(RoomEvent.TranscriptionReceived, onTranscription);
    return () => {
      room.off(RoomEvent.TranscriptionReceived, onTranscription);
    };
  }, [room, addMessage, setInterimAgentTranscript, setInterimUserTranscript]);

  return null;
}

// ─── Room Event Handler Component ────────────────────────────────────────────
function RoomEventHandler({
  interviewId,
  setProblemMetadata,
}: {
  interviewId: string;
  setProblemMetadata: (data: any) => void;
}) {
  const room = useRoomContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!room) return;

    const onDataReceived = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (
          data.type === "STATE_CHANGE" &&
          data.state === "GENERATING_FEEDBACK"
        ) {
          room.disconnect();
          toast.success("Interview ended! Generating your feedback...");
          navigate(`/interviews/${interviewId}/result`);
        } else if (data.type === "NEW_DSA_PROBLEM" && data.data) {
          setProblemMetadata(data.data);
          sessionStorage.setItem(
            "currentProblemMetadata",
            JSON.stringify(data.data)
          );
          toast.success("New question loaded!");
        }
      } catch {
        // Ignore non-JSON payloads
      }
    };

    room.on(RoomEvent.DataReceived, onDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, onDataReceived);
    };
  }, [room, interviewId, navigate]);

  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DSAInterviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const { updateInterviewId } = useInterviewData();

  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [problemMetadata, setProblemMetadata] =
    useState<ProblemMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  const MAX_QUESTIONS = 2;
  const [questionNumber, setQuestionNumber] = useState(1);
  const questionNumberRef = useRef(1);
  const [isLoadingNextQuestion, setIsLoadingNextQuestion] = useState(false);

  // ── LiveKit: store ONLY validated plain strings ───────────────────────────
  const [livekitToken, setLivekitToken] = useState<string>("");
  const [livekitUrl, setLivekitUrl] = useState<string>("");

  // Conversation
  const messagesRef = useRef<Message[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  const [showTranscript, setShowTranscript] = useState(false);
  const [interimAgentTranscript, setInterimAgentTranscript] = useState("");
  const [interimUserTranscript, setInterimUserTranscript] = useState("");
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const INTERVIEW_DURATION_SECONDS = 45 * 60;
  const [timeLeft, setTimeLeft] = useState(INTERVIEW_DURATION_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef(INTERVIEW_DURATION_SECONDS);

  const addMessage = (message: Message) => {
    const updated = [...messagesRef.current, message];
    messagesRef.current = updated;
    setMessages(updated);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    if (showTranscript)
      transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showTranscript, interimAgentTranscript, interimUserTranscript]);

  // ── Load interview data ───────────────────────────────────────────────────
  useEffect(() => {
    const stateData = location.state as any;

    if (stateData?.interviewId) {
      setInterviewId(stateData.interviewId);
      if (stateData.problemMetadata) setProblemMetadata(stateData.problemMetadata);
      setUserId(stateData.userId || user?.id);

      // ✅ FIX: Always extract plain strings — guard against object tokens
      const token = extractToken(stateData.token);
      const url =
        typeof stateData.livekitUrl === "string" ? stateData.livekitUrl : "";

      if (token && url) {
        setLivekitToken(token);
        setLivekitUrl(url);
        sessionStorage.setItem("livekitToken", token);
        sessionStorage.setItem("livekitUrl", url);
      } else {
        console.error(
          "LiveKit token or URL is missing/invalid in location.state",
          { rawToken: stateData.token, rawUrl: stateData.livekitUrl }
        );
        toast.error("Interview connection details are invalid. Please restart.");
      }

      updateInterviewId(stateData.interviewId);
      setIsLoading(false);
    } else {
      const storedId = sessionStorage.getItem("currentInterviewId");
      const storedMeta = sessionStorage.getItem("currentProblemMetadata");
      const storedToken = sessionStorage.getItem("livekitToken");
      const storedUrl = sessionStorage.getItem("livekitUrl");

      if (storedId) {
        try {
          if (storedMeta) setProblemMetadata(JSON.parse(storedMeta));
          setInterviewId(storedId);
          setUserId(user?.id);

          // ✅ FIX: sessionStorage always stores strings, but validate anyway
          const token = extractToken(storedToken);
          const url = typeof storedUrl === "string" ? storedUrl : "";

          if (token && url) {
            setLivekitToken(token);
            setLivekitUrl(url);
          } else {
            toast.error("Stored connection details are invalid. Please restart.");
          }

          updateInterviewId(storedId);
          setIsLoading(false);
        } catch {
          toast.error("Failed to load interview data.");
          navigate("/start-interview");
        }
      } else {
        toast.error("No active interview found. Please start a new interview.");
        navigate("/start-interview");
      }
    }
  }, [location, navigate, user?.id]);

  const handleCodeSubmitted = (code: string, language: string, result: any) => {
    console.log("Code submitted:", {
      language,
      verdict: result.verdict,
      passed: result.passedCount,
      total: result.totalCount,
    });
  };

  // ── Start interview ────────────────────────────────────────────────────────
  const startInterview = async () => {
    // ✅ FIX: Validate token is a non-empty plain string BEFORE connecting
    if (!livekitToken || typeof livekitToken !== "string" || !livekitUrl) {
      toast.error(
        "Cannot connect: missing or invalid LiveKit credentials. Please restart the interview."
      );
      console.error("startInterview blocked — invalid token or URL:", {
        livekitToken,
        livekitUrl,
      });
      return;
    }

    setIsStarting(true);
    setHasStarted(true);

    try {
      setIsInterviewing(true);
      startTimer();
      toast.success("🎙️ Connected to the interview!", {
        description: "You are now live with your AI interviewer.",
        duration: 4000,
      });
    } catch (err) {
      console.error("Start error:", err);
      toast.error("Failed to start interview");
      setHasStarted(false);
      setIsInterviewing(false);
    } finally {
      setIsStarting(false);
    }
  };

  // ── Timer ─────────────────────────────────────────────────────────────────
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        timeLeftRef.current = next;
        if (next <= 0) {
          clearInterval(timerRef.current!);
          handleTimeExpired();
          return 0;
        }
        return next;
      });
    }, 1000);
  };

  const handleTimeExpired = () => {
    toast.warning("Time is up! Ending interview...");
    setTimeout(() => endInterview(), 2000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── End interview ─────────────────────────────────────────────────────────
  const endInterview = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsInterviewing(false);
    setIsSpeaking(false);
    setIsUserSpeaking(false);
    // ✅ FIX: Clear token AFTER setting isInterviewing=false so LiveKitRoom
    // unmounts cleanly before token is wiped (avoids a re-render with "" token)
    setTimeout(() => {
      setLivekitToken("");
      setLivekitUrl("");
    }, 100);

    if (!interviewId) {
      toast.error("No active interview to end");
      return;
    }
    setIsGeneratingFeedback(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/interview/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          interviewId,
          conversation: messagesRef.current,
        }),
      });
      if (!response.ok) throw new Error("Failed to end interview");
      sessionStorage.removeItem("currentInterviewId");
      sessionStorage.removeItem("currentProblemMetadata");
      sessionStorage.removeItem("currentAiText");
      toast.success("Interview ended! Generating your feedback...");
      navigate(`/interview/feedback/resume/${interviewId}`);
    } catch (error) {
      console.error("Error ending interview:", error);
      toast.error("Failed to end interview");
      setIsGeneratingFeedback(false);
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const latestAssistantMsg = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");

  const timerColor =
    timeLeft <= 120
      ? "text-red-400 border-red-500/40 bg-red-500/10"
      : timeLeft <= 300
      ? "text-orange-400 border-orange-500/40 bg-orange-500/10"
      : "text-slate-300 border-white/10 bg-white/[0.03]";

  // ── Screens ───────────────────────────────────────────────────────────────
  if (isGeneratingFeedback) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#050505] text-white gap-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-indigo-500/30 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500 animate-ping opacity-20" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white tracking-tight">
            Analyzing Performance
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Generating your personalized feedback report...
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050505]">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto" />
          <p className="text-slate-500 text-sm">Loading interview...</p>
        </div>
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-full bg-[#050505] text-slate-200 flex flex-col font-sans overflow-hidden">

      {/* ── LiveKit Room ── */}
      {/* ✅ FIX: Triple-guard — isInterviewing AND token is a valid non-empty string */}
      {isInterviewing &&
        livekitToken &&
        typeof livekitToken === "string" &&
        livekitUrl && (
          <LiveKitRoom
            token={livekitToken}
            serverUrl={livekitUrl}
            connect={true}
            audio={true}
            onConnected={() => {
              toast.success("🟢 Room connected!", {
                description: "Audio stream is live. You can now speak with Aria.",
                duration: 3000,
              });
            }}
            onDisconnected={() => {
              toast.info("Room disconnected.");
              setIsInterviewing(false);
            }}
            onError={(err) => {
              // ✅ NEW: Surface connection errors visibly
              console.error("LiveKit connection error:", err);
              toast.error(`Connection error: ${err.message}`);
              setIsInterviewing(false);
              setHasStarted(false);
            }}
          >
            <RoomAudioRenderer />
            <TranscriptionSync
              addMessage={addMessage}
              setInterimAgentTranscript={setInterimAgentTranscript}
              setInterimUserTranscript={setInterimUserTranscript}
            />
            {interviewId && (
              <RoomEventHandler
                interviewId={interviewId}
                setProblemMetadata={setProblemMetadata}
              />
            )}
          </LiveKitRoom>
        )}

      {/* ── Header ── */}
      <header className="flex-none flex items-center justify-between px-6 h-14 border-b border-white/[0.06] bg-[#080808]/80 backdrop-blur-xl z-20">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate("/interviews")}
        >
          <img
            src="https://res.cloudinary.com/dgxc8nspo/image/upload/v1769330002/logo2_ah607m.png"
            alt="Logo"
            className="h-7 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-slate-400">
            <span className="text-white font-semibold">Q{questionNumber}</span>
            <span className="text-slate-600">/</span>
            <span>{MAX_QUESTIONS}</span>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full border font-mono font-bold text-xs transition-all duration-500 ${timerColor}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full bg-current ${
                isInterviewing ? "animate-pulse" : "opacity-30"
              }`}
            />
            {formatTime(timeLeft)}
          </div>
          {isLoadingNextQuestion && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading next problem...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold rounded-full tracking-widest uppercase hidden sm:block">
            DSA Interview
          </span>
          {isInterviewing && (
            <button
              onClick={() => endInterview()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-full font-semibold text-xs transition-all"
            >
              <Square className="w-3 h-3 fill-current" />
              End
            </button>
          )}
        </div>
      </header>

      {/* ── Voice panel ── */}
      <div className="flex-none border-b border-white/[0.06] bg-[#080808]/60 backdrop-blur-sm">
        <div className="flex items-center gap-4 px-6 py-3">
          {/* AI card */}
          <div
            className={`relative flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-500 ${
              isInterviewing && isSpeaking
                ? "border-indigo-500/40 bg-indigo-500/[0.08]"
                : "border-white/[0.06] bg-white/[0.02]"
            }`}
          >
            {isInterviewing && isSpeaking && (
              <div className="absolute inset-0 rounded-2xl border border-indigo-500/20 animate-ping pointer-events-none" />
            )}
            <div
              className={`relative w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                isInterviewing && isSpeaking
                  ? "bg-indigo-500 shadow-[0_0_16px_rgba(99,102,241,0.5)]"
                  : "bg-[#1A1A1A]"
              }`}
            >
              <Bot
                className={`w-3.5 h-3.5 ${
                  isInterviewing && isSpeaking ? "text-white" : "text-slate-500"
                }`}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-slate-300 leading-none">
                Aria
              </span>
              <span
                className={`text-[10px] mt-0.5 transition-colors ${
                  isInterviewing && isSpeaking
                    ? "text-indigo-400"
                    : "text-slate-600"
                }`}
              >
                {isInterviewing && isSpeaking ? "Speaking..." : "AI Interviewer"}
              </span>
            </div>
            {isInterviewing && isSpeaking && (
              <div className="flex gap-[3px] items-center ml-1">
                {[0, 100, 200, 100, 0].map((delay, i) => (
                  <div
                    key={i}
                    className="w-[2px] rounded-full bg-indigo-400"
                    style={{
                      height: i % 2 === 0 ? "8px" : "14px",
                      animation: `dsaPulse 0.8s ease-in-out ${delay}ms infinite alternate`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Transcript teaser */}
          <div
            className="flex-1 min-w-0 cursor-pointer group"
            onClick={() => setShowTranscript((v) => !v)}
          >
            <p
              className={`text-sm truncate transition-colors ${
                isInterviewing ? "text-slate-400" : "text-slate-600"
              } group-hover:text-slate-300`}
            >
              {interimAgentTranscript
                ? `"${interimAgentTranscript}"`
                : latestAssistantMsg
                ? `"${latestAssistantMsg.text}"`
                : isInterviewing
                ? "Listening for conversation..."
                : "Start the interview to begin speaking with Aria."}
            </p>
            {messages.length > 0 && (
              <p className="text-[10px] text-slate-600 mt-0.5 group-hover:text-slate-500 transition-colors">
                {showTranscript ? "▲ Hide transcript" : "▼ View full transcript"}
              </p>
            )}
          </div>

          {/* User card */}
          <div
            className={`relative flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-500 ${
              isInterviewing && isUserSpeaking
                ? "border-emerald-500/40 bg-emerald-500/[0.08]"
                : "border-white/[0.06] bg-white/[0.02]"
            }`}
          >
            <div className="flex flex-col items-end min-w-0">
              <span className="text-[11px] font-bold text-slate-300 leading-none">
                {user?.firstName || "You"}
              </span>
              <span
                className={`text-[10px] mt-0.5 transition-colors ${
                  isInterviewing && isUserSpeaking
                    ? "text-emerald-400"
                    : "text-slate-600"
                }`}
              >
                {isInterviewing && isUserSpeaking ? "Speaking..." : "Candidate"}
              </span>
            </div>
            <div
              className={`relative w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                isInterviewing && isUserSpeaking
                  ? "bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.5)]"
                  : "bg-[#1A1A1A]"
              }`}
            >
              {isInterviewing ? (
                <Mic
                  className={`w-3.5 h-3.5 ${
                    isUserSpeaking ? "text-white" : "text-slate-500"
                  }`}
                />
              ) : (
                <MicOff className="w-3.5 h-3.5 text-slate-600" />
              )}
            </div>
          </div>
        </div>

        {/* Expandable transcript */}
        {showTranscript &&
          (messages.length > 0 ||
            interimAgentTranscript ||
            interimUserTranscript) && (
            <div className="border-t border-white/[0.06] bg-[#060606] max-h-48 overflow-y-auto px-6 py-3 space-y-2 custom-scrollbar">
              {messages.slice(-20).map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex-none flex items-center justify-center mt-0.5 ${
                      msg.role === "assistant"
                        ? "bg-indigo-500/20"
                        : "bg-emerald-500/20"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <Bot className="w-3 h-3 text-indigo-400" />
                    ) : (
                      <UserIcon className="w-3 h-3 text-emerald-400" />
                    )}
                  </div>
                  <p
                    className={`text-xs leading-relaxed max-w-[80%] ${
                      msg.role === "assistant"
                        ? "text-slate-400"
                        : "text-slate-300 text-right"
                    }`}
                  >
                    {msg.text}
                  </p>
                </div>
              ))}
              {interimUserTranscript && (
                <div className="flex gap-3 flex-row-reverse">
                  <div className="w-5 h-5 rounded-full flex-none flex items-center justify-center mt-0.5 bg-emerald-500/20 opacity-70">
                    <UserIcon className="w-3 h-3 text-emerald-400" />
                  </div>
                  <p className="text-xs leading-relaxed max-w-[80%] text-slate-300/70 text-right italic">
                    {interimUserTranscript}
                  </p>
                </div>
              )}
              {interimAgentTranscript && (
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full flex-none flex items-center justify-center mt-0.5 bg-indigo-500/20 opacity-70">
                    <Bot className="w-3 h-3 text-indigo-400" />
                  </div>
                  <p className="text-xs leading-relaxed max-w-[80%] text-slate-400/70 italic">
                    {interimAgentTranscript}
                  </p>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>
          )}
      </div>

      {/* ── Code editor ── */}
      <main className="flex-1 overflow-hidden relative">
        <div
          className={`h-full transition-all duration-700 ${
            !isInterviewing ? "blur-md pointer-events-none select-none" : ""
          }`}
        >
          <CodeEditor
            problemMetadata={problemMetadata}
            userId={userId || user?.id}
            interviewId={interviewId || undefined}
            onCodeSubmitted={handleCodeSubmitted}
            questionNumber={questionNumber}
          />
        </div>

        {isLoadingNextQuestion && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#050505]/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 bg-[#0d0d0d] border border-white/[0.08] p-8 rounded-2xl shadow-xl">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <div className="text-center space-y-1">
                <h3 className="text-white font-medium">Loading Next Question</h3>
                <p className="text-slate-400 text-sm">
                  Please wait while Aria prepares the problem...
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Start modal ── */}
      {!hasStarted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="bg-[#0f0f0f] border border-white/[0.08] rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 rounded-full border border-indigo-500/20 animate-ping" />
              <Bot className="w-9 h-9 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
              Ready to Begin?
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-1 px-2">
              Your AI interviewer{" "}
              <span className="text-slate-300 font-medium">Aria</span> is ready.
              You'll start with a brief introduction, then move into the problem.
            </p>
            <p className="text-slate-600 text-xs mb-8">
              Make sure your microphone is on and you're in a quiet space.
            </p>
            <button
              onClick={startInterview}
              disabled={isStarting}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-white text-black hover:bg-slate-100 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-[15px] shadow-lg shadow-white/10"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Connecting...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" /> Start Interview
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dsaPulse {
          from { opacity: 0.5; transform: scaleY(0.7); }
          to { opacity: 1; transform: scaleY(1.3); }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }
      `}</style>
    </div>
  );
}