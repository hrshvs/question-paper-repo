/**
 * QPR Contribution Worker
 * Handles OAuth and GitHub API operations for the contribution system
 */

import { getInstallationToken } from './github-app.js';

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Will be restricted in handleRequest
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error('Top-level error:', error);
      console.error('Error stack:', error.stack);
      return new Response(JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};

async function handleRequest(request, env) {
  const url = new URL(request.url);
  
  // Set proper CORS origin
  const allowedOrigins = [
    'https://iiserm.github.io',
    'http://localhost:8000', // For local testing
    'http://127.0.0.1:8000', // Alternative localhost
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
    
    if (url.pathname === '/api/contribute-direct') {
      return handleDirectContribution(request, env, responseHeaders);
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
    console.log('Exchanging code for token...');
    console.log('Client ID:', env.GITHUB_CLIENT_ID);
    
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

    console.log('Token response status:', tokenResponse.status);
    const responseText = await tokenResponse.text();
    console.log('Token response body:', responseText);
    
    const tokenData = JSON.parse(responseText);
    
    if (tokenData.error) {
      console.error('GitHub error:', tokenData.error, tokenData.error_description);
      throw new Error(tokenData.error_description || tokenData.error);
    }

    // Get user info
    console.log('Getting user info...');
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'QPR-Contribution-Portal',
      },
    });

    console.log('User response status:', userResponse.status);
    const userResponseText = await userResponse.text();
    console.log('User response body:', userResponseText);
    
    const userData = JSON.parse(userResponseText);

    // Redirect back to frontend with token
    console.log('Redirecting to frontend with username:', userData.login);
    const redirectUrl = new URL(`${env.FRONTEND_URL}/docs/contribute.html`);
    redirectUrl.searchParams.set('token', tokenData.access_token);
    redirectUrl.searchParams.set('username', userData.login);
    if (state) redirectUrl.searchParams.set('state', state);

    console.log('Redirect URL:', redirectUrl.toString());
    return Response.redirect(redirectUrl.toString(), 302);
  } catch (error) {
    console.error('Caught error in handleAuthCallback:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    const errorUrl = new URL(`${env.FRONTEND_URL}/docs/contribute.html`);
    errorUrl.searchParams.set('error', error.message);
    console.log('Redirecting to error URL:', errorUrl.toString());
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
        'User-Agent': 'QPR-Contribution-Portal',
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
          'User-Agent': 'QPR-Contribution-Portal',
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
          'User-Agent': 'QPR-Contribution-Portal',
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
        'User-Agent': 'QPR-Contribution-Portal',
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
          'User-Agent': 'QPR-Contribution-Portal',
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
          'User-Agent': 'QPR-Contribution-Portal',
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
          'User-Agent': 'QPR-Contribution-Portal',
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
          'User-Agent': 'QPR-Contribution-Portal',
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

/**
 * Handle direct contribution (Firebase Google Auth flow)
 * Creates PR directly on main repo using GitHub App token
 */
async function handleDirectContribution(request, env, headers) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await request.json();
    const { userEmail, userName, uploadGroups, prTitle, prDescription } = data;

    // Validate required fields
    if (!userEmail || !userName || !uploadGroups || !prTitle) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Validate email domain
    const allowedDomain = env.ALLOWED_EMAIL_DOMAIN || 'iisermohali.ac.in';
    if (!userEmail.endsWith(`@${allowedDomain}`)) {
      return new Response(JSON.stringify({ 
        error: `Only ${allowedDomain} email addresses are allowed` 
      }), {
        status: 403,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Direct contribution from ${userName} (${userEmail})`);

    // Get GitHub App installation token
    const appToken = await getInstallationToken(
      env.GITHUB_APP_ID,
      env.GITHUB_APP_PRIVATE_KEY,
      env.GITHUB_APP_INSTALLATION_ID
    );

    // Create a unique branch name
    const timestamp = Date.now();
    const emailPrefix = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '-');
    const branchName = `contrib-${emailPrefix}-${timestamp}`;

    // Get the default branch SHA
    const repoResponse = await fetch(
      `https://api.github.com/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}`,
      {
        headers: {
          'Authorization': `Bearer ${appToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'QPR-Contribution-Bot',
        },
      }
    );

    if (!repoResponse.ok) {
      throw new Error('Failed to fetch repository information');
    }

    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch;

    // Get the SHA of the default branch
    const refResponse = await fetch(
      `https://api.github.com/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/git/ref/heads/${defaultBranch}`,
      {
        headers: {
          'Authorization': `Bearer ${appToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'QPR-Contribution-Bot',
        },
      }
    );

    if (!refResponse.ok) {
      throw new Error('Failed to fetch default branch reference');
    }

    const refData = await refResponse.json();
    const baseSha = refData.object.sha;

    // Create new branch
    const createBranchResponse = await fetch(
      `https://api.github.com/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/git/refs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${appToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'QPR-Contribution-Bot',
        },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: baseSha,
        }),
      }
    );

    if (!createBranchResponse.ok) {
      const errorData = await createBranchResponse.json();
      throw new Error(errorData.message || 'Failed to create branch');
    }

    console.log(`Created branch: ${branchName}`);

    // Upload files with custom author
    const uploadedFiles = [];
    for (const group of uploadGroups) {
      const { folderPath, files } = group;
      
      for (const file of files) {
        const { name, content } = file; // content should be base64
        const filePath = `${folderPath}/${name}`;
        
        console.log(`Uploading file: ${filePath}`);
        
        const uploadResponse = await fetch(
          `https://api.github.com/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/contents/${filePath}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${appToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
              'User-Agent': 'QPR-Contribution-Bot',
            },
            body: JSON.stringify({
              message: `Add ${name}`,
              content: content,
              branch: branchName,
              author: {
                name: userName,
                email: userEmail,
              },
              committer: {
                name: 'QPR Bot',
                email: 'bot@iiserm.github.io',
              },
            }),
          }
        );

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          console.error(`Failed to upload ${filePath}:`, errorData);
          throw new Error(`Failed to upload ${name}: ${errorData.message}`);
        }

        uploadedFiles.push(filePath);
        console.log(`Uploaded: ${filePath}`);
      }
    }

    // Build PR body
    const filesList = uploadGroups.map(group => {
      const { folderPath, files } = group;
      return `- **${folderPath}/**:\n${files.map(f => `  - ${f.name}`).join('\n')}`;
    }).join('\n\n');

    const prBody = `${prDescription ? prDescription + '\n\n' : ''}**Contributed by:** ${userEmail}
**Google Account:** ${userName}

### Files Added:
${filesList}

---
*This PR was created via the QPR Contribution Portal (Direct submission)*`;

    // Create pull request
    const prResponse = await fetch(
      `https://api.github.com/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/pulls`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${appToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'QPR-Contribution-Bot',
        },
        body: JSON.stringify({
          title: prTitle,
          body: prBody,
          head: branchName,
          base: defaultBranch,
        }),
      }
    );

    if (!prResponse.ok) {
      const errorData = await prResponse.json();
      throw new Error(errorData.message || 'Failed to create pull request');
    }

    const prData = await prResponse.json();
    console.log(`Created PR #${prData.number}: ${prData.html_url}`);

    return new Response(JSON.stringify({
      success: true,
      pr: prData,
      branch: branchName,
      filesUploaded: uploadedFiles,
    }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Direct contribution error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to process direct contribution' 
    }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
}

