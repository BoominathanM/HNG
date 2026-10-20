import React from 'react';
import { Select, Input, Button, Space, Divider } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useGetOptionsQuery, useCreateOptionMutation } from '../../store/api/apiSlice';

// Dropdown with an inline "Add item" box. When a `field` key is supplied the
// newly added value is persisted to the DB (POST /settings/options) and merged
// with any previously-saved values so it sticks across sessions and users.
// `selectOnAdd` (opt-in) also selects the added value, and re-selects an existing option
// (matched case-insensitively on value or string label) instead of adding a duplicate;
// it also merges case-only duplicates between default/saved options.
const SelectWithAdd = ({ field, defaultOptions = [], placeholder, selectOnAdd = false, addPlaceholder = 'Add item', ...props }) => {
  const { data: optData } = useGetOptionsQuery({ field }, { skip: !field });
  const [createOption] = useCreateOptionMutation();
  const [localItems, setLocalItems] = React.useState([]);
  const [name, setName] = React.useState('');
  const inputRef = React.useRef(null);

  const items = React.useMemo(() => {
    const map = new Map();
    [
      ...defaultOptions,
      ...((optData?.data || []).map((o) => ({ value: o.value, label: o.label || o.value }))),
      ...localItems,
    ].forEach((o) => {
      if (o == null || o.value == null) return;
      const key = selectOnAdd ? String(o.value).toLowerCase() : o.value;
      if (!map.has(key)) map.set(key, o);
    });
    return Array.from(map.values());
  }, [defaultOptions, optData, localItems, selectOnAdd]);

  const addItem = async (e) => {
    e.preventDefault();
    const v = (name || '').trim();
    if (!v) return;
    if (selectOnAdd) {
      const same = (s) => typeof s === 'string' && s.toLowerCase() === v.toLowerCase();
      const existing = items.find((i) => same(String(i.value)) || same(i.label));
      if (existing) {
        setName('');
        props.onChange?.(existing.value);
        return;
      }
    }
    if (items.some((i) => i.value === v)) return;
    setLocalItems((prev) => [...prev, { value: v, label: v }]);
    setName('');
    setTimeout(() => inputRef.current?.focus(), 0);
    if (selectOnAdd) props.onChange?.(v);
    if (field) {
      try {
        await createOption({ field, value: v, label: v }).unwrap();
      } catch {
        /* keep it locally even if persistence fails */
      }
    }
  };

  return (
    <Select
      {...props}
      placeholder={placeholder}
      options={items}
      dropdownRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '8px 0' }} />
          <Space style={{ padding: '0 8px 4px' }}>
            <Input
              placeholder={addPlaceholder}
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onPressEnter={addItem}
            />
            <Button type="text" icon={<PlusOutlined />} onClick={addItem} style={{ color: '#B11E6A', fontWeight: 600 }}>
              Add
            </Button>
          </Space>
        </>
      )}
    />
  );
};

export default SelectWithAdd;
