import type { Device } from '../types';

export interface DeviceEditValues {
  name: string;
  dynamic_ip: string;
  wifi_name: string;
  status: string;
}

interface DeviceEditFormProps {
  values: DeviceEditValues;
  onChange: (values: DeviceEditValues) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error?: string;
  compact?: boolean;
}

export function deviceToEditValues(device: Device): DeviceEditValues {
  return {
    name: device.name || '',
    dynamic_ip: device.dynamic_ip || '',
    wifi_name: device.wifi_name || '',
    status: device.status || 'inactive',
  };
}

export default function DeviceEditForm({
  values,
  onChange,
  onSave,
  onCancel,
  saving,
  error,
  compact,
}: DeviceEditFormProps) {
  const fieldClass = compact ? 'input-field text-xs' : 'input-field text-sm';

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div>
        <label className="label">Name</label>
        <input
          className={fieldClass}
          value={values.name}
          onChange={(e) => onChange({ ...values, name: e.target.value })}
          placeholder="Bedroom Frame"
        />
      </div>
      <div>
        <label className="label">Dynamic IP</label>
        <input
          className={`${fieldClass} font-mono`}
          value={values.dynamic_ip}
          onChange={(e) => onChange({ ...values, dynamic_ip: e.target.value })}
          placeholder="192.168.1.105"
        />
      </div>
      <div>
        <label className="label">WiFi name</label>
        <input
          className={fieldClass}
          value={values.wifi_name}
          onChange={(e) => onChange({ ...values, wifi_name: e.target.value })}
          placeholder="HomeNetwork"
        />
      </div>
      <div>
        <label className="label">Status</label>
        <select
          className={fieldClass}
          value={values.status}
          onChange={(e) => onChange({ ...values, status: e.target.value })}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-primary text-xs" disabled={saving} onClick={onSave}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" className="btn-secondary text-xs" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
