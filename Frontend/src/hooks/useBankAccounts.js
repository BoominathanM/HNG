import { useMemo } from 'react';
import { useGetCompanySettingsQuery } from '../store/api/apiSlice';

// The company's receiving bank accounts from Settings → Invoice Settings. `activeAccounts` is what
// payment dropdowns offer; `accounts` (incl. inactive) is for naming entries already recorded.
export default function useBankAccounts() {
  const { data, isLoading } = useGetCompanySettingsQuery();
  return useMemo(() => {
    const settings = data?.data || {};
    const accounts = Array.isArray(settings.bankAccounts) ? settings.bankAccounts : [];
    return {
      accounts,
      activeAccounts: accounts.filter((a) => a.active !== false),
      invoiceAccountId: settings.invoiceBankAccountId || null,
      loading: isLoading,
    };
  }, [data, isLoading]);
}
