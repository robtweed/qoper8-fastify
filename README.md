# qoper8-fastify: QOper8 Plugin for Fastify
 
Rob Tweed <rtweed@mgateway.com>  
12 September 2022, M/Gateway Developments Ltd [http://www.mgateway.com](http://www.mgateway.com)  

Twitter: @rtweed

Google Group for discussions, support, advice etc: [http://groups.google.co.uk/group/enterprise-web-developer-community](http://groups.google.co.uk/group/enterprise-web-developer-community)


## Background

*qoper8-fastify* is a Node.js Plugin for the Fastify Web Server platform.  It integrates the 
[*QOper8-wt*](https://github.com/robtweed/qoper8-wt) and [QOper8-cp](https://github.com/robtweed/qoper8-cp) Modules 
with Fastify.

The *QOper8-wt* and *QOper8-cp* Modules allow you to easily and simply maintain a pool of Node.js Worker Threads or Child Processes respectively.  When using these modules, messages are placed in a queue, from where they are dispatched to an available Worker Thread or Child Process and handled by a module of your choice.  This queue-based architecture creates a highly-scalable architecture for handling a large amount of messages, particularly if some require significant CPU resources, since the load imposed by handling the messages is off-loaded to a Worker Thread or Child Process.  An interesting and often desirable aspect of these Modules is that each Worker Thread or Child Process only handles a single message at a time, meaning that during their processing, Node.js concurrency is not an issue.

*qoper8-fastify* integrates these modules with Fastify, with the result that every incoming HTTP request received by Fastify is automatically repackaged and forwarded as a message to a Worker Thread or Child Process, where it is handled by a module of your choice, based on the signature of the incoming request.

## Installing *qoper8-fastify*

        npm install qoper8-fastify

Notes:

- *qoper8-fastify* requires Node.js v18 or later (a requirement of *qoper8-wt* and *qoper8-cp*);
- Installing *qoper8-fastify* will also install the following as dependencies:

  - fastify
  - fastify-plugin
  - qoper8-wt
  - qoper8-cp


## Configuring Fastify to Use *qoper8-fastify*

*qoper8-fastify* is implemented as a Fastify Plug-in.  To configure it for use with Fastify:

- First, import Fastify and *qoper8-fastify* and then instantiate Fastify in the usual way, eg:

        import Fastify from 'fastify';
        import QOper8 from 'qoper8-fastify';

        const fastify = Fastify({
          logger: true
        });


- Next, determine whether you wish to use Worker Threads or Child Processes for handling incoming HTTP Requests.  Worker Threads are the default.  You should also specify here any QOper8 startup options, such as:

  - the Worker pool size (defaults to 1)
  - whether or not you want the QOoper8 module to log its activity to the console (which is recommended during development)

  eg:

        const options = {
          mode: 'child_process',    // defaults to 'worker_thread' if not specified
          logging: true,            // defaults to false if not specified
          poolSize: 3               // we will use up to 3 Workers, depending on activity levels 
        }


Full details of the startup options for QOper8 modules are available at:

- [*qoper8-wt* (Worker Threads)](https://github.com/robtweed/qoper8-wt#startingconfiguring-qoper8-wt)

- [*qoper8-cp* (Child Processes)](https://github.com/robtweed/qoper8-cp#startingconfiguring-qoper8-cp)



- You can now register *qoper8-fastify*:


        fastify.register(QOper8, options);

or, for a default silent implementation using a single Worker Thread:


        fastify.register(QOper8);


## Handling Incoming Requests within QOper8 Workers

### Specifying Routes

As a result of the steps shown above, each incoming request will now be dispatched to a Worker (either a Worker Thread or Child Process).  You now need to specify how each particular incoming request will be handled.

Normally, with Fastify, you do this within your Route specifications.  You'll still define them as normal, but you need to change their handler code to look like this example:


        fastify.get('/helloworld', async (request, reply) => {
          fastify.setHandler('getHelloWorld', './handlers/getHelloWorld.mjs', request);
          return true;
        })


Registering the *qoper8-fastify* module adds a method - *setHandler()* - to Fastify.  This takes three arguments:

- *type*: a QOper8 *type* name for the message that will be generated for these incoming requests.  The name is up to you to define, but should be unique to this particular incoming route.

- *module_path*: the path to your actual message handler module - ie the module that will be used to handle incoming requests for this route within a Worker.  The path is for you to determine, but it must be accessible to the *QOper8* module, and as such it is recommened that it is specified relative to the current working directory.

- *request*: the incoming Fastify request object (which *qoper8-fastify* will re-package into a message).


So in the example above, any *GET /helloworld* requests will be repackaged as a QOper8 message of type *getHelloWorld* and handled by a module that you've created at the path *'./handlers/getHelloWorld.mjs'*.

Note that *qoper8-fastify* automatically replaces the Fastify reply payload with whatever you return from your message handler (see below).


### Handler Modules

Worker Message Handler Modules must export a function with two arguments:

- *messageObj*: the repackaged incoming HTTP request
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

where *message_type* is the message type name you assigned to this particular route (eg *getHelloWorld* in the earlier example).

For example:

        {
          "type": "getHelloWorld",
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



## Initialising/Customising the Worker

You may need to customise the Worker environment and the *this* context of the Worker.  For example you may want each Worker to connect to a database when it first starts, and provide the access credentials for the database via the Worker's *this* context.

You do this as an additional, optional configuration step, once again as a Fastify Plug-in.

Within the Plug-In, use the *fastify.qoper8.setOnStartupModule()* method to tell the Qoper8 module where to find your startup module and the run-time arguments to use for it.  For example:


        import fastifyPlugin from 'fastify-plugin';

        function configure (fastify, opts, done) {

          fastify.qoper8.setOnStartupModule({
            module: 'path/to/startup/module',
            arguments: {
              // arguments for your startup module
            }
          });

          done();
        }

        export default fastifyPlugin(configure);


For full details about QOper8 Worker Startup Modules, see the relevant documentation:

- [*qoper8-wt* (Worker Threads)](https://github.com/robtweed/qoper8-wt#optional-worker-thread-initialisationcustomisation)

- [*qoper8-cp* (Child Processes)](https://github.com/robtweed/qoper8-cp#optional-child-process-initialisationcustomisation)



## Worked Example Integrating Fastify with *qoper8-fastify*


### main.mjs


        import Fastify from 'fastify';
        import QOper8 from 'qoper8-fastify';
        import config from './configure.mjs';
        import routes from './routes.mjs';

        const fastify = Fastify({
          logger: true
        });

        const options = {
          mode: 'child_process',
          poolSize: 3,
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



### configure.mjs

Specify a Worker Startup Module:

        import fastifyPlugin from 'fastify-plugin';

        function configure (fastify, opts, done) {

          fastify.qoper8.setOnStartupModule({
            module: './workerStartup.mjs',
            arguments: {
              foo: function() {
                console.log('my foo function');
                return "result";
              },
              bar: 123
            }
          });

          done();
        }

        export default fastifyPlugin(configure);


### workerStartup.mjs

Worker Startup Module Logic:

        const onStartupModule = function(args) {
          args = args || {};

          // augment this, so your custom properties/methods are available
          // to your message type handlers

          this.foo = args.foo.bind(this);
          this.bar = args.bar;

          // add any Worker shutdown logic

          this.on('stop', function() {
            console.log('Worker is about to be shut down by QOper8');
            // perform any resource disconnection/tear-down logic
          });
        };

        export {onStartupModule};


### routes.mjs

Define Routes and the Associated Worker Message Handler Methods:

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


### getHelloWorld.mjs

Example Message Handler logic

        const handler = function(messageObj, finished) {
       
          // process incoming request in messageObj.data

          // your handler has access to the properties your startup module
          // added to this:

          let x = this.foo();
          let y = this.bar;

          // return response - contents are for you to determine

          finished({
            ok: true,
            hello: 'world',
          });
        };

        export {handler};




## License

 Copyright (c) 2022 M/Gateway Developments Ltd,                           
 Redhill, Surrey UK.                                                      
 All rights reserved.                                                     
                                                                           
  http://www.mgateway.com                                                  
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
