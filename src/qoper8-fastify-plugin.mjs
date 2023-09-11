/*
 ----------------------------------------------------------------------------
 | QOper8-Fastify-Plugin: Fastify Plugin                                     |
 |                                                                           |
 | Copyright (c) 2023 MGateway Ltd,                                          |
 | Redhill, Surrey UK.                                                       |
 | All rights reserved.                                                      |
 |                                                                           |
 | https://www.mgateway.com                                                  |
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

8 September 2023

*/

import fastifyPlugin from 'fastify-plugin';
import crypto from 'crypto';
import path from 'path';

async function QOper8_Plugin (fastify, options) {

  if (!options || typeof options !== 'object') return;
  let qmodule;
  if (typeof Bun !== 'undefined') {
    qmodule = await import('qoper8-ww');
  }
  else {
    let mode = options.mode || 'worker_thread';
    if (mode === 'child_process') {
      qmodule = await import('qoper8-cp');
    }
    else {
      qmodule = await import('qoper8-wt');
    }
  }
  delete options.mode;

  if (typeof Bun === 'undefined' && options.onStartup && options.onStartup.module) {
    let mpath = path.resolve(process.cwd(), options.onStartup.module);
    options.onStartup.module = mpath;
  }

  let QOper8 = qmodule.QOper8;
  const qoper8 = new QOper8(options);

  qoper8.routeToName = new Map();
  for (let route of options.workerHandlersByRoute) {
    let name = crypto.createHash('sha1').update(route.url).digest('hex');
    let mpath = route.handlerPath;
    if (typeof Bun === 'undefined') {
      mpath = path.resolve(process.cwd(), route.handlerPath);
    }
    qoper8.handlersByMessageType.set(name, {module: mpath});
    qoper8.routeToName.set(route.url, name);
    fastify[route.method](route.url, async (request, reply) => {
      return true;
    });
  }

  qoper8.on('stop', function() {
    fastify.close(function() {
      console.log('Fastify closed');
    });
  });

  function prepareRequest(request) {
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
      url: request.url,
      routerPath: request.routerPath
    };
  }

  fastify.decorate('errorResponse', function(err, reply) {
    let error = '{error:"' + err + '"}';
    reply.code(404).type('application/json').send(error);
  });

  fastify.decorate('setPoolSize', function(poolSize) {
    qoper8.setPoolSize(poolSize);
  });

  fastify.decorateRequest('qRequest', '');

  fastify.addHook('onSend', async (request, reply, payload) => {

    if (!qoper8.routeToName.get(request.routerPath)) {
      return payload;
    }

    let res = await qoper8.send({
      type: qoper8.routeToName.get(request.routerPath),
      data: request.qRequest
    });
    delete res.qoper8;

    if (res.error) {
      reply.code(res.errorCode || 400);
      delete res.errorCode;
    }

    if (fastify.interceptQOper8Response) {
      res = fastify.interceptQOper8Response(res, request, reply);
    }

    return JSON.stringify(res);
  })

  fastify.addHook('onRequest', function(request, reply, done) {
    if (qoper8.routeToName.get(request.routerPath)) {
      request.qRequest = prepareRequest(request);
    }
    done();
  });

  fastify.addHook('onClose', async function(instance) {
    //console.log('*** Fastify onclose triggered! ***');
  });

};

export default fastifyPlugin(QOper8_Plugin);
