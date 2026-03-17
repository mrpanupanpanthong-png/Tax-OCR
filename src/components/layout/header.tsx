"use client";

import React from 'react';
import { useClient } from '@/context/client-context';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Users, Building2 } from "lucide-react";

export function Header() {
  const { clients, activeClient, setActiveClient, isLoading } = useClient();

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-slate-500">
          <Building2 className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Active Client Profile:</span>
        </div>
        
        <div className="w-[280px]">
          <Select
            value={activeClient?.id || ""}
            onValueChange={(value) => {
              const client = clients.find(c => c.id === value);
              if (client) setActiveClient(client);
            }}
            disabled={isLoading || clients.length === 0}
          >
            <SelectTrigger className="h-9 border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <SelectValue placeholder={isLoading ? "Loading clients..." : "Select a client profile"} />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{client.name}</span>
                    <span className="text-[10px] text-slate-500">Tax ID: {client.tax_id}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {activeClient && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">Managing: {activeClient.name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
