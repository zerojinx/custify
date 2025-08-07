export function getRequiredEnvVar(name, defaultValue = null) {
  const value = process.env[name] || defaultValue;
  
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  
  return value;
}

export function getShopifyAppConfig() {
  return {
    apiKey: getRequiredEnvVar("SHOPIFY_API_KEY"),
    apiSecret: getRequiredEnvVar("SHOPIFY_API_SECRET"),
    appUrl: getRequiredEnvVar("SHOPIFY_APP_URL"),
    scopes: getRequiredEnvVar("SCOPES", "read_customers,write_customers").split(","),
    webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET,
    databaseUrl: process.env.DATABASE_URL || "file:dev.sqlite"
  };
}

export function validateConfig() {
  try {
    const config = getShopifyAppConfig();
    console.log("Configuration validated successfully");
    console.log("App URL:", config.appUrl);
    console.log("Scopes:", config.scopes.join(", "));
    return true;
  } catch (error) {
    console.error("Configuration validation failed:", error.message);
    return false;
  }
}