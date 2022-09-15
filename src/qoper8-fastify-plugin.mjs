/*
 ----------------------------------------------------------------------------
 | QOper8-Fastify-Plugin: Fastify Plugin                                     |
 |                                                                           |
 | Copyright (c) 2022 M/Gateway Developments Ltd,                            |
 | Redhill, Surrey UK.                                                       |
 | All rights reserved.                                                      |
 |                                                                           |
 | http://www.mgateway.com                                                   |
 | Email: rtweed@mgateway.com                                                |
 |                                                                           |
 |                                                                           |
 | Licensed under the Apache License, Version 2.0 (the "License");           |
 | you may not use this file except in compliance with the License.          |
 | You may obtain a copy of the License at                                   |
 |                                                                           |
 |     http://www.apache.org/licenses/LICENSE-2.0                            |
 |                                                                           |
 | Unless required by applicable law or agreed to in writing, software       |
 | distributed under the License is distributed on an "AS IS" BASIS,         |
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  |
 | See the License for the specific language governing permissions and       |
 |  limitations under the License.                                           |
 ----------------------------------------------------------------------------

15 September 2022

*/

import fastifyPlugin from 'fastify-plugin';

async function QOper8_Plugin (fastify, options) {

  if (!options || typeof options !== 'object') return;
  let mode = options.mode || 'worker_thread';
  let qmodule;
  if (mode === 'child_process') {
    qmodule = await import('qoper8-cp');
  }
  else {
    qmodule = await import('qoper8-wt');
  }
  delete options.mode;

  let QOper8 = qmodule.QOper8;
  const qoper8 = new QOper8(options);

  qoper8.on('stop', function() {
    fastify.close(function() {
      console.log('Fastify closed');
    });
  });

  fastify.decorate('qoper8', qoper8);

  fastify.decorate('prepareRequest', function(request) {
    return  {
      method: request.method,
      query: request.query,
      body: request.body,
      params: request.params,
      headers: request.headers,
      ip: request.ip,
      ips: request.ips,
      hostname: request.hostname,
      protocol: request.protocol,
      url: request.url
    };
  });

  fastify.decorate('setHandler', function(name, modulePath, request) {
    fastify.qoper8.handlersByMessageType.set(name, {module: modulePath});
    request.qRequest.handler = name;
  });

  fastify.decorate('setPoolSize', function(poolSize) {
    fastify.qoper8.setPoolSize(poolSize);
  });

  fastify.decorateRequest('qRequest', '');

  fastify.addHook('onSend', async (request, reply, payload) => {
    if (payload.startsWith('{error:')) {
      return payload;
    }

    let res = await fastify.qoper8.send({
      type: request.qRequest.handler,
      data: request.qRequest
    });
    delete res.qoper8;
    return JSON.stringify(res);
  })

  fastify.addHook('onRequest', function(request, reply, done) {
    request.qRequest = fastify.prepareRequest(request);
    done()
  });

  fastify.addHook('onClose', async function(instance) {
    //console.log('*** Fastify onclose triggered! ***');
  });

};

export default fastifyPlugin(QOper8_Plugin);
