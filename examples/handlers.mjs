import fastifyPlugin from 'fastify-plugin';

function handlers (fastify, opts, done) {

  fastify.registerHandler('getHelloWorld', './handlers/getHelloWorld.mjs');

  done();
}

export default fastifyPlugin(handlers);