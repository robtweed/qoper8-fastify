import fastifyPlugin from 'fastify-plugin';

function configure (fastify, opts, done) {

  fastify.qoper8.setOnStartupModule({
    module: './iris-qoper8-startup.mjs'
  });

  done();
}

export default fastifyPlugin(configure);