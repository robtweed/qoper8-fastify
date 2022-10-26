const handler = function(messageObj, finished) {
   
  // process incoming request in messageObj.data

  // your handler has access to the properties your startup module
  // added to this:

  this.iris.set(Date.now().toString(), '^testglobal', 1);

  // return response - contents are for you to determine

  finished({
    ok: true,
    hello: 'world',
  });
};

export {handler};