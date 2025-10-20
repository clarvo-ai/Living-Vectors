/**
 * Validates the Authorization Bearer token from the request headers
 * @param request The incoming request
 * @param expectedToken The token we expect to receive
 * @returns Response with error if validation fails, null if validation passes
 */
export function validateBearerToken(request: Request, expectedToken: string): Response | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('Missing or invalid Authorization header');
    return new Response(
      JSON.stringify({
        error: 'Missing or invalid Authorization header',
      }),
      { status: 401 }
    );
  }

  const apiToken = authHeader.split(' ')[1];
  if (!apiToken || apiToken !== expectedToken) {
    return new Response(
      JSON.stringify({
        error: 'Invalid API token',
      }),
      { status: 401 }
    );
  }

  return null;
}
