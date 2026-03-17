export type InvoiceStatus = 'pending' | 'confirmed';
export type InvoiceType = 'purchase' | 'sale';

export interface Client {
  id: string;
  name: string;
  tax_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  file_url: string;
  vendor_name: string;
  tax_id: string;
  invoice_no: string;
  invoice_date: string; // YYYY-MM-DD
  total_amount: number;
  vat_amount: number;
  net_amount: number;
  status: InvoiceStatus;
  type: InvoiceType;
  created_at?: string;
  raw_data?: {
    confidence_score?: number;
    field_confidence?: Record<string, number>;
    error?: string;
  };
}

export type InvoiceUpdatePayload = Partial<Omit<Invoice, 'id' | 'client_id' | 'file_url' | 'created_at' | 'type' | 'raw_data'>>;
