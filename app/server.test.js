'use strict';

process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('./server');

describe('casestudy-demo-app', () => {
  it('GET / tra ve service info', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.service).toBe('casestudy-demo-app');
  });

  it('GET /api/products tra ve danh sach san pham', async () => {
    const res = await request(app).get('/api/products');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('price');
  });

  it('GET /health/live tra ve UP', async () => {
    const res = await request(app).get('/health/live');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  it('GET /health/ready tra ve READY (test mode warm-up = 0)', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('READY');
  });
});
