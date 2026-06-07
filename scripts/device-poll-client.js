#!/usr/bin/env node
/**
 * Iris Art Frame — Device Poll Client (TypeScript-ready)
 *
 * Run on Raspberry Pi to poll cloud API for display jobs.
 *
 * Usage:
 *   IRIS_API_KEY=iris_xxx IRIS_API_URL=https://your-api.onrender.com node device-poll-client.js
 */

const API_URL = process.env.IRIS_API_URL || 'http://localhost:3001';
const API_KEY = process.env.IRIS_API_KEY;
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '10000', 10);
const DEVICE_PORT = process.env.DEVICE_PORT || '5000';

if (!API_KEY) {
  console.error('Error: IRIS_API_KEY environment variable is required');
  process.exit(1);
}

async function poll(): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/api/device/poll`, {
      headers: { 'x-api-key': API_KEY },
    });

    if (!res.ok) {
      console.error(`Poll failed: ${res.status} ${await res.text()}`);
      return;
    }

    const data = (await res.json()) as {
      job: { job_id: string; image_url: string } | null;
    };

    if (!data.job) {
      process.stdout.write('.');
      return;
    }

    console.log(`\nNew job: ${data.job.job_id}`);
    console.log(`Image URL: ${data.job.image_url}`);

    const displayRes = await fetch(`http://127.0.0.1:${DEVICE_PORT}/display`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({ image_url: data.job.image_url }),
    });

    const displayData = (await displayRes.json().catch(() => ({}))) as {
      status?: string;
      message?: string;
    };
    const success = displayRes.ok && displayData.status === 'success';

    await fetch(`${API_URL}/api/device/poll/ack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        job_id: data.job.job_id,
        status: success ? 'success' : 'error',
        message: displayData.message || (success ? 'Displayed' : 'Display failed'),
      }),
    });

    console.log(success ? 'Display successful' : 'Display failed');
  } catch (err) {
    console.error('Poll error:', err instanceof Error ? err.message : err);
  }
}

console.log(`Iris poll client started — polling ${API_URL} every ${POLL_INTERVAL_MS / 1000}s`);
setInterval(poll, POLL_INTERVAL_MS);
poll();
