# Redis job scheduler

This application demonstrates how it is possible to configure a job
scheduler using Redis. 
When keys expire, a hook will execute a job handler.

## Example

```javascript
// create handler name
const handlerName = 'exampleHandler';

// init JobScheduler instance
const jobScheduler = new JobScheduler('127.0.0.1');

// create job runner (handler)
const handlerExampleJob = (payload: TPayload) => {}

// add this handler to JobScheduler
jobScheduler.addHandler(handlerName, handlerExampleJob);

const examplePayload = {
    foo: 'bar',
    a: 1,
    c: 5,
};

// wrap in try catch async methods
try {
    await jobScheduler.scheduleJobInSeconds(
      handlerName,
      12345, // unique id
      15, // seconds
      examplePayload
    );
} catch (error) {
    console.log(error);
}
```