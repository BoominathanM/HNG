// Helpers for the hotel logo file (Lead.hotelLogoUrl → Order.logoUrl). The lead-form logo
// Upload accepts images, PDFs and .ai files — only images can render in an <img>.

export const isImageUrl = (url) => /\.(jpe?g|png|gif|webp|bmp|svg|avif)(\?|$)/i.test(url || '');

/** File extension from a URL's path (e.g. "pdf", "jpg"), or '' when it has none. */
export const urlExtension = (url) => ((url || '').split('?')[0].match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
