import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock, rpcMock } = vi.hoisted(() => {
  const fromMock = vi.fn();
  const rpcMock = vi.fn();
  return { fromMock, rpcMock };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
    rpc: rpcMock
  }
}));

import {
  formatPkr,
  invoiceStatusLabel,
  isSettled,
  issueFeeInvoice,
  listFeeInvoices,
  markInvoicePaid,
  markInvoiceUnpaid,
  minorToAmount,
  settlementLabel,
  voidInvoice
} from './payments';

type UpdatePayload = Record<string, unknown>;

interface QueryStub {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  payload: UpdatePayload | null;
}

function makeStub(result: { data: unknown; error: unknown }): QueryStub {
  const stub: Partial<QueryStub> & { payload: UpdatePayload | null } = { payload: null };
  stub.select = vi.fn(() => stub);
  stub.eq = vi.fn(() => stub);
  stub.order = vi.fn(() => stub);
  stub.limit = vi.fn(() => Promise.resolve(result));
  stub.single = vi.fn(() => Promise.resolve(result));
  stub.update = vi.fn((payload: UpdatePayload) => {
    stub.payload = payload;
    return stub;
  });
  return stub as QueryStub;
}

function singleResult(row: unknown) {
  return makeStub({ data: row, error: null });
}

describe('offline fee ledger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('formats PKR amounts from minor units', () => {
    expect(formatPkr(12500)).toBe('PKR 12,500');
    expect(formatPkr('99')).toBe('PKR 99');
    expect(formatPkr(0)).toBe('PKR 0');
    expect(formatPkr(null)).toBe('Amount unavailable');
    expect(formatPkr(-1)).toBe('Amount unavailable');
    expect(formatPkr('abc')).toBe('Amount unavailable');
  });

  it('converts minor units to a rupee amount', () => {
    expect(minorToAmount(1250000)).toBe(12500);
    expect(minorToAmount('2500')).toBe(25);
    expect(minorToAmount(null)).toBeNull();
    expect(minorToAmount('nope')).toBeNull();
  });

  it('maps invoice statuses to labels', () => {
    expect(invoiceStatusLabel('paid')).toBe('Paid');
    expect(invoiceStatusLabel('open')).toBe('Unpaid');
    expect(invoiceStatusLabel('void')).toBe('Voided');
    expect(invoiceStatusLabel('expired')).toBe('Expired');
    expect(invoiceStatusLabel(null)).toBe('Unknown');
    expect(isSettled('paid')).toBe(true);
    expect(isSettled('open')).toBe(false);
  });

  it('maps settlement methods to labels', () => {
    expect(settlementLabel('cash')).toBe('Cash');
    expect(settlementLabel('bank_transfer')).toBe('Bank transfer');
    expect(settlementLabel('cheque')).toBe('Cheque');
    expect(settlementLabel('other')).toBe('Other');
    expect(settlementLabel(null)).toBeNull();
  });

  it('records an offline payment with method, reference and timestamp', async () => {
    const builder = singleResult({ id: 'inv-1', status: 'paid', paid_at: '2026-03-01T00:00:00Z' });
    fromMock.mockReturnValue(builder);

    await markInvoicePaid('inv-1', 'bank_transfer', 'TRX-99887');

    const payload = builder.payload ?? {};
    expect(payload.status).toBe('paid');
    expect(payload.settled_via).toBe('bank_transfer');
    expect(payload.settled_reference).toBe('TRX-99887');
    expect(typeof payload.paid_at).toBe('string');
    expect(builder.eq).toHaveBeenCalledWith('id', 'inv-1');
  });

  it('stores a null reference when none is supplied', async () => {
    const builder = singleResult({ id: 'inv-1', status: 'paid' });
    fromMock.mockReturnValue(builder);

    await markInvoicePaid('inv-1', 'cash');

    expect((builder.payload ?? {}).settled_reference).toBeNull();
  });

  it('never reports success when the server does not mark the invoice paid', async () => {
    const builder = makeStub({ data: { id: 'inv-1', status: 'open' }, error: null });
    fromMock.mockReturnValue(builder);
    await expect(markInvoicePaid('inv-1', 'cash')).rejects.toThrow('The invoice was not marked as paid.');
  });

  it('surfaces a server error instead of claiming success', async () => {
    const builder = makeStub({ data: null, error: { message: 'permission denied' } });
    fromMock.mockReturnValue(builder);
    await expect(markInvoiceUnpaid('inv-1')).rejects.toThrow();
  });

  it('reopens a settled invoice', async () => {
    const builder = singleResult({ id: 'inv-1', status: 'open' });
    fromMock.mockReturnValue(builder);

    await markInvoiceUnpaid('inv-1');

    const payload = builder.payload ?? {};
    expect(payload.status).toBe('open');
    expect(payload.paid_at).toBeNull();
  });

  it('voids an invoice', async () => {
    const builder = singleResult({ id: 'inv-1', status: 'void' });
    fromMock.mockReturnValue(builder);

    await voidInvoice('inv-1');

    expect((builder.payload ?? {}).status).toBe('void');
  });

  it('requires a settlement method', async () => {
    await expect(markInvoicePaid('inv-1', '' as never)).rejects.toThrow('A settlement method is required.');
  });

  it('requires an invoice id', async () => {
    await expect(markInvoicePaid('  ', 'cash')).rejects.toThrow('An invoice is required.');
  });

  it('issues an invoice through the server-owned RPC', async () => {
    rpcMock.mockResolvedValue({ data: [{ id: 'inv-9' }], error: null });
    const builder = makeStub({ data: { id: 'inv-9', status: 'open' }, error: null });
    fromMock.mockReturnValue(builder);

    await issueFeeInvoice({
      productKey: 'membership-2026',
      payerProfileId: 'profile-1',
      idempotencyKey: 'offline-membership-1'
    });

    expect(rpcMock).toHaveBeenCalledWith('create_fee_invoice', {
      p_product_key: 'membership-2026',
      p_payer_profile_id: 'profile-1',
      p_tournament_id: null,
      p_idempotency_key: 'offline-membership-1'
    });
  });

  it('rejects an invoice request with a short idempotency key', async () => {
    await expect(
      issueFeeInvoice({ productKey: 'membership-2026', payerProfileId: 'profile-1', idempotencyKey: 'short' })
    ).rejects.toThrow('An idempotency key is required.');
  });

  it('lists invoices newest first', async () => {
    const builder = makeStub({ data: [{ id: 'inv-1' }], error: null });
    fromMock.mockReturnValue(builder);

    const result = await listFeeInvoices(25);

    expect(fromMock).toHaveBeenCalledWith('fee_invoices');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder.limit).toHaveBeenCalledWith(25);
    expect(result).toHaveLength(1);
  });
});
