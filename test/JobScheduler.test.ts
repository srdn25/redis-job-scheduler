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
    const expireDate = new Date(now.getTime() + (expireTime * 1000));
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

  it('Should throw error if handler with __', () => {
    const handlerName = 'handler__wrong';
    const handlerMock = jest.fn();

    let error: Error;
    try {
      jobScheduler.addHandler(handlerName, handlerMock);
    } catch (err) {
      error = err;
    }

    expect(error.message).toBe('Handler cannot contains "__"');
    expect(handlerMock).not.toHaveBeenCalled();
  });

  it('Should throw error if schedule job with handler __', async () => {
    const handlerName = 'handler__incorrect';
    const handlerMock = jest.fn();
    const id = randomUUID();

    let error: Error;
    try {
      await jobScheduler.scheduleJobInSeconds(handlerName, id, 1, {});
    } catch (err) {
      error = err;
    }

    expect(error.message).toBe('Handler cannot contain "__"');
    expect(handlerMock).not.toHaveBeenCalled();
  });

  it('Should throw error if schedule job without handler', async () => {
    const handlerName = 'handler_not_existing';
    const handlerMock = jest.fn();
    const id = randomUUID();

    let error: Error;
    try {
      await jobScheduler.scheduleJobInSeconds(handlerName, id, 1, {});
    } catch (err) {
      error = err;
    }

    expect(error.message).toBe(`Handler "${handlerName}" not exists`);
    expect(handlerMock).not.toHaveBeenCalled();
  });

  it('Should throw error if schedule job in past', async () => {
    const handlerName = 'handler_not_existing';
    const handlerMock = jest.fn();
    const id = randomUUID();
    const now = new Date();

    await scheduler.wait(500);

    let error: Error;
    try {
      await jobScheduler.scheduleJobAtDate(handlerName, id, now, {});
    } catch (err) {
      error = err;
    }

    expect(error.message).toBe('Ensure that the date is set for a future time');
    expect(handlerMock).not.toHaveBeenCalled();
  });
});
