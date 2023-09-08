const handler = function(messageObj, finished) {

  // process the incoming message object


  // on completion, invoke the QOper8 finished() method
  //  to return the response and release the Worker back
  //  to the available pool

  finished({
    ok: true,
    hello: 'world',
    handledByWorker: this.id
  });
};

export {handler};