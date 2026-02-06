import type { NextFunction, Request, Response } from 'express';
import { errorHandler } from '../../../../src/server/middleware/error-handler';

type MockResponse = {
  status: jest.MockedFunction<(code: number) => Response>;
  render: jest.MockedFunction<(view: string, locals?: object) => Response>;
};

describe('errorHandler middleware', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs the error and renders a generic 500 error page', () => {
    const error = new Error('database password is hunter2');
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      // no-op in tests
    });
    const res = {
      status: jest.fn(),
      render: jest.fn(),
    } as unknown as MockResponse;

    res.status.mockReturnValue(res as unknown as Response);
    res.render.mockReturnValue(res as unknown as Response);

    errorHandler(
      error,
      {} as Request,
      res as unknown as Response,
      jest.fn() as unknown as NextFunction,
    );

    expect(errorSpy).toHaveBeenCalledWith('Unhandled error:', error);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render).toHaveBeenCalledWith('pages/error', {
      title: 'Error - One More Branch',
      message: 'Something went wrong. Please try again.',
    });

    const renderPayload = res.render.mock.calls[0]?.[1] as { message?: string };
    expect(renderPayload.message).not.toContain('hunter2');
  });
});
