import { useState, useRef, useCallback, useEffect } from 'react';

// Voice interview states
export type VoiceState = 'IDLE' | 'AI_SPEAKING' | 'LISTENING' | 'PROCESSING';

interface UseVoiceInterviewProps {
  onTranscriptComplete: (transcript: string) => Promise<void>;
  silenceTimeout?: number; // milliseconds
  interviewId: string;
}

interface UseVoiceInterviewReturn {
  state: VoiceState;
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  isSpeaking: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  playAudio: (audioUrl: string) => Promise<void>;
  stopAudio: () => void;
  resetError: () => void;
}

export const useVoiceInterview = ({
  onTranscriptComplete,
  silenceTimeout = 5000,
  interviewId,
}: UseVoiceInterviewProps): UseVoiceInterviewReturn => {
  // State management
  const [state, setState] = useState<VoiceState>('IDLE');
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup and state management
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef<boolean>(false);

  // Initialize Speech Recognition
  const initRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;

    // Check browser compatibility
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return null;
    }

    const recognition = new SpeechRecognition();
    
    // Configuration
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    // Event handlers
    recognition.onstart = () => {
      console.log('Speech recognition started');
      isListeningRef.current = true;
      setState('LISTENING');
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log('Speech recognition result received');
      
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptPart = result[0].transcript;

        if (result.isFinal) {
          finalText += transcriptPart + ' ';
        } else {
          interimText += transcriptPart;
        }
      }

      // Update interim transcript
      if (interimText) {
        setInterimTranscript(interimText);
      }

      // Update final transcript
      if (finalText) {
        setTranscript(prev => prev + finalText);
        setInterimTranscript('');
      }

      // Reset silence timer on any speech
      resetSilenceTimer();
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permissions.');
      } else if (event.error === 'no-speech') {
        console.log('No speech detected, continuing...');
        // Don't treat no-speech as error, just continue
      } else if (event.error === 'network') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      isListeningRef.current = false;
      
      // If we were listening and it ended unexpectedly, restart
      if (state === 'LISTENING' && !error) {
        console.log('Recognition ended unexpectedly, restarting...');
        setTimeout(() => {
          if (isListeningRef.current === false && state === 'LISTENING') {
            try {
              recognition.start();
            } catch (err) {
              console.error('Failed to restart recognition:', err);
            }
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [state, error]);

  // Reset silence timer
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    silenceTimerRef.current = setTimeout(() => {
      console.log('Silence detected, stopping listening');
      stopListening();
    }, silenceTimeout);
  }, [silenceTimeout]);

  // Start listening
  const startListening = useCallback(async () => {
    console.log('Starting listening...');
    
    // Stop any playing audio first
    if (audioRef.current && !audioRef.current.paused) {
      stopAudio();
    }

    const recognition = initRecognition();
    if (!recognition) return;

    try {
      // Reset transcript
      setTranscript('');
      setInterimTranscript('');
      
      // Start recognition
      recognition.start();
      
      // Start silence timer
      resetSilenceTimer();
    } catch (err: any) {
      console.error('Failed to start recognition:', err);
      if (err.message?.includes('already started')) {
        console.log('Recognition already started, continuing...');
      } else {
        setError('Failed to start listening. Please try again.');
      }
    }
  }, [initRecognition, resetSilenceTimer]);

  // Stop listening
  const stopListening = useCallback(async () => {
    console.log('Stopping listening...');
    
    // Clear silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // Stop recognition
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
        isListeningRef.current = false;
      } catch (err) {
        console.error('Error stopping recognition:', err);
      }
    }

    // Get final transcript
    const finalTranscript = transcript.trim();
    
    if (finalTranscript) {
      console.log('Final transcript:', finalTranscript);
      setState('PROCESSING');
      
      try {
        await onTranscriptComplete(finalTranscript);
      } catch (err) {
        console.error('Error processing transcript:', err);
        setError('Failed to process your response. Please try again.');
        setState('IDLE');
      }
    } else {
      console.log('No transcript to send');
      setState('IDLE');
    }
  }, [transcript, onTranscriptComplete]);

  // Play audio
  const playAudio = useCallback(async (audioUrl: string): Promise<void> => {
    console.log('Playing audio...');
    
    // Stop listening if active
    if (isListeningRef.current && recognitionRef.current) {
      recognitionRef.current.stop();
      isListeningRef.current = false;
    }

    setState('AI_SPEAKING');

    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        console.log('Audio playback ended');
        setState('IDLE');
        URL.revokeObjectURL(audioUrl);
        
        // Automatically start listening after audio ends
        setTimeout(() => {
          startListening();
        }, 500);
        
        resolve();
      };

      audio.onerror = (err) => {
        console.error('Audio playback error:', err);
        setState('IDLE');
        URL.revokeObjectURL(audioUrl);
        setError('Failed to play audio');
        reject(err);
      };

      audio.play().catch(err => {
        console.error('Failed to play audio:', err);
        setState('IDLE');
        setError('Failed to play audio');
        reject(err);
      });
    });
  }, [startListening]);

  // Stop audio
  const stopAudio = useCallback(() => {
    console.log('Stopping audio...');
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // Start listening immediately
    if (state === 'AI_SPEAKING') {
      startListening();
    }
  }, [state, startListening]);

  // Reset error
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Cleaning up voice interview hook');
      
      // Stop recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.error('Error stopping recognition on cleanup:', err);
        }
        recognitionRef.current = null;
      }

      // Stop audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Clear timers
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  return {
    state,
    transcript,
    interimTranscript,
    isListening: state === 'LISTENING',
    isSpeaking: state === 'AI_SPEAKING',
    error,
    startListening,
    stopListening,
    playAudio,
    stopAudio,
    resetError,
  };
};
