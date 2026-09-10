import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Alert, Checkbox, Modal, Space } from 'antd';
import { UserOutlined, LockOutlined, EyeTwoTone, EyeInvisibleOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clearError } from '../../store/slices/authSlice';
import { useLoginMutation, useGetPublicBrandingQuery } from '../../store/api/apiSlice';
import { firstAccessiblePath } from '../../utils/access';
import { enqueueSnackbar } from 'notistack';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;

const DEFAULT_LOGO = '/hnglogonew.png';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { error: authError } = useSelector((s) => s.auth);
  const [login, { isLoading, error: loginError }] = useLoginMutation();
  const { data: branding } = useGetPublicBrandingQuery();
  const companyName = branding?.data?.companyName || 'Heal N Glow';
  const logoSrc = branding?.data?.logoUrl || DEFAULT_LOGO;

  const errorMsg = loginError?.data || authError || null;

  // ─── Forgot-password flow (UI only — SMTP e-mail delivery to be wired later) ───
  // Step 1: "Reset your password" modal — enter e-mail, request a 6-digit code,
  //         type the code into 6 separate boxes, Verify.
  // Step 2: "Set a new password" modal — new password + confirm, Update.
  // The three async handlers (send code / verify code / update password) are the
  // integration points for the future backend endpoints; each is marked TODO.
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [pwForm] = Form.useForm();

  // Resend cool-down ticker
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const openForgot = () => {
    setResetEmail(form.getFieldValue('email') || '');
    setOtp('');
    setCodeSent(false);
    setCooldown(0);
    setForgotOpen(true);
  };

  const closeForgot = () => {
    setForgotOpen(false);
    setOtp('');
    setCodeSent(false);
    setSending(false);
    setVerifying(false);
    setCooldown(0);
  };

  const handleSendCode = async () => {
    if (!EMAIL_RE.test(resetEmail.trim())) {
      enqueueSnackbar('Enter a valid email address', { variant: 'error' });
      return;
    }
    setSending(true);
    try {
      // TODO: call backend — POST /auth/forgot-password { email } → e-mails a 6-digit OTP (SMTP).
      await new Promise((r) => setTimeout(r, 400));
      setCodeSent(true);
      setCooldown(30);
      enqueueSnackbar(
        'If an account exists for this email, a 6-digit verification code has been sent. (Email delivery via SMTP — configuration pending)',
        { variant: 'info' },
      );
    } catch (e) {
      enqueueSnackbar(e?.data || 'Could not send the verification code', { variant: 'error' });
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      enqueueSnackbar('Enter the full 6-digit code', { variant: 'error' });
      return;
    }
    setVerifying(true);
    try {
      // TODO: call backend — POST /auth/verify-reset-otp { email, otp } → 200 if the code is valid.
      await new Promise((r) => setTimeout(r, 400));
      setForgotOpen(false);
      pwForm.resetFields();
      setResetOpen(true);
    } catch (e) {
      enqueueSnackbar(e?.data || 'Invalid or expired code', { variant: 'error' });
    } finally {
      setVerifying(false);
    }
  };

  const handleUpdatePassword = async () => {
    try {
      await pwForm.validateFields();
    } catch {
      return;
    }
    setUpdating(true);
    try {
      // TODO: call backend — POST /auth/reset-password { email, otp, newPassword } → sets the new password.
      await new Promise((r) => setTimeout(r, 400));
      setResetOpen(false);
      pwForm.resetFields();
      setOtp('');
      setCodeSent(false);
      enqueueSnackbar('Password updated successfully. Please sign in with your new password.', { variant: 'success' });
      form.setFieldsValue({ email: resetEmail });
    } catch (e) {
      enqueueSnackbar(e?.data || 'Could not update the password', { variant: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      const res = await login({
        email: values.email,
        password: values.password,
        rememberMe: !!values.rememberMe,
      }).unwrap();
      enqueueSnackbar('Signed in successfully', { variant: 'success' });
      // Land on the first page the user actually has access to, so a user
      // without Dashboard permission doesn't hit the "Access Restricted" screen.
      navigate(firstAccessiblePath(res?.data?.user), { replace: true });
    } catch (e) {
      // error also shown via loginError state Alert
      enqueueSnackbar(e?.data || 'Invalid email or password', { variant: 'error' });
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #6b1240 0%, #B11E6A 50%, #D85C9E 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ position: 'fixed', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}
      >
        <div style={{ background: '#ffffff', borderRadius: 20, padding: 'clamp(20px, 5vw, 44px) clamp(16px, 7vw, 44px) clamp(20px, 5vw, 36px)', boxShadow: '0 24px 64px rgba(107,18,64,0.35)' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <img src={logoSrc} alt={companyName} onError={(e) => { if (!e.target.src.endsWith(DEFAULT_LOGO)) e.target.src = DEFAULT_LOGO; }} style={{ height: 90, maxWidth: 240, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
            <Title level={4} style={{ margin: '4px 0 2px', color: '#1a1a2e', fontWeight: 700, lineHeight: 1.2 }}>Welcome Back</Title>
            <Text style={{ color: '#888', fontSize: 13 }}>Sign in to your HNG CRM account</Text>
          </div>

          {errorMsg && (
            <Alert
              type="error"
              message={errorMsg}
              showIcon
              style={{ marginBottom: 20, borderRadius: 10 }}
              closable
              onClose={() => dispatch(clearError())}
            />
          )}

          <Form form={form} name="login" layout="vertical" onFinish={handleSubmit} requiredMark={false}>
            <Form.Item
              name="email"
              label={<span style={{ fontWeight: 600, color: '#1a1a2e' }}>Email Address</span>}
              rules={[{ required: true, message: 'Please enter your email' }, { type: 'email', message: 'Enter a valid email address' }]}
            >
              <Input prefix={<UserOutlined style={{ color: '#B11E6A' }} />} placeholder="admin@gmail.com" size="large" style={{ borderRadius: 10, borderColor: '#e8d0dc' }} />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ fontWeight: 600, color: '#1a1a2e' }}>Password</span>}
              rules={[{ required: true, message: 'Please enter your password' }]}
              style={{ marginBottom: 24 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#B11E6A' }} />}
                placeholder="Enter your password"
                size="large"
                style={{ borderRadius: 10, borderColor: '#e8d0dc' }}
                iconRender={(visible) => visible ? <EyeTwoTone twoToneColor="#B11E6A" /> : <EyeInvisibleOutlined style={{ color: '#ccc' }} />}
              />
            </Form.Item>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <Form.Item name="rememberMe" valuePropName="checked" noStyle>
                <Checkbox style={{ color: '#1a1a2e' }}>
                  Remember me for 30 days
                </Checkbox>
              </Form.Item>
              <Button
                type="link"
                onClick={openForgot}
                style={{ padding: 0, height: 'auto', color: '#B11E6A', fontWeight: 600 }}
              >
                Forgot password?
              </Button>
            </div>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={isLoading}
                block
                style={{ background: 'linear-gradient(135deg, #B11E6A, #D85C9E)', border: 'none', borderRadius: 10, height: 48, fontSize: 15, fontWeight: 600, boxShadow: '0 4px 20px rgba(177,30,106,0.35)' }}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Text style={{ fontSize: 12, color: '#aaa' }}>Heal N Glow CRM / ERP &copy; {new Date().getFullYear()}</Text>
          </div>
        </div>
      </motion.div>

      {/* ── Step 1: request + verify the 6-digit code ── */}
      <Modal
        title="Reset your password"
        open={forgotOpen}
        onCancel={closeForgot}
        maskClosable={false}
        footer={[
          <Button key="cancel" onClick={closeForgot}>Cancel</Button>,
          <Button
            key="verify"
            type="primary"
            loading={verifying}
            disabled={otp.length !== 6}
            onClick={handleVerifyOtp}
            style={{ background: 'linear-gradient(135deg, #B11E6A, #D85C9E)', border: 'none' }}
          >
            Verify
          </Button>,
        ]}
        width={440}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div>
            <Text style={{ fontWeight: 600, color: '#1a1a2e' }}>Email address</Text>
            <Space.Compact style={{ width: '100%', marginTop: 6 }}>
              <Input
                prefix={<MailOutlined style={{ color: '#B11E6A' }} />}
                placeholder="you@company.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                onPressEnter={handleSendCode}
                size="large"
                style={{ borderRadius: '10px 0 0 10px' }}
              />
              <Button
                size="large"
                onClick={handleSendCode}
                loading={sending}
                disabled={cooldown > 0}
                style={{ borderRadius: '0 10px 10px 0', fontWeight: 600 }}
              >
                {cooldown > 0 ? `Resend (${cooldown}s)` : codeSent ? 'Resend code' : 'Send code'}
              </Button>
            </Space.Compact>
          </div>

          <div>
            <Text style={{ fontWeight: 600, color: '#1a1a2e' }}>Enter the 6-digit code</Text>
            <div style={{ marginTop: 8 }}>
              <Input.OTP
                length={6}
                value={otp}
                onChange={setOtp}
                formatter={(str) => str.replace(/\D/g, '')}
                size="large"
                disabled={!codeSent}
              />
            </div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
              {codeSent
                ? 'We sent a verification code to your email. It expires in 10 minutes.'
                : 'Request a code first, then type it into the boxes above.'}
            </Text>
          </div>
        </Space>
      </Modal>

      {/* ── Step 2: set the new password ── */}
      <Modal
        title="Set a new password"
        open={resetOpen}
        onCancel={() => { setResetOpen(false); pwForm.resetFields(); }}
        maskClosable={false}
        footer={[
          <Button key="cancel" onClick={() => { setResetOpen(false); pwForm.resetFields(); }}>Cancel</Button>,
          <Button
            key="update"
            type="primary"
            loading={updating}
            onClick={handleUpdatePassword}
            style={{ background: 'linear-gradient(135deg, #B11E6A, #D85C9E)', border: 'none' }}
          >
            Update Password
          </Button>,
        ]}
        width={440}
      >
        <Form form={pwForm} layout="vertical" requiredMark={false} onFinish={handleUpdatePassword}>
          <Form.Item
            name="newPassword"
            label={<span style={{ fontWeight: 600, color: '#1a1a2e' }}>New password</span>}
            rules={[
              { required: true, message: 'Please enter a new password' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#B11E6A' }} />}
              placeholder="Enter new password"
              size="large"
              style={{ borderRadius: 10 }}
              iconRender={(visible) => visible ? <EyeTwoTone twoToneColor="#B11E6A" /> : <EyeInvisibleOutlined style={{ color: '#ccc' }} />}
            />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label={<span style={{ fontWeight: 600, color: '#1a1a2e' }}>Confirm new password</span>}
            dependencies={['newPassword']}
            hasFeedback
            rules={[
              { required: true, message: 'Please confirm your new password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                  return Promise.reject(new Error('The two passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<SafetyCertificateOutlined style={{ color: '#B11E6A' }} />}
              placeholder="Re-enter new password"
              size="large"
              style={{ borderRadius: 10 }}
              iconRender={(visible) => visible ? <EyeTwoTone twoToneColor="#B11E6A" /> : <EyeInvisibleOutlined style={{ color: '#ccc' }} />}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
