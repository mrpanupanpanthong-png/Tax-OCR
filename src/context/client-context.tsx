"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Client } from '@/types';

interface ClientContextType {
  clients: Client[];
  activeClient: Client | null;
  setActiveClient: (client: Client | null) => void;
  isLoading: boolean;
  refreshClients: () => Promise<void>;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshClients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();
      if (Array.isArray(data)) {
        setClients(data);
        
        // Restore active client from localStorage or set the first one if none selected
        const savedClientId = localStorage.getItem('activeClientId');
        if (savedClientId) {
          const savedClient = data.find(c => c.id === savedClientId);
          if (savedClient) {
            setActiveClient(savedClient);
          } else if (data.length > 0) {
            setActiveClient(data[0]);
          }
        } else if (data.length > 0) {
          setActiveClient(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshClients();
  }, []);

  useEffect(() => {
    if (activeClient) {
      localStorage.setItem('activeClientId', activeClient.id);
    }
  }, [activeClient]);

  return (
    <ClientContext.Provider value={{ 
      clients, 
      activeClient, 
      setActiveClient, 
      isLoading, 
      refreshClients 
    }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
}
