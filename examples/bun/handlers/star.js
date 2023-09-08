const handler = function(messageObj, finished) {

  finished({
    ok: 'star',
    received: messageObj,
    handledByWorker: this.id,
  });
};

export {handler};