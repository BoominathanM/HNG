import { useUploadFilesMutation } from '../store/api/apiSlice';
import { enqueueSnackbar } from 'notistack';

/**
 * Returns a factory that builds an AntD Upload `customRequest` handler.
 * Usage:
 *   const makeUpload = useCloudinaryUpload();
 *   <Upload customRequest={makeUpload('invoices')} ... />
 *
 * @returns {(folder: string) => (options: AntDUploadRequestOption) => void}
 */
export function useCloudinaryUpload() {
  const [uploadFilesMutation] = useUploadFilesMutation();

  return (folder = 'general') =>
    async ({ file, onSuccess, onError }) => {
      const formData = new FormData();
      formData.append('files', file);
      try {
        const res = await uploadFilesMutation({ formData, folder }).unwrap();
        const uploaded = res.data?.[0];
        if (uploaded) {
          file.url = uploaded.url;
          file.cloudPublicId = uploaded.public_id;
          file.thumbUrl = uploaded.url;
          onSuccess(uploaded, file);
        } else {
          onError(new Error('Upload failed — no URL returned'));
          enqueueSnackbar('File upload failed', { variant: 'error' });
        }
      } catch (err) {
        onError(err);
        enqueueSnackbar(err?.data?.message || 'File upload failed', { variant: 'error' });
      }
    };
}

/**
 * Helper: extract Cloudinary URL from an AntD fileList entry.
 * Works for both freshly-uploaded files (file.url set by customRequest)
 * and previously-saved files (stored as { url, name, public_id }).
 */
export function getFileUrl(fileEntry) {
  if (!fileEntry) return null;
  return fileEntry.url || fileEntry.response?.url || null;
}

/**
 * Serialize an AntD fileList into the shape persisted in MongoDB:
 * [{ name, url, public_id }]
 */
export function serializeFileList(fileList = []) {
  return fileList
    .filter((f) => f.status === 'done' || f.url)
    .map((f) => ({
      name: f.name || f.originFileObj?.name || 'file',
      url: getFileUrl(f),
      public_id: f.cloudPublicId || f.response?.public_id || null,
      uid: f.uid,
    }));
}
