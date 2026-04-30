import Vapi from "@vapi-ai/web";
import { useRef, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useInterviewData } from "@/hooks/useInterviewData";
import { toast } from "sonner";
import { Loader2, Bot, User as UserIcon, Play, Square, ThumbsUp, MessageSquare } from "lucide-react";
import OutOfAttemptsModal from '@/components/out-of-attempts-modal';

type Message = {
    role: "assistant" | "user";
    text: string;
};

const VAPI_KEY = import.meta.env.VITE_VAPI_KEY;
const VAPI_ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID;

export default function ResumeInterview() {
    const vapiRef = useRef<Vapi | null>(null);
    const userSpeakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useUser();
    const resumeId = location.state?.resumeId;
    const targetRole = location.state?.role;
    const { updateInterviewId, interviewData } = useInterviewData();

    const [messages, setMessages] = useState<Message[]>([]);
    const messagesRef = useRef<Message[]>([]);

    const [isInterviewing, setIsInterviewing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false); // Assistant speaking
    const [isUserSpeaking, setIsUserSpeaking] = useState(false); // User speaking
    const [isStarting, setIsStarting] = useState(false);
    const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
    const [apiUserName, setApiUserName] = useState<string>('');
    const [isOutOfAttemptsModalOpen, setIsOutOfAttemptsModalOpen] = useState(false);
    const [externalEndRequested, setExternalEndRequested] = useState(false);
    const endButtonRef = useRef<HTMLButtonElement | null>(null);

    const addMessage = (message: Message) => {
        const updated = [...messagesRef.current, message];
        messagesRef.current = updated;
        setMessages(updated);
    };

    const startInterview = async () => {
        if (!user?.id || !resumeId || !VAPI_KEY || !VAPI_ASSISTANT_ID) {
            toast.error('Missing requirements to start');
            return;
        }

        setIsStarting(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/interview/resume/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId: user?.id, resumeId, role: targetRole })
            });
            // handle 403 explicitly
            console.log('Resume start response status:', response.status);
            if (response.status === 403) {
                setIsOutOfAttemptsModalOpen(true);
                setIsStarting(false);
                return;
            }

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Failed to start interview');

            const { interviewId, resumeContext, userName, role } = data;
            setApiUserName(userName || user.firstName || 'User');
            updateInterviewId(interviewId);

            vapiRef.current = new Vapi(VAPI_KEY);
            messagesRef.current = [];
            setMessages([]);

            vapiRef.current.on("call-start", () => setIsInterviewing(true));
            // When Vapi signals call-end from the server/assistant side,
            // don't automatically finish the flow (which triggers API calls).
            // Instead, mark that an external end was requested and prompt
            // the candidate to press the END INTERVIEW button.
            vapiRef.current.on("call-end", () => {
                setExternalEndRequested(true);
                // keep isInterviewing true so UI indicates a session is still active
                setIsSpeaking(false);
                setIsUserSpeaking(false);
            });

            // Assistant Speaking States
            vapiRef.current.on("speech-start", () => setIsSpeaking(true));
            vapiRef.current.on("speech-end", () => setIsSpeaking(false));

            vapiRef.current.on("message", (msg: any) => {
                if (msg.type === "transcript") {
                    if (msg.role === "user") {
                        setIsUserSpeaking(true);

                        // Clear existing timeout when user is still talking
                        if (userSpeakingTimeoutRef.current) clearTimeout(userSpeakingTimeoutRef.current);

                        // If it's the final transcript, turn off glow after a short delay
                        if (msg.transcriptType === "final") {
                            addMessage({ role: "user", text: msg.transcript });
                            userSpeakingTimeoutRef.current = setTimeout(() => {
                                setIsUserSpeaking(false);
                            }, 800);
                        }
                    } else if (msg.role === "assistant" && msg.transcriptType === "final") {
                        addMessage({ role: "assistant", text: msg.transcript });
                    }
                }
            });

            vapiRef.current.on("error", (error: any) => {
                console.error("Vapi error:", error);
                setIsInterviewing(false);
                setIsUserSpeaking(false);
            });

            await vapiRef.current.start(VAPI_ASSISTANT_ID, {
                variableValues: { 
                    resume: JSON.stringify(resumeContext),
                    role: role || targetRole
                },
            });

        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to initialize interview');
            setIsInterviewing(false);
        } finally {
            setIsStarting(false);
        }
    };

    // Focus the END INTERVIEW button and draw attention when an external
    // end request arrives.
    useEffect(() => {
        if (externalEndRequested) {
            // focus and scroll into view so the candidate sees the button
            endButtonRef.current?.focus();
            endButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [externalEndRequested]);

    const stopInterview = async () => {
        if (vapiRef.current) vapiRef.current.stop();
        setIsInterviewing(false);
        setIsSpeaking(false);
        setIsUserSpeaking(false);
    // If candidate presses the End Interview button after an external
    // end request, clear the external prompt state.
    setExternalEndRequested(false);

        if (!interviewData?.interviewId) return;

        const conversation = messagesRef.current;
        setIsGeneratingFeedback(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/interview/resume/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    interviewId: interviewData.interviewId,
                    conversation: conversation,
                    role: targetRole
                })
            });
            if (!response.ok) throw new Error('Failed to end interview');

            // get the interviewId from the response
            const { interviewId } = await response.json();

            if(!interviewId) {
                toast.error('Failed to retrieve interview ID');
                setIsGeneratingFeedback(false);
                return;
            }

            // send the interviewId to the "/interview/feedback/resume/:id" page
            navigate(`/interview/feedback/resume/${interviewId}`);

            // navigate('/interview/feedback/resume');
        } catch (error) {
            toast.error('Failed to generate feedback');
            setIsGeneratingFeedback(false);
        }
    };

    if (isGeneratingFeedback) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <h2 className="text-xl font-semibold tracking-tight">Analyzing Performance...</h2>
                <p className="text-slate-400">Emma is preparing your feedback report.</p>
            </div>
        );
    }

    const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    return (
        <div className="relative h-screen w-full bg-[#050505] text-slate-200 flex flex-col font-sans overflow-hidden">
            <header className="flex items-center justify-between px-10 py-5 border-b border-white/5 bg-[#0A0A0A]/50 backdrop-blur-md">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/interviews')}>
                    <img src="https://res.cloudinary.com/dgxc8nspo/image/upload/v1769330002/logo2_ah607m.png" alt="Logo" className="h-9 w-auto object-contain transition-transform group-hover:scale-105" />
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full tracking-widest uppercase">Behavioral Interview</span>
                </div>
            </header>

            <main className="flex-1 flex flex-col px-8 py-6 max-w-7xl mx-auto w-full h-full min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0 mb-6">
                    {/* Emma Box */}
                    <div className={`relative rounded-4xl flex flex-col items-center justify-center border transition-all duration-700 overflow-hidden ${isInterviewing && isSpeaking ? 'bg-[#11111a] border-indigo-500/50 shadow-[0_0_50px_rgba(99,102,241,0.15)]' : 'bg-[#0F0F0F] border-white/5'}`}>
                        <div className={`w-36 h-36 rounded-full flex items-center justify-center mb-6 transition-all duration-500 relative z-10 ${isInterviewing && isSpeaking ? 'bg-indigo-500 text-white shadow-[0_0_40px_rgba(99,102,241,0.4)] scale-105' : 'bg-[#1A1A1A] text-slate-500'}`}>
                            <Bot className="w-16 h-16" />
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight text-white relative z-10">Emma</h3>
                        <p className="text-slate-500 text-sm mt-1 relative z-10 font-semibold uppercase tracking-tighter">AI Interviewer</p>
                        {isInterviewing && isSpeaking && (
                            <div className="absolute inset-0 z-0 flex items-center justify-center">
                                <div className="w-80 h-80 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
                            </div>
                        )}
                    </div>

                    {/* Candidate Box */}
                    <div className={`relative rounded-4xl flex flex-col items-center justify-center border transition-all duration-700 overflow-hidden ${isInterviewing && isUserSpeaking ? 'bg-[#0a1410] border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.15)]' : 'bg-[#0F0F0F] border-white/5'}`}>
                        <div className={`w-36 h-36 rounded-full flex items-center justify-center mb-6 transition-all duration-500 relative z-10 ${isInterviewing && isUserSpeaking ? 'bg-emerald-500 text-white shadow-[0_0_40px_rgba(16,185,129,0.4)] scale-105' : 'bg-[#1A1A1A] text-slate-500'}`}>
                            <UserIcon className="w-16 h-16" />
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight text-white relative z-10">{apiUserName}</h3>
                        <p className="text-slate-500 text-sm mt-1 relative z-10 font-semibold uppercase tracking-tighter">Candidate</p>
                        {isInterviewing && isUserSpeaking && (
                            <div className="absolute inset-0 z-0 flex items-center justify-center">
                                <div className="w-80 h-80 bg-emerald-600/20 rounded-full blur-[120px] animate-pulse"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Transcript Area */}
                <div className="w-full bg-[#0F0F0F] border border-white/5 rounded-2xl py-8 mb-8 flex items-center justify-center text-center px-12 min-h-30">
                    {latestMessage ? (
                        <p className="text-xl text-slate-100 font-medium max-w-3xl leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-500">"{latestMessage.text}"</p>
                    ) : isInterviewing ? (
                        <div className="flex items-center gap-3">
                            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
                            <p className="text-lg text-slate-500 font-medium">Ready for your response...</p>
                        </div>
                    ) : (
                        <p className="text-lg text-slate-600 italic">Start the interview to begin the conversation</p>
                    )}
                </div>

                {/* Controls */}
                <div className="grid grid-cols-3 items-center pb-2">
                    <div />
                    <div className="flex justify-center">
                        {!isInterviewing ? (
                            <button onClick={startInterview} disabled={isStarting} className="group relative inline-flex h-16 items-center justify-center overflow-hidden rounded-full bg-white px-12 font-black text-black transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                                <span className="relative flex items-center gap-3 text-lg">
                                    {isStarting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                                    {isStarting ? "CONNECTING..." : "START INTERVIEW"}
                                </span>
                            </button>
                        ) : (
                            <button
                                ref={endButtonRef}
                                onClick={stopInterview}
                                // keep this button above the external overlay and add
                                // an attention animation when an external end is requested
                                className={`group inline-flex h-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all px-12 font-bold text-red-500 hover:shadow-[0_0_30px_rgba(239,68,68,0.3)] ${externalEndRequested ? 'z-50 ring-4 ring-red-500/30 animate-pulse' : ''}`}
                                aria-pressed="false"
                            >
                                <span className="flex items-center gap-3 text-lg"><Square className="w-5 h-5 fill-current" /> END INTERVIEW</span>
                            </button>
                        )}
                    </div>
                    <div className="flex gap-4 justify-end">
                        <button className="p-4 rounded-2xl bg-[#0F0F0F] hover:bg-[#1A1A1A] text-slate-400 border border-white/5 transition-all"><ThumbsUp className="w-5 h-5" /></button>
                        <button className="p-4 rounded-2xl bg-[#0F0F0F] hover:bg-[#1A1A1A] text-slate-400 border border-white/5 transition-all"><MessageSquare className="w-5 h-5" /></button>
                    </div>
                </div>
            </main>
            {/* External end requested overlay: blur everything and focus attention on the End Interview button */}
            {externalEndRequested && (
                // keep the overlay from covering the bottom controls (approx 9rem)
                <div className="absolute top-0 left-0 right-0 bottom-36 z-40 flex items-center justify-center pointer-events-none">
                    <div className="absolute top-0 left-0 right-0 bottom-0 bg-black/60 backdrop-blur-sm pointer-events-none" />
                    <div className="relative z-50 text-center text-white max-w-xl px-6 pointer-events-auto">
                        <h3 className="text-2xl font-bold mb-2">Please end the interview</h3>
                        <p className="text-slate-300">The interviewer requested to end the session. Please press the <span className="font-bold">END INTERVIEW</span> button to finish and see your feedback.</p>
                    </div>
                </div>
            )}
            {/* Floating, always-visible END INTERVIEW button when external end is requested */}
            {externalEndRequested && (
                <div className="fixed left-1/2 bottom-8 z-60 transform -translate-x-1/2">
                    <button
                        ref={endButtonRef}
                        onClick={stopInterview}
                        className="group inline-flex h-16 items-center justify-center rounded-full bg-red-600 text-white px-14 font-bold shadow-[0_8px_30px_rgba(239,68,68,0.25)]"
                    >
                        <span className="flex items-center gap-3 text-lg"><Square className="w-5 h-5 fill-current" /> END INTERVIEW</span>
                    </button>
                </div>
            )}
            <OutOfAttemptsModal isOpen={isOutOfAttemptsModalOpen} onClose={() => setIsOutOfAttemptsModalOpen(false)} />
        </div>
    );
}