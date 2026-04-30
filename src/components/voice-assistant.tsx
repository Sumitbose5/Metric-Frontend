import React, { useState, useEffect } from 'react';
import { Mic, MicOff, RotateCcw, X, Volume2 } from 'lucide-react';

interface VoiceAssistantProps {
  isActive?: boolean;
  isSpeaking?: boolean;
  transcript?: string;
  onMute?: () => void;
  onReplay?: () => void;
  onEndInterview?: () => void;
}

export function VoiceAssistant({
  isActive = true,
  isSpeaking = false,
  transcript = '',
  onMute,
  onReplay,
  onEndInterview,
}: VoiceAssistantProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const handleMute = () => {
    setIsMuted(!isMuted);
    onMute?.();
  };

  return (
    <>
      {/* Floating Orb */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="group fixed bottom-6 right-6 z-50"
          aria-label="Open voice assistant"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 blur-xl group-hover:blur-2xl transition-all duration-500 animate-pulse" />
          
          {/* Main orb */}
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 shadow-2xl shadow-blue-500/50 group-hover:shadow-blue-500/70 transition-all duration-300 group-hover:scale-110">
            
            {/* Idle breathing animation */}
            {!isSpeaking && (
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400/40 to-purple-400/40 animate-[pulse_2s_ease-in-out_infinite]" />
            )}
            
            {/* Speaking waveform effect */}
            {isSpeaking && (
              <div className="absolute inset-0 flex items-center justify-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-0.5 bg-white rounded-full animate-[wave_0.8s_ease-in-out_infinite]"
                    style={{
                      height: '40%',
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            )}
            
            {/* Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Volume2 className="w-6 h-6 text-white" />
            </div>
            
            {/* Ripple effect when speaking */}
            {isSpeaking && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-[ping_1.5s_ease-out_infinite]" />
                <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-[ping_1.5s_ease-out_infinite_0.5s]" />
              </>
            )}
          </div>
        </button>
      )}

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="fixed bottom-6 right-6 z-50 w-96 animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Glassmorphism container */}
          <div className="relative rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 pointer-events-none" />
            
            {/* Header */}
            <div className="relative flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                {/* Mini orb indicator */}
                <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                  {isSpeaking && (
                    <div className="absolute inset-0 flex items-center justify-center gap-0.5">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="w-0.5 bg-white rounded-full animate-[wave_0.8s_ease-in-out_infinite]"
                          style={{
                            height: '30%',
                            animationDelay: `${i * 0.1}s`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {!isSpeaking && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Volume2 className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
                  <p className="text-xs text-gray-400">
                    {isSpeaking ? 'Speaking...' : 'Listening'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Minimize"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            
            {/* Transcript area */}
            <div className="relative p-4 max-h-64 overflow-y-auto">
              {transcript ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Transcript
                  </p>
                  <p className="text-sm text-gray-200 leading-relaxed">
                    {transcript}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-3">
                    <Mic className="w-6 h-6 text-blue-400" />
                  </div>
                  <p className="text-sm text-gray-400">
                    Waiting for AI response...
                  </p>
                </div>
              )}
            </div>
            
            {/* Controls */}
            <div className="relative flex items-center gap-2 p-4 border-t border-white/10">
              <button
                onClick={handleMute}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  isMuted
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                    : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
              
              <button
                onClick={onReplay}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Replay
              </button>
              
              <button
                onClick={onEndInterview}
                className="px-4 py-2.5 rounded-lg font-medium text-sm bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
              >
                End
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom animations */}
      <style>{`
        @keyframes wave {
          0%, 100% { height: 30%; }
          50% { height: 70%; }
        }
      `}</style>
    </>
  );
}
