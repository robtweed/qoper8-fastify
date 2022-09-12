import fastifyPlugin from 'fastify-plugin';

function configure (fastify, opts, done) {

  fastify.qoper8.setPoolSize(2);
  fastify.qoper8.logging = true;

  // YottaDB API Connection

  fastify.qoper8.setOnStartupModule({
    module: './glsdb-qoper8-fastify-startup.mjs',
    arguments: {
      type: 'yottadb',
      options: {
        connection: 'api',
        path: '/usr/local/lib/yottadb/r134/',
        env: {
          ydb_dir: '/opt/yottadb',
          ydb_gbldir: '/opt/yottadb/yottadb.gld',
          ydb_routines: '/opt/fastify-qoper8/m /usr/local/lib/yottadb/r134/libyottadbutil.so',
          ydb_ci: '/usr/local/lib/yottadb/r134/zmgsi.ci'
        }
      }
    }
  });

/*

  // YottaDB Network Connection

  fastify.qoper8.setOnStartupModule({
    module: './glsdb-qoper8-fastify-startup.mjs',
    arguments: {
      type: 'yottadb',
      options: {
        connection: 'network',
        host: 'localhost',
        tcp_port: 7041
      }
    }
  });

*/


/*

  // IRIS API Connection

  fastify.qoper8.setOnStartupModule({
    module: './glsdb-qoper8-fastify-startup.mjs',
    arguments: {
      type: 'iris',
      options: {
        path: '/usr/irissys/mgr',
        username: "_SYSTEM",
        password: "SYS",
        namespace: "USER"
      }
    }
  });

*/

/*

  // IRIS Network Connection

  fastify.qoper8.setOnStartupModule({
    module: './glsdb-qoper8-fastify-startup.mjs',
    arguments: {
      type: 'iris',
      options: {
        host: '172.17.0.2',
        tcp_port: 7042,
        username: "_SYSTEM",
        password: "SYS",
        namespace: "USER"
      }
    }
  });

*/

  done();
}

export default fastifyPlugin(configure);
