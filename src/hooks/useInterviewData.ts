import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface InterviewData {
  userId: string;
  difficulty: Difficulty;
  interviewId?: string;
}

const INTERVIEW_DATA_KEY = ['interviewData'];

// Default interview data
const defaultInterviewData: InterviewData = {
  userId: '',
  difficulty: 'MEDIUM',
  interviewId: undefined
};

// Mock async functions to simulate API calls (since we're storing locally)
const getInterviewData = async (): Promise<InterviewData> => {
  // In a real app, this might fetch from localStorage or an API
  const stored = localStorage.getItem('interviewData');
  return stored ? JSON.parse(stored) : defaultInterviewData;
};

const setInterviewData = async (data: InterviewData): Promise<InterviewData> => {
  // In a real app, this might save to an API
  localStorage.setItem('interviewData', JSON.stringify(data));
  return data;
};

export const useInterviewData = () => {
  const queryClient = useQueryClient();

  // Query to get interview data
  const query = useQuery({
    queryKey: INTERVIEW_DATA_KEY,
    queryFn: getInterviewData,
    initialData: defaultInterviewData,
  });

  // Mutation to update interview data
  const mutation = useMutation({
    mutationFn: setInterviewData,
    onSuccess: (data) => {
      queryClient.setQueryData(INTERVIEW_DATA_KEY, data);
    },
  });

  // Helper functions
  const updateUserId = (userId: string) => {
    const currentData = query.data;
    mutation.mutate({ ...currentData, userId });
  };

  const updateDifficulty = (difficulty: Difficulty) => {
    const currentData = query.data;
    mutation.mutate({ ...currentData, difficulty });
  };

  const updateInterviewId = (interviewId: string) => {
    const currentData = query.data;
    mutation.mutate({ ...currentData, interviewId });
  };

  const updateInterviewData = (data: InterviewData) => {
    mutation.mutate(data);
  };

  return {
    interviewData: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateUserId,
    updateDifficulty,
    updateInterviewId,
    updateInterviewData,
    isUpdating: mutation.isPending,
  };
};