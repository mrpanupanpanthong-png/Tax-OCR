"use client";

import React, { useState } from 'react';
import { useInvoices } from '@/hooks/use-invoices';
import { useClient } from '@/context/client-context';
import { DataTable } from '@/components/dashboard/data-table';
import { InvoiceEditor } from '@/components/dashboard/invoice-editor';
import { Invoice } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DownloadCloud, FileText, AlertCircle, DollarSign, Plus, XCircle, CheckCircle2, Clock } from "lucide-react";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { exportInvoicesToExcel } from '@/lib/export-utils';

export default function DashboardPage() {
  const currentYear = new Date().getFullYear();
  const { activeClient } = useClient();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [filterType, setFilterType] = useState<'purchase' | 'sale' | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'verified'>('pending');

  const { invoices, isLoading, isError, updateInvoice } = useInvoices(activeClient?.id, startDate, endDate);

  const handleSaveInvoice = async (id: string, updates: Partial<Invoice>) => {
    await updateInvoice(id, updates);
    if (updates.status === 'confirmed') {
      setActiveTab('verified');
    }
  };

  const handleExport = () => {
    if (verifiedInvoices.length === 0) return;
    const clientName = activeClient?.name || 'Client';
    const typeLabel = filterType ? (filterType === 'sale' ? '_Sales' : '_Purchases') : '_All';
    const fileName = `Tax_Report_${clientName}${typeLabel}_${startDate}_to_${endDate}.xlsx`;
    exportInvoicesToExcel(verifiedInvoices, fileName);
  };

  // Ensure invoices is an array
  let invoicesArray = Array.isArray(invoices) ? invoices : [];
  if (filterType) {
    invoicesArray = invoicesArray.filter(i => i.type === filterType);
  }

  // Split into tabs
  const pendingInvoices = invoicesArray.filter(i => i.status === 'pending');
  const verifiedInvoices = invoicesArray.filter(i => i.status === 'confirmed');
  const activeInvoices = activeTab === 'pending' ? pendingInvoices : verifiedInvoices;

  const totalSalesAmount = verifiedInvoices
    .filter(i => i.type === 'sale')
    .reduce((sum, inv) => sum + (inv.net_amount || 0), 0);
  const totalPurchaseAmount = verifiedInvoices
    .filter(i => i.type === 'purchase')
    .reduce((sum, inv) => sum + (inv.net_amount || 0), 0);


  return (
    <div className="flex-1 space-y-6 p-8 bg-gray-50/50 min-h-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-slate-500 text-sm">
            Review AI-extracted invoices before they become confirmed records.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 font-semibold"
            onClick={handleExport}
            disabled={verifiedInvoices.length === 0}
          >
            <DownloadCloud className="w-4 h-4" />
            Export Verified
          </Button>
          <Link href="/upload">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm font-semibold">
              <Plus className="w-4 h-4" />
              Upload Invoices
            </Button>
          </Link>
        </div>
      </div>

      {!activeClient && (
        <Card className="border-indigo-100 bg-indigo-50/50 p-12 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="max-w-md mx-auto flex flex-col items-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md mb-6 border border-indigo-100">
              <Plus className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">Welcome to Tax OCR Pro</h3>
            <p className="text-slate-500 mt-3 text-lg leading-relaxed">
              To get started, please <Link href="/clients" className="text-indigo-600 font-bold hover:underline">create or select a client profile</Link> from the menu above.
            </p>
            <Link href="/clients" className="mt-8">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 h-12 px-8 text-base font-bold shadow-lg shadow-indigo-200">
                Go to Profiles Management
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {activeClient && isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="font-semibold">Error loading data</p>
            <p className="text-sm">{(isError as any).message || 'Could not connect to the database.'}</p>
          </div>
        </div>
      )}

      {activeClient && (
        <>
          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-4">
            <Card
              className={cn("border-slate-200 shadow-sm transition-all hover:shadow-md bg-white cursor-pointer active:scale-95", activeTab === 'pending' && "ring-2 ring-amber-400 border-transparent")}
              onClick={() => setActiveTab('pending')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Awaiting Review</CardTitle>
                <div className="p-2 bg-amber-50 rounded-lg"><Clock className="h-4 w-4 text-amber-500" /></div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">{pendingInvoices.length}</div>
                <p className="text-xs text-slate-400 mt-1">Click to view</p>
              </CardContent>
            </Card>

            <Card
              className={cn("border-slate-200 shadow-sm transition-all hover:shadow-md bg-white cursor-pointer active:scale-95", activeTab === 'verified' && "ring-2 ring-emerald-500 border-transparent")}
              onClick={() => setActiveTab('verified')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Verified Records</CardTitle>
                <div className="p-2 bg-emerald-50 rounded-lg"><CheckCircle2 className="h-4 w-4 text-emerald-500" /></div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">{verifiedInvoices.length}</div>
                <p className="text-xs text-slate-400 mt-1">Click to view</p>
              </CardContent>
            </Card>

            <Card 
              className={cn("border-slate-200 shadow-sm transition-all hover:shadow-md bg-white cursor-pointer active:scale-95", filterType === 'sale' && "ring-2 ring-blue-500 border-transparent bg-blue-50/20")}
              onClick={() => setFilterType(filterType === 'sale' ? null : 'sale')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Sales (Output) {filterType === 'sale' && "•"}</CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg"><DollarSign className="h-4 w-4 text-blue-600" /></div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">฿{totalSalesAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                <p className="text-xs text-slate-400 mt-2">{filterType === 'sale' ? "Filtering by Sales" : "Verified only"}</p>
              </CardContent>
            </Card>

            <Card 
              className={cn("border-slate-200 shadow-sm transition-all hover:shadow-md bg-white cursor-pointer active:scale-95", filterType === 'purchase' && "ring-2 ring-emerald-500 border-transparent bg-emerald-50/20")}
              onClick={() => setFilterType(filterType === 'purchase' ? null : 'purchase')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Purchase (Input) {filterType === 'purchase' && "•"}</CardTitle>
                <div className="p-2 bg-emerald-50 rounded-lg"><DollarSign className="h-4 w-4 text-emerald-600" /></div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">฿{totalPurchaseAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                <p className="text-xs text-slate-400 mt-2">{filterType === 'purchase' ? "Filtering by Purchases" : "Verified only"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tab Bar */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                    activeTab === 'pending'
                      ? "bg-white text-amber-600 shadow-sm border border-amber-100"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Clock className="w-4 h-4" />
                  Pending Review
                  {pendingInvoices.length > 0 && (
                    <span className="ml-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {pendingInvoices.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('verified')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                    activeTab === 'verified'
                      ? "bg-white text-emerald-600 shadow-sm border border-emerald-100"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Verified Records
                  {verifiedInvoices.length > 0 && (
                    <span className="ml-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {verifiedInvoices.length}
                    </span>
                  )}
                </button>
              </div>
              {filterType && (
                <Button variant="ghost" size="sm" onClick={() => setFilterType(null)} className="text-slate-500 hover:text-slate-900 h-8">
                  <XCircle className="w-4 h-4 mr-2" />
                  Clear Filter
                </Button>
              )}
            </div>

            <DataTable 
              invoices={activeInvoices} 
              isLoading={isLoading}
              startDate={startDate} 
              endDate={endDate} 
              onDateChange={(s, e) => { setStartDate(s); setEndDate(e) }}
              onSelectInvoice={setSelectedInvoice}
            />
          </div>
        </>
      )}

      {selectedInvoice && (
        <InvoiceEditor 
          invoice={selectedInvoice} 
          onClose={() => setSelectedInvoice(null)} 
          onSave={handleSaveInvoice}
        />
      )}
    </div>
  );
}
