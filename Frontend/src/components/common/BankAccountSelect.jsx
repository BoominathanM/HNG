import { Select, Tag } from 'antd';
import { BankOutlined } from '@ant-design/icons';
import useBankAccounts from '../../hooks/useBankAccounts';
import { bankAccountLabel } from '../../utils/bankAccounts';

// Dropdown of the company's active receiving bank accounts (Settings → Invoice Settings). Works
// standalone (value/onChange) and inside a Form.Item. The value is the account's accountId.
export default function BankAccountSelect({
  value, onChange, size, style, disabled, allowClear = true, placeholder = 'Select bank account', status,
}) {
  const { accounts, activeAccounts, invoiceAccountId } = useBankAccounts();

  const options = activeAccounts.map((a) => ({
    value: a.accountId,
    label: bankAccountLabel(a),
    account: a,
  }));
  // An entry saved against an account that has since been deactivated/removed keeps showing its
  // name instead of the raw id.
  if (value && !options.some((o) => o.value === value)) {
    const old = accounts.find((a) => a.accountId === value);
    options.push({ value, label: old ? `${bankAccountLabel(old)} (inactive)` : 'Removed account', disabled: true });
  }

  return (
    <Select
      value={value || undefined}
      onChange={(v) => onChange?.(v ?? null)}
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabled}
      size={size}
      status={status}
      style={{ width: '100%', ...style }}
      showSearch
      optionFilterProp="label"
      options={options}
      notFoundContent={<span style={{ fontSize: 12 }}>No bank accounts — add them in Settings → Invoice Settings</span>}
      optionRender={(opt) => {
        const a = opt.data.account;
        if (!a) return opt.label;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <BankOutlined style={{ color: '#B11E6A', flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.label}</div>
              {(a.bank || a.ifsc) && (
                <div style={{ fontSize: 11, color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {[a.label ? a.bank : '', a.ifsc].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
            {a.accountId === invoiceAccountId && <Tag color="magenta" style={{ margin: 0, fontSize: 10 }}>On invoice</Tag>}
          </div>
        );
      }}
    />
  );
}
