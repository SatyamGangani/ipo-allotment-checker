import { describe, it, expect } from 'vitest';
import healthHandler from '../api/health.ts';
import iposHandler from '../api/ipos.ts';
import checkAllotmentHandler from '../api/check-allotment.ts';

function createMockRes() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let responseData = '';

  const res: any = {
    headers,
    statusCode,
    setHeader(key: string, val: string) {
      headers[key] = val;
    },
    writeHead(code: number, newHeaders?: Record<string, string>) {
      res.statusCode = code;
      if (newHeaders) {
        Object.assign(headers, newHeaders);
      }
    },
    end(data?: string) {
      if (data) responseData = data;
    },
    getBody() {
      return responseData;
    },
    getJson() {
      return JSON.parse(responseData || '{}');
    },
  };
  return res;
}

describe('Vercel API Serverless Function Handlers', () => {
  it('GET /api/health returns ok status', () => {
    const req: any = { method: 'GET' };
    const res = createMockRes();

    healthHandler(req, res);

    expect(res.statusCode).toBe(200);
    const json = res.getJson();
    expect(json.status).toBe('ok');
    expect(typeof json.timestamp).toBe('number');
  });

  it('OPTIONS /api/ipos responds with 204 preflight', async () => {
    const req: any = { method: 'OPTIONS' };
    const res = createMockRes();

    await iposHandler(req, res);

    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
  });

  it('POST /api/check-allotment handles preflight and validation', async () => {
    // 1. Preflight
    const optReq: any = { method: 'OPTIONS' };
    const optRes = createMockRes();
    await checkAllotmentHandler(optReq, optRes);
    expect(optRes.statusCode).toBe(204);

    // 2. Missing params validation
    const postReq: any = {
      method: 'POST',
      body: { registrar: 'LINKINTIME' }, // missing pan and companyId
    };
    const postRes = createMockRes();
    await checkAllotmentHandler(postReq, postRes);
    expect(postRes.statusCode).toBe(400);
    expect(postRes.getJson().status).toBe('error');

    // 3. Method not allowed
    const getReq: any = { method: 'GET' };
    const getRes = createMockRes();
    await checkAllotmentHandler(getReq, getRes);
    expect(getRes.statusCode).toBe(405);
  });
});
