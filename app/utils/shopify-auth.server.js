import crypto from "crypto";
import db from "../db.server.js";

export async function getShopAccessToken(shop) {
  try {
    const session = await db.session.findFirst({
      where: { 
        shop: shop,
        isOnline: false 
      },
      orderBy: { id: 'desc' } 
    });
    
    return session?.accessToken || null;
  } catch (error) {
    console.error("Error fetching shop access token:", error);
    return null;
  }
}


export async function storeShopAccessToken(shop, accessToken, sessionData = {}) {
  try {
    const sessionId = `offline_${shop}`;
    
    await db.session.upsert({
      where: { id: sessionId },
      update: {
        accessToken: accessToken,
        shop: shop,
        state: sessionData.state || "authenticated",
        scope: sessionData.scope || null,
        expires: sessionData.expires || null,
        userId: sessionData.userId || null,
        firstName: sessionData.firstName || null,
        lastName: sessionData.lastName || null,
        email: sessionData.email || null,
        accountOwner: sessionData.accountOwner || false,
        locale: sessionData.locale || null,
        collaborator: sessionData.collaborator || false,
        emailVerified: sessionData.emailVerified || false
      },
      create: {
        id: sessionId,
        shop: shop,
        state: sessionData.state || "authenticated",
        isOnline: false,
        accessToken: accessToken,
        scope: sessionData.scope || null,
        expires: sessionData.expires || null,
        userId: sessionData.userId || null,
        firstName: sessionData.firstName || null,
        lastName: sessionData.lastName || null,
        email: sessionData.email || null,
        accountOwner: sessionData.accountOwner || false,
        locale: sessionData.locale || null,
        collaborator: sessionData.collaborator || false,
        emailVerified: sessionData.emailVerified || false
      }
    });
    
    console.log(`Stored access token for shop: ${shop}`);
    console.log(`Token stored in database: ${accessToken}`);
    return true;
  } catch (error) {
    console.error("Error storing shop access token:", error);
    return false;
  }
}


export async function verifyShopifyHMAC(params, signature, shop) {
  try {
    const accessToken = await getShopAccessToken(shop);

    if (!accessToken) {
      console.error(`No access token found for shop: ${shop}`);
      return false;
    }

    console.log(`Retrieved stored token for ${shop}: ${accessToken}`);

    const filteredParams = Array.from(params.entries())
      .filter(([key]) => 
        key !== "signature" &&
        key !== "path_prefix" &&
        key !== "logged_in_customer_id" &&
        key !== "_shopify_sa_p" &&
        key !== "_shopify_sa_t" &&
        key !== "_shopify_y" &&
        key !== "_shopify_s" &&
        key !== "_shopify_d"
      );

    filteredParams.sort(([a], [b]) => a.localeCompare(b));

    const queryString = filteredParams
      .map(([key, val]) => `${key}=${val}`)
      .join("&");

    console.log("query string for HMAC:", queryString);
    console.log("all received params:", Object.fromEntries(params.entries()));
    console.log("filtered params for HMAC:", Object.fromEntries(filteredParams));
    console.log("useing stored access token for HMAC verification");

    const calculatedHmac = crypto
      .createHmac("sha256", accessToken)
      .update(queryString, "utf8")
      .digest("hex");

    console.log("Shopify signature (from request):", signature);
    console.log("Calculated HMAC (from token):   ", calculatedHmac);

    // Compare signatures (case-insensitive)
    const isValid = calculatedHmac.toLowerCase() === signature.toLowerCase();

    if (!isValid) {
      console.error("HMAC verification failed!");
      console.error("Expected:", calculatedHmac);
      console.error("Received:", signature);
      console.error("Query string used:", queryString);
      console.error("All params received:", Object.fromEntries(params.entries()));
    } else {
      console.log("HMAC verification successful!");
    }

    return isValid;
  } catch (error) {
    console.error("HMAC verification error:", error);
    return false;
  }
}


export async function removeShopAccessToken(shop) {
  try {
    await db.session.deleteMany({
      where: { shop: shop }
    });
    
    console.log(`Removed access token for shop: ${shop}`);
    return true;
  } catch (error) {
    console.error("Error removing shop access token:", error);
    return false;
  }
}

export function getShopifyConfig() {
  return {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecret: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SCOPES?.split(",") || ["read_customers", "write_customers"],
    appUrl: process.env.SHOPIFY_APP_URL,
    webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET
  };
}
