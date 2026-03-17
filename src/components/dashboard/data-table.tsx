"use client";

import React from 'react';
import { Invoice } from '@/types';
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface DataTableProps {
  invoices: Invoice[];
  onSelectInvoice: (invoice: Invoice) => void;
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  isLoading: boolean;
}

export function DataTable({ 
  invoices, 
  onSelectInvoice, 
  startDate, 
  endDate, 
  onDateChange, 
  isLoading 
}: DataTableProps) {
  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold text-slate-900">Tax Invoices</CardTitle>
          <p className="text-sm text-slate-500">View and manage your recent extractions.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Search invoices..."
              className="pl-9 w-[200px] lg:w-[300px] h-9 bg-slate-50 border-slate-200"
            />
          </div>
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => onDateChange(e.target.value, endDate)}
              className="text-xs font-semibold text-slate-600 border-none bg-transparent focus:ring-0 cursor-pointer outline-none"
            />
            <span className="text-slate-300 text-xs">-</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => onDateChange(startDate, e.target.value)}
              className="text-xs font-semibold text-slate-600 border-none bg-transparent focus:ring-0 cursor-pointer outline-none"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-200">
              <TableHead className="w-[150px] font-bold text-slate-500">INVOICE NO.</TableHead>
              <TableHead className="font-bold text-slate-500">TYPE</TableHead>
              <TableHead className="font-bold text-slate-500">DATE</TableHead>
              <TableHead className="font-bold text-slate-500">VENDOR</TableHead>
              <TableHead className="text-right font-bold text-slate-500">NET AMOUNT</TableHead>
              <TableHead className="text-right font-bold text-slate-500">VAT</TableHead>
              <TableHead className="text-right font-bold text-slate-500">TOTAL</TableHead>
              <TableHead className="text-center font-bold text-slate-500">CONFID.</TableHead>
              <TableHead className="text-center font-bold text-slate-500">STATUS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-slate-400 animate-pulse">
                  Fetching accounting records...
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-slate-500">
                  No invoices found for the selected period.
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => {
                const isProcessing = inv.status === 'pending' && !inv.vendor_name && !inv.raw_data?.error;
                const hasError = !!inv.raw_data?.error;
                
                return (
                  <TableRow 
                    key={inv.id} 
                    className={cn(
                      "cursor-pointer hover:bg-slate-50 transition-colors border-slate-100",
                      isProcessing && "opacity-70 cursor-wait bg-slate-50/10",
                      hasError && "bg-red-50/50 hover:bg-red-50"
                    )}
                    onClick={() => !isProcessing && onSelectInvoice(inv)}
                  >
                    <TableCell className="font-bold text-slate-900">
                        {inv.invoice_no || (isProcessing ? "PRO-SYNC..." : hasError ? "ERROR" : "N/A")}
                    </TableCell>
                    <TableCell>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                        hasError ? 'bg-red-100 text-red-700' :
                        inv.type === 'sale' ? 'bg-blue-100 text-blue-700' : 
                        inv.type === 'purchase' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {hasError ? 'Failed' : inv.type === 'sale' ? 'Output' : inv.type === 'purchase' ? 'Input' : 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600">
                        {inv.invoice_date || (isProcessing ? "WAITING..." : "-")}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium text-slate-700">
                        {hasError ? (
                          <span className="text-red-600 font-semibold">{inv.raw_data.error}</span>
                        ) : inv.vendor_name || (isProcessing ? "ANALYZING BY AI..." : "N/A")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-600">
                      {hasError ? '-' : (inv.net_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-400">
                      {hasError ? '-' : (inv.vat_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900 font-mono text-lg">
                      {hasError ? '-' : (inv.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      {hasError ? (
                        <span className="text-xs font-bold text-red-600">NA</span>
                      ) : inv.raw_data?.confidence_score ? (
                        <span className={`text-xs font-bold ${
                          inv.raw_data.confidence_score >= 90 ? 'text-emerald-600' : 
                          inv.raw_data.confidence_score >= 80 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {inv.raw_data.confidence_score}%
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isProcessing ? (
                        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse">
                          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                          Processing
                        </Badge>
                      ) : (
                        <Badge 
                          variant={inv.status === 'confirmed' ? "default" : "outline"}
                          className={inv.status === 'confirmed' 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50" 
                            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50"
                          }
                        >
                          {inv.status === 'confirmed' ? 'Verified' : 'Pending'}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
