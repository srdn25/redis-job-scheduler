import { randomUUID } from 'node:crypto';
import { scheduler } from 'node:timers/promises';

import { JobScheduler } from '../src';

describe('JobScheduler should work correct', () => {
  let jobScheduler = null;

  beforeAll(() => {
    jobScheduler = new JobScheduler(
      '127.0.0.1',
      1234,
    );
  });

  afterAll(() => {
    jobScheduler.disconnectRedis();
  });

  it('Should be able schedule job in seconds', async () => {
    const expireTime = 3; // seconds
    const handlerName = 'test_handler_seconds';
    const id = randomUUID();
    const payload = {
      id,
      props: 'abc',
      name: 'test bar',
    };

    const handlerMock = jest.fn();

    jobScheduler.addHandler(handlerName, handlerMock);

    await jobScheduler.scheduleJobInSeconds(handlerName, id, expireTime, payload);

    await scheduler.wait((expireTime * 1000) + 100);

    expect(handlerMock).toHaveBeenCalledTimes(1);
    expect(handlerMock).toHaveBeenCalledWith(payload);
  });

  it('Should be able schedule job at date', async () => {
    const expireTime = 1; // seconds
    const now = new Date();
    const expireDate = new Date(now.getTime() + expireTime * 1000);
    const handlerName = 'test_handler_at_date';
    const id = randomUUID();
    const payload = {
      id,
      props: 'abc',
      name: 'test bar',
    };

    const handlerMock = jest.fn();

    jobScheduler.addHandler(handlerName, handlerMock);

    await jobScheduler.scheduleJobAtDate(handlerName, id, expireDate, payload);

    await scheduler.wait((expireTime * 1000) + 100);

    expect(handlerMock).toHaveBeenCalledTimes(1);
    expect(handlerMock).toHaveBeenCalledWith(payload);
  });

  it('Should be able to cancel job', async () => {
    const expireTime = 1; // seconds
    const now = new Date();
    const expireDate = new Date(now.getTime() + expireTime * 1000);
    const handlerName = 'test_cancel_job';
    const id = randomUUID();
    const payload = {
      id,
      props: 'abc',
      name: 'test bar',
    };

    const handlerMock = jest.fn();

    jobScheduler.addHandler(handlerName, handlerMock);

    await jobScheduler.scheduleJobAtDate(handlerName, id, expireDate, payload);

    const halfTime = expireTime / 2;
    await scheduler.wait(halfTime);

    await jobScheduler.cancelJob(handlerName, id);

    await scheduler.wait((expireTime * 1000) + 100);

    expect(handlerMock).not.toHaveBeenCalled();
  });
});
