import React from 'react';
import { Form, Input, Button, Typography, Alert } from 'antd';
import { UserOutlined, LockOutlined, EyeTwoTone, EyeInvisibleOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clearError } from '../../store/slices/authSlice';
import { useLoginMutation } from '../../store/api/apiSlice';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { error: authError } = useSelector((s) => s.auth);
  const [login, { isLoading, error: loginError }] = useLoginMutation();

  const errorMsg = loginError?.data || authError || null;

  const handleSubmit = async (values) => {
    try {
      await login({ email: values.email, password: values.password }).unwrap();
      navigate('/', { replace: true });
    } catch {
      // error shown via loginError state
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
        <div style={{ background: '#ffffff', borderRadius: 20, padding: '36px 44px 36px', boxShadow: '0 24px 64px rgba(107,18,64,0.35)' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <img src="/hng%20logo%20new.png" alt="Heal N Glow" style={{ height: 90, maxWidth: 240, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
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

          <Form name="login" layout="vertical" onFinish={handleSubmit} requiredMark={false}>
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
    </div>
  );
}
