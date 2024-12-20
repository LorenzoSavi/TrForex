const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'My API',
    description: 'Description'
  },
  host: 'sturdy-space-journey-976r4jpxr773p6xg-3000.app.github.dev'
};

const outputFile = 'swagger.json';
const routes = ['server.js', 'server-forex.js'];

swaggerAutogen(outputFile, routes, doc);