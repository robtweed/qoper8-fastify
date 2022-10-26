import Fastify from 'fastify';
import QOper8 from 'qoper8-fastify';
import config from './configure.mjs';
import routes from './routes.mjs';

const fastify = Fastify({
  logger: true
});

const options = {
  mode: 'child_process',
  poolSize: 2,
  logging: true
}

fastify.register(QOper8, options);
fastify.register(config);
fastify.register(routes);

await fastify.listen({ port: 3000, host: '0.0.0.0' }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})

