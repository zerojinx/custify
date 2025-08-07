import { redirect } from "@remix-run/node";
import { getShopifyConfig } from "../utils/shopify-auth.server.js";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  
  if (!shop) {
    return new Response("Missing shop parameter", { status: 400 });
  }
  
  // Validates shop domain
  if (!shop.endsWith(".myshopify.com")) {
    return new Response("Invalid shop domain", { status: 400 });
  }
  
  const config = getShopifyConfig();
  
  if (!config.apiKey || !config.appUrl) {
    return new Response("App not configured properly", { status: 500 });
  }
  
  // Generate state for security
  const state = Math.random().toString(36).substring(2, 15);
  
  // Build OAuth URL
  const scopes = config.scopes.join(",");
  const redirectUri = `${config.appUrl}/auth/callback`;
  
  const authUrl = `https://${shop}/admin/oauth/authorize?` +
    `client_id=${config.apiKey}&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${state}`;
  
  console.log("Redirecting to Shopify OAuth:", authUrl);
  
  return redirect(authUrl);
};