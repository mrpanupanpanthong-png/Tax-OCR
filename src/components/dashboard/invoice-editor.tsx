"use client";

import React, { useState, useEffect } from 'react';
import { Invoice } from '@/types';
import { AlertCircle, DollarSign, Loader2, Maximize2, Minimize2, X, ShieldCheck, AlertTriangle, History, Edit3, User, Clock } from 'lucide-react';
import { FieldSnapshot } from '../ui/field-snapshot';
import { format } from 'date-fns';

interface InvoiceEditorProps {
  invoice: Invoice | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Invoice>) => Promise<void>;
}

export function InvoiceEditor({ invoice, onClose, onSave }: InvoiceEditorProps) {
  const [formData, setFormData] = useState<Partial<Invoice>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isEnlarged, setIsEnlarged] = useState(false);
  const [manuallyVerified, setManuallyVerified] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'history'>('edit');
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Mock currentUser - In real app, this comes from an Auth Context
  const currentUser = {
    name: 'Mock User',
    role: 'data_entry' // Change to 'supervisor' to test supervisor features
  };
  const isSupervisor = currentUser.role === 'supervisor';

  useEffect(() => {
    if (invoice) {
        setFormData(invoice);
        fetchFullData();
    }
  }, [invoice]);

  const fetchFullData = async () => {
    if (!invoice) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`);
      if (res.ok) {
        const fullData = await res.json();
        setFormData(fullData);
        setHistory(fullData.history || []);
      }
    } catch (e) {
      console.error('Failed to fetch full data', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  if (!invoice) return null;

  // Extract confidence data from raw_data
  const rawData = (invoice as any).raw_data || {};
  const overallConfidence = rawData.confidence_score || 0;
  const fieldConfidence = rawData.field_confidence || {};
  const boundingBoxes = rawData.bounding_boxes || {};
  const isDuplicate = rawData.is_duplicate || false;

  const isLocked = overallConfidence < 70 && !manuallyVerified;

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 80) return 'text-amber-500';
    return 'text-red-500';
  };

  const getFieldBorder = (fieldName: string) => {
    const score = fieldConfidence[fieldName];
    if (score === undefined) return 'border-slate-200';
    if (score < 85) return 'border-amber-300 ring-2 ring-amber-50';
    return 'border-slate-200';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Auto convert number fields
    const isNumberField = ['total_amount', 'vat_amount', 'net_amount'].includes(name);
    setFormData(prev => ({
      ...prev,
      [name]: isNumberField ? parseFloat(value) || 0 : value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = { ...formData };
      
      // If the button is "Store Verified Record", force status to confirmed
      if (isSupervisor || formData.status === 'pending') {
        updates.status = 'confirmed';
        
        // If it was a failed AI extraction, clear the error flag now that it's manually fixed
        if (updates.raw_data?.error) {
          updates.raw_data = {
            ...updates.raw_data,
            error: undefined
          };
        }
      }
      
      await onSave(invoice.id, updates);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 transition-opacity backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col md:flex-row animate-in slide-in-from-right-8 duration-300">
        
        {/* Document Preview Panel (Left Side) */}
        <div className="md:w-[60%] bg-slate-50 border-r border-slate-200 flex flex-col h-full relative">
          <div className="p-4 border-b border-slate-200 bg-white shadow-sm z-10 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
              Document Preview
            </h3>
            {overallConfidence > 0 && (
              <div className="flex items-center gap-2 px-2 py-1 bg-white rounded-full border border-slate-100 shadow-sm">
                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${overallConfidence >= 85 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                    style={{ width: `${overallConfidence}%` }}
                  ></div>
                </div>
                <span className={`text-[10px] font-bold ${getConfidenceColor(overallConfidence)}`}>
                  {overallConfidence}% AI
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 p-5 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none"></div>
            <div className="relative w-full h-full p-2 group/preview">
              {(() => {
                const url = formData.file_url || invoice.file_url;
                const isImage = url && (
                  url.toLowerCase().includes('.jpg') || 
                  url.toLowerCase().includes('.jpeg') || 
                  url.toLowerCase().includes('.png') || 
                  url.toLowerCase().includes('.webp') ||
                  url.toLowerCase().includes('image/')
                );
                
                // eslint-disable-next-line react-hooks/rules-of-hooks
                const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
                // eslint-disable-next-line react-hooks/rules-of-hooks
                const [showMagnifier, setShowMagnifier] = useState(false);

                const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
                  const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
                  const x = ((e.pageX - left - window.scrollX) / width) * 100;
                  const y = ((e.pageY - top - window.scrollY) / height) * 100;
                  setMousePos({ x, y });
                };

                if (isImage) {
                  return (
                    <div 
                      className="relative w-full h-full cursor-crosshair overflow-hidden rounded-xl border border-slate-200 bg-white"
                      onMouseEnter={() => setShowMagnifier(true)}
                      onMouseLeave={() => setShowMagnifier(false)}
                      onMouseMove={handleMouseMove}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={url} 
                        className="w-full h-full object-contain transition-all relative z-10"
                        alt="Invoice Preview"
                      />
                      
                      {/* Magnifying Glass Overlay */}
                      {showMagnifier && (
                        <div 
                          className="absolute pointer-events-none z-30 w-48 h-48 rounded-full border-4 border-white shadow-[0_0_20px_rgba(0,0,0,0.3)] bg-no-repeat overflow-hidden"
                          style={{
                            left: `${mousePos.x}%`,
                            top: `${mousePos.y}%`,
                            transform: 'translate(-50%, -50%)',
                            backgroundImage: `url(${url})`,
                            backgroundSize: '400%', // 4x zoom
                            backgroundPosition: `${mousePos.x}% ${mousePos.y}%`,
                            display: 'block'
                          }}
                        />
                      )}
                    </div>
                  );
                }
                
                return (
                  <iframe 
                    src={`${url}#toolbar=0`} 
                    className="w-full h-full rounded-xl border border-slate-200 bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] transition-all relative z-10"
                    title="Invoice Preview"
                  />
                );
              })()}
              <button 
                onClick={() => setIsEnlarged(true)}
                className="absolute top-6 right-6 z-20 p-2.5 bg-white/95 hover:bg-white text-slate-700 rounded-xl shadow-xl border border-slate-200 opacity-0 group-hover/preview:opacity-100 transition-all flex items-center gap-2 text-[11px] font-bold"
              >
                <Maximize2 className="w-4 h-4" />
                Fullscreen
              </button>
            </div>
          </div>
        </div>

        {/* Global Enlarge Overlay */}
        {isEnlarged && (
          <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex flex-col p-4 md:p-10 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Maximize2 className="w-6 h-6 text-indigo-400" />
                Document Full View
              </h3>
              <button 
                onClick={() => setIsEnlarged(false)}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 w-full max-w-6xl mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
              <iframe 
                src={formData.file_url || invoice.file_url} 
                className="w-full h-full bg-white"
                title="Invoice Full Preview"
              />
              <button 
                onClick={() => setIsEnlarged(false)}
                className="absolute bottom-8 right-8 bg-white text-slate-900 px-6 py-3 rounded-xl font-bold shadow-2xl hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <Minimize2 className="w-5 h-5" />
                Close Preview
              </button>
            </div>
          </div>
        )}

        {/* Edit Form Panel (Right Side) */}
        <div className="md:w-[40%] flex flex-col h-full bg-white">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white shadow-sm z-10">
            <div className="flex flex-col">
              <h3 className="font-bold text-lg text-slate-900 tracking-tight">
                {viewMode === 'edit' ? 'Accountant Review' : 'Edit History'}
              </h3>
              <div className="flex gap-2 mt-1">
                <button 
                  onClick={() => setViewMode('edit')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all flex items-center gap-1 ${viewMode === 'edit' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  <Edit3 className="w-3 h-3" />
                  Edit Form
                </button>
                <button 
                  onClick={() => setViewMode('history')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all flex items-center gap-1 ${viewMode === 'history' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  <History className="w-3 h-3" />
                  History
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                   <User className="w-3 h-3" /> 
                   Logged in as
                </span>
                <span className={`text-[11px] font-bold ${isSupervisor ? 'text-purple-600' : 'text-indigo-600'}`}>
                  {currentUser.name} ({isSupervisor ? 'Supervisor' : 'Steward'})
                </span>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-full transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {viewMode === 'history' ? (
              <div className="space-y-4">
                {isLoadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p className="text-sm font-medium">Loading history...</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                    <Clock className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-sm font-medium">No changes recorded yet.</p>
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:inset-y-0 before:left-2 before:w-0.5 before:bg-slate-100">
                    {history.map((log) => (
                      <div key={log.id} className="relative group">
                        <div className="absolute -left-[22px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-indigo-500 z-10"></div>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 shadow-sm group-hover:bg-white group-hover:border-indigo-100 transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
                              {format(new Date(log.timestamp), 'MMM dd, HH:mm')}
                            </span>
                            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                              {log.user_name}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-700 mb-2">
                            Updated <span className="text-indigo-600 uppercase">{log.field_name.replace('_', ' ')}</span>
                          </p>
                          <div className="grid grid-cols-2 gap-3 mt-2 font-mono text-[10px]">
                            <div className="bg-red-50 text-red-700 p-2 rounded border border-red-100 overflow-hidden text-ellipsis italic">
                              - {log.old_value || 'empty'}
                            </div>
                            <div className="bg-emerald-50 text-emerald-900 p-2 rounded border border-emerald-100 overflow-hidden text-ellipsis font-bold">
                              + {log.new_value}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor Name</label>
                  {fieldConfidence.vendor_name && (
                    <span className={`text-[10px] font-bold ${getConfidenceColor(fieldConfidence.vendor_name)}`}>
                      {fieldConfidence.vendor_name}%
                    </span>
                  )}
                </div>
                <div className="flex gap-3 items-center">
                  <input type="text" name="vendor_name" value={formData.vendor_name || ''} onChange={handleChange} className={`flex-1 h-11 px-4 border bg-slate-50 hover:bg-white rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 font-medium ${getFieldBorder('vendor_name')}`} />
                  {boundingBoxes.vendor_name && <FieldSnapshot imageUrl={formData.file_url || invoice.file_url} boundingBox={boundingBoxes.vendor_name} />}
                </div>
              </div>
              
              <div className="col-span-1">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tax ID</label>
                  {fieldConfidence.tax_id && (
                    <span className={`text-[10px] font-bold ${getConfidenceColor(fieldConfidence.tax_id)}`}>
                      {fieldConfidence.tax_id}%
                    </span>
                  )}
                </div>
                <div className="flex gap-2 flex-col">
                  <input type="text" name="tax_id" value={formData.tax_id || ''} onChange={handleChange} className={`w-full h-11 px-4 border bg-slate-50 hover:bg-white rounded-lg shadow-sm focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 font-medium font-mono ${getFieldBorder('tax_id')}`} />
                </div>
              </div>

              <div className="col-span-1">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Branch</label>
                  {fieldConfidence.branch && (
                    <span className={`text-[10px] font-bold ${getConfidenceColor(fieldConfidence.branch)}`}>
                      {fieldConfidence.branch}%
                    </span>
                  )}
                </div>
                <div className="flex gap-2 flex-col">
                  <input type="text" name="branch" value={formData.branch || ''} onChange={handleChange} className={`w-full h-11 px-4 border bg-slate-50 hover:bg-white rounded-lg shadow-sm focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 font-medium ${getFieldBorder('branch')}`} />
                </div>
              </div>

              <div className="col-span-1">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice No.</label>
                  {fieldConfidence.invoice_no && (
                    <span className={`text-[10px] font-bold ${getConfidenceColor(fieldConfidence.invoice_no)}`}>
                      {fieldConfidence.invoice_no}%
                    </span>
                  )}
                </div>
                <div className="flex gap-2 flex-col">
                  <input type="text" name="invoice_no" value={formData.invoice_no || ''} onChange={handleChange} className={`w-full h-11 px-4 border bg-slate-50 hover:bg-white rounded-lg shadow-sm focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 font-medium font-mono ${getFieldBorder('invoice_no')}`} />
                  {boundingBoxes.invoice_no && <FieldSnapshot imageUrl={formData.file_url || invoice.file_url} boundingBox={boundingBoxes.invoice_no} className="w-full !h-8" />}
                </div>
              </div>

              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Issue Date</label>
                <input type="date" name="invoice_date" value={formData.invoice_date || ''} onChange={handleChange} className="w-full h-11 px-4 border border-slate-200 bg-slate-50 hover:bg-white rounded-lg shadow-sm focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 font-medium" />
              </div>

              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                <select name="status" value={formData.status || 'pending'} onChange={handleChange} className="w-full h-11 px-4 border border-slate-200 bg-slate-50 hover:bg-white rounded-lg shadow-sm focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 font-medium">
                  <option value="pending">Review Required</option>
                  <option value="confirmed">Verified</option>
                </select>
              </div>

              <div className="col-span-2 mt-4 pt-6 border-t border-slate-100 relative">
                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  Amount Summary
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Net</label>
                    <input type="number" step="0.01" name="net_amount" value={formData.net_amount || ''} onChange={handleChange} className={`w-full h-11 px-3 border bg-slate-50 hover:bg-white rounded-lg shadow-sm focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-right transition-all font-mono ${getFieldBorder('net_amount')}`} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">VAT</label>
                    <input type="number" step="0.01" name="vat_amount" value={formData.vat_amount || ''} onChange={handleChange} className={`w-full h-11 px-3 border bg-slate-50 hover:bg-white rounded-lg shadow-sm focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-right transition-all font-mono ${getFieldBorder('vat_amount')}`} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-500 uppercase tracking-wider mb-2">Total</label>
                    <input type="number" step="0.01" name="total_amount" value={formData.total_amount || ''} onChange={handleChange} className={`w-full h-11 px-3 border bg-indigo-50/50 rounded-lg shadow-sm shadow-indigo-100/50 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 outline-none font-bold text-indigo-900 text-right transition-all font-mono text-lg ${getFieldBorder('total_amount')}`} />
                  </div>
                </div>
              </div>
            </div>
            
            {(overallConfidence < 70 || isDuplicate || rawData.error) && (
              <div className={`mt-4 p-4 rounded-xl border flex flex-col gap-3 ${rawData.error || isDuplicate ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${rawData.error || isDuplicate ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h5 className={`text-sm font-bold ${rawData.error || isDuplicate ? 'text-red-900' : 'text-amber-900'}`}>
                      {rawData.error ? 'AI Extraction Failed' : isDuplicate ? 'Action Required: Potential Duplicate' : 'Validation Required'}
                    </h5>
                    <p className={`text-xs ${rawData.error || isDuplicate ? 'text-red-700' : 'text-amber-700'} mt-1 font-medium`}>
                      {rawData.error 
                        ? `Error: ${rawData.error}. Please examine the document and enter the fields manually.` 
                        : isDuplicate 
                        ? 'This invoice appears to already exist in the database. Please verify before saving.' 
                        : 'AI confidence score is very low (below 70%). You must manually verify all fields before saving.'}
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${manuallyVerified ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white group-hover:border-indigo-400'}`}>
                    {manuallyVerified && <ShieldCheck className="w-4 h-4" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={manuallyVerified} 
                    onChange={(e) => setManuallyVerified(e.target.checked)} 
                  />
                  <span className="text-sm font-semibold text-slate-700">I have manually verified this data</span>
                </label>
              </div>
            )}
            </>
            )}
          </div>

          <div className="p-5 border-t border-slate-200 bg-slate-50/80 flex justify-end space-x-3 shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.02)] z-10">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-all outline-none">
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={isSaving || isLocked}
              className={`px-5 py-2.5 text-sm font-semibold text-white rounded-lg shadow-md flex items-center transition-all disabled:opacity-50 active:scale-95 outline-none ${isLocked ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Saving...
                </>
              ) : (isSupervisor || formData.status === 'pending') ? 'Store Verified Record' : 'Supervisor Review Required'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
