"use client";

import React, { useState } from 'react';
import { useClient } from '@/context/client-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Plus, Building2, UserPlus, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ClientsPage() {
  const { clients, activeClient, setActiveClient, refreshClients, isLoading } = useClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', tax_id: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      });

      if (response.ok) {
        const created = await response.json();
        await refreshClients();
        setNewClient({ name: '', tax_id: '' });
        setIsAdding(false);
        // Automatically set as active if it's the first client
        if (clients.length === 0) {
          setActiveClient(created);
        }
      }
    } catch (error) {
      console.error('Error adding client:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Client Profiles</h1>
          <p className="text-slate-500 mt-1">Manage your accounting firm's clients and their tax settings.</p>
        </div>
        {!isAdding && (
          <Button 
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add New Client
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="border-indigo-100 bg-indigo-50/30 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader>
            <CardTitle className="text-lg">Register New Client Profile</CardTitle>
            <CardDescription>Enter the legal company name and 13-digit Tax ID.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Company Name</label>
                <Input 
                  placeholder="e.g. ABC Company Ltd."
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  required
                  className="bg-white"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Tax ID (13 Digits)</label>
                <Input 
                  placeholder="0123456789012"
                  value={newClient.tax_id}
                  onChange={(e) => setNewClient({ ...newClient, tax_id: e.target.value })}
                  required
                  maxLength={13}
                  className="bg-white"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]"
                >
                  {isSubmitting ? "Saving..." : "Create Profile"}
                </Button>
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => setIsAdding(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-400" />
                Registered Clients ({clients.length})
              </CardTitle>
            </div>
          </CardHeader>
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-bold">COMPANY NAME</TableHead>
                <TableHead className="font-bold">TAX ID</TableHead>
                <TableHead className="font-bold text-center">STATUS</TableHead>
                <TableHead className="text-right font-bold">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-400 italic">
                    No clients registered yet. Add your first client to start processing invoices.
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id} className={activeClient?.id === client.id ? "bg-indigo-50/30" : ""}>
                    <TableCell className="font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                          <Building2 className="w-4 h-4" />
                        </div>
                        {client.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-slate-600">{client.tax_id}</TableCell>
                    <TableCell className="text-center">
                      {activeClient?.id === client.id ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 px-3">
                          <CheckCircle2 className="w-3 h-3 mr-1.5" />
                          ACTIVE
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">Standby</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {activeClient?.id !== client.id && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          onClick={() => setActiveClient(client)}
                        >
                          Switch to Client
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      ) || (
                        <Button variant="ghost" size="sm" disabled className="text-slate-400 italic">
                          Currently Managing
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
