import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return json({
    features: [
      "Customer Management with Custom Fields",
      "Points & Coupon Code System", 
      "Customer Account Storefront Block",
    ]
  });
};

export default function Index() {
  const { features } = useLoaderData();
  const navigate = useNavigate();

  return (
    <Page>
      <TitleBar title="Custify - Customer Management App" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Welcome to Custify!
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Manage your customers with custom fields like points and coupon codes.
                    Your customers can view their rewards on their account page.
                  </Text>
                </BlockStack>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Features:
                  </Text>
                  <Box>
                    <List type="bullet">
                      {features.map((feature, index) => (
                        <List.Item key={index}>{feature}</List.Item>
                      ))}
                    </List>
                  </Box>
                </BlockStack>
                <InlineStack gap="300">
                  <Button variant="primary" onClick={() => navigate("/app/customers")}>
                    Manage Customers
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}