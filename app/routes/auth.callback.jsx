import { json, redirect } from "@remix-run/node";
import { storeShopAccessToken, getShopifyConfig } from "../utils/shopify-auth.server.js";
import crypto from "crypto";

export const loader = async ({ request }) => {
  console.log("=== AUTH CALLBACK RECEIVED ===");
  
  const url = new URL(request.url);
  const params = url.searchParams;
  
  const shop = params.get("shop");
  const code = params.get("code");
  const state = params.get("state");
  const hmac = params.get("hmac");
  
  console.log("Callback params:", { shop, code: !!code, state, hmac });
  
  if (!shop || !code) {
    console.error("Missing required parameters");
    return json({ error: "Missing required parameters" }, { status: 400 });
  }
  
  try {
    const config = getShopifyConfig();
    if (!config.apiSecret) {
      console.error("SHOPIFY_API_SECRET not configured");
      return json({ error: "Server configuration error" }, { status: 500 });
    }
    
    const queryString = Array.from(params.entries())
      .filter(([key]) => key !== "hmac" && key !== "signature")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${key}=${val}`)
      .join("&");
    
    const calculatedHmac = crypto
      .createHmac("sha256", config.apiSecret)
      .update(queryString, "utf8")
      .digest("hex");
    
    if (calculatedHmac !== hmac) {
      console.error("Invalid HMAC signature");
      return json({ error: "Invalid request signature" }, { status: 403 });
    }
    
    console.log("HMAC verification passed");
    
    // Exchange authorization code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: config.apiKey,
        client_secret: config.apiSecret,
        code: code,
      }),
    });
    
    if (!tokenResponse.ok) {
      console.error("Failed to exchange code for token:", tokenResponse.status);
      return json({ error: "Failed to get access token" }, { status: 400 });
    }
    
    const tokenData = await tokenResponse.json();
    console.log("Received access token from Shopify");
    console.log("ACCESS TOKEN:", tokenData.access_token);
    console.log("TOKEN TYPE:", tokenData.associated_user ? "Online" : "Offline");
    
    // Store the access token in database
    const stored = await storeShopAccessToken(shop, tokenData.access_token, {
      scope: tokenData.scope,
      state: "authenticated"
    });
    
    if (!stored) {
      console.error("Failed to store access token");
      return json({ error: "Failed to store access token" }, { status: 500 });
    }
    
    console.log("Access token stored successfully");
    
    // Redirect to app
    return redirect(`https://${shop}/admin/apps/${config.apiKey}`);
    
  } catch (error) {
    console.error("Auth callback error:", error);
    return json({ error: "Authentication failed" }, { status: 500 });
  }
};