/**
 * QPR Contribution Worker
 * Handles OAuth and GitHub API operations for the contribution system
 */

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Will be restricted in handleRequest
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  },
};

async function handleRequest(request, env) {
  const url = new URL(request.url);
  
  // Set proper CORS origin
  const allowedOrigins = [
    'https://iiserm.github.io',
    'http://localhost:8000', // For local testing
  ];
  
  const origin = request.headers.get('Origin');
  const responseHeaders = {
    ...corsHeaders,
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  };

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: responseHeaders });
  }

  try {
    // Route handling
    if (url.pathname === '/auth/callback') {
      return handleAuthCallback(url, env, responseHeaders);
    }
    
    if (url.pathname === '/api/fork') {
      return handleFork(request, env, responseHeaders);
    }
    
    if (url.pathname === '/api/create-branch') {
      return handleCreateBranch(request, env, responseHeaders);
    }
    
    if (url.pathname === '/api/upload-file') {
      return handleUploadFile(request, env, responseHeaders);
    }
    
    if (url.pathname === '/api/create-pr') {
      return handleCreatePR(request, env, responseHeaders);
    }
    
    if (url.pathname === '/api/check-fork') {
      return handleCheckFork(request, env, responseHeaders);
    }

    return new Response('Not Found', { status: 404, headers: responseHeaders });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle GitHub OAuth callback
 */
async function handleAuthCallback(url, env, headers) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  if (!code) {
    return new Response('Missing authorization code', { status: 400, headers });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const userData = await userResponse.json();

    // Redirect back to frontend with token
    const redirectUrl = new URL(`${env.FRONTEND_URL}/docs/contribute.html`);
    redirectUrl.searchParams.set('token', tokenData.access_token);
    redirectUrl.searchParams.set('username', userData.login);
    if (state) redirectUrl.searchParams.set('state', state);

    return Response.redirect(redirectUrl.toString(), 302);
  } catch (error) {
    const errorUrl = new URL(`${env.FRONTEND_URL}/docs/contribute.html`);
    errorUrl.searchParams.set('error', error.message);
    return Response.redirect(errorUrl.toString(), 302);
  }
}

/**
 * Check if user has already forked the repository
 */
async function handleCheckFork(request, env, headers) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    // Get authenticated user
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    const userData = await userResponse.json();
    
    // Check if fork exists
    const forkResponse = await fetch(
      `https://api.github.com/repos/${userData.login}/${env.GITHUB_REPO_NAME}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (forkResponse.status === 200) {
      const forkData = await forkResponse.json();
      return new Response(JSON.stringify({ 
        exists: true, 
        fork: forkData 
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ exists: false }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Fork the repository
 */
async function handleFork(request, env, headers) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // Fork the repository
    const forkResponse = await fetch(
      `https://api.github.com/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/forks`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    const forkData = await forkResponse.json();

    if (forkResponse.status !== 202 && forkResponse.status !== 200) {
      throw new Error(forkData.message || 'Failed to fork repository');
    }

    // Wait a bit for fork to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    return new Response(JSON.stringify(forkData), {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Create a new branch in the forked repository
 */
async function handleCreateBranch(request, env, headers) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const { owner, repo, branchName } = await request.json();

  try {
    // Get the default branch reference
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch;

    // Get the SHA of the default branch
    const refResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    const refData = await refResponse.json();
    const sha = refData.object.sha;

    // Create new branch
    const createBranchResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: sha,
        }),
      }
    );

    const branchData = await createBranchResponse.json();

    if (createBranchResponse.status !== 201) {
      throw new Error(branchData.message || 'Failed to create branch');
    }

    return new Response(JSON.stringify(branchData), {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Upload a file to the repository
 */
async function handleUploadFile(request, env, headers) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const { owner, repo, path, content, message, branch } = await request.json();

  try {
    // Create or update file
    const uploadResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          content: content, // Base64 encoded
          branch: branch,
        }),
      }
    );

    const uploadData = await uploadResponse.json();

    if (uploadResponse.status !== 201 && uploadResponse.status !== 200) {
      throw new Error(uploadData.message || 'Failed to upload file');
    }

    return new Response(JSON.stringify(uploadData), {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Create a pull request
 */
async function handleCreatePR(request, env, headers) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const { owner, branch, title, body } = await request.json();

  try {
    // Create pull request
    const prResponse = await fetch(
      `https://api.github.com/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/pulls`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title,
          body: body,
          head: `${owner}:${branch}`,
          base: 'main',
        }),
      }
    );

    const prData = await prResponse.json();

    if (prResponse.status !== 201) {
      throw new Error(prData.message || 'Failed to create pull request');
    }

    return new Response(JSON.stringify(prData), {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
}

