import { afterEach, beforeEach, expect, it } from 'vitest';
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { api, authTransport, resetCsrf } from '../../src/api/axios';
import {
  createInstructorLecture,
  deleteInstructorLecture,
  getAdminLecture,
  listAdminLectures,
  patchInstructorLecture,
  patchAdminLecture,
  submitInstructorLecture,
  updateInstructorLecture,
} from '../../src/api/services/lectures';

const originalAdapter = api.defaults.adapter;
const originalAuthAdapter = authTransport.defaults.adapter;

function response(
  data: unknown,
  config: InternalAxiosRequestConfig,
  status = 200,
) {
  return {
    data,
    config,
    status,
    statusText: status === 204 ? 'No Content' : 'OK',
    headers: new AxiosHeaders(),
  };
}

beforeEach(() => {
  resetCsrf();
  authTransport.defaults.adapter = async (config) =>
    response({ csrfToken: 'csrf' }, config);
});

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  authTransport.defaults.adapter = originalAuthAdapter;
  resetCsrf();
});

it('uses the lecture instructor list endpoint with supported filters', async () => {
  const filters = {
    page: 'last' as const,
    search: 'audio basics',
    course: 'course-uuid',
    course_slug: 'audio-basics',
    section: 'section-uuid',
    section_slug: 'introduction',
    instructor: 'instructor-uuid',
    status: 'published' as const,
    lecture_type: 'video' as const,
    is_preview: false,
    ordering: 'order,-created_at',
  };
  api.defaults.adapter = async (config) => {
    expect(config.url).toBe('/api/v1/lecture/instructor/all/');
    expect(config.method).toBe('get');
    expect(config.data).toBeUndefined();
    expect(config.params).toEqual(filters);
    expect(config.params).not.toHaveProperty('page_size');
    expect(config.withCredentials).toBe(true);
    return response(
      { count: 0, next: null, previous: null, results: [] },
      config,
    );
  };
  expect(await listAdminLectures(filters)).toEqual({
    count: 0,
    next: null,
    previous: null,
    results: [],
  });
});

it('uses UUID details and limits lecture patches to status and rejection reason', async () => {
  const requests: InternalAxiosRequestConfig[] = [];
  api.defaults.adapter = async (config) => {
    requests.push(config);
    return response(
      {
        id: 'lecture/uuid',
        instructor: 'john_doe',
        course: 'course-uuid',
        section: 'section-uuid',
        status: 'rejected',
        source: 'https://example.test/video.mp4',
        thumbnail: null,
        resources: null,
      },
      config,
    );
  };
  await getAdminLecture('lecture/uuid');
  await patchAdminLecture('lecture/uuid', 'rejected', 'Improve audio.');
  await patchAdminLecture('lecture/uuid', 'draft', 'must not be sent');
  await patchAdminLecture('lecture/uuid', 'rejected', '  ');
  expect(requests[0].url).toBe(
    '/api/v1/lecture/instructor/all/lecture%2Fuuid/',
  );
  expect(requests[0].method).toBe('get');
  expect(JSON.parse(requests[1].data)).toEqual({
    status: 'rejected',
    reject_reason: 'Improve audio.',
  });
  expect(JSON.parse(requests[2].data)).toEqual({ status: 'draft' });
  expect(JSON.parse(requests[3].data)).toEqual({ status: 'rejected' });
});

it('creates document lectures as JSON and supports PUT, PATCH, and soft-delete', async () => {
  const calls: InternalAxiosRequestConfig[] = [];
  api.defaults.adapter = async (config) => {
    calls.push(config);
    return response(
      config.method === 'delete'
        ? { message: 'Lecture deleted successfully' }
        : { id: 'lecture-uuid' },
      config,
      config.method === 'delete' ? 200 : 201,
    );
  };
  const lecture = {
    title: 'Introduction',
    description: 'An introduction to the course',
    lecture_type: 'document' as const,
    is_preview: false,
    document_content: 'Lesson content',
    resources: [],
    order: 1,
    course: 'course-uuid',
    section: 'section-uuid',
  };
  await createInstructorLecture(lecture);
  await updateInstructorLecture('lecture-uuid', lecture);
  await patchInstructorLecture('lecture-uuid', { order: 2 });
  expect(await deleteInstructorLecture('lecture-uuid')).toEqual({
    message: 'Lecture deleted successfully',
  });
  expect(calls.map(({ method, url }) => [method, url])).toEqual([
    ['post', '/api/v1/lecture/instructor/all/'],
    ['put', '/api/v1/lecture/instructor/all/lecture-uuid/'],
    ['patch', '/api/v1/lecture/instructor/all/lecture-uuid/'],
    ['delete', '/api/v1/lecture/instructor/all/lecture-uuid/'],
  ]);
  expect(JSON.parse(calls[0].data)).toEqual(lecture);
  expect(JSON.parse(calls[1].data)).toEqual(lecture);
  expect(JSON.parse(calls[2].data)).toEqual({ order: 2 });
  expect(JSON.parse(calls[0].data)).not.toHaveProperty('status');
  expect(JSON.parse(calls[1].data)).not.toHaveProperty('status');
});

it('sends video and thumbnail uploads as multipart data', async () => {
  const source = new File(['video'], 'lesson.mp4', { type: 'video/mp4' });
  const thumbnail = new File(['image'], 'thumb.png', { type: 'image/png' });
  api.defaults.adapter = async (config) => {
    expect(config.method).toBe('post');
    expect(config.headers.get('Content-Type')).toBe(false);
    const body = config.data as FormData;
    expect(body.get('source')).toBe(source);
    expect(body.get('thumbnail')).toBe(thumbnail);
    expect(body.get('is_preview')).toBe('false');
    expect(body.get('resources')).toBe('[]');
    return response({ id: 'lecture-uuid' }, config, 201);
  };
  await createInstructorLecture({
    title: 'Video lesson',
    description: 'Watch this',
    lecture_type: 'video',
    is_preview: false,
    order: 1,
    course: 'course-uuid',
    section: 'section-uuid',
    resources: [],
    source,
    thumbnail,
  });
});

it('submits instructor lectures using the explicit approval action', async () => {
  api.defaults.adapter = async (config) => {
    expect(config.method).toBe('post');
    expect(config.url).toBe(
      '/api/v1/lecture/instructor/all/lecture-uuid/submit/',
    );
    return response(
      {
        message: 'Lecture submitted for review.',
        status: 'in-review',
      },
      config,
    );
  };
  expect(await submitInstructorLecture('lecture-uuid')).toEqual({
    message: 'Lecture submitted for review.',
    status: 'in-review',
  });
});
