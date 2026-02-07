# Inventory System

A general-purpose **inventory management system** for shops and supermarkets. Track products, stock levels, purchases, sales, and generate reports—all in one place.

## Features

- **Dashboard** – Overview of total stock value, daily sales, low-stock alerts, and pending deliveries
- **Products** – Manage your product catalog with categories, prices, cost price, and SKU/barcode
- **Inventory** – Track stock levels, reorder points, and last restocked dates
- **Purchases** – Record supplier orders and restocking with invoice details
- **Sales (POS)** – Point-of-sale: add products to cart, apply discounts, and complete checkout
- **Receipts** – View and print transaction receipts
- **Reports** – Daily/monthly sales, top selling items, stock movement; export to PDF or Excel
- **Settings** – Business info, receipt template, units, and categories

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects to the dashboard.

## Tech Stack

- **Next.js** (App Router)
- **React** + **TypeScript**
- **Tailwind CSS** + **MUI (Material UI)** + **Ant Design**
- **Recharts** for charts

## Project Structure

```
app/
  components/     # DashboardLayout, ThemeRegistry, Loader
  dashboard/      # Dashboard, Products, Inventory, Purchases, Sales, Receipts, Reports, Settings
  layout.tsx
  page.tsx        # Redirects to /dashboard
  theme.tsx
```

## License

Private project.
