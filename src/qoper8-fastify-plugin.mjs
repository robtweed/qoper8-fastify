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

25 September 2023

*/

import fastifyPlugin from 'fastify-plugin';
import crypto from 'crypto';

async function QOper8_Plugin (fastify, options) {

  if (!options || typeof options !== 'object') return;
  let qmodule;

  let mode = options.mode || 'worker_thread';
  if (mode === 'child_process') {
    qmodule = await import('qoper8-cp');
  }
  else {
    if (typeof Bun !== 'undefined') {
      qmodule = await import('qoper8-ww');
    }
    else {
      qmodule = await import('qoper8-wt');
    }
  }
  delete options.mode;

  let QOper8 = qmodule.QOper8;
  const qoper8 = new QOper8(options);

  qoper8.routeToName = new Map();
  for (let route of options.workerHandlersByRoute) {
    let name = crypto.createHash('sha1').update(route.url).digest('hex');
    qoper8.handlersByMessageType.set(name, {module: route.handlerPath});
    qoper8.routeToName.set(route.url, name);
    fastify[route.method](route.url, async (request, reply) => {
      let qRequest = {
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
        routerPath: route.url
      };

      qoper8.message({
        type: name,
        data: qRequest
      }, function(response, workerId) {

        let res = structuredClone(response);
        delete res.qoper8;

        if (res.error) {
          let status = 400;
          if (res.errorCode) {
            status = res.errorCode;
            delete res.errorCode;
          }
          reply.code(status).type('application/json').send(res);
        }
        else {
          let options;
          if (res.http_response) {
            if (res.http_response.statusCode) {
              reply.code(res.http_response.statusCode);
            }
            if (res.http_response.headers) {
              reply.headers(res.http_response.headers);
            }
            delete res.http_response;
          }
          reply.send(res);
        }
      });

      await reply;

    });
  }

  fastify.decorate('qoper8', qoper8);


};

export default fastifyPlugin(QOper8_Plugin);
