# Custify Shopify App

Machine Round Task: Shopify App Development
Level: Intermediate–Advanced

##  Implemented features

- **Remix Scaffold**: Used latest shopify remix scaffold for base application
- **Admin Dashboard**: Complete customer management interface with pagination
- **Custom Fields**: Points, coupon codes, and notes for each customer
- **CRUD Operations**: Full create, read, update, delete functionality for custom fields
- **Storefront Integration**: Customer rewards block for account pages
- **Real-time Updates**: Seamless data synchronization between admin and storefront

##  Pending tasks

- **HMAC verification**: calculated string is not matching shopify provided signature

## Project Structure

```
custify/
├── app/
│   ├── routes/
│   │   ├── app._index.jsx              
│   │   ├── app.customers._index.jsx    
│   │   ├── app.customers.$customerId.jsx 
│   │   ├── app.settings.jsx            
│   │   └── apps.custify-proxy.jsx      
│   ├── db.server.js                    
│   └── shopify.server.js               
├── extensions/
│   └── custify-app-block/              
│       ├── blocks/
│       │   └── customer-rewards.liquid 
│       ├── snippets/
│       │   └── custify-rewards-script.liquid 
│       └── shopify.extension.toml      
├── prisma/
│   └── schema.prisma                   
└── package.json                       
```

## Setup Instructions

### Prerequisites

- Node.js v20 or latest LTS
- Shopify CLI (latest version)
- Shopify Partner account
- Development store

### 1. Initial Setup

```bash
# Install dependencies
npm install

# Setup database
npx prisma migrate dev --name init
npx prisma generate
```

### 2. Development

```bash
# Start development server
shopify app dev
```

### 3. Database Migration

The app includes a custom `CustomerField` model in Prisma:

```prisma
model CustomerField {
  id           Int      @id @default(autoincrement())
  shop         String   // Shop domain
  customerId   String   // Shopify customer ID
  points       Int?     
  couponCode   String?  
  note         String?  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([shop, customerId])
}
```

## Data Flow Explanation

### Admin UI → Database
1. **Authentication**: Shopify OAuth via `authenticate.admin(request)`
2. **Customer Fetch**: GraphQL queries to Shopify Admin API
3. **Custom Fields**: CRUD operations on `CustomerField` table via Prisma
4. **Data Persistence**: Upsert operations with shop/customer scoping

### Storefront → App Proxy → Database
1. **Customer Request**: Account page loads with app block
2. **Proxy Call**: JavaScript fetches `/apps/custify-proxy`
3. **Shopify Routing**: Request forwarded with authentication parameters
4. **Verification**: Host validation
5. **Data Retrieval**: Customer-specific lookup in database
6. **Response**: Secure JSON with points and coupon data

### Key Components

#### 1. Admin Routes (`app/routes/app.*.jsx`)
- **Dashboard**: Overview and navigation
- **Customer Index**: Paginated customer listing with Shopify GraphQL
- **Customer Detail**: CRUD interface for custom fields

#### 2. App Proxy (`app/routes/apps.custify-proxy.jsx`)
- Host header validation against shop domain
- Customer data lookup with shop/customer scoping
- CORS headers for cross-origin requests

#### 3. Theme Extension (`extensions/custify-app-block/`)
- **Liquid Block**: Template for theme editor integration
- **JavaScript**: Async data fetching with error handling
- **CSS**: Responsive styling matching Shopify's design standards
- **Schema**: Merchant configuration options

#### 4. Database Layer (`prisma/schema.prisma`)
- **CustomerField Model**: Shop-scoped customer data storage
- **Unique Constraints**: Prevents duplicate records per shop/customer
- **Timestamps**: Automatic created/updated tracking
- **Nullable Fields**: Flexible data entry for optional information

## Technical Implementation

### Database Operations
```javascript
// Upsert pattern for customer fields
await db.customerField.upsert({
  where: { shop_customerId: { shop, customerId } },
  create: { shop, customerId, points, couponCode, note },
  update: { points, couponCode, note },
});
```

### Shopify GraphQL Integration
```javascript
// Customer fetch with pagination
const response = await admin.graphql(`
  query getCustomers($after: String) {
    customers(first: 25, after: $after) {
      edges { node { id legacyResourceId firstName lastName email phone } }
      pageInfo { hasNextPage endCursor }
    }
  }
`);
```

### Frontend Data Fetching
```javascript
// Secure proxy request from storefront
const response = await fetch('/apps/custify-proxy');
const data = await response.json();
// { points: 100, couponCode: "SAVE20", hasData: true }
```

## Production Deployment

### Using Shopify CLI

```bash
# Deploy the app
shopify app deploy
```