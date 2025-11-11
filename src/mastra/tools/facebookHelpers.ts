/**
 * Facebook API Helper Functions
 * 
 * This file contains utility functions for working with Facebook Graph API,
 * including token management and API interactions.
 */

interface PageData {
  access_token: string;
  id: string;
  name: string;
}

interface PageTokenResponse {
  data: PageData[];
}

/**
 * Exchange a User Access Token for a Page Access Token
 * 
 * Facebook requires a Page Access Token to upload videos and post to Pages.
 * This function exchanges a User Access Token for the proper Page Access Token.
 * 
 * @param userAccessToken - The user's access token
 * @param pageId - Optional specific page ID to get token for
 * @returns Page Access Token and Page ID
 * @throws Error if token exchange fails
 */
export async function getPageAccessToken(
  userAccessToken: string,
  pageId?: string
): Promise<{ pageAccessToken: string; pageId: string; pageName: string }> {
  try {
    // Call Facebook API to get all pages managed by this user
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get page token: ${error.error?.message || 'Unknown error'}`);
    }

    const data: PageTokenResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('No pages found for this user access token');
    }

    // If specific pageId is provided, find that page
    if (pageId) {
      const page = data.data.find((p) => p.id === pageId);
      if (!page) {
        throw new Error(`Page with ID ${pageId} not found in user's managed pages`);
      }
      return {
        pageAccessToken: page.access_token,
        pageId: page.id,
        pageName: page.name,
      };
    }

    // Otherwise, return the first page
    const firstPage = data.data[0];
    return {
      pageAccessToken: firstPage.access_token,
      pageId: firstPage.id,
      pageName: firstPage.name,
    };
  } catch (error: any) {
    throw new Error(`Error getting page access token: ${error.message}`);
  }
}

/**
 * Get the correct access token for Facebook API operations
 * 
 * This function handles the token logic:
 * 1. If FB_PAGE_ACCESS_TOKEN is set and looks like a page token, use it
 * 2. Otherwise, exchange FB_USER_ACCESS_TOKEN for a page token
 * 3. Falls back to FB_PAGE_ACCESS_TOKEN if no user token is available
 * 
 * @param logger - Logger instance for debugging
 * @returns Object with pageAccessToken and pageId
 */
export async function getFacebookCredentials(logger?: any): Promise<{
  pageAccessToken: string;
  pageId: string;
}> {
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  const userAccessToken = process.env.FB_USER_ACCESS_TOKEN;
  const pageId = process.env.FB_PAGE_ID;

  // If we have a user access token, exchange it for a page token
  if (userAccessToken) {
    logger?.info('🔑 [Facebook] Using user access token to get page token');
    try {
      const result = await getPageAccessToken(userAccessToken, pageId);
      logger?.info('✅ [Facebook] Successfully obtained page access token', {
        pageId: result.pageId,
        pageName: result.pageName,
      });
      return {
        pageAccessToken: result.pageAccessToken,
        pageId: result.pageId,
      };
    } catch (error: any) {
      logger?.error('❌ [Facebook] Failed to exchange user token for page token:', error.message);
      logger?.warn('⚠️ [Facebook] Falling back to FB_PAGE_ACCESS_TOKEN');
    }
  }

  // Fallback to direct page access token
  if (!pageAccessToken || !pageId) {
    throw new Error(
      'Missing Facebook credentials. Please set either:\n' +
      '1. FB_USER_ACCESS_TOKEN (recommended) - will auto-exchange for page token\n' +
      '2. FB_PAGE_ACCESS_TOKEN and FB_PAGE_ID - direct page token'
    );
  }

  logger?.info('🔑 [Facebook] Using direct page access token');
  return {
    pageAccessToken,
    pageId,
  };
}
