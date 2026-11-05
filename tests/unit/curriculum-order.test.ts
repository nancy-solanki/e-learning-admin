import { afterEach, beforeEach, expect, it } from 'vitest';
import { AxiosHeaders } from 'axios';
import { api, authTransport, resetCsrf } from '../../src/api/axios';
import { saveCurriculumOrder } from '../../src/api/services/instructorCurriculum';
const original = api.defaults.adapter;
const authOriginal = authTransport.defaults.adapter;
beforeEach(() => {
  resetCsrf();
  authTransport.defaults.adapter = async (config) => ({
    data: { csrfToken: 'csrf' },
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
    config,
  });
});
afterEach(() => {
  api.defaults.adapter = original;
  authTransport.defaults.adapter = authOriginal;
  resetCsrf();
});
it('persists the displayed order using one-based positions', async () => {
  const calls: unknown[] = [];
  api.defaults.adapter = async (config) => {
    calls.push([config.url, JSON.parse(config.data)]);
    return {
      data: {},
      status: 200,
      statusText: 'OK',
      headers: new AxiosHeaders(),
      config,
    };
  };
  await saveCurriculumOrder('sections', ['second', 'first']);
  expect(calls).toEqual([
    ['/api/v1/section/instructor/all/second/', { order: 1 }],
    ['/api/v1/section/instructor/all/first/', { order: 2 }],
  ]);
});
it('rejects partial failures and can retry the complete desired order', async () => {
  let failing = true;
  const calls: string[] = [];
  api.defaults.adapter = async (config) => {
    calls.push(config.url ?? '');
    if (failing && config.url?.includes('/first/'))
      throw new Error('Network error');
    return {
      data: {},
      status: 200,
      statusText: 'OK',
      headers: new AxiosHeaders(),
      config,
    };
  };
  await expect(
    saveCurriculumOrder('sections', ['second', 'first']),
  ).rejects.toThrow('Network error');
  failing = false;
  await saveCurriculumOrder('sections', ['second', 'first']);
  expect(calls).toEqual([
    '/api/v1/section/instructor/all/second/',
    '/api/v1/section/instructor/all/first/',
    '/api/v1/section/instructor/all/second/',
    '/api/v1/section/instructor/all/first/',
  ]);
});

it('persists lecture order through the instructor lecture endpoint', async () => {
  const calls: unknown[] = [];
  api.defaults.adapter = async (config) => {
    calls.push([config.url, config.method, JSON.parse(config.data)]);
    return {
      data: {},
      status: 200,
      statusText: 'OK',
      headers: new AxiosHeaders(),
      config,
    };
  };
  await saveCurriculumOrder('lectures', ['lecture-2', 'lecture-1']);
  expect(calls).toEqual([
    ['/api/v1/lecture/instructor/all/lecture-2/', 'patch', { order: 1 }],
    ['/api/v1/lecture/instructor/all/lecture-1/', 'patch', { order: 2 }],
  ]);
});
