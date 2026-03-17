import * as XLSX from 'xlsx';
import { Invoice } from '@/types';

export function exportInvoicesToExcel(invoices: Invoice[], fileName: string = 'tax_report.xlsx') {
  // 1. Prepare data for Excel with Thai headers
  const excelData = invoices.map(inv => ({
    'วันที่เอกสาร': inv.invoice_date || '-',
    'เลขที่ใบกำกับ': inv.invoice_no || '-',
    'ประเภท': inv.type === 'sale' ? 'ภาษีขาย (Output)' : 'ภาษีซื้อ (Input)',
    'ชื่อผู้ขาย/ผู้ซื้อ': inv.vendor_name || '-',
    'เลขประจำตัวผู้เสียภาษี': inv.tax_id || '-',
    'จำนวนเงิน': inv.net_amount || 0,
    'ภาษีมูลค่าเพิ่ม (7%)': inv.vat_amount || 0,
    'จำนวนเงินรวม': inv.total_amount || 0,
    'สถานะ': inv.status === 'confirmed' ? 'ตรวจสอบแล้ว' : 'รอตรวจสอบ',
    'ระดับความมั่นใจ AI': inv.raw_data?.confidence_score ? `${inv.raw_data.confidence_score}%` : '-'
  }));

  // 2. Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // 3. Set column widths for better readability
  const wscols = [
    { wch: 12 }, // Date
    { wch: 15 }, // Invoice No
    { wch: 18 }, // Type
    { wch: 30 }, // Vendor
    { wch: 20 }, // Tax ID
    { wch: 12 }, // Net
    { wch: 12 }, // VAT
    { wch: 12 }, // Total
    { wch: 12 }, // Status
    { wch: 15 }, // Confidence
  ];
  worksheet['!cols'] = wscols;

  // 4. Create workbook and append worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tax Invoices');

  // 5. Generate and download
  XLSX.writeFile(workbook, fileName);
}
