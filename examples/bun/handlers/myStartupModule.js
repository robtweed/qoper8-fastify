const onStartupModule = function(args) {

  this.on('stop', function() {
    console.log('Worker is about to be shut down by QOper8');
    // perform any resource disconnection/tear-down logic
  });
};

export {onStartupModule};