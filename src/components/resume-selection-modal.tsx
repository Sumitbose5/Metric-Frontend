import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface Resume {
  id: string;
  name: string;
  resumeUrl: string;
}

interface ResumeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | undefined;
  onUploadClick: () => void;
  onProceed: (resumeId: string) => void;
  refreshTrigger: number;
}

export const ResumeSelectionModal: React.FC<ResumeSelectionModalProps> = ({
  isOpen,
  onClose,
  userId,
  onUploadClick,
  onProceed,
  refreshTrigger
}) => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [resumeToDelete, setResumeToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      fetchResumes();
    }
  }, [isOpen, userId, refreshTrigger]);

  const fetchResumes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/resume/user/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch resumes');
      const data = await response.json();
      setResumes(data.resumes || []);
      if (data.resumes && data.resumes.length === 1) {
         setSelectedResumeId(data.resumes[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load resumes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setResumeToDelete(id);
  };

  const confirmDelete = async () => {
    if (!resumeToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/resume/${resumeToDelete}/${userId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error('Failed to delete resume');
      }
      setResumes(resumes.filter(r => r.id !== resumeToDelete));
      if (selectedResumeId === resumeToDelete) setSelectedResumeId(null);
      toast.success('Resume deleted successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete resume');
    } finally {
      setIsDeleting(false);
      setResumeToDelete(null);
    }
  };

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
          <h2 className="text-2xl font-bold text-foreground">Select Resume</h2>
          <button
            onClick={onUploadClick}
            className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/80 transition-colors font-medium text-sm border border-border"
          >
            <Upload className="w-4 h-4" />
            Upload New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[200px] mb-6 pr-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p>Loading resumes...</p>
            </div>
          ) : resumes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground border-2 border-dashed border-border rounded-xl p-12">
              <FileText className="w-12 h-12 mb-4 opacity-20" />
              <p className="mb-4 text-center">No resumes found.<br/>Please upload one to continue.</p>
              <button
                onClick={onUploadClick}
                className="bg-accent text-accent-foreground px-6 py-2 rounded-lg font-bold hover:bg-accent/90 transition-colors inline-flex items-center gap-2 shadow-sm"
              >
                <Upload className="w-4 h-4" />
                Upload Resume
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  onClick={() => setSelectedResumeId(resume.id)}
                  className={`relative cursor-pointer border rounded-xl p-4 transition-all ${
                    selectedResumeId === resume.id
                      ? 'border-accent bg-accent/5 shadow-sm'
                      : 'border-border hover:border-accent/40 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start gap-4 pr-6">
                    <div className={`p-3 rounded-lg ${selectedResumeId === resume.id ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate" title={resume.name}>{resume.name}</h3>
                      <a 
                        href={resume.resumeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline inline-flex mt-1 font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View PDF
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteClick(resume.id, e)}
                    className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                    title="Delete resume"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <button
            disabled={!selectedResumeId || resumes.length === 0}
            onClick={() => selectedResumeId && onProceed(selectedResumeId)}
            className="bg-accent text-accent-foreground px-8 py-3 rounded-xl font-bold hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 shadow-lg"
          >
            Proceed
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {resumeToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-sm rounded-xl border border-border shadow-lg p-6 relative">
            <h3 className="text-xl font-bold mb-2">Delete Resume</h3>
            <p className="text-muted-foreground mb-6">Are you sure you want to delete this resume? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setResumeToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors font-medium border border-transparent"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg font-bold hover:bg-destructive/90 transition-colors flex items-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
