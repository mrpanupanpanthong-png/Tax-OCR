"use client";

import React, { useState, useRef } from 'react';
import { useClient } from '@/context/client-context';
import { UploadCloud, File, AlertCircle, FileUp, Loader2, CheckCircle2, UserX, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from 'next/link';

export default function UploadPage() {
  const { activeClient } = useClient();
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{name: string, status: 'success' | 'error', message?: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const filtered = newFiles.filter(f => validTypes.includes(f.type));
    setFiles(prev => [...prev, ...filtered]);
    setResults([]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0 || !activeClient) return;

    setUploading(true);
    const newResults: {name: string, status: 'success' | 'error', message?: string}[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', activeClient.id);

      try {
        const response = await fetch('/api/invoices', {
          method: 'POST',
          body: formData,
        });

        if (response.status === 202 || response.status === 201) {
          newResults.push({ name: file.name, status: 'success' });
        } else {
          const errorData = await response.json();
          newResults.push({ name: file.name, status: 'error', message: errorData.error || 'Upload failed' });
        }
      } catch (err) {
        newResults.push({ name: file.name, status: 'error', message: 'Network error' });
      }
    }

    setResults(newResults);
    setUploading(false);
    
    // Clear files if all successful
    if (newResults.every(r => r.status === 'success')) {
        setTimeout(() => setFiles([]), 1500);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Upload Documents</h2>
          <p className="text-slate-500 mt-2">
              Upload multiple tax invoices for <span className="font-semibold text-indigo-600">{activeClient?.name || 'the selected client'}</span>.
          </p>
        </div>
      </div>

      {!activeClient && (
        <Card className="border-indigo-100 bg-indigo-50/50 mb-6 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-700">
              <UserX className="h-5 w-5" />
              Client Profile Required
            </CardTitle>
            <CardDescription className="text-indigo-600/70 font-medium">
              Please select a client profile from the top menu before uploading documents.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="border-slate-200 shadow-xl overflow-hidden bg-white border-2">
        <CardContent className="p-0">
          <div 
            className={cn(
              "p-12 border-b-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center min-h-[250px] relative group",
              dragActive ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50",
              uploading && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              multiple
              accept="image/*,application/pdf"
              disabled={uploading}
            />
            <div className="p-5 bg-indigo-50 rounded-2xl mb-4 group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300 shadow-sm text-indigo-600">
              <UploadCloud className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                {files.length > 0 ? `${files.length} Documents Selected` : "Drop invoices here to process"}
            </h3>
            <p className="text-sm text-slate-400 mt-1 text-center max-w-sm">
                PDF, JPG, and PNG are supported. Processing happens in the background.
            </p>
          </div>

          {(files.length > 0 || results.length > 0) && (
            <div className="p-8 bg-slate-50/50">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {results.length > 0 ? "Transmission Report" : "Queue for Processing"}
                </h4>
                {!uploading && results.length === 0 && (
                   <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="text-slate-400 hover:text-red-500 hover:bg-red-50 font-bold h-8">
                      Remove All
                   </Button>
                )}
              </div>
              
              <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {(results.length > 0 ? results : files.map(f => ({name: f.name, status: 'pending'}))).map((item, idx) => (
                  <div key={idx} className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border-2 transition-all animate-in slide-in-from-right-4 duration-300",
                    item.status === 'success' ? "bg-white border-emerald-100 shadow-sm" : 
                    item.status === 'error' ? "bg-red-50 border-red-100 shadow-sm" :
                    "bg-white border-slate-100 shadow-sm"
                  )}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn(
                        "p-2.5 rounded-xl shadow-inner",
                        (item as any).status === 'success' ? "bg-emerald-50 text-emerald-600" : 
                        (item as any).status === 'error' ? "bg-red-50 text-red-600" :
                        "bg-slate-50 text-slate-400 border border-slate-100"
                      )}>
                        {item.status === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
                         item.status === 'error' ? <AlertCircle className="w-5 h-5" /> :
                         <File className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                        {item.status === 'error' ? (
                           <p className="text-[10px] text-red-500 font-bold leading-none mt-1 uppercase tracking-tighter">{(item as any).message}</p>
                        ) : item.status === 'success' ? (
                           <p className="text-[10px] text-emerald-500 font-bold leading-none mt-1 uppercase tracking-tighter">Handed off to AI</p>
                        ) : (
                           <p className="text-[10px] text-slate-400 font-bold leading-none mt-1 uppercase tracking-tighter">Waiting in queue</p>
                        )}
                      </div>
                    </div>
                    {!uploading && results.length === 0 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }} 
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {uploading && (
                <div className="mt-8 flex flex-col items-center justify-center p-8 border-2 border-indigo-100 border-dashed rounded-3xl bg-indigo-50/30 animate-pulse">
                   <div className="relative">
                      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                   </div>
                   <p className="text-sm font-black text-indigo-600 mt-4 tracking-tight">Syncing with Secure AI Pipeline...</p>
                </div>
              )}

              {results.length > 0 && !uploading && (
                <div className="mt-10 flex flex-col sm:flex-row gap-4">
                  <Button asChild className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-700 font-bold text-lg shadow-xl shadow-indigo-100 rounded-2xl active:scale-[0.98] transition-all">
                    <Link href="/">
                       Go to Dashboard
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {setFiles([]); setResults([]);}} 
                    className="flex-1 h-14 font-bold text-lg border-2 border-slate-200 hover:bg-slate-50 rounded-2xl active:scale-[0.98] transition-all"
                  >
                    Upload More
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
        {files.length > 0 && !uploading && results.length === 0 && (
          <CardFooter className="p-8 bg-slate-50/80 border-t-2 border-slate-100">
            <Button 
                onClick={(e) => { e.stopPropagation(); handleUpload(); }} 
                className="w-full h-16 text-xl font-black bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-200/50 active:scale-[0.97] transition-all rounded-2xl group"
                disabled={!activeClient}
            >
              <FileUp className="w-6 h-6 mr-3 group-hover:-translate-y-1 transition-transform" />
              Begin AI Analysis for {files.length} {files.length === 1 ? 'Record' : 'Records'}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
