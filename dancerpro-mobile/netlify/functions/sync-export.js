const { handleCors, createResponse, verifyToken, writeUserSnapshot } = require('./shared/utils');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  const corsResponse = handleCors(event);
  if (corsResponse) return corsResponse;

  if (event.httpMethod !== 'POST') {
    return createResponse(405, { error: 'Method not allowed' });
  }

  // Verify authentication
  const authResult = verifyToken(event.headers.authorization);
  if (authResult.error) {
    return createResponse(401, { error: authResult.error });
  }

  try {
    const userId = authResult.user.id;
    const { snapshot } = JSON.parse(event.body);
    
    if (!snapshot || typeof snapshot !== 'object') {
      return createResponse(400, { error: 'Invalid snapshot data' });
    }

    const result = writeUserSnapshot(userId, snapshot, {
      exportedBy: userId,
      exportedAt: new Date().toISOString()
    });

    if (!result) {
      return createResponse(500, { error: 'Failed to save snapshot' });
    }

    return createResponse(200, {
      message: 'Snapshot exported successfully',
      metadata: result.metadata
    });

  } catch (error) {
    console.error('Sync export error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};