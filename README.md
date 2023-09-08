# qoper8-fastify: QOper8 Plugin for Fastify
 
Rob Tweed <rtweed@mgateway.com>  
23 May 2023, MGateway Ltd [https://www.mgateway.com](https://www.mgateway.com)  

Twitter: @rtweed

Google Group for discussions, support, advice etc: [http://groups.google.co.uk/group/enterprise-web-developer-community](http://groups.google.co.uk/group/enterprise-web-developer-community)


## Background

*qoper8-fastify* is a Node.js or Bun.js Plugin for the Fastify Web Server platform.  It integrates the 
[*QOper8-ww*](https://github.com/robtweed/qoper8-ww), 
[*QOper8-wt*](https://github.com/robtweed/qoper8-wt) and [QOper8-cp](https://github.com/robtweed/qoper8-cp) Modules 
with Fastify.  

Note that Bun.js will always use the WebWorker version: (QOper8-ww).  If you're using Node.js, you can choose between the *QOper8-wt* and *QOper8-cp* versions.

The *QOper8-wt* and *QOper8-cp* Modules allow you to easily and simply maintain a pool of Node.js Worker Threads or Child Processes respectively.  

The *QOper8-ww* Module allows you to easily and simply maintain a pool of Bun.js WebWorkers.

All three modules behave in essentially the same way: when using these modules, 
messages are placed in a queue, from where they are dispatched to an available
WebWorker,  Worker Thread or Child Process and handled by a module of your choice.  
This queue-based design creates a highly-scalable architecture for handling a large amount of messages, particularly if some require significant CPU resources, since the load imposed by handling the messages is off-loaded to a 
WebWorker, Worker Thread or Child Process.  An interesting and often desirable aspect of these Modules is that each WebWorker, Worker Thread or Child Process only handles a single message at a time, meaning that during their processing, Node.js or Bun.js concurrency is not an issue.

*qoper8-fastify* integrates these modules with Fastify: APIs handled by Fastify can
be configured to be automatically repackaged and forwarded as a message to a WebWorker ,Worker Thread or Child Process, where they are handled by a module of your choice, based on the signature of the API.

You can have a mixture of:

- APIs handled by Fastify in the main thread as normal
- APIs handled within a Worker


## Installing *qoper8-fastify*

  Node.js:

        npm install qoper8-fastify


  Bun.js:

        bun install qoper8-fastify

Notes:

- if you are using Node.js, *qoper8-fastify* requires Node.js v16 or later (a requirement of *qoper8-wt* and *qoper8-cp*);

- Installing *qoper8-fastify* will also install the following as dependencies:

  - fastify
  - fastify-plugin
  - qoper8-wt
  - qoper8-cp
  - qoper8-ww


## Configuring Fastify to Use *qoper8-fastify*

*qoper8-fastify* is implemented as a Fastify Plug-in.  To configure it for use with Fastify:

- First, import Fastify and *qoper8-fastify* and then instantiate Fastify in the usual way, eg:

        import Fastify from 'fastify';
        import QOper8 from 'qoper8-fastify';

        const fastify = Fastify({
          logger: true
        });


- Next, if you are using Node.js, determine whether you wish to use Worker Threads or Child Processes for handling incoming HTTP Requests.  Worker Threads are the default.  

- You should also determine any QOper8 startup options, such as:

  - the Worker pool size (defaults to 1)
  - whether or not you want the QOoper8 module to log its activity to the console (which is recommended during development)

  eg:

    Node.js:

        const options = {
          mode: 'child_process',    // defaults to 'worker_thread' if not specified
          logging: true,            // defaults to false if not specified
          poolSize: 3               // we will use up to 3 Workers, depending on activity levels 
        }

    Bun.js:

        const options = {
          logging: true,            // defaults to false if not specified
          poolSize: 3               // we will use up to 3 Workers, depending on activity levels 
        }


Full details of the startup options for QOper8 modules are available at:

- [*qoper8-wt* (Worker Threads)](https://github.com/robtweed/qoper8-wt#startingconfiguring-qoper8-wt)

- [*qoper8-cp* (Child Processes)](https://github.com/robtweed/qoper8-cp#startingconfiguring-qoper8-cp)

- [*qoper8-ww* (WebWorkers)](https://github.com/robtweed/QOper8#startingconfiguring-qoper8)


- You can now register *qoper8-fastify*:


        fastify.register(QOper8, options);

or, for a default silent implementation using a single Worker Thread:


        fastify.register(QOper8);


## Handling Incoming Requests within QOper8 Workers


The steps shown above will not actually route any incoming HTTP requests to a Worker.  To do that,
you need to specify the API routes and their associated Worker Handler modules in the *options* object.
Worker Handlers are specified by adding an array named *workerHandlersByRoute*.

Each element of the *workerHandlersByRoute* array is an object that specifies three properties:

- method: get, post, etc
- url: the API URL route, eg /myapi
- handlerPath: the file path for of the handler module file.  Note that the path you specify will be relative 
to the directory in which you started your Node.js or Bun script.

For example, suppose you want the API -  *GET /helloworld* - to be handled in a Worker using a
module named *helloworld.mjs* (or *helloworld.js if you are using Bun.js), you would change the
*options* object to:

  Node.js:

        const options = {
          mode: 'child_process',
          logging: true,
          poolSize: 3,
          workerHandlersByRoute: [
            {
              method: 'get',
              url: '/helloworld',
              handlerPath: 'helloWorld.mjs'
            }
          ]
        }

  Bun.js:

        const options = {
          logging: true,
          poolSize: 3,
          workerHandlersByRoute: [
            {
              method: 'get',
              url: '/helloworld',
              handlerPath: 'helloWorld.js'
            }
          ]
        }



As a result of the steps shown above, the *qoper8-fastify* PlugIn will automatically route all incoming
instances of *GET /helloworld* to a Worker, where they will be handled by your *helloworld.mjs* or
*helloworld.js* module.

There's no need, therefore, to specify such routes and their handling in the usual Fastify way, eg:


        fastify.get('/helloworld', async (request, reply) => {
          // process the incoming request and generate a response
        });

*qoper8-fastify* generates these automatically for you from the information you supply in the
*workerHandlersByRoute* array.

Note that *qoper8-fastify* automatically replaces the Fastify reply payload with whatever you return from your message handler (see below).


## Handling Incoming Requests normally with Fastify


You can also define routes that will be handled as normal by Fastify in the main execution thread.  Just
specify these in the normal Fastify way, eg:


        fastify.get('/mainthreadapi', function (req, reply) {
          // do some stuff
          reply.send({
            api: '/mainthreadapi',
            ok: true
          });
        });

Only the routes you specify in the *workerHandlersByRoute* array are forwarded to a Worker.


### Handler Modules

#### Structure/Pattern

Worker Message Handler Modules must export a function with two arguments:

- *messageObj*: the incoming HTTP request, as repackaged for you by *qoper8-fastify*

- *finished*: the QOper8 method for returning your response object and releasing the Worker back to the available pool

The export must be to *{handler}*.

For example:

        const handler = function(messageObj, finished) {

          // process the incoming message object


          // on completion, invoke the QOper8 finished() method
          //  to return the response and release the Worker back
          //  to the available pool

          finished({
            ok: true,
            hello: 'world'
          });
        };

        export {handler};


For more details about QOper8 handler modules, see the relevant documentation:

- [*Qoper8-wt* (Worker Threads)](https://github.com/robtweed/qoper8-wt#the-message-handler-method-script)

- [*Qoper8-cp* (Child Processes)](https://github.com/robtweed/qoper8-cp#the-message-handler-method-script)

- [*Qoper8-ww* (WebWorkers)](https://github.com/robtweed/QOper8#the-message-handler-method-script)



#### The Repackaged HTTP Request in *messageObj*

The *messageObj* argument contains the re-packaged incoming HTTP request.  It is a simple object with the following structure.  The *data* sub-object is created from the corresponding incoming Fastify request object as shown:

        {
          type: message_type,
          data: {
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
          }
        }

where *message_type* is an internally-used opaque, unique message type name created automatically by *qoper8-fastify* for this particular route.

For example:

        {
          "type": "f9862f0ed8f093afb7f6d2165aa63a69dda262da",
          "data": {
            "method": "GET",
            "query": {},
            "params": {},
            "headers": {
              "host": "127.0.0.1:3000",
              "user-agent": "curl/7.74.0",
              "accept": "*/*"
            },
            "ip": "127.0.0.1",
            "hostname": "127.0.0.1:3000",
            "protocol": "http",
            "url": "/helloworld",
        }


*messageObj* will therefore contain all the information you need in order to process the incoming instance of 
each of the API you need to handle.  For *POST* methods, most of the information you'll require will be in
*messageObj.data.body*, and for *GET* methods you'll probably mainly use *messageObj.data.query*.


## Initialising/Customising the Worker

You may need to customise the Worker environment and the *this* context of the Worker.  For example you may want each Worker to connect to a database when it first starts, and provide the access credentials for the database via the Worker's *this* context.

You do this via an additional property - *onStartup* - in the *options* object, eg:


  Node.js:

        onStartup: {
          module: 'myStartupModule.mjs'
        }

  Bun.js:

        onStartup: {
          module: 'myStartupModule.js'
        }



Note that, just like Handler Modules, the path you specify for a startup module will be relative 
to the directory in which you started your Node.js or Bun script


Within the Plug-In, use the *fastify.qoper8.setOnStartupModule()* method to tell the Qoper8 module where to find your startup module and the run-time arguments to use for it.  For example:

For full details about QOper8 Worker Startup Modules, see the relevant documentation:

- [*qoper8-wt* (Worker Threads)](https://github.com/robtweed/qoper8-wt#optional-worker-thread-initialisationcustomisation)

- [*qoper8-cp* (Child Processes)](https://github.com/robtweed/qoper8-cp#optional-child-process-initialisationcustomisation)

- [*qoper8-ww* (WebWorkers)](https://github.com/robtweed/QOper8#optional-child-process-initialisationcustomisation)


----

## Worked Example Integrating Fastify with *qoper8-fastify*

### Example Using Bun.js


#### main.mjs


        import Fastify from 'fastify';
        import QOper8 from 'qoper8-fastify';

        const fastify = Fastify({
          logger: true
        });

        const options = {
          poolSize: 2,
          logging: true,
          workerHandlersByRoute: [
            {
              method: 'get',
              url: '/helloworld',
              handlerPath: 'handlers/getHelloWorld.js'
            }
          ],
          onStartup: {
            module: 'handlers/myStartupModule.js'
          }
        };

        fastify.register(QOper8, options);

        fastify.setNotFoundHandler((request, reply) => {
          reply.code(404).type('application/json').send("{error: 'Not Found'}")
        });

        fastify.get('/mainthreadapi', function (req, reply) {
          // handled in main thread, not a WebWorker
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


#### getHelloWorld.js


        const handler = function(messageObj, finished) {
       
          // process incoming request in messageObj.data

          // return response - contents are for you to determine

          finished({
            ok: true,
            hello: 'world'
          });
        };

        export {handler};


#### myStartupModule.js

        const onStartupModule = function(args) {

          // add any Worker shutdown logic

          this.on('stop', function() {
            console.log('Worker is about to be shut down by QOper8');
            // perform any resource disconnection/tear-down logic
          });
        };

        export {onStartupModule};



----

## Handling Dynamic URLs

Fastify allows you to declare wildcards and parameters in URLs, and you can use these in routes
you specify for handling in a Worker, eg;

          workerHandlersByRoute: [
            {
              method: 'get',
              url: '/example/:userId',
              handlerPath: 'handlers/getUser.js'
            },
            {
              method: 'get',
              url: '/example/:userId/:token',
              handlerPath: 'handlers/getUserToken.js'
            },
            {
              method: 'get',
              url: '/example/any/*',
              handlerPath: 'handlers/getAny.js'
            }
          ]


If an incoming request matches any of the parametric or wildcard routes, it will be routed to a Worker
and the specified Handler Module will be applied.

The specific incoming values of parameters or a wildcard are accessed via the *messageObj.data.params* object
within your Handler module, eg:

### getUserToken.js


        const handler = function(messageObj, finished) {
       
          let userId = messageObj.data.params.userId;
          let token = messageObj.data.params.token;

          // etc...

          if (invalidUser) {
            finished({
              error: 'Invalid User'
            });
          }
          else {
            finished({
              ok: true,
            });
          }
        };

        export {handler};

----

## Handling Errors

You can return an error from your Handler Module simply by returning an *error* property via the *finished()*
method, eg:

            return finished({
              error: 'Invalid User'
            });

*qoper8-fastify* will automatically change the HTTP response status to 400.

You can customise the HTTP response status by adding an *errorCode* property, eg:

            return finished({
              error: 'Invalid User',
              errorCode: 405
            });

*qoper8-fastify* removes the *errorCode* property from the response object that is sent to the client, but
changes the HTTP status code of the response.


----

## Customising the Response

*qoper8-fastify* also allows you to optionally intercept the response just before it is
sent back to the client.  This gives you the opportunity to modify headers, set cookies, and/or add or amend 
response content.

To do this, use *fastify.decorate()* to create the intercept method, eg:

        fastify.decorate('interceptQOper8Response', function(res, request, reply) {
          if (request.routerPath === '/token/:userId/:token') {
            reply.header('set-cookie', 'foo');
          }
          return res;
        });

As you can see from this example, you have access to the response (from your Handler module), 
the repackaged *request* object that was sent to the QOper8 Worker, and Fastify's *reply* object.

Make sure you return a response object!



## License

 Copyright (c) 2023 MGateway Ltd,                           
 Redhill, Surrey UK.                                                      
 All rights reserved.                                                     
                                                                           
  https://www.mgateway.com                                                  
  Email: rtweed@mgateway.com                                               
                                                                           
                                                                           
  Licensed under the Apache License, Version 2.0 (the "License");          
  you may not use this file except in compliance with the License.         
  You may obtain a copy of the License at                                  
                                                                           
      http://www.apache.org/licenses/LICENSE-2.0                           
                                                                           
  Unless required by applicable law or agreed to in writing, software      
  distributed under the License is distributed on an "AS IS" BASIS,        
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
  See the License for the specific language governing permissions and      
   limitations under the License.      
