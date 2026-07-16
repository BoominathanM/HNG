import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Upload, Input, Typography, Space, Tag, Empty,
} from 'antd';
import { UploadOutlined, ArrowLeftOutlined, FileOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { enqueueSnackbar } from 'notistack';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import {
  useGetPackagingInvoicesQuery,
  useUploadPackagingInvoiceMutation,
} from '../../store/api/apiSlice';

const { Text } = Typography;
const { TextArea } = Input;

// Each :type slug is backed by its own model/collection on the server
// (StickerInvoice / BoxInvoice / ZiplockInvoice / ButterPaperInvoice).
const TYPE_LABELS = {
  sticker: 'Sticker',
  box: 'Box',
  ziplock: 'Frosted Ziplock',
  butter: 'Butter Paper',
};

export default function PackagingInvoices() {
  const { type } = useParams();
  const navigate = useNavigate();
  const isDark = useSelector((s) => s.theme.isDark);
  const label = TYPE_LABELS[type] || type;

  const { data, isLoading } = useGetPackagingInvoicesQuery(type, { skip: !TYPE_LABELS[type] });
  const [uploadInvoice, { isLoading: uploading }] = useUploadPackagingInvoiceMutation();

  const [fileList, setFileList] = useState([]);
  const [notes, setNotes] = useState('');

  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#ececf1' : '#1a1a2e';

  const handleSubmit = async () => {
    const file = fileList[0]?.originFileObj;
    if (!file) {
      enqueueSnackbar('Please choose a file to upload', { variant: 'warning' });
      return;
    }
    const formData = new FormData();
    formData.append('invoice', file);
    formData.append('notes', notes);
    try {
      await uploadInvoice({ type, formData }).unwrap();
      enqueueSnackbar(`${label} invoice uploaded`, { variant: 'success' });
      setFileList([]);
      setNotes('');
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to upload invoice', { variant: 'error' });
    }
  };

  const columns = [
    {
      title: 'Uploaded By',
      key: 'uploadedByName',
      render: (_, r) => r.uploadedBy?.name || '—',
    },
    { title: 'Email', key: 'uploadedByEmail', render: (_, r) => r.uploadedBy?.email || '—' },
    { title: 'Phone', key: 'uploadedByPhone', render: (_, r) => r.uploadedBy?.phone || '—' },
    {
      title: 'Role',
      key: 'uploadedByRole',
      render: (_, r) => r.uploadedBy?.role ? <Tag color="purple">{r.uploadedBy.role}</Tag> : '—',
    },
    {
      title: 'Date',
      key: 'date',
      render: (_, r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '—',
    },
    {
      title: 'Time',
      key: 'time',
      render: (_, r) => r.createdAt ? new Date(r.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—',
    },
    {
      title: 'File',
      key: 'file',
      render: (_, r) => r.fileUrl
        ? <a href={r.fileUrl} target="_blank" rel="noopener noreferrer"><FileOutlined /> {r.fileName || 'View file'}</a>
        : '—',
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      render: (v) => v ? <Text>{v}</Text> : <Text type="secondary">—</Text>,
    },
  ];

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb
        title={`${label} Invoices`}
        items={[{ label: 'Operations', path: '/operations' }, { label: `${label} Invoices` }]}
      />

      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/operations')} style={{ marginBottom: 16 }}>
        Back to Operations
      </Button>

      <Card
        title={<Text strong style={{ color: textColor }}>Upload {label} Invoice</Text>}
        style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', marginBottom: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Upload
            beforeUpload={() => false}
            fileList={fileList}
            onChange={({ fileList: fl }) => setFileList(fl.slice(-1))}
            maxCount={1}
            accept="image/*,.pdf"
          >
            <Button icon={<UploadOutlined />}>Choose Invoice File</Button>
          </Upload>
          <TextArea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          <Button
            type="primary"
            loading={uploading}
            onClick={handleSubmit}
            style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
          >
            Upload Invoice
          </Button>
        </Space>
      </Card>

      <Card
        title={<Text strong style={{ color: textColor }}>{label} Invoice History</Text>}
        style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
        styles={{ body: { padding: 0 } }}
      >
        <div className="table-responsive" style={{ padding: 4 }}>
          <Table
            dataSource={data?.data || []}
            columns={columns}
            rowKey={(r) => r._id}
            loading={isLoading}
            size="small"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="No invoices uploaded yet" /> }}
          />
        </div>
      </Card>
    </div>
  );
}
