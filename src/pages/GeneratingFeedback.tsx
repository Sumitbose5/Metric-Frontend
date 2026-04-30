import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const GeneratingFeedback: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dots, setDots] = useState('');

  // Animated dots for the "Analyzing Performance..." text
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!id) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const pollFeedback = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/interview/feedback/${id}`);
        if (response.ok) {
          const result = await response.json();
          // Check if feedback actually exists and is complete
          if (result.feedback || (result && result.id)) {
             // Ready! Move to the FeedbackDetails page
             navigate(`/interview/feedback/resume/${id}`, { replace: true });
             return;
          }
        }
      } catch (error) {
        console.error("Polling error", error);
      }
      
      // Continue polling after 3 seconds if not ready
      timeoutId = setTimeout(pollFeedback, 3000);
    };

    pollFeedback();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [id, navigate]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050505] text-white gap-6">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-2 border-indigo-500/30 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-indigo-500 animate-ping opacity-20" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white tracking-tight">Analyzing Performance{dots}</h2>
        <p className="text-slate-500 text-sm mt-1">Generating your personalized feedback report...</p>
      </div>
    </div>
  );
};

export default GeneratingFeedback;
