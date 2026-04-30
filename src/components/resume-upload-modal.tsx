import React, { useState, useRef } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ResumeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | undefined;
  onSuccess: () => void;
}

export const ResumeUploadModal: React.FC<ResumeUploadModalProps> = ({
  isOpen,
  onClose,
  userId,
  onSuccess
}) => {
  const [resumeName, setResumeName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Only PDF files are accepted');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setSelectedFile(file);
      if (!resumeName) {
        setResumeName(file.name.replace('.pdf', ''));
      }
    }
  };

  const handleUpload = async () => {
    if (!resumeName.trim()) {
      toast.error('Please enter a resume name');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select a PDF file');
      return;
    }
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', selectedFile);
      formData.append('userId', userId);
      formData.append('resumeName', resumeName);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/resume/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to upload resume');
      }

      toast.success('Resume uploaded successfully');
      setResumeName('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload resume. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetStateAndClose = () => {
    setResumeName('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-lg p-6 relative">
        <button
          onClick={resetStateAndClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Upload className="w-6 h-6 text-accent" />
          Upload Resume
        </h2>

        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Resume Name
            </label>
            <input
              type="text"
              value={resumeName}
              onChange={(e) => setResumeName(e.target.value)}
              placeholder="e.g. Software Engineer 2024"
              className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
              disabled={isUploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              PDF File
            </label>
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                disabled={isUploading}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button
            onClick={resetStateAndClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-lg font-medium hover:bg-muted text-muted-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading || !selectedFile || !resumeName.trim()}
            className="bg-accent text-accent-foreground px-6 py-2 rounded-lg font-bold hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 shadow-md"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
