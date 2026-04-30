import React from 'react';
import { Breadcrumb, Typography } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const { Title, Text } = Typography;

export default function PageBreadcrumb({ title, subtitle, items, style }) {
  const navigate = useNavigate();
  const isDark = useSelector((s) => s.theme.isDark);
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

  const allItems = [
    {
      title: (
        <span
          style={{ cursor: 'pointer', color: '#999', fontSize: 13 }}
          onClick={() => navigate('/')}
        >
          <HomeOutlined style={{ marginRight: 4 }} />Home
        </span>
      ),
    },
    ...items.map((item, i) => ({
      title: (
        <span
          style={{
            color: i === items.length - 1 ? '#B11E6A' : '#999',
            fontWeight: i === items.length - 1 ? 500 : 400,
            fontSize: 13,
            cursor: item.path ? 'pointer' : 'default',
          }}
          onClick={() => item.path && navigate(item.path)}
        >
          {item.label}
        </span>
      ),
    })),
  ];

  return (
    <div style={{ marginBottom: 20, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {title && (
          <Title level={4} style={{ margin: 0, color: textColor, lineHeight: 1.3 }}>
            {title}
          </Title>
        )}
        {title && (
          <div style={{ width: 1, height: 22, background: isDark ? '#555' : '#d9d9d9', flexShrink: 0 }} />
        )}
        <Breadcrumb items={allItems} />
      </div>
      {subtitle && (
        <Text style={{ color: '#999', fontSize: 14, display: 'block', marginTop: 3 }}>
          {subtitle}
        </Text>
      )}
    </div>
  );
}
