const handler = function(messageObj, finished) {

  let userId = messageObj.data.params.userId;
  let token = messageObj.data.params.token;

  finished({
    token: token,
    received: messageObj,
    handledByWorker: this.id,
  });
};

export {handler};