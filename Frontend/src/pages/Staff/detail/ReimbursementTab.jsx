// Reimbursement tab — GET /admin/approvals/expense?staffId={id}.
import React from 'react';
import { Typography } from 'antd';
import ApprovalRequests from '../shared/ApprovalRequests';
import useSurface from '../shared/useSurface';

const { Text } = Typography;

export default function ReimbursementTab({ staffId }) {
  const s = useSurface();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Text strong style={{ fontSize: 15, color: s.text }}>Reimbursement</Text>
      <ApprovalRequests type="expense" staffId={staffId} />
    </div>
  );
}
