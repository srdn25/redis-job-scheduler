import { randomUUID } from 'node:crypto';
import { JobScheduler, TPayload } from '../src';

const handlerName = 'exampleHandler';
const jobScheduler = new JobScheduler('127.0.0.1');
const handlerExampleJob = (payload: TPayload) => {
  console.log('>>> Execute handler <<<');
  console.log(JSON.stringify(payload));
}

async function app() {
  jobScheduler.addHandler(handlerName, handlerExampleJob);

  const examplePayload = {
    foo: 'bar',
    a: 1,
    c: 5,
  };

  let sec = 0;
  const interval = setInterval(() => {
    sec++;
    console.log(sec);
  }, 1000);
  setTimeout(() => clearInterval(interval), 17 * 1000);

  try {
    await jobScheduler.scheduleJobInSeconds(handlerName, randomUUID(), 15, examplePayload);
  } catch (error) {
    console.log(error);
  }
}

app();
