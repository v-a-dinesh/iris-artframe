import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });
dotenv.config({ path: join(__dirname, '../../../.env') });

import { macToDeviceId, parseQrPayload, isValidMac, normalizeDeviceId } from '../utils/deviceId.js';
import { registerUser, loginUser } from '../services/auth.service.js';
import { provisionDevice, registerDeviceForUser, updateDeviceDynamicIp, updateDeviceDynamicIpByMac } from '../services/device.service.js';
import { uploadImage, getImageByPublicId } from '../services/image.service.js';
import { queueDisplayJob } from '../services/display.service.js';

const TEST_EMAIL = `test-${Date.now()}@iris-test.com`;
const TEST_MAC_SUFFIX = Date.now().toString(16).slice(-6).toUpperCase().padStart(6, '0');
const TEST_MAC = `B8:27:EB:${TEST_MAC_SUFFIX.slice(0, 2)}:${TEST_MAC_SUFFIX.slice(2, 4)}:${TEST_MAC_SUFFIX.slice(4, 6)}`;
const TEST_STATIC_IP = `10.${(Date.now() % 200) + 10}.${(Date.now() % 200) + 10}.${(Date.now() % 200) + 10}`;
let userId = '';
let deviceUuid = '';
let deviceIdStr = '';
let imageId = '';
let publicId = '';
let jobId = '';

describe('Iris Art Frame API Integration', () => {
  it('macToDeviceId uses MAC as device id', () => {
    assert.equal(macToDeviceId('b8:27:eb:12:34:56'), 'B8:27:EB:12:34:56');
    assert.equal(normalizeDeviceId('IRIS-B827EB123456'), 'B8:27:EB:12:34:56');
    assert.equal(isValidMac('B8:27:EB:AA:BB:CC'), true);
  });

  it('parseQrPayload handles JSON and plain text', () => {
    const json = JSON.stringify({ type: 'iris-artframe', device_id: 'B8:27:EB:12:34:56' });
    assert.equal(parseQrPayload(json), 'B8:27:EB:12:34:56');
    assert.equal(parseQrPayload('B8:27:EB:12:34:56'), 'B8:27:EB:12:34:56');
    assert.equal(parseQrPayload('IRIS-B827EB123456'), 'B8:27:EB:12:34:56');
  });

  it('registers a test user', async () => {
    const result = await registerUser({
      name: 'Test User',
      email: TEST_EMAIL,
      password: 'testpass123',
      mobile: '+919999999999',
    });
    assert.ok(result.user.id);
    assert.ok(result.token);
    userId = result.user.id;
  });

  it('logs in the test user', async () => {
    const result = await loginUser({ email: TEST_EMAIL, password: 'testpass123' });
    assert.equal(result.user.email, TEST_EMAIL);
  });

  it('provisions a device from MAC', async () => {
    const result = await provisionDevice({ mac: TEST_MAC, name: 'Test Frame', staticIp: TEST_STATIC_IP });
    assert.ok(result.device.id);
    assert.ok(result.api_key);
    assert.ok(result.qr_data_url.startsWith('data:image/png'));
    deviceUuid = result.device.id;
    deviceIdStr = result.device.device_id;
    assert.equal(deviceIdStr, macToDeviceId(TEST_MAC));
  });

  it('registers device for user', async () => {
    const device = await registerDeviceForUser(userId, {
      device_id: deviceIdStr,
      name: 'My Test Frame',
    });
    assert.equal(device.device_id, deviceIdStr);
  });

  it('rejects unsupported image formats', async () => {
    const webpBuffer = Buffer.from('RIFF....WEBP', 'utf8');
    const file = {
      originalname: 'test.webp',
      mimetype: 'image/webp',
      size: webpBuffer.length,
      buffer: webpBuffer,
    };
    await assert.rejects(() => uploadImage(userId, file), /JPG, JPEG, PNG/);
  });

  it('uploads an image', async () => {
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    const file = {
      originalname: 'test.png',
      mimetype: 'image/png',
      size: pngBuffer.length,
      buffer: pngBuffer,
    };
    const image = await uploadImage(userId, file);
    assert.ok(image.id);
    assert.ok(image.public_id);
    assert.ok(image.public_url.includes(image.public_id));
    imageId = image.id;
    publicId = image.public_id;
  });

  it('serves image by public id', async () => {
    const img = await getImageByPublicId(publicId);
    assert.ok(img);
    assert.equal(img.mime_type, 'image/png');
  });

  it('queues display job', async () => {
    const result = await queueDisplayJob(userId, deviceUuid, imageId);
    assert.equal(result.status, 'pending');
    jobId = result.job_id;
  });

  it('updates device dynamic IP', async () => {
    const device = await updateDeviceDynamicIp(deviceUuid, '192.168.1.105');
    assert.ok(device);
    assert.equal(device?.dynamic_ip, '192.168.1.105');
  });

  it('updates device dynamic IP by MAC', async () => {
    const device = await updateDeviceDynamicIpByMac(TEST_MAC, '192.168.1.50');
    assert.ok(device);
    assert.equal(device?.dynamic_ip, '192.168.1.50');
  });
});
