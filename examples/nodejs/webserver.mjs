import Fastify from 'fastify';
import QOper8 from 'qoper8-fastify';

const fastify = Fastify({
  logger: true
});

const options = {
  mode: 'child_process',
  logging: true,
  poolSize: 2,
  exitOnStop: true,
  workerHandlersByRoute: [
    {
      method: 'get',
      url: '/helloworld',
      handlerPath: 'handlers/getHelloWorld.mjs'
    },
    {
      method: 'get',
      url: '/user/:userId',
      handlerPath: 'handlers/getUser.mjs'
    },
    {
      method: 'get',
      url: '/star/*',
      handlerPath: 'handlers/star.mjs'
    },
    {
      method: 'get',
      url: '/token/:userId/:token',
      handlerPath: 'handlers/getUserToken.mjs'
    }
  ],
  onStartup: {
    module: 'handlers/myStartupModule.mjs'
  }
};

fastify.register(QOper8, options);

fastify.setNotFoundHandler((request, reply) => {
  reply.code(404).type('application/json').send("{error: 'Not Found'}")
});

fastify.get('/mainthreadapi', function (req, reply) {
  reply.send({
    api: '/mainthreadapi',
    ok: true
  });
});

fastify.ready(() => {

  let counts = {};

  fastify.qoper8.on('workerStarted', function(id) {
    console.log('worker ' + id + ' started');
  });

  fastify.qoper8.on('workerStopped', function(id) {
    console.log('worker ' + id + ' stopped');
    delete counts[id];
  });

  fastify.qoper8.on('replyReceived', function(res) {
    let id = res.workerId;
    if (!counts[id]) counts[id] = 0;
    counts[id]++;
  });

  let countTimer = setInterval(() => {
    console.log('messages handled:');
    for (let id in counts) {
      console.log(id + ': ' + counts[id]);
    }
    console.log('-----');
  }, 20000);

  fastify.qoper8.on('stop', () => {
    clearInterval(countTimer);
  });

});

await fastify.listen({ port: 3000, host: '0.0.0.0' }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
});

