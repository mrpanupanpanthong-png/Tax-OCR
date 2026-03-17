"use client";

import React, { useState, useRef } from 'react';
import { useClient } from '@/context/client-context';

export function UploadUI({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const { activeClient } = useClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    setError(null);
    // Basic validation
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Please upload a PDF, JPG, or PNG.');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File is too large. Maximum size is 10MB.');
        return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(10); // Fake initial progress
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    if (activeClient) {
      formData.append('clientId', activeClient.id);
    }
    
    // Get clientId from the context or a prop if available
    // For now, we'll try to find it from the global window state if context isn't easy to hook in here, 
    // but better yet, let's assume it should be passed in.
    // Actually, I'll add the useClient hook.
    
    // [EDIT]: I need to import useClient. I will do that in a multi-replace.

    try {
      // Fake progress animation while waiting for API
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      const response = await fetch('/api/invoices', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      setUploadProgress(100);
      
      // Wait a moment to show 100% success before closing
      setTimeout(() => {
        setIsOpen(false);
        setFile(null);
        setUploadProgress(0);
        if (onUploadSuccess) onUploadSuccess();
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 px-4 py-2 rounded-lg transition-all shadow-sm hover:shadow-md hover:shadow-indigo-200 flex items-center gap-2 active:scale-95"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
        Upload Invoices
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl shadow-slate-900/20 w-full max-w-md overflow-hidden animate-in zoom-in-[0.98] duration-300">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-white">
              <h3 className="font-bold text-slate-900 text-lg">Upload Tax Invoice</h3>
              <button 
                onClick={() => !isUploading && setIsOpen(false)} 
                className={`text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-full transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isUploading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="p-6">
              {!file ? (
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
                    isDragging ? 'border-indigo-400 bg-indigo-50 shadow-inner' : 'border-slate-300 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    accept="image/jpeg, image/png, application/pdf"
                  />
                  <div className="mx-auto w-14 h-14 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 12v6"/><path d="m9 15 3-3 3 3"/></svg>
                  </div>
                  <p className="text-sm font-bold text-slate-700 mb-1">Click to upload or drag and drop</p>
                  <p className="text-xs font-medium text-slate-500">PDF, JPG, or PNG (max. 10MB)</p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 flex items-start gap-4">
                  <div className="p-2.5 bg-white rounded-lg shadow-sm border border-slate-100 text-indigo-600">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs font-medium text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    
                    {isUploading && (
                      <div className="mt-3 w-full bg-slate-200 rounded-full h-2 mb-1 overflow-hidden">
                        <div className="bg-indigo-500 h-2 rounded-full transition-all duration-300 ease-out relative overflow-hidden" style={{ width: `${uploadProgress}%` }}>
                          <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite] -translate-x-full"></div>
                        </div>
                      </div>
                    )}
                  </div>
                  {!isUploading && (
                    <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg flex items-start gap-2">
                  <svg className="shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setIsOpen(false)}
                  disabled={isUploading}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50 transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:filter-grayscale flex items-center gap-2 transition-all active:scale-95"
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Extracting...
                    </>
                  ) : 'Process Document'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
