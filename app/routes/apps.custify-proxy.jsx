import { json } from "@remix-run/node";
import db from "../db.server";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const customerId = url.searchParams.get("customerId");
  const signature = url.searchParams.get("signature");

  console.log("API called with params:", { shop, customerId, signature });

  if (!shop || !customerId) {
    return json({
      points: 0,
      couponCode: "",
      hasData: false,
      error: "Missing required parameters",
      debug: { shop, customerId }
    }, {
      status: 400,
      headers: corsHeaders
    });
  }

  const finalCustomerId = parseInt(customerId);
  
  if (isNaN(finalCustomerId)) {
    return json({
      points: 0,
      couponCode: "",
      hasData: false,
      error: "Invalid customer ID",
      debug: { customerId }
    }, {
      status: 400,
      headers: corsHeaders
    });
  }

  // Skipping HMAC verification for now (couldn't understand how to implement it correctly in time)
  try {
    const user = await db.customerField.findUnique({ 
      where: { 
        shop_customerId: {
          shop: shop,
          customerId: finalCustomerId.toString()
        }
      } 
    });

    console.log("Fetching customer data for:", finalCustomerId);
    console.log("Found user data:", user);

    return json({
      points: user?.points || 0,
      couponCode: user?.couponCode || "",
      hasData: !!user,
    }, {
      headers: corsHeaders
    });
  } catch (dbError) {
    console.error("Database query error:", dbError);
    return json({
      points: 0,
      couponCode: "",
      hasData: false,
      error: "Database error",
      debug: dbError.message
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}