import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Card,
  DataTable,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");

  const query = `#graphql
    query getCustomers($after: String) {
      customers(first: 25, after: $after) {
        edges {
          node {
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
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
      }
    }
  `;

  const variables = cursor ? { after: cursor } : {};
  const response = await admin.graphql(query, { variables });
  const responseJson = await response.json();
  const customers = responseJson.data?.customers?.edges?.map(edge => edge.node) || [];
  const pageInfo = responseJson.data?.customers?.pageInfo || {};

  return json({ customers, pageInfo });
};

export default function CustomersIndex() {
  const { customers, pageInfo } = useLoaderData();
  const navigate = useNavigate();

  if (!customers || customers.length === 0) {
    return (
      <Page>
        <TitleBar title="Customers" />
        <Card>
          <EmptyState
            heading="No customers found"
            action={{
              content: 'Learn more about customers',
              url: 'https://help.shopify.com/manual/customers',
              external: true,
            }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>Your store doesn't have any customers yet.</p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  const rows = customers.map((customer) => [
    <InlineStack gap="200" align="start" blockAlign="center">
      <Text variant="bodyMd" fontWeight="medium">
        {`${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'No Name'}
      </Text>
    </InlineStack>,
    customer.email?.trim() || 'No Email',
    customer.phone?.trim() || 'No Phone',
    <Button
      variant="plain"
      onClick={() => navigate(`/app/customers/${customer.legacyResourceId}`)}
    >
      Manage
    </Button>,
  ]);

  return (
    <Page>
      <TitleBar title="Customer Management" />
      <BlockStack gap="300">
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">
                Customers ({customers.length})
              </Text>
            </InlineStack>
            <DataTable
              columnContentTypes={['text', 'text', 'text', 'text']}
              headings={['Name', 'Email', 'Phone', 'Actions']}
              rows={rows}
            />
            {(pageInfo.hasPreviousPage || pageInfo.hasNextPage) && (
              <InlineStack gap="200">
                {pageInfo.hasPreviousPage && (
                  <Button
                    onClick={() => navigate(`?cursor=${pageInfo.startCursor}&direction=previous`)}
                  >
                    Previous
                  </Button>
                )}
                {pageInfo.hasNextPage && (
                  <Button
                    onClick={() => navigate(`?cursor=${pageInfo.endCursor}`)}
                  >
                    Next
                  </Button>
                )}
              </InlineStack>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
