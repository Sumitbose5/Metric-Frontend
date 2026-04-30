import Vapi from "@vapi-ai/web";
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useInterviewData } from "../hooks/useInterviewData";
import { toast } from "sonner";
import { Loader2, Bot, User as UserIcon, Square, Play, Mic, MicOff } from "lucide-react";
import { CodeEditor } from "./CodeEditor";

// ─── Environment Variables ────────────────────────────────────────────────────
const VAPI_KEY = import.meta.env.VITE_VAPI_KEY;
const DSA_VAPI_ASSISTANT_ID = import.meta.env.VITE_VAPI_DSA_ASSISTANT_ID;

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

// ─── Helper: format problem into clean plain-text for voice reading ───────────
// Avoids JSON brackets, quotes, backslashes that the AI would read aloud literally.
function formatProblemForVoice(
  meta: ProblemMetadata,
  questionNum: number,
  maxQuestions: number,
  timeRemainingMinutes?: number
): string {
  const p = meta.problem;

  // Format examples as readable prose
  const exampleLines = (meta.examples || [])
    .slice(0, 3) // at most 3 examples passed; AI will pick 1-2 to read
    .map((ex: any, i: number) => {
      // Support both raw exampleText string and structured input/output objects
      if (ex.exampleText) {
        // Strip any markdown-style formatting characters that look bad in voice
        const cleaned = ex.exampleText
          .replace(/\\n/g, "\n")
          .replace(/\\/g, "")
          .trim();
        return `Example ${i + 1}:\n${cleaned}`;
      }
      // Structured format
      const inputStr = ex.input !== undefined ? JSON.stringify(ex.input) : "";
      const outputStr = ex.output !== undefined ? String(ex.output) : ex.expectedOutput !== undefined ? String(ex.expectedOutput) : "";
      return `Example ${i + 1}: Input is ${inputStr}, expected output is ${outputStr}.`;
    })
    .join("\n\n");

  // Format constraints as a plain bulleted list (no JSON brackets)
  const constraintLines = (p.constraints || [])
    .map((c: string) => `- ${c}`)
    .join("\n");

  const timeNote = timeRemainingMinutes !== undefined
    ? `\nTime remaining in interview: approximately ${timeRemainingMinutes} minutes.`
    : "\nTotal interview time: 45 minutes.";

  return `<system_event type="new_question" question_num="${questionNum}" max_questions="${maxQuestions}" title="${p.title}" />

[INSTRUCTION]: You have received a new problem. Acknowledge this event by stating "I have the next problem." or similar, then immediately present the following content to the candidate in a natural, spoken flow.

Problem Title: ${p.title}
Difficulty: ${p.difficulty}

Description:
${p.description}

Examples:
${exampleLines || "No examples provided."}

Constraints:
${constraintLines || "No constraints listed."}
${timeNote}

REMINDER: Translate all constraints/examples to natural English. Do not read JSON, brackets, or code symbols. Pick 1 or 2 examples to explain conversationally.`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DSAInterviewPage() {
  const location = useLocation();
  const navigate = useNavigate(); 
  const { user } = useUser();
  const { updateInterviewId } = useInterviewData();

  // Interview data
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [problemMetadata, setProblemMetadata] = useState<ProblemMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  // Question management — max 2 questions per interview
  const MAX_QUESTIONS = 2;
  const [questionNumber, setQuestionNumber] = useState(1);
  const questionNumberRef = useRef(1);
  const [isLoadingNextQuestion, setIsLoadingNextQuestion] = useState(false);

  // VAPI refs + conversation state
  const vapiRef = useRef<Vapi | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const userSpeakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  // Transcript panel
  const [showTranscript, setShowTranscript] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Timer — 45 minutes
  const INTERVIEW_DURATION_SECONDS = 45 * 60;
  const [timeLeft, setTimeLeft] = useState(INTERVIEW_DURATION_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef(INTERVIEW_DURATION_SECONDS);

  // ── Helpers ──────────────────────────────────────────────────────────────────
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

  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  useEffect(() => {
    if (showTranscript) transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showTranscript]);

  // ── Load interview data on mount ─────────────────────────────────────────────
  useEffect(() => {
    const stateData = location.state as any;

    if (stateData?.interviewId && stateData?.problemMetadata) {
      setInterviewId(stateData.interviewId);
      setProblemMetadata(stateData.problemMetadata);
      setUserId(stateData.userId || user?.id);
      updateInterviewId(stateData.interviewId);
      setIsLoading(false);
    } else {
      const storedId = sessionStorage.getItem("currentInterviewId");
      const storedMeta = sessionStorage.getItem("currentProblemMetadata");
      if (storedId && storedMeta) {
        try {
          setProblemMetadata(JSON.parse(storedMeta));
          setInterviewId(storedId);
          setUserId(user?.id);
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

  // ── Fetch next question ───────────────────────────────────────────────────────
  const fetchNextQuestion = async (): Promise<ProblemMetadata | null> => {
    console.log("Inside fetchNextQuestion");
    if (!interviewId || !userId || !problemMetadata) {
      console.log("Missing parameters for fetching next question");
      return null;
    }
    setIsLoadingNextQuestion(true);
    try {
      const params = new URLSearchParams({
        userId,
        difficulty: problemMetadata.problem.difficulty,
        interviewId,
        excludeProblemId: problemMetadata.problem.id,
      });
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/interview/question?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch next question");
      const data = await res.json();
      console.log("fetchNextQuestion res.json() data:", data);
      return data;
    } catch (err) {
      console.error("Failed to fetch next question:", err);
      toast.error("Failed to load next question");
      return null;
    } finally {
      setIsLoadingNextQuestion(false);
    }
  };

  const handleCodeSubmitted = (code: string, language: string, result: any) => {
    if (vapiRef.current) {
      const accepted = result.verdict === "Pass";
      // Using XML tags for robustness
      const eventContent = `
<system_event 
  type="code_submitted" 
  result="${accepted ? "ACCEPTED" : "FAILED"}" 
  passed="${result.passedCount}" 
  total="${result.totalCount}"
  code="${code}"
  question_num="${questionNumberRef.current}"
/>
The candidate submitted code. Verdict: ${accepted ? "ACCEPTED" : "FAILED"}.`;

      vapiRef.current.send({
        type: "add-message",
        message: { role: "system", content: eventContent },
      });
    }
  };

  // ── Advance to next question ──────────────────────────────────────────────────
  const advanceToNextQuestion = async (toolCallId?: string) => {
    if (questionNumberRef.current >= MAX_QUESTIONS) {
      if (toolCallId) {
        vapiRef.current?.send({
          type: "tool-call-result",
          toolCallId: toolCallId,
          result: "Failed: Maximum questions reached. Conclude the interview naturally.",
        } as any);
      }
      vapiRef.current?.send({
        type: "add-message",
        message: {
          role: "system",
          content: `NOTIFICATION: This was the final question (${MAX_QUESTIONS}/${MAX_QUESTIONS}). Do not introduce any new problems. Begin wrapping up the interview naturally.`,
        },
      });
      return;
    }

    if (timeLeftRef.current < 8 * 60) {
      if (toolCallId) {
        vapiRef.current?.send({
          type: "tool-call-result",
          toolCallId: toolCallId,
          result: "Failed: Not enough time remaining. Skip the next question and begin wrapping up.",
        } as any);
      }
      vapiRef.current?.send({
        type: "add-message",
        message: {
          role: "system",
          content: `NOTIFICATION: Only ${Math.floor(timeLeftRef.current / 60)} minutes remaining. Skip the next question and begin wrapping up the interview.`,
        },
      });
      return;
    }

    console.log("Calling fetchNextQuestion.............")
    const nextMeta = await fetchNextQuestion();
    if (!nextMeta) {
      if (toolCallId) {
        vapiRef.current?.send({
          type: "tool-call-result",
          toolCallId: toolCallId,
          result: "Failed: Could not fetch the next question due to an error.",
        } as any);
      }
      return;
    }

    const nextNum = questionNumberRef.current + 1;
    questionNumberRef.current = nextNum;
    setQuestionNumber(nextNum);
    console.log("Setting state for new problem with nextMeta data:", nextMeta);
    setProblemMetadata(nextMeta);
    sessionStorage.setItem("currentProblemMetadata", JSON.stringify(nextMeta));

    // Formulate the problem content
    const problemContent = formatProblemForVoice(nextMeta, nextNum, MAX_QUESTIONS, Math.floor(timeLeftRef.current / 60));

    // 1. IMPORTANT: Resolve the tool call first
    if (toolCallId) {
      vapiRef.current?.send({
        type: "tool-call-result",
        toolCallId: toolCallId,
        result: "New problem loaded successfully. Please present it to the candidate now.",
      } as any);
    }

    // 2. Inject the actual problem data into the conversation
    vapiRef.current?.send({
      type: "add-message",
      message: {
        role: "system",
        content: problemContent,
      },
    });

    toast.success(`Question ${nextNum} loaded!`);
  };

  // ── Start interview ────────────────────────────────────────────────────────────
  const startInterview = async () => {
    if (!VAPI_KEY || !DSA_VAPI_ASSISTANT_ID) {
      toast.error("VAPI configuration missing.");
      return;
    }
    setIsStarting(true);
    setHasStarted(true);

    try {
      vapiRef.current = new Vapi(VAPI_KEY);
      messagesRef.current = [];
      setMessages([]);

      vapiRef.current.on("call-start", () => {
        setIsInterviewing(true);

        if (problemMetadata) {
          // Send problem in clean voice-friendly format — no raw JSON
          vapiRef.current?.send({
            type: "add-message",
            message: {
              role: "system",
              content: formatProblemForVoice(problemMetadata, 1, MAX_QUESTIONS),
            },
          });

          // Reinforce the anti-hallucination guard
          vapiRef.current?.send({
            type: "add-message",
            message: {
              role: "system",
              content: `IMPORTANT: No code has been submitted yet. The candidate has not run or submitted anything. Do NOT discuss test results, pass/fail status, or code correctness until you receive an actual "EVENT: CODE_SUBMITTED" system message. If the candidate mentions their code or approach, discuss it conceptually only.`,
            },
          });
        }
      });

      vapiRef.current.on("call-end", () => {
        setIsInterviewing(false);
        setIsSpeaking(false);
        setIsUserSpeaking(false);
      });

      vapiRef.current.on("speech-start", () => setIsSpeaking(true));
      vapiRef.current.on("speech-end", () => setIsSpeaking(false));

      vapiRef.current.on("message", (msg: any) => {
        if (msg.type === "transcript") {
          if (msg.role === "user") {
            setIsUserSpeaking(true);
            if (userSpeakingTimeoutRef.current) clearTimeout(userSpeakingTimeoutRef.current);
            if (msg.transcriptType === "final") {
              addMessage({ role: "user", text: msg.transcript });
              userSpeakingTimeoutRef.current = setTimeout(() => setIsUserSpeaking(false), 800);
            }
          } else if (msg.role === "assistant" && msg.transcriptType === "final") {
            addMessage({ role: "assistant", text: msg.transcript });
          }
        }

        // Listen for requestNextQuestion and end_interview_tool tool calls from AI
        if (msg.type === "tool-calls" || msg.type === "function-call") {
          console.log("Inside tool-calls..........");
          const calls = msg.toolCalls || msg.functionCall || [];
          console.log("calls : ", calls);
          for (const call of calls) {
            if (call.name === "requestNextQuestion" || call.function?.name === "requestNextQuestion") {
              console.log("Calling advanceToNextQuestion........");
              advanceToNextQuestion(call.id);
            } else if (call.name === "end_interview_tool" || call.function?.name === "end_interview_tool") {
              console.log("Calling endInterview........");
              endInterview(call.id);
            }
          }
        }
      });

      vapiRef.current.on("error", (error: any) => {
        console.error("Vapi error:", error);
        toast.error("Voice assistant error");
        setIsInterviewing(false);
        setIsUserSpeaking(false);
      });

      console.log("Problem meta data : ", problemMetadata);

      await vapiRef.current.start(DSA_VAPI_ASSISTANT_ID, {
        variableValues: {
          level: problemMetadata?.problem?.difficulty || "intermediate",
          maxQuestions: String(MAX_QUESTIONS),
          firstQuestion: problemMetadata?.problem
            ? `Title: ${problemMetadata.problem.title}\nDescription: ${problemMetadata.problem.description}\nConstraints: ${problemMetadata.problem.constraints.join(', ')}`
            : "No Question Found"
        },
      });

      startTimer();
    } catch (error) {
      console.error("Error starting VAPI DSA interview:", error);
      toast.error("Failed to start voice interview");
      setHasStarted(false);
    } finally {
      setIsStarting(false);
    }
  };

  // ── Timer ─────────────────────────────────────────────────────────────────────
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        timeLeftRef.current = next;

        if (next === 600) {
          vapiRef.current?.send({
            type: "add-message",
            message: {
              role: "system",
              content: `NOTIFICATION: 10 minutes remaining. Current question: ${questionNumberRef.current}/${MAX_QUESTIONS}. Adjust pacing — if question 1 is still unsolved, gently nudge the candidate toward wrapping up.`,
            },
          });
        }

        if (next === 300) {
          vapiRef.current?.send({
            type: "add-message",
            message: {
              role: "system",
              content: `NOTIFICATION: 5 minutes remaining. Begin wrapping up. Do not introduce new problems.`,
            },
          });
        }

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
    vapiRef.current?.send({
      type: "add-message",
      message: {
        role: "system",
        content: `EVENT: INTERVIEW_END\nReason: 45-minute time limit reached. Conclude the interview immediately.`,
      },
    });
    setTimeout(() => endInterview(), 2000);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ── End interview ──────────────────────────────────────────────────────────────
  const endInterview = async (toolCallId?: string) => {
    if (toolCallId) {
      vapiRef.current?.send({
        type: "tool-call-result",
        toolCallId: toolCallId,
        result: "Interview ended successfully.",
      } as any);
    }

    vapiRef.current?.send({
      type: "add-message",
      message: { role: "system", content: `EVENT: INTERVIEW_END` },
    });
    vapiRef.current?.stop();

    if (timerRef.current) clearInterval(timerRef.current);
    setIsInterviewing(false);
    setIsSpeaking(false);
    setIsUserSpeaking(false);

    if (!interviewId) { toast.error("No active interview to end"); return; }
    setIsGeneratingFeedback(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/interview/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ interviewId, conversation: messagesRef.current }),
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

  // ── Derived state ─────────────────────────────────────────────────────────────
  const latestAssistantMsg = [...messages].reverse().find(m => m.role === "assistant");

  const timerColor =
    timeLeft <= 120 ? "text-red-400 border-red-500/40 bg-red-500/10" :
      timeLeft <= 300 ? "text-orange-400 border-orange-500/40 bg-orange-500/10" :
        "text-slate-300 border-white/10 bg-white/[0.03]";

  // ── Generating feedback screen ─────────────────────────────────────────────────
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
          <h2 className="text-xl font-semibold text-white tracking-tight">Analyzing Performance</h2>
          <p className="text-slate-500 text-sm mt-1">Generating your personalized feedback report...</p>
        </div>
      </div>
    );
  }

  // ── Loading screen ─────────────────────────────────────────────────────────────
  if (isLoading || !problemMetadata) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050505]">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto" />
          <p className="text-slate-500 text-sm">Loading interview...</p>
        </div>
      </div>
    );
  }

  // ── Main layout ────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-full bg-[#050505] text-slate-200 flex flex-col font-sans overflow-hidden">

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

        {/* Center: question counter + timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-slate-400">
            <span className="text-white font-semibold">Q{questionNumber}</span>
            <span className="text-slate-600">/</span>
            <span>{MAX_QUESTIONS}</span>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border font-mono font-bold text-xs transition-all duration-500 ${timerColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full bg-current ${isInterviewing ? "animate-pulse" : "opacity-30"}`} />
            {formatTime(timeLeft)}
          </div>

          {isLoadingNextQuestion && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading next problem...</span>
            </div>
          )}
        </div>

        {/* Right: badge + end */}
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
          <div className={`relative flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-500 ${isInterviewing && isSpeaking
            ? "border-indigo-500/40 bg-indigo-500/[0.08]"
            : "border-white/[0.06] bg-white/[0.02]"
            }`}>
            {isInterviewing && isSpeaking && (
              <div className="absolute inset-0 rounded-2xl border border-indigo-500/20 animate-ping pointer-events-none" />
            )}
            <div className={`relative w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${isInterviewing && isSpeaking
              ? "bg-indigo-500 shadow-[0_0_16px_rgba(99,102,241,0.5)]"
              : "bg-[#1A1A1A]"
              }`}>
              <Bot className={`w-3.5 h-3.5 ${isInterviewing && isSpeaking ? "text-white" : "text-slate-500"}`} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-slate-300 leading-none">Aria</span>
              <span className={`text-[10px] mt-0.5 transition-colors ${isInterviewing && isSpeaking ? "text-indigo-400" : "text-slate-600"}`}>
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

          {/* Transcript teaser — click to expand */}
          <div
            className="flex-1 min-w-0 cursor-pointer group"
            onClick={() => setShowTranscript(v => !v)}
          >
            <p className={`text-sm truncate transition-colors ${isInterviewing ? "text-slate-400" : "text-slate-600"
              } group-hover:text-slate-300`}>
              {latestAssistantMsg
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
          <div className={`relative flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-500 ${isInterviewing && isUserSpeaking
            ? "border-emerald-500/40 bg-emerald-500/[0.08]"
            : "border-white/[0.06] bg-white/[0.02]"
            }`}>
            <div className="flex flex-col items-end min-w-0">
              <span className="text-[11px] font-bold text-slate-300 leading-none">{user?.firstName || "You"}</span>
              <span className={`text-[10px] mt-0.5 transition-colors ${isInterviewing && isUserSpeaking ? "text-emerald-400" : "text-slate-600"}`}>
                {isInterviewing && isUserSpeaking ? "Speaking..." : "Candidate"}
              </span>
            </div>
            <div className={`relative w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${isInterviewing && isUserSpeaking
              ? "bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.5)]"
              : "bg-[#1A1A1A]"
              }`}>
              {isInterviewing
                ? <Mic className={`w-3.5 h-3.5 ${isUserSpeaking ? "text-white" : "text-slate-500"}`} />
                : <MicOff className="w-3.5 h-3.5 text-slate-600" />
              }
            </div>
          </div>
        </div>

        {/* Expandable transcript */}
        {showTranscript && messages.length > 0 && (
          <div className="border-t border-white/[0.06] bg-[#060606] max-h-48 overflow-y-auto px-6 py-3 space-y-2 custom-scrollbar">
            {messages.slice(-20).map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-5 h-5 rounded-full flex-none flex items-center justify-center mt-0.5 ${msg.role === "assistant" ? "bg-indigo-500/20" : "bg-emerald-500/20"
                  }`}>
                  {msg.role === "assistant"
                    ? <Bot className="w-3 h-3 text-indigo-400" />
                    : <UserIcon className="w-3 h-3 text-emerald-400" />
                  }
                </div>
                <p className={`text-xs leading-relaxed max-w-[80%] ${msg.role === "assistant" ? "text-slate-400" : "text-slate-300 text-right"
                  }`}>
                  {msg.text}
                </p>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>

      {/* ── Code editor ── */}
      <main className="flex-1 overflow-hidden relative">
        <div className={`h-full transition-all duration-700 ${!isInterviewing ? "blur-md pointer-events-none select-none" : ""}`}>
          <CodeEditor
            problemMetadata={problemMetadata}
            userId={userId || user?.id}
            interviewId={interviewId || undefined}
            onCodeSubmitted={handleCodeSubmitted}
            questionNumber={questionNumber}
          />
        </div>

        {/* Next Question Loading Overlay */}
        {isLoadingNextQuestion && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#050505]/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 bg-[#0d0d0d] border border-white/[0.08] p-8 rounded-2xl shadow-xl">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <div className="text-center space-y-1">
                <h3 className="text-white font-medium">Loading Next Question</h3>
                <p className="text-slate-400 text-sm">Please wait while Aria prepares the problem...</p>
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
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Ready to Begin?</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-1 px-2">
              Your AI interviewer <span className="text-slate-300 font-medium">Aria</span> is ready. You'll start with a brief introduction, then move into the problem.
            </p>
            <p className="text-slate-600 text-xs mb-8">Make sure your microphone is on and you're in a quiet space.</p>
            <button
              onClick={startInterview}
              disabled={isStarting}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-white text-black hover:bg-slate-100 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-[15px] shadow-lg shadow-white/10"
            >
              {isStarting
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Connecting...</>
                : <><Play className="w-5 h-5 fill-current" /> Start Interview</>
              }
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