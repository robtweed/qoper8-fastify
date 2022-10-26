# Using *qoper8-fastify* With the IRIS Data Platform's Native API for Node.js

## The IRIS Data Platform

The [IRIS Data Platform](https://www.intersystems.com/data-platform/) from InterSystems is a very high-performance database technology.  Although [third-party alternatives](https://github.com/chrisemunt/mg-dbx) are available, IRIS includes what is referred to as a [*Native API for Node.js*](https://docs.intersystems.com/iris20221/csp/docbook/DocBook.UI.Page.cls?KEY=BJSNAT).

Inspection of the Native API methods reveals that they are all synchronous, which, for a Node.js system with any degree of concurrency is, of course, highly problematic.  It appears that the Node.js API included with IRIS is therefore not intended for and must be avoided for serious production Node.js-based multi-user applications.

## *QOper8-cp*

The [QOper8-cp](https://github.com/robtweed/qoper8-cp) module for Node.js manages and maintains a pool of persistent Node.js Child Processes, with a simple API that allows a task to be queued and dispatched to run on an available Child Process.  A key feature of *Qoper8-cp* is that each Child Process only handles a single task at a time: *ie* each task runs in isolation within its allocated Child Process.

This means that *QOper8-cp* is an ideal potential solution for safe use of the IRIS Native API for Node.js.  Not only does *QOper8-cp* solve the problem of safely handling synchronous APIs (since there's no concurrency to worry about in the Child Process), its architecture of a queue and a pool of Node.js Child Processes makes it a highly-scalable solution for large-scale multi-user systems such as REST or Web back-ends.

## *qoper8-fastify*

In the last couple of years, [Fastify](https://www.fastify.io/) has become the most highly-regarded, most commonly-used and, as its name implies, the highest-performance Web framework for Node.js.

Fastify provides a simple and effective plug-in architecture for integration of add-on modules and supporting services, and this has been used to allow *QOper8-cp* to be integrated with Fastify via the 
[*qoper8-fastify*](https://github.com/robtweed/qoper8-fastify) Plug-In.

This means that a combination of Fastify, QOper8-cp and IRIS can be quickly and easily constructed to create a massively-scalable and extremely high-performance back-end Web/REST platform, with IRIS integrated via its Native API for Node.js to each of the QOper8-cp Child Process workers.

The resulting architecture means that the main Node.js process runs Fastify alone.  Any incoming REST or HTTP/Web requests that require access to IRIS during their processing are automatically queued and dispatched to the first available Child Process where they run in isolation and with direct access to IRIS via its synchronous Native APIs.


## A Simple Worked Example

A simple example is the easiest way to explain and demonstrate how to construct a fully-working Fastify/QOper8-cp/IRIS system.  Just expand the example with your own routes and handlers.

You'll find a copy of each of the files described below in the 
[*/examples/iris*](https://github.com/robtweed/qoper8-fastify/tree/master/examples/iris) folder of this repository.

### Install Dependencies

Nearly everything you need, including Fastify, can be installed simply by using:

      npm install qoper8-fastify


The one thing you'll need to also do is to manually find and install the Node.js API interface files for IRIS.  Unfortunately InterSystems don't supply these via the usual and expected *NPM* system, so I'm afraid you have to use these messy manual steps instead:

First you need to find the IRIS Native Node.js API module files that are supplied by InterSystems as part of installed your IRIS system.  Their location may depend on the version of IRIS and the platform you're running it on.  For example, if you're using the Docker-based Community version of IRIS v2022.1, you'll find these files below the path:

        /usr/irissys/dev/nodejs/intersystems-iris-native/bin

Depending on the hardware and operating system on which you're running IRIS, you'll find a further sub-directory, eg on ARM-based 64-bit Ubuntu Linux systems:

        /usr/irissys/dev/nodejs/intersystems-iris-native/bin/lnxubuntuarm64

In this will be one or more files, eg:

- irisnative.node
- libirisconnect.so
- libirisnative.so

These are what we're looking for!

Copy all of these to your Node.js *node_modules* directory and you're now ready to proceed.


### Create the Main Module

Let's create a main module named *main.mjs*.  

This example is written to run with Node.js 14 or later and is designed around the use of the latest ES6 syntax and the use of ES6 modules rather than CommonJS modules, hence the use of the *mjs* file extension.


        import Fastify from 'fastify';
        import QOper8 from 'qoper8-fastify';
        import config from './qoper8-startup-plugin.mjs';

        const fastify = Fastify({
          logger: true                      // <= ****
        });

        const options = {
          mode: 'child_process',
          logging: true,
          poolSize: 2                       // <= ****
        };

        fastify.register(QOper8, options);
        fastify.register(config);


        // **** Routes and associated handlers

        fastify.get('/helloworld', async (request, reply) => {
          fastify.setHandler('./getHelloWorld.mjs', request);
          return true;
        });


        // **** Start up Fastify listening on a particular port

        await fastify.listen({ port: 3000, host: '0.0.0.0' }, function (err, address) {
          if (err) {
            fastify.log.error(err)
            process.exit(1)
          }
        });


When you modify this example to meet your own requirements, you'll just need to make the following changes in the areas shown above with asterisks:

- turn off the Fastify logger if required.  It's useful to have it enabled during development

- modify the QOper8-cp *poolSize* value if you need a larger worker pool

- add more routes with associated handlers.  Any routes with handlers requiring access to IRIS, and hence which must be queued and dispatched to a Child Process, must use the *fastify.setHandler()* method.  Other routes can be handled safely in the main Node.js process if you wish.

- modify the port on which Fastify listens.


### The QOper8-cp Worker Startup Module Plug-In for Fastify

You'll see in the example above the lines:

        import config from './qoper8-startup-plugin.mjs';

and:

        fastify.register(config);


These provide the means by which we load the plug-in into Fastify which will initialise each *QOper8-cp* Child Process with a connection to IRIS, and by which your handlers have access to the IRIS Native API for Node.js.

All you'll need is the following Fastify Plug-in file which I've named *qoper8-startup-plugin.mjs*:

        import fastifyPlugin from 'fastify-plugin';
        
        function configure (fastify, opts, done) {
          fastify.qoper8.setOnStartupModule({
            module: './iris-qoper8-startup.mjs'
          });
          done();
        }
        
        export default fastifyPlugin(configure);

You won't need to modify this for your own system.


### The *QOper8-cp* Worker Startup Module

Next, we need to define the actual *QOper8-cp* Worker Startup Module file (*iris-qoper8-startup.mjs*) which is loaded by the Plug-in above:

        import { createRequire } from 'module';

        let onStartupModule = function(props) {
          const localRequire = createRequire('/opt/rps/node_modules');   // <= ****
          const irisnative = localRequire('irisnative');
          const connection = irisnative.createConnection({
            host: '172.17.0.2',                                          // <= ****
            port: 1972,                                                  // <= ****
            ns: 'USER',                                                  // <= ****
            user: '_SYSTEM',                                             // <= ****
            pwd: 'xxxxx'                                                 // <= ****
          });

          const irisNative = connection.createIris();

          this.iris = irisNative;

          this.on('stop', function() {
            // close connection to database
            connection.close();
            console.log('Connection to IRIS has been closed!');
          });
        };

        export {onStartupModule};


You will probably need to modify some or all of the lines marked with asterisks:

- change the *createRequire()* path to the one where you have saved the *irisnative.node* and its associated *so* files (see the earlier steps).  We need to load it as shown because we're using ES6 modules and not the older-style CommonJS modules (so *require()* cannot be used).

- change the host IP address/host name to match that of your IRIS system

- you may need to change the port, but 1972 is usually configured in IRIS systems as the superserver port used by the Node.js APIs

- change the IRIS namespace if required

- change the IRIS username and password as required for your system.

Otherwise, you can leave everything else in this file.


Note that the *irisNative* object is mapped to the Worker's *this.iris* object.  Your handler will use *this.iris* to access all the IRIS Native API methods.


### Handler Modules

In the example above, we've defined a single route: */helloworld*:

        fastify.get('/helloworld', async (request, reply) => {
          fastify.setHandler('./getHelloWorld.mjs', request);
          return true;
        });


By using *fastify.setHandler()* in it, we're telling Fastify to use QOper8-cp to queue and dispatch the request to a QOper8-cp Child Process, and handle the request using a module named *getHelloWorld.mjs*.

All QOper8 Worker Handler methods have the same pattern as used in this example file (*getHelloWorld.mjs*):

        const handler = function(messageObj, finished) {
           
          // process incoming request in messageObj.data

          // your handler has access to the IRIS Native API via this.iris, eg:

          this.iris.set(Date.now().toString(), '^testglobal', 1);

          // return response - contents are for you to determine

          finished({
            ok: true,
            hello: 'world',
          });
        };

        export {handler};


Make modifications as follows:

- the incoming request's query parameters, body payload and/or HTTP headers are provided in the *messageObj* object.  See [here](https://github.com/robtweed/qoper8-fastify#handler-modules) for full details.  Your handler will use these to determine what to do and how to do it.

- use the relevant IRIS Native Node.js API methods.  These are all accessible via *this.iris*.

- when you've finished processing, invoke the *finished()* method and return the response JSON payload.  This will be returned to the awaiting client/user via Fastify automatically.  You **MUST** use the *finished()* method because it signals to QOper8-cp that the Child Process can be made available for re-use for another incoming request.


### Running the Example

If you've created and saved the example files listed above, you're now ready to run it.  Simply invoke:

        node main.mjs

You'll see Fastify starting up and also QOper8-cp reporting that it is also ready for use with the specified number of Worker Child processes.


Then, in another process, try sending a */helloworld* request:

        curl http://127.0.0.1:3000/helloworld


You'll see everything burst into life in the main process window, and the */helloworld* response will be returned.  if you check in your IRIS system you should also see that the global has been set, eg:

        USER>zw ^testglobal
        ^testglobal(1)=1666786135488

You can of course use the IRIS Native APIs that access IRIS Classes and SQL.


## Your Fastify/QOper8-cp/IRIS System

Adapt the simple example to handle your own REST/Web requests.  What you now have is one of the fastest and most highly-scalable platforms available, complete with direct access to your IRIS database.

One thing you'll quickly notice and realise is that all the incoming traffic is being handled by your pool of Child Processes (each of which has a single connection to IRIS).  You'll need to experiment with the pool size to optimise your throughput, but you should find that you actually probably don't need many Child processes: start with the pool size equalling the number of CPU cores on the system on which you are running Node.js and Fastify and see how you get on.


## Alternative to the IRIS Native API for Node.js

As mentioned previously, you might want to take a look at our [*mg-dbx*](https://github.com/chrisemunt/mg-dbx) interface for Node.js.  This has a number of benefits over the built-in APIs:

- mg-dbx is Open Source and [available on NPM](https://github.com/chrisemunt/mg-dbx#-installing-mg-dbx)

- mg-dbx will work with all versions of IRIS and also most older versions of Cache

- mg-dbx is highly optimised to minimise some serious bottlenecks in the Node.js API

- mg-dbx can connect to IRIS in two ways:

  - using a network interface (ie similarly to the built-in API)
  - using a very high-performance in-process API connection, where the Node.js Child Process and IRIS Process are actually the same physical process

Otherwise, mg-dbx provides alternatives to pretty much all the Native API methods, including direct access to Globals, IRIS Classes and SQL.

Rather than using the low-level *mg-dbx* APIs themselves, you can go a further step and take advantage of the very high-level abstraction of the IRIS database provided by [*glsdb*](https://github.com/robtweed/glsdb).  *glsdb* includes built-integration of Fastify and QOper8-cp.


## Why *QOper8-cp* and not *QOper8-wt*

The *Qoper8-wt* module is almost identical to *QOper8-cp*, but is designed around Workers that use Node.js Worker Threads rather than Child Processes.  

Our comparisons of the two options usually show *QOper8-wt* to provide nearly twice the throughput of *QOper8-cp*.  So why do we not recommend using *QOper8-wt* with IRIS?

The answer is that IRIS is not thread-safe, and unless you make configuration changes to the use of the Worker Threads to prevent concurrent access to IRIS across all the Worker Threads, you'll potentially get some pretty spectacular crashes occurring.  Those changes hobble the performance advantage of Worker Threads to the extent that you might as well use the fully-safe full-blown Child Processes to interface with IRIS.

Although there's therefore little benefit in doing so, *mg-dbx* can actually be made to work with Worker Threads and hence with *QOper8-wt*.

However, if you're using the built-in IRIS Native API for Node.js, you won't have such an option available and therefore you must use *QOper8-cp*.


That's pretty much everything you need to know about running IRIS with Fastify and QOper8.  Have fun!

