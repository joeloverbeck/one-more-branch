import type { NextFunction, Request, Response } from 'express';
import { wrapAsyncRoute } from '../../../../src/server/utils/async-route';

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('wrapAsyncRoute', () => {
  it('forwards async errors to next', async () => {
    const error = new Error('boom');
    const handler = wrapAsyncRoute(() => Promise.reject(error));

    const next = jest.fn() as NextFunction;
    handler({} as Request, {} as Response, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(error);
  });

  it('does not call next when handler resolves', async () => {
    const handler = wrapAsyncRoute(() => Promise.resolve(undefined));

    const next = jest.fn() as NextFunction;
    handler({} as Request, {} as Response, next);
    await flushPromises();

    expect(next).not.toHaveBeenCalled();
  });

  it('forwards rejected errors from handler', async () => {
    const error = new Error('sync');
    const handler = wrapAsyncRoute(() => Promise.reject(error));

    const next = jest.fn() as NextFunction;
    handler({} as Request, {} as Response, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards rejected Error values', async () => {
    const error = new Error('oops');
    const handler = wrapAsyncRoute(() => Promise.reject(error));

    const next = jest.fn() as NextFunction;
    handler({} as Request, {} as Response, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(error);
  });

  it('returns a function with Express middleware signature (req, res, next)', () => {
    const wrapped = wrapAsyncRoute(() => Promise.resolve(undefined));

    expect(wrapped.length).toBe(3);
  });
});
