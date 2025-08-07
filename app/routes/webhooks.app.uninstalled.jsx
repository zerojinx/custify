import { json } from "@remix-run/node";
import { removeShopAccessToken } from "../utils/shopify-auth.server.js";
import db from "../db.server";

export const action = async ({ request }) => {
  const payload = await request.text();
  const shop = request.headers.get("X-Shopify-Shop-Domain");

  console.log("App uninstalled for shop:", shop);

  // Remove stored access token
  if (shop) {
    await removeShopAccessToken(shop);
  }

  // Clean up any shop-specific data
  // You might want to remove customer data or mark it as inactive
  // await db.customerField.deleteMany({ where: { shop } });

  return json({ success: true });
};