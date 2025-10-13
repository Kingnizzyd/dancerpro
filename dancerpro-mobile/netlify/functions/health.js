const { handleCors, createResponse } = require('./shared/utils');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  const corsResponse = handleCors(event);
  if (corsResponse) return corsResponse;

  if (event.httpMethod !== 'GET') {
    return createResponse(405, { error: 'Method not allowed' });
  }

  return createResponse(200, { 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'DancerPro API'
  });
};