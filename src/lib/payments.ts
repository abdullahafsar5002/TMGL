import { supabase } from '@/lib/supabase';
import { getErrorMessage, toUserFacingServiceError } from '@/lib/errors';

export type SettlementMethod = 'cash' | 'bank_transfer' | 'cheque' | 'other';

export interface FeeInvoiceRecord {
  id: string;
  invoice_number: string | null;
  payer_profile_id: string | null;
  product_key: string | null;
  kind: string | null;
  description: string | null;
  amount_minor: number;
  currency: string;
  status: string;
  created_at: string;
  due_at: string | null;
  paid_at: string | null;
  settled_via: SettlementMethod | null;
  settled_reference: string | null;
  settled_at: string | null;
}

export interface IssueInvoiceInput {
  productKey: string;
  payerProfileId: string;
  tournamentId?: string | null;
  idempotencyKey: string;
}

export function formatPkr(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return 'Amount unavailable';
  const numericAmount = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 0) return 'Amount unavailable';
  return `PKR ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(numericAmount)}`;
}

export function minorToAmount(amountMinor: number | string | null | undefined): number | null {
  if (amountMinor === null || amountMinor === undefined) return null;
  const numeric = typeof amountMinor === 'number' ? amountMinor : Number(amountMinor);
  if (!Number.isFinite(numeric)) return null;
  return numeric / 100;
}

export function isSettled(status: string | null | undefined): boolean {
  return status === 'paid';
}

export function invoiceStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'open':
      return 'Unpaid';
    case 'void':
      return 'Voided';
    case 'expired':
      return 'Expired';
    default:
      return 'Unknown';
  }
}

export function settlementLabel(method: SettlementMethod | null | undefined): string | null {
  switch (method) {
    case 'cash':
      return 'Cash';
    case 'bank_transfer':
      return 'Bank transfer';
    case 'cheque':
      return 'Cheque';
    case 'other':
      return 'Other';
    default:
      return null;
  }
}

const INVOICE_COLUMNS =
  'id, invoice_number, payer_profile_id, product_key, kind, description, amount_minor, currency, status, created_at, due_at, paid_at, settled_via, settled_reference, settled_at';

export async function listFeeInvoices(limit = 100): Promise<FeeInvoiceRecord[]> {
  const { data, error } = await supabase
    .from('fee_invoices')
    .select(INVOICE_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    throw new Error(toUserFacingServiceError(error, 'Unable to load invoices.'));
  }
  return (data ?? []) as FeeInvoiceRecord[];
}

export async function issueFeeInvoice(input: IssueInvoiceInput): Promise<FeeInvoiceRecord> {
  if (!input.productKey.trim()) throw new Error('A fee product is required.');
  if (!input.payerProfileId.trim()) throw new Error('A payer is required.');
  if (input.idempotencyKey.trim().length < 8) throw new Error('An idempotency key is required.');

  const { data, error } = await supabase.rpc('create_fee_invoice', {
    p_product_key: input.productKey.trim(),
    p_payer_profile_id: input.payerProfileId.trim(),
    p_tournament_id: input.tournamentId ?? null,
    p_idempotency_key: input.idempotencyKey.trim(),
  });
  if (error) {
    throw new Error(toUserFacingServiceError(error, 'Unable to create the invoice.'));
  }

  const record = Array.isArray(data) ? data[0] : data;
  const id = record?.id as string | undefined;
  if (!id) throw new Error('The invoice service returned an invalid invoice.');

  const { data: invoice, error: readError } = await supabase
    .from('fee_invoices')
    .select(INVOICE_COLUMNS)
    .eq('id', id)
    .single();
  if (readError) {
    throw new Error(toUserFacingServiceError(readError, 'Unable to load the created invoice.'));
  }
  return invoice as FeeInvoiceRecord;
}

export async function markInvoicePaid(
  invoiceId: string,
  method: SettlementMethod,
  reference?: string | null
): Promise<void> {
  if (!invoiceId.trim()) throw new Error('An invoice is required.');
  if (!method) throw new Error('A settlement method is required.');

  const { data, error } = await supabase
    .from('fee_invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      settled_via: method,
      settled_reference: reference?.trim() ? reference.trim() : null,
    })
    .eq('id', invoiceId.trim())
    .select('id, status, paid_at')
    .single();

  if (error) {
    throw new Error(toUserFacingServiceError(error, getErrorMessage(error, 'Unable to record the payment.')));
  }
  if (!data || data.status !== 'paid') {
    throw new Error('The invoice was not marked as paid.');
  }
}

export async function markInvoiceUnpaid(invoiceId: string): Promise<void> {
  if (!invoiceId.trim()) throw new Error('An invoice is required.');

  const { data, error } = await supabase
    .from('fee_invoices')
    .update({ status: 'open', paid_at: null })
    .eq('id', invoiceId.trim())
    .select('id, status')
    .single();

  if (error) {
    throw new Error(toUserFacingServiceError(error, 'Unable to reopen the invoice.'));
  }
  if (!data || data.status !== 'open') {
    throw new Error('The invoice was not reopened.');
  }
}

export async function voidInvoice(invoiceId: string): Promise<void> {
  if (!invoiceId.trim()) throw new Error('An invoice is required.');

  const { data, error } = await supabase
    .from('fee_invoices')
    .update({ status: 'void' })
    .eq('id', invoiceId.trim())
    .select('id, status')
    .single();

  if (error) {
    throw new Error(toUserFacingServiceError(error, 'Unable to void the invoice.'));
  }
  if (!data || data.status !== 'void') {
    throw new Error('The invoice was not voided.');
  }
}
