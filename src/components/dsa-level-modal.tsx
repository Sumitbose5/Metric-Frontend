import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Code2, Zap, Trophy } from 'lucide-react';

interface DsaLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartInterview: (level: 'beginner' | 'intermediate' | 'advanced') => Promise<void> | void;
}

export function DsaLevelModal({ isOpen, onClose, onStartInterview }: DsaLevelModalProps) {
  const [selectedLevel, setSelectedLevel] = useState<'beginner' | 'intermediate' | 'advanced' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartInterview = async () => {
    if (!selectedLevel) return;

    setIsSubmitting(true);
    try {
      await onStartInterview(selectedLevel);
    } catch (error) {
      console.error('Error starting interview:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const levels = [
    {
      id: 'beginner' as const,
      title: 'Beginner',
      description: 'Basic data structures and simple algorithms',
      icon: Code2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
    },
    {
      id: 'intermediate' as const,
      title: 'Intermediate',
      description: 'Complex algorithms and optimization problems',
      icon: Zap,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
    },
    {
      id: 'advanced' as const,
      title: 'Advanced',
      description: 'Expert-level problems and system design',
      icon: Trophy,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Select Interview Difficulty</DialogTitle>
          <DialogDescription>
            Choose the difficulty level that matches your current skill level
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {levels.map((level) => {
            const Icon = level.icon;
            const isSelected = selectedLevel === level.id;

            return (
              <button
                key={level.id}
                onClick={() => setSelectedLevel(level.id)}
                className={`relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? `${level.borderColor} ${level.bgColor}`
                    : 'border-border bg-card hover:border-accent/30'
                }`}
              >
                <div className={`p-3 rounded-lg ${level.bgColor}`}>
                  <Icon className={`w-6 h-6 ${level.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{level.title}</h3>
                  <p className="text-sm text-muted-foreground">{level.description}</p>
                </div>
                {isSelected && (
                  <div className={`absolute top-4 right-4 w-5 h-5 rounded-full ${level.bgColor} border-2 ${level.borderColor} flex items-center justify-center`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${level.color.replace('text-', 'bg-')}`} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleStartInterview}
            disabled={!selectedLevel || isSubmitting}
            className="min-w-[140px]"
          >
            {isSubmitting ? 'Proceeding...' : 'Proceed'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
