import Redis from 'ioredis';
import { TId, TPayload } from './interfaces';

export class JobScheduler {
  private redis: Redis;
  private signature = 'job_scheduler';
  private listener: Redis;
  private handlers: Record<string, (payload: TPayload) => void>;

  constructor(
    private host: string,
    private port: number = 6379,
    private password: string | null = null,
    private db: number = 0,
  ) {
    const initRedis = (): Redis =>
      new Redis({
        host: this.host,
        port: this.port,
        db: this.db,
        ...(password && { password }),
      });

    this.redis = initRedis();
    this.redis.on('ready', () =>
      this.redis.config('SET', 'notify-keyspace-events', 'Ex')
    );
    this.listener = initRedis();
    this.handlers = {};
    this.listener.psubscribe('__keyevent@' + db + '__:expired');
    this.listener.on('pmessage', (_, __, message) => {
      if (message.startsWith(`${this.signature}:`)) {
        return this.executeJob(message);
      }
    });
  }

  disconnectRedis() {
    this.redis.disconnect();
    this.listener.disconnect();
  }

  addHandler(name: string, fn: (payload: TPayload) => void) {
    if (name.includes('__')) {
      throw new Error('Handler cannot contains "__"');
    }
    this.handlers[name] = fn;
  }

  private async executeJob(key: string) {
    const handlerResult = new RegExp(`${this.signature}:(.*)__`, 'g').exec(key);
    if (!handlerResult || !handlerResult[1]) {
      throw new Error('The key is not supported. Ensure you are using the correct format.');
    }

    const handler = handlerResult[1];
    if (!this.handlers[handler]) {
      throw new Error(`Handler "${handler}" does not exist.`);
    }

    const payload = JSON.parse(await this.redis.get(`shadow:${key}`));

    this.handlers[handler](payload);
    this.redis.del(`shadow:${key}`);
  }

  cancelJob(handler: string, id: TId) {
    const key: string = `${this.signature}:${handler}__${id}`;
    return Promise.all([
      this.redis.del(key),
      this.redis.del(`shadow:${key}`),
    ]);
  }

  async scheduleJobInSeconds(
    handler: string,
    id: TId,
    expireTime: number,
    payload?: TPayload,
  ) {
    if (handler.includes('__')) {
      throw new Error('Handler cannot contain "__"');
    }

    if (!this.handlers?.[handler]) {
      throw new Error(`Handler "${handler}" not exists`);
    }

    let mainKey: string, shadowKey: string;
    try {
      mainKey = await this.redis.set(
        `${this.signature}:${handler}__${id}`,
        '',
        'EX',
        Math.round(expireTime)
      );

      shadowKey = await this.redis.set(
        `shadow:${this.signature}:${handler}__${id}`,
        JSON.stringify(payload),
        'EX',
        Math.round(expireTime) + 60
      );

      if (!mainKey || !shadowKey) {
        this.cancelJob(handler, id);
      }
    } catch (error) {
      this.cancelJob(handler, id);
      throw error;
    }

    return {
      mainKey,
      shadowKey,
    }
  }

  scheduleJobAtDate(
    handler: string,
    id: TId,
    expireTime: number | Date,
    payload?: TPayload,
  ) {
    const now = new Date();
    let expireInSeconds: number;

    if (expireTime instanceof Date) {
      expireInSeconds = expireTime.getTime();
    } else {
      expireInSeconds = expireTime;
    }

    const diffInSeconds = (expireInSeconds - now.getTime()) / 1000;

    if (diffInSeconds <= 0) {
      throw new Error('Ensure that the date is set for a future time');
    }

    return this.scheduleJobInSeconds(handler, id, diffInSeconds, payload);
  }
}
