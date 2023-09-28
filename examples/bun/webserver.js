import Fastify from 'fastify';
import QOper8 from 'qoper8-fastify';

const fastify = Fastify({
  logger: true
});

const options = {
  logging: true,
  poolSize: 2,
  exitOnStop: true,
  workerHandlersByRoute: [
    {
      method: 'get',
      url: '/helloworld',
      handlerPath: 'handlers/getHelloWorld.js'
    },
    {
      method: 'get',
      url: '/user/:userId',
      handlerPath: 'handlers/getUser.js'
    },
    {
      method: 'get',
      url: '/star/*',
      handlerPath: 'handlers/star.js'
    },
    {
      method: 'get',
      url: '/token/:userId/:token',
      handlerPath: 'handlers/getUserToken.js'
    }
  ],
  onStartup: {
    module: 'handlers/myStartupModule.js'
  }
};

fastify.decorate('interceptQOper8Response', function(res, request, reply) {
  reply.header('set-cookie', 'foo');
  return res;
});

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

await fastify.listen({ port: 3000, host: '0.0.0.0' }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
});

