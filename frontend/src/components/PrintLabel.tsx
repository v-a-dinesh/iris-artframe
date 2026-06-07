interface PrintLabelProps {
  deviceId: string;
  deviceName?: string | null;
  qrDataUrl: string;
}

/** Print-safe logo mark — solid colors, no gradients (reliable in print) */
function PrintLogoMark() {
  return (
    <svg width="48" height="48" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <rect x="8" y="8" width="104" height="104" rx="20" stroke="#b8941f" strokeWidth="4" fill="#ffffff" />
      <rect x="18" y="18" width="84" height="84" rx="12" stroke="#7c3aed" strokeWidth="3" fill="none" />
      <path
        d="M60 32 C48 42 42 52 42 60 C42 68 48 78 60 88 C72 78 78 68 78 60 C78 52 72 42 60 32Z"
        fill="#7c3aed"
      />
      <path
        d="M60 38 C54 44 50 52 50 60 C50 68 54 76 60 82 C66 76 70 68 70 60 C70 52 66 44 60 38Z"
        fill="#ffffff"
      />
      <circle cx="60" cy="60" r="6" fill="#b8941f" />
      <path d="M60 24 L62 34 L60 32 L58 34 Z" fill="#7c3aed" />
    </svg>
  );
}

export default function PrintLabel({ deviceId, deviceName, qrDataUrl }: PrintLabelProps) {
  return (
    <div className="print-label-sheet">
      <div className="print-label-card">
        {/* Header brand */}
        <div className="print-label-header">
          <PrintLogoMark />
          <div className="print-label-brand">
            <p className="print-label-brand-name">IRIS ART FRAME</p>
            <p className="print-label-brand-tag">Digital E-Ink Display</p>
          </div>
        </div>

        <div className="print-label-divider" />

        {/* QR */}
        <div className="print-label-qr-wrap">
          <img src={qrDataUrl} alt="Scan to register device" className="print-label-qr" />
        </div>

        <p className="print-label-scan">Scan to register this frame</p>

        <div className="print-label-divider" />

        {/* Device info */}
        <div className="print-label-device">
          <p className="print-label-device-label">Device ID</p>
          <p className="print-label-device-id">{deviceId}</p>
          {deviceName && <p className="print-label-device-name">{deviceName}</p>}
        </div>

        <p className="print-label-footer">iris-artframe.com</p>
      </div>
    </div>
  );
}
