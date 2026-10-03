// Documents tab — GET /admin/staff/{id}/documents → data.documents[]
// ({ name, category, type (MIME), size, uploaded, url }).
import React from 'react';
import { Table, Typography } from 'antd';
import { FileTextOutlined, PaperClipOutlined } from '@ant-design/icons';
import { useGetHrStaffDocumentsQuery } from '../../../store/api/apiSlice';
import { pick, asText, fmtDate, toList } from '../shared/hrUtils';
import { PanelCard, PanelTitle, EmptyBlock, LoadError } from '../shared/StaffUi';
import useSurface from '../shared/useSurface';

const { Text } = Typography;

const fileUrl = (d) => {
  const v = pick(d, ['url', 'fileUrl', 'documentUrl', 'file', 'secure_url', 'path']);
  return typeof v === 'string' ? v : pick(v, ['url', 'secure_url']);
};

// "image/jpeg" → "JPEG", "application/pdf" → "PDF".
const fileType = (mime) => (mime ? mime.split('/').pop().replace(/^x-/, '').toUpperCase() : undefined);

const columns = [
  {
    title: 'Document', key: 'name',
    render: (_, d) => <Text strong>{asText(pick(d, ['name', 'documentName', 'title', 'fileName', 'originalName'])) || 'Document'}</Text>,
  },
  { title: 'Category', key: 'category', render: (_, d) => asText(pick(d, ['category', 'documentType'])) || '—' },
  { title: 'Type', key: 'type', render: (_, d) => fileType(asText(pick(d, ['type', 'mimeType']))) || '—' },
  { title: 'Size', key: 'size', render: (_, d) => asText(pick(d, ['size'])) || '—' },
  { title: 'Uploaded On', key: 'uploaded', render: (_, d) => fmtDate(pick(d, ['uploaded', 'uploadedAt', 'createdAt'])) || '—' },
  {
    title: 'File', key: 'file', align: 'center',
    render: (_, d) => {
      const url = fileUrl(d);
      return url
        ? <a href={url} target="_blank" rel="noreferrer"><PaperClipOutlined /> View</a>
        : <Text type="secondary">—</Text>;
    },
  },
];

export default function DocumentsTab({ staffId }) {
  const s = useSurface();
  const { data, isFetching, error, refetch } = useGetHrStaffDocumentsQuery(staffId);
  const docs = toList(data);

  return (
    <PanelCard bodyStyle={{ padding: 0 }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${s.border}` }}>
        <PanelTitle icon={<FileTextOutlined />} title="Staff Documents" />
      </div>
      {error ? <div style={{ padding: 16 }}><LoadError error={error} onRetry={refetch} /></div> : (
        <div className="table-responsive">
          <Table
            className="staff-table"
            size="middle"
            rowKey={(d, i) => d._id || i}
            dataSource={docs}
            columns={columns}
            loading={isFetching}
            pagination={docs.length > 10 ? { defaultPageSize: 10 } : false}
            locale={{ emptyText: <EmptyBlock icon={<FileTextOutlined />} text="No documents uploaded for this staff member yet." /> }}
          />
        </div>
      )}
    </PanelCard>
  );
}
