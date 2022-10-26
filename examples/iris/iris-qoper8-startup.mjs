import { createRequire } from 'module';

let onStartupModule = function(props) {

  const localRequire = createRequire('/opt/rps/node_modules');
  const irisnative = localRequire('irisnative');
  const connection = irisnative.createConnection({
    host: '172.17.0.2', 
    port: 1972, 
    ns: 'USER', 
    user: '_SYSTEM', 
    pwd: 'SW193dy'
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