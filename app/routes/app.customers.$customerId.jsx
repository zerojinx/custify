import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation, useNavigate } from "@remix-run/react";
import { useState, useEffect } from "react";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  BlockStack,
  Text,
  InlineStack,
  Banner,
  Box,
  Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;
  const customerId = params.customerId;


  const response = await admin.graphql(
    `#graphql
      query getCustomer($id: ID!) {
        customer(id: $id) {
          id
          legacyResourceId
          firstName
          lastName
          email
          phone
          createdAt
          tags
        }
      }
    `,
    {
      variables: {
        id: `gid://shopify/Customer/${customerId}`,
      },
    }
  );

  const responseJson = await response.json();
  const shopifyCustomer = responseJson.data?.customer;

  if (!shopifyCustomer) {
    throw new Response("Customer not found", { status: 404 });
  }

 
  const customData = await db.customerField.findUnique({
    where: { 
      shop_customerId: { 
        shop: shop, 
        customerId: customerId 
      } 
    },
  });

  return json({
    shopifyCustomer,
    customData: customData || { points: 0, couponCode: "", note: "" },
  });
};

export const action = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;
  const customerId = params.customerId;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    await db.customerField.delete({
      where: { 
        shop_customerId: { 
          shop: shop, 
          customerId: customerId 
        } 
      },
    });
    return redirect("/app/customers");
  }

  
  const phoneInput = formData.get("phone");
  if (phoneInput) {
    let processedPhone = phoneInput.trim();
    
    // Checks if phone already has +91 prefix
    if (processedPhone.startsWith("+91")) {
      return json({ error: "Please enter phone number without +91 prefix. It will be added automatically." }, { status: 400 });
    }
    
    // Validates 10-digit number
    if (!/^\d{10}$/.test(processedPhone)) {
      return json({ error: "Phone number must be exactly 10 digits." }, { status: 400 });
    }
    
    // Adds +91 prefix
    processedPhone = `+91${processedPhone}`;
    
    // Checks for duplicate phone numbers in Shopify
    const phoneCheckResponse = await admin.graphql(
      `#graphql
        query checkPhoneNumber($query: String!) {
          customers(first: 5, query: $query) {
            edges {
              node {
                id
                legacyResourceId
                phone
              }
            }
          }
        }
      `,
      {
        variables: {
          query: `phone:${processedPhone}`,
        },
      }
    );
    
    const phoneCheckJson = await phoneCheckResponse.json();
    const existingCustomers = phoneCheckJson.data?.customers?.edges || [];
    
    // Checks if phone exists for a different customer
    const duplicateCustomer = existingCustomers.find(
      edge => edge.node.legacyResourceId !== customerId
    );
    
    if (duplicateCustomer) {
      return json({ error: "This phone number is already assigned to another customer." }, { status: 400 });
    }
    
    // Updates phone number in Shopify
    try {
      await admin.graphql(
        `#graphql
          mutation customerUpdate($input: CustomerInput!) {
            customerUpdate(input: $input) {
              customer {
                id
                phone
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        {
          variables: {
            input: {
              id: `gid://shopify/Customer/${customerId}`,
              phone: processedPhone,
            },
          },
        }
      );
    } catch (error) {
      return json({ error: "Failed to update phone number in Shopify." }, { status: 500 });
    }
  }

  // Validates and save custom fields
  const points = parseInt(formData.get("points") || "0", 10);
  const couponCode = formData.get("couponCode") || "";
  const note = formData.get("note") || "";

  // Basic validation
  if (isNaN(points) || points < 0) {
    return json({ error: "Points must be a valid number greater than or equal to 0." }, { status: 400 });
  }

  if (couponCode && couponCode.length > 50) {
    return json({ error: "Coupon code must be less than 50 characters." }, { status: 400 });
  }

  try {
    await db.customerField.upsert({
      where: { 
        shop_customerId: { 
          shop: shop, 
          customerId: customerId 
        } 
      },
      create: { 
        shop: shop, 
        customerId: customerId, 
        points, 
        couponCode, 
        note 
      },
      update: { 
        points, 
        couponCode, 
        note 
      },
    });

    return json({ success: "Customer data updated successfully!" });
  } catch (error) {
    return json({ error: "Failed to save customer data. Please try again." }, { status: 500 });
  }
};

export default function CustomerDetail() {
  const { shopifyCustomer, customData } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isLoading = navigation.state === "submitting";

  const [formData, setFormData] = useState({
    phone: '',
    points: '',
    couponCode: '',
    note: ''
  });

  useEffect(() => {
    const displayPhone = shopifyCustomer.phone?.startsWith('+91') 
      ? shopifyCustomer.phone.substring(3) 
      : shopifyCustomer.phone || '';

    setFormData({
      phone: displayPhone,
      points: customData.points?.toString() || "0",
      couponCode: customData.couponCode || "",
      note: customData.note || ""
    });
  }, [shopifyCustomer, customData]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const customerName = `${shopifyCustomer.firstName || ''} ${shopifyCustomer.lastName || ''}`.trim() || 'Unknown Customer';

  return (
    <Page
      backAction={{
        content: 'Customers',
        onAction: () => navigate('/app/customers'),
      }}
    >
      <TitleBar title={`Managing: ${customerName}`} />
      <BlockStack gap="500">
        {actionData?.error && (
          <Banner title="Error" tone="critical">
            <p>{actionData.error}</p>
          </Banner>
        )}
        {actionData?.success && (
          <Banner title="Success" tone="success">
            <p>{actionData.success}</p>
          </Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Customer Information
            </Text>
            <Form method="post">
              <FormLayout>
                <InlineStack gap="400">
                  <Box minWidth="200px">
                    <TextField
                      label="First Name"
                      value={shopifyCustomer.firstName || ''}
                      disabled
                      readOnly
                    />
                  </Box>
                  <Box minWidth="200px">
                    <TextField
                      label="Last Name"
                      value={shopifyCustomer.lastName || ''}
                      disabled
                      readOnly
                    />
                  </Box>
                </InlineStack>
                <TextField
                  label="Email"
                  value={shopifyCustomer.email || ''}
                  disabled
                  readOnly
                />
                <TextField
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(value) => handleFieldChange('phone', value)}
                  prefix="+91"
                  placeholder="9828123321"
                  helpText="Enter 10-digit phone number without +91 prefix"
                  autoComplete="off"
                />
                <Box paddingBlockStart="400">
                  <InlineStack gap="200">
                    <Button
                      submit
                      variant="primary"
                      loading={isLoading && navigation.formData?.get("intent") !== "delete"}
                    >
                      Update Phone
                    </Button>
                  </InlineStack>
                </Box>
              </FormLayout>
            </Form>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Custom Fields
            </Text>
            <Form method="post">
              <FormLayout>
                <TextField
                  label="Points"
                  name="points"
                  type="number"
                  value={formData.points}
                  onChange={(value) => handleFieldChange('points', value)}
                  helpText="Loyalty points for this customer"
                  autoComplete="off"
                />
                <TextField
                  label="Coupon Code"
                  name="couponCode"
                  type="text"
                  value={formData.couponCode}
                  onChange={(value) => handleFieldChange('couponCode', value)}
                  helpText="Special coupon code for this customer"
                  autoComplete="off"
                />
                <TextField
                  label="Note"
                  name="note"
                  multiline={4}
                  value={formData.note}
                  onChange={(value) => handleFieldChange('note', value)}
                  helpText="Internal notes about this customer"
                  autoComplete="off"
                />
              </FormLayout>
              <Box paddingBlockStart="400">
                <InlineStack gap="200">
                  <Button
                    submit
                    variant="primary"
                    loading={isLoading && navigation.formData?.get("intent") !== "delete"}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/app/customers')}
                  >
                    Cancel
                  </Button>
                </InlineStack>
              </Box>
            </Form>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Danger Zone
            </Text>
            <Divider />
            <Text variant="bodyMd">
              Remove all custom fields for this customer. This action cannot be undone.
            </Text>
            <Form method="post">
              <input type="hidden" name="intent" value="delete" />
              <Button
                submit
                variant="primary"
                tone="critical"
                loading={isLoading && navigation.formData?.get("intent") === "delete"}
              >
                Delete Custom Fields
              </Button>
            </Form>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}