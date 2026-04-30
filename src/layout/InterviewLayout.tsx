import React, { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { VoiceAssistant } from "@/components/voice-assistant";

interface InterviewLayoutProps {
  children: ReactNode;
  durationInMinutes?: number;
  onEndInterview?: () => void;
  showVoiceAssistant?: boolean;
  isAiSpeaking?: boolean;
  aiTranscript?: string;
  onReplayAudio?: () => void;
}

const InterviewLayout: React.FC<InterviewLayoutProps> = ({
  children,
  durationInMinutes = 45,
  onEndInterview,
  showVoiceAssistant = true,
  isAiSpeaking = false,
  aiTranscript = '',
  onReplayAudio,
}) => {
  const [timeLeft, setTimeLeft] = useState(durationInMinutes * 60);

  // Timer logic
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onEndInterview?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onEndInterview]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="h-screen overflow-hidden bg-[#0a0a0a] text-white font-['Inter']">
      {/* Gradient Background Effect */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
      
      {/* Main Container */}
      <div className="relative h-full flex flex-col overflow-hidden">
        
        {/* Fixed Header - Minimal */}
        <header className="sticky top-0 z-50 flex-shrink-0 border-b border-white/5 bg-black/60 backdrop-blur-xl">
          <div className="max-w-[1600px] mx-auto px-6 py-2.5">
            <div className="flex items-center justify-between">
              
              {/* Logo */}
              <div className="flex items-center gap-2.5">
                <img 
                  src="https://res.cloudinary.com/dgxc8nspo/image/upload/v1769340150/logo_-removebg-preview_ncazxr.png" 
                  alt="Metric Logo" 
                  className="h-8 w-auto"
                />
                <span className="text-lg font-semibold tracking-tight text-white font-inter">
                  Metric
                </span>
              </div>

              {/* Center - Timer Only */}
              <div className="flex items-center gap-5">
                {/* Timer */}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                  timeLeft < 300 
                    ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-mono text-xs font-semibold">
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>

              {/* End Button */}
              <button
                onClick={onEndInterview}
                className="group relative px-5 py-1.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all duration-300 text-xs font-semibold shadow-lg shadow-red-500/20 hover:shadow-red-500/40 active:scale-95"
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  End Interview
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area - Fills remaining space without padding */}
        <main className="flex-1 overflow-hidden min-h-0">
          {children}
        </main>
      </div>

      {/* Voice Assistant */}
      {showVoiceAssistant && (
        <VoiceAssistant
          isActive={true}
          isSpeaking={isAiSpeaking}
          transcript={aiTranscript}
          onMute={() => console.log('Mute toggled')}
          onReplay={onReplayAudio || (() => console.log('Replay clicked'))}
          onEndInterview={onEndInterview}
        />
      )}
    </div>
  );
};

export default InterviewLayout;