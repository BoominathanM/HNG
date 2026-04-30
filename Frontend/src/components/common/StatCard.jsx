import React from 'react';
import { Card, Typography } from 'antd';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';

const { Text, Title } = Typography;

export default function StatCard({ title, value, icon, color, change, suffix }) {
  const isDark = useSelector((s) => s.theme.isDark);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card
        style={{
          borderRadius: 14,
          border: 'none',
          background: isDark
            ? `linear-gradient(135deg, ${color}30 0%, ${color}18 100%)`
            : `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
          boxShadow: `0 4px 20px ${color}25`,
          overflow: 'hidden',
        }}
        bodyStyle={{ padding: '20px 22px' }}
        hoverable
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Text style={{ fontSize: 13, color: isDark ? '#bbb' : '#666', fontWeight: 500 }}>
              {title}
            </Text>
            <Title level={3} style={{ margin: '4px 0 0', color: isDark ? '#ffffff' : '#1a1a2e', fontWeight: 700 }}>
              {value}{suffix && <span style={{ fontSize: 16, fontWeight: 500 }}> {suffix}</span>}
            </Title>
            {change !== undefined && (
              <Text style={{
                fontSize: 12, fontWeight: 600,
                color: change >= 0 ? (isDark ? '#8AE06A' : '#52c41a') : (isDark ? '#FF7A7A' : '#ff4d4f'),
              }}>
                {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% this month
              </Text>
            )}
          </div>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: isDark ? `${color}35` : `${color}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color,
          }}>
            {icon}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
