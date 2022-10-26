import Fastify from 'fastify';
import QOper8 from 'qoper8-fastify';
import config from './qoper8-startup-plugin.mjs';

const fastify = Fastify({
  logger: true
});

const options = {
  mode: 'child_process',
  logging: true,
  poolSize: 2
};

fastify.register(QOper8, options);
fastify.register(config);


fastify.get('/helloworld', async (request, reply) => {
  fastify.setHandler('./getHelloWorld.mjs', request);
  return true;
});

await fastify.listen({ port: 3000, host: '0.0.0.0' }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
});


