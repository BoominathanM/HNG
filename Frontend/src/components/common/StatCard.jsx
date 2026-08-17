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
        styles={{ body: { padding: '14px 16px' } }}
        hoverable
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
          <div style={{ minWidth: 0, flex: 1 }} title={title}>
            <Text style={{ fontSize: 12, color: isDark ? '#bbb' : '#666', fontWeight: 500, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </Text>
            <Title level={3} style={{ margin: '4px 0 0', color: isDark ? '#ffffff' : '#1a1a2e', fontWeight: 700, fontSize: 'clamp(15px, 2.2vw, 22px)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {value}{suffix && <span style={{ fontSize: 14, fontWeight: 500 }}> {suffix}</span>}
            </Title>
            {change !== undefined && (
              <Text style={{
                fontSize: 11, fontWeight: 600,
                color: change >= 0 ? (isDark ? '#8AE06A' : '#52c41a') : (isDark ? '#FF7A7A' : '#ff4d4f'),
              }}>
                {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
              </Text>
            )}
          </div>
          <div className="stat-icon-box" style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: isDark ? `${color}35` : `${color}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color,
          }}>
            {icon}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
