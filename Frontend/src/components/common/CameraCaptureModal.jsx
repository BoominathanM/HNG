import { useRef, useState, useEffect, useCallback } from 'react';
import { Modal, Button, Space, Alert, Spin, Select } from 'antd';
import { CameraOutlined, RedoOutlined, CheckOutlined, SwapOutlined, LoadingOutlined } from '@ant-design/icons';

/**
 * CameraCaptureModal — opens the device webcam / phone camera via getUserMedia,
 * lets the user snap a still, and hands the parent a JPEG File. Used anywhere a
 * "Scan" button should capture a document with the camera instead of opening the
 * OS file-picker (which is all the bare `capture` attribute does on desktop).
 *
 * Props:
 *   open        — controls visibility
 *   onClose()   — called when the user dismisses without using a photo
 *   onCapture(file: File) — called with the captured JPEG once the user confirms
 *   title       — modal title (default "Scan Document")
 *   busy        — parent-owned loading flag (e.g. while uploading / AI-parsing);
 *                 keeps the modal open with a spinner over the confirm action
 *   fileNamePrefix — basename for the produced File (default "scan")
 */
export default function CameraCaptureModal({
  open,
  onClose,
  onCapture,
  title = 'Scan Document',
  busy = false,
  fileNamePrefix = 'scan',
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState(null);        // dataURL of the frozen frame
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(undefined);
  const [facingMode, setFacingMode] = useState('environment');

  const stopStream = useCallback(() => {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startStream = useCallback(async (opts = {}) => {
    setError('');
    setStarting(true);
    stopStream();
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser does not expose a camera API.');
      }
      const constraints = {
        video: opts.deviceId
          ? { deviceId: { exact: opts.deviceId } }
          : { facingMode: { ideal: opts.facingMode || facingMode } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      // Enumerate only after permission is granted so labels are populated.
      try {
        const list = (await navigator.mediaDevices.enumerateDevices())
          .filter((d) => d.kind === 'videoinput');
        setDevices(list);
        const active = stream.getVideoTracks()[0]?.getSettings?.().deviceId;
        if (active) setDeviceId(active);
      } catch { /* enumerateDevices is best-effort */ }
    } catch (err) {
      let msg = err?.message || 'Could not start the camera.';
      if (err?.name === 'NotAllowedError') msg = 'Camera permission was denied. Allow camera access in the browser and try again.';
      else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') msg = 'No camera was found on this device.';
      else if (err?.name === 'NotReadableError') msg = 'The camera is already in use by another app.';
      else if (!window.isSecureContext) msg = 'The camera needs a secure (HTTPS or localhost) connection.';
      setError(msg);
      stopStream();
    } finally {
      setStarting(false);
    }
  }, [facingMode, stopStream]);

  // Open / close lifecycle — syncing React state to an external system (the camera
  // stream), so the setState calls here are deliberate.
  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setSnapshot(null);
      startStream();
    } else {
      stopStream();
      setSnapshot(null);
      setError('');
    }
    return () => stopStream();
  }, [open]);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  // Re-bind the live stream to the <video> element whenever the preview should be
  // visible — covers the first mount (Modal destroyOnClose remounts the node) and
  // returning from a frozen snapshot via "Retake".
  useEffect(() => {
    if (open && !snapshot && !error && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play?.().catch(() => {});
    }
  }, [open, snapshot, error, starting]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvasRef.current = canvas;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setSnapshot(canvas.toDataURL('image/jpeg', 0.92));
  };

  const handleRetake = () => {
    setSnapshot(null);
    if (!streamRef.current) startStream({ deviceId });
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `${fileNamePrefix}-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture?.(file);
      },
      'image/jpeg',
      0.92,
    );
  };

  const switchCamera = () => {
    if (devices.length > 1) {
      const idx = devices.findIndex((d) => d.deviceId === deviceId);
      const next = devices[(idx + 1) % devices.length];
      setDeviceId(next.deviceId);
      startStream({ deviceId: next.deviceId });
    } else {
      const nextMode = facingMode === 'environment' ? 'user' : 'environment';
      setFacingMode(nextMode);
      startStream({ facingMode: nextMode });
    }
  };

  return (
    <Modal
      open={open}
      onCancel={busy ? undefined : onClose}
      title={<span><CameraOutlined style={{ marginRight: 8, color: '#B11E6A' }} />{title}</span>}
      maskClosable={!busy}
      closable={!busy}
      width={640}
      destroyOnClose
      footer={
        snapshot ? (
          <Space>
            <Button icon={<RedoOutlined />} onClick={handleRetake} disabled={busy}>Retake</Button>
            <Button type="primary" icon={<CheckOutlined />} loading={busy} onClick={handleConfirm}
              style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
              {busy ? 'Processing…' : 'Use Photo'}
            </Button>
          </Space>
        ) : (
          <Space>
            <Button icon={<SwapOutlined />} onClick={switchCamera} disabled={starting || !!error}>
              Switch Camera
            </Button>
            <Button type="primary" icon={<CameraOutlined />} onClick={handleCapture} disabled={starting || !!error}
              style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
              Capture Photo
            </Button>
          </Space>
        )
      }
    >
      {error ? (
        <Alert
          type="error"
          showIcon
          message="Camera unavailable"
          description={
            <div>
              <div style={{ marginBottom: 8 }}>{error}</div>
              <Button size="small" onClick={() => startStream({ deviceId })}>Try again</Button>
            </div>
          }
        />
      ) : (
        <div style={{ position: 'relative', background: '#000', borderRadius: 8, overflow: 'hidden', minHeight: 320 }}>
          {starting && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 32, color: '#fff' }} spin />} />
              <span style={{ color: '#fff', fontSize: 13 }}>Starting camera…</span>
            </div>
          )}
          {/* Live preview — hidden (but kept mounted) once a snapshot is frozen */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', display: snapshot ? 'none' : 'block', maxHeight: 460, objectFit: 'contain' }}
          />
          {snapshot && (
            <img src={snapshot} alt="Captured document" style={{ width: '100%', maxHeight: 460, objectFit: 'contain', display: 'block' }} />
          )}
        </div>
      )}

      {devices.length > 1 && !snapshot && !error && (
        <Select
          size="small"
          value={deviceId}
          onChange={(v) => { setDeviceId(v); startStream({ deviceId: v }); }}
          style={{ width: '100%', marginTop: 10 }}
          options={devices.map((d, i) => ({ value: d.deviceId, label: d.label || `Camera ${i + 1}` }))}
        />
      )}
    </Modal>
  );
}
