import React from 'react';
import { Select, Input, Button, Space, Divider } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useGetOptionsQuery, useCreateOptionMutation } from '../../store/api/apiSlice';

// Dropdown with an inline "Add item" box. When a `field` key is supplied the
// newly added value is persisted to the DB (POST /settings/options) and merged
// with any previously-saved values so it sticks across sessions and users.
const SelectWithAdd = ({ field, defaultOptions = [], placeholder, ...props }) => {
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
      if (o && o.value != null && !map.has(o.value)) map.set(o.value, o);
    });
    return Array.from(map.values());
  }, [defaultOptions, optData, localItems]);

  const addItem = async (e) => {
    e.preventDefault();
    const v = (name || '').trim();
    if (!v || items.some((i) => i.value === v)) return;
    setLocalItems((prev) => [...prev, { value: v, label: v }]);
    setName('');
    setTimeout(() => inputRef.current?.focus(), 0);
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
              placeholder="Add item"
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
