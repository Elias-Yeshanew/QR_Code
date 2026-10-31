import QRCode from 'qrcode';

export interface QROptions {
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  width?: number;
}

export async function generateQRDataUrl(
  text: string,
  options?: QROptions
): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: options?.errorCorrectionLevel || 'H',
      margin: options?.margin ?? 2,
      width: options?.width ?? 320,
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR data URL:', err);
    return '';
  }
}

export function downloadQrCode(dataUrl: string, filename = 'landing-page-qr.png') {
  if (!dataUrl) return;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
