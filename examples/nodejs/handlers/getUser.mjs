const handler = function(messageObj, finished) {

  if (messageObj.data.params.userId !== 'rob') {
    return finished({
      error: 'Invalid User',
      errorCode: 405
    });
  }

  finished({
    ok: true,
    received: messageObj,
    handledByWorker: this.id,
  });
};

export {handler};