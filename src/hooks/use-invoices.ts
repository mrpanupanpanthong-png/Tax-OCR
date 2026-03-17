import useSWR from 'swr';
import { Invoice } from '../types';

// In a real app, this points to your Next.js API route that connects to Supabase
// Fetcher for SWR to communicate with Next.js API routes
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'An error occurred while fetching data');
  }
  return res.json();
};

export function useInvoices(clientId?: string, startDate?: string, endDate?: string) {
  // Construct the URL with query parameters for server-side filtering
  const queryParams = new URLSearchParams();
  if (clientId) queryParams.append('clientId', clientId);
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  
  const url = clientId ? `/api/invoices?${queryParams.toString()}` : null;

  const { data, error, isLoading, mutate } = useSWR<Invoice[]>(url, fetcher, {
    // If we have invoices that are currently in 'queued' or 'processing' status, 
    // poll the server every 3 seconds to get the update.
    refreshInterval: (data) => {
      const hasActiveTasks = data?.some(inv => inv.status === 'queued' || inv.status === 'processing');
      return hasActiveTasks ? 3000 : 0;
    },
    revalidateOnFocus: true
  });

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    // Optimistic update of the local cache
    mutate(
      data?.map(inv => inv.id === id ? { ...inv, ...updates } : inv),
      false
    );
    
    // Call the API to update the database
    try {
      const response = await fetch(`/api/invoices/${id}`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates) 
      });
      
      if (!response.ok) throw new Error('Failed to update invoice');
      
      // Revalidate the data to ensure UI is in sync with server
      mutate();
    } catch (err) {
      console.error('Update failed:', err);
      // Revert if API call fails
      mutate();
    }
  };

  return {
    invoices: data || [],
    isLoading,
    isError: error,
    updateInvoice
  };
}
