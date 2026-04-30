import React, { useState } from 'react';
import { X, Briefcase, ArrowRight } from 'lucide-react';

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: (role: string) => void;
}

const ROLES = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Scientist",
  "Data Analyst",
  "Product Manager",
  "Project Manager",
  "UI/UX Designer",
  "DevOps Engineer",
  "QA Engineer",
  "Marketing Manager",
  "Business Analyst",
  "Human Resources",
];

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({
  isOpen,
  onClose,
  onProceed,
}) => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-2xl rounded-xl border border-border shadow-lg p-6 relative flex flex-col max-h-[80vh]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center justify-between mb-6 pr-8">
          <h2 className="text-2xl font-bold text-foreground">Select Target Role</h2>
        </div>
        
        <p className="text-muted-foreground mb-6">
          Choose the role you are preparing for. The AI will tailor the interview questions specifically for this position.
        </p>

        <div className="flex-1 overflow-y-auto mb-6 pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ROLES.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`flex items-center gap-3 p-3 text-left border rounded-xl transition-all ${
                  selectedRole === role
                    ? 'border-accent bg-accent/10 shadow-sm'
                    : 'border-border hover:border-accent/40 hover:bg-muted/30'
                }`}
              >
                <div className={`p-2 rounded-lg ${selectedRole === role ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'}`}>
                  <Briefcase className="w-4 h-4" />
                </div>
                <span className={`font-semibold ${selectedRole === role ? 'text-accent' : 'text-foreground'}`}>
                  {role}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <button
            disabled={!selectedRole}
            onClick={() => selectedRole && onProceed(selectedRole)}
            className="bg-accent text-accent-foreground px-8 py-3 rounded-xl font-bold hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 shadow-lg"
          >
            Next Step
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
