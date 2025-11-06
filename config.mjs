const CERT_BASE = `${process.env.HOME}/tmp/localhost-certs`;

export default {

  service: {
    dbUrl:  'mongodb://localhost:27017/books',
  },

  ws: {
    port: 2345,
    base: '/api',
  },

  https: {
    certPath: `${CERT_BASE}/localhost.crt`,
    keyPath: `${CERT_BASE}/localhost.key`,
  },
  

};
