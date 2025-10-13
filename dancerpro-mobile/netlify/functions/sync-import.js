const { handleCors, createResponse, verifyToken, readUserSnapshot } = require('./shared/utils');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  const corsResponse = handleCors(event);
  if (corsResponse) return corsResponse;

  if (event.httpMethod !== 'GET') {
    return createResponse(405, { error: 'Method not allowed' });
  }

  // Verify authentication
  const authResult = verifyToken(event.headers.authorization);
  if (authResult.error) {
    return createResponse(401, { error: authResult.error });
  }

  try {
    const userId = authResult.user.id;
    const snapshot = readUserSnapshot(userId);
    
    if (!snapshot) {
      return createResponse(404, { 
        error: 'No snapshot found for user',
        snapshot: {},
        metadata: {
          updatedAt: null,
          version: 0
        }
      });
    }

    return createResponse(200, {
      message: 'Snapshot retrieved successfully',
      snapshot: snapshot.snapshot || {},
      metadata: snapshot.metadata || {
        updatedAt: null,
        version: 0
      }
    });

  } catch (error) {
    console.error('Sync import error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};