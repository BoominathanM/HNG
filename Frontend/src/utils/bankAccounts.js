// Receiving bank accounts (Settings → Invoice Settings → Bank Accounts). Each payment entry —
// Billing's Record Payment In, Sales' payment entries — stores the chosen account as
// `bankAccountId` plus a `bankAccountName` snapshot, which the Payment Bank Details report groups
// by. See Backend CompanySettings.bankAccounts / reports.controller getPaymentBankReport.

export const newBankAccountId = () => `ba_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const maskAccountNo = (acc) => {
  const digits = String(acc || '').replace(/\s/g, '');
  return digits ? `****${digits.slice(-4)}` : '';
};

// "HDFC Current — ****1234": the nickname (else bank name) plus the masked account number.
export const bankAccountLabel = (a) => {
  if (!a) return '';
  const base = String(a.label || a.bank || 'Bank Account').trim();
  const masked = maskAccountNo(a.account);
  return masked ? `${base} — ${masked}` : base;
};

// Payment entry modes offered everywhere a customer payment is recorded: Cash, or Bank Account
// (then the account it went into is picked). Billing stores the labels ('Cash' / 'Bank Account'),
// Sales the codes ('CASH' / 'BANK_ACCOUNT'); older entries keep UPI / Card / Cheque / etc.
// Bank Account is listed first and is the default for a new payment.
export const BILLING_PAYMENT_MODES = ['Bank Account', 'Cash'];
export const isBankAccountMode = (mode) => String(mode || '').trim().toUpperCase().replace(/\s+/g, '_') === 'BANK_ACCOUNT';

// The account printed on invoices/quotations: settings.invoiceBankAccountId when it is still
// an active account, else null (DocumentTemplate then falls back to the bankDetails mirror).
export const resolveInvoiceBankAccount = (settings = {}) => {
  const accounts = Array.isArray(settings.bankAccounts) ? settings.bankAccounts : [];
  return accounts.find((a) => a.accountId === settings.invoiceBankAccountId && a.active !== false) || null;
};

// Adds the bankAccountName snapshot for a new payment entry's bankAccountId, so the entry still
// names its account in history/reports if that account is later removed. Only a Bank Account
// entry keeps one — a selection left behind after switching the row to Cash is dropped.
export const withBankAccountName = (entry, accounts = []) => {
  if (!entry) return entry;
  if (!entry.bankAccountId || !isBankAccountMode(entry.paymentMethod || entry.paymentMode)) {
    const rest = { ...entry };
    delete rest.bankAccountId;
    delete rest.bankAccountName;
    return rest;
  }
  const acc = accounts.find((a) => a.accountId === entry.bankAccountId);
  return acc ? { ...entry, bankAccountName: bankAccountLabel(acc) } : entry;
};

// Display text for a stored payment entry's bank account ('' when none was recorded).
export const entryBankLabel = (entry, accounts = []) => {
  if (!entry?.bankAccountId) return '';
  const acc = accounts.find((a) => a.accountId === entry.bankAccountId);
  return acc ? bankAccountLabel(acc) : (entry.bankAccountName || 'Removed account');
};
