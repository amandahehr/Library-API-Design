const Hapi = require('hapi')

const server = new Hapi.Server()

const Inert = require('inert');

server.connection({
  host: 'localhost',
  port: 3000
})

server.register(require('inert'), (err) => {
    if (err) {
        throw err;
    }
});

server.register(require('vision'), (err) => {
  if (err) {
    throw err
  }


  server.views({
    engines: {
     ejs: require('ejs') 
    },
    relativeTo: __dirname,
    path: 'templates'
  })

	server.route(require('./routes'))

  server.route({
    method: 'GET',
    path:'/books/',
    handler(request, reply){
      var params = request.query
      reply()
    }
  })
	server.start((err) => {
	  if (err) {
	    throw err
	  }
	  console.log('server listening at: ', server.info.uri)
	})
})
