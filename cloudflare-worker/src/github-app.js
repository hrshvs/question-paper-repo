/**
 * GitHub App Authentication Helper
 * Generates installation tokens for GitHub App API access
 */

/**
 * Generate JWT for GitHub App authentication
 * @param {string} appId - GitHub App ID
 * @param {string} privateKey - GitHub App Private Key (PEM format)
 * @returns {string} JWT token
 */
async function generateJWT(appId, privateKey) {
  const now = Math.floor(Date.now() / 1000);

  // JWT Header
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  // JWT Payload
  const payload = {
    iat: now - 60, // Issued at time (60 seconds in the past to account for clock drift)
    exp: now + 10 * 60, // Expires in 10 minutes
    iss: appId,
  };

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  // Create signature
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await signRS256(signatureInput, privateKey);

  return `${signatureInput}.${signature}`;
}

/**
 * Sign data using RS256 algorithm
 * @param {string} data - Data to sign
 * @param {string} privateKey - Private key in PEM format
 * @returns {string} Base64 URL encoded signature
 */
async function signRS256(data, privateKey) {
  // Import the private key
  const pemContents = privateKey
    .replace(/-----BEGIN RSA PRIVATE KEY-----/, "")
    .replace(/-----END RSA PRIVATE KEY-----/, "")
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryKey = base64Decode(pemContents);

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  // Sign the data
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    dataBuffer
  );

  return base64UrlEncode(signatureBuffer);
}

/**
 * Get GitHub App Installation Access Token
 * @param {string} appId - GitHub App ID
 * @param {string} privateKey - GitHub App Private Key
 * @param {string} installationId - GitHub App Installation ID
 * @returns {Promise<string>} Access token
 */
async function getInstallationToken(appId, privateKey, installationId) {
  // Generate JWT
  const jwt = await generateJWT(appId, privateKey);

  // Exchange JWT for installation token
  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "QPR-Contribution-Bot",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get installation token: ${error}`);
  }

  const data = await response.json();
  return data.token;
}

/**
 * Base64 URL encode
 * @param {string|ArrayBuffer} data - Data to encode
 * @returns {string} Base64 URL encoded string
 */
function base64UrlEncode(data) {
  let base64;

  if (typeof data === "string") {
    base64 = btoa(data);
  } else {
    // ArrayBuffer
    const bytes = new Uint8Array(data);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  }

  // Convert to URL-safe base64
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Base64 decode
 * @param {string} base64 - Base64 encoded string
 * @returns {ArrayBuffer} Decoded data
 */
function base64Decode(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export { getInstallationToken };
