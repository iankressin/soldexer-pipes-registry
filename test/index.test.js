import { test, expect } from 'vitest';
import Fastify from 'fastify';
test('GET / returns hello world', async () => {
    const fastify = Fastify();
    fastify.get('/', async (request, reply) => {
        return { message: 'Hello World!' };
    });
    const response = await fastify.inject({
        method: 'GET',
        url: '/'
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ message: 'Hello World!' });
});
test('GET /health returns status', async () => {
    const fastify = Fastify();
    fastify.get('/health', async (request, reply) => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });
    const response = await fastify.inject({
        method: 'GET',
        url: '/health'
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
});
//# sourceMappingURL=index.test.js.map