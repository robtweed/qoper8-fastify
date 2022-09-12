let handler = function(messageObj, finished) {
  console.log('**** glsdb test handler ****');

  let p = new this.glsdb.node('Person.x');
  console.log(JSON.stringify(p.getDocument, null, 2));


  finished({
    ok: true,
    hello: 'world'
  });
};
export {handler};