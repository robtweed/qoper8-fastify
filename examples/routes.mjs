async function routes (fastify, options, done) {

  fastify.get('/helloworld', async (request, reply) => {
    fastify.setHandler('getHelloWorld', './handlers/getHelloWorld.mjs', request);
    return true;
  })

  fastify.setNotFoundHandler((request, reply) => {
    reply.code(404).type('application/json').send("{error: 'Not Found'}")
  })

  done();

}

export default routes;
