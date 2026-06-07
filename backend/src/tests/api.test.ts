import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });
dotenv.config({ path: join(__dirname, '../../../.env') });

import { macToDeviceId, parseQrPayload, isValidMac } from '../utils/deviceId.js';
import { registerUser, loginUser } from '../services/auth.service.js';
import { provisionDevice, registerDeviceForUser } from '../services/device.service.js';
import { uploadImage, getImageByPublicId } from '../services/image.service.js';
import { queueDisplayJob, getPendingJobForDevice, acknowledgeJob } from '../services/display.service.js';

const TEST_EMAIL = `test-${Date.now()}@iris-test.com`;
const TEST_MAC = 'B8:27:EB:AA:BB:CC';
let userId = '';
let deviceUuid = '';
let deviceIdStr = '';
let imageId = '';
let publicId = '';
let jobId = '';

describe('Iris Art Frame API Integration', () => {
  it('macToDeviceId converts MAC correctly', () => {
    assert.equal(macToDeviceId('b8:27:eb:12:34:56'), 'IRIS-B827EB123456');
    assert.equal(isValidMac('B8:27:EB:AA:BB:CC'), true);
  });

  it('parseQrPayload handles JSON and plain text', () => {
    const json = JSON.stringify({ type: 'iris-artframe', device_id: 'IRIS-B827EB123456' });
    assert.equal(parseQrPayload(json), 'IRIS-B827EB123456');
    assert.equal(parseQrPayload('IRIS-B827EB123456'), 'IRIS-B827EB123456');
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
    const result = await provisionDevice({ mac: TEST_MAC, name: 'Test Frame' });
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

  it('device polls pending job', async () => {
    const job = await getPendingJobForDevice(deviceUuid);
    assert.ok(job);
    assert.equal(job.job_id, jobId);
    assert.ok(job.image_url.includes(publicId));
  });

  it('device acknowledges job', async () => {
    const result = await acknowledgeJob(deviceUuid, jobId, {
      status: 'success',
      message: 'Displayed on E-Ink',
    });
    assert.equal(result.status, 'completed');
  });

  it('no pending job after ack', async () => {
    const job = await getPendingJobForDevice(deviceUuid);
    assert.equal(job, null);
  });
});
