'use client';

import React, { useEffect, useState } from 'react';
import { Card, Typography, Tabs } from 'antd';
import {
  DashboardOutlined,
  ImportOutlined,
  ExportOutlined,
  EditOutlined,
  FileAddOutlined,
  WarningOutlined,
  RollbackOutlined,
  HistoryOutlined,
  BookOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import { STOCK_MOVEMENTS, type StockMovement } from '../../lib/stockManagementData';
import {
  StockOverviewPanel,
  StockInPanel,
  StockOutPanel,
  StockAdjustmentPanel,
  OpeningStockPanel,
  DamagedStockPanel,
  ReturnedStockPanel,
  StockMovementHistoryPanel,
  StockLedgerPanel,
} from '../../components/stock/StockMovementPanels';

const { Title, Text } = Typography;

export default function StockManagementPage() {
  const [movements, setMovements] = useState(STOCK_MOVEMENTS);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab) setActiveTab(tab);
  }, []);

  const addMovement = (m: StockMovement) => {
    setMovements((prev) => [m, ...prev]);
  };

  const tabItems = [
    {
      key: 'overview',
      label: <span><DashboardOutlined /> Overview</span>,
      children: <StockOverviewPanel movements={movements} />,
    },
    {
      key: 'stock_in',
      label: <span><ImportOutlined /> Stock In</span>,
      children: <StockInPanel movements={movements} onAdd={addMovement} />,
    },
    {
      key: 'stock_out',
      label: <span><ExportOutlined /> Stock Out</span>,
      children: <StockOutPanel movements={movements} onAdd={addMovement} />,
    },
    {
      key: 'adjustment',
      label: <span><EditOutlined /> Adjustments</span>,
      children: <StockAdjustmentPanel movements={movements} onAdd={addMovement} />,
    },
    {
      key: 'opening',
      label: <span><FileAddOutlined /> Opening Stock</span>,
      children: <OpeningStockPanel movements={movements} onAdd={addMovement} />,
    },
    {
      key: 'damaged',
      label: <span><WarningOutlined /> Damaged</span>,
      children: <DamagedStockPanel movements={movements} onAdd={addMovement} />,
    },
    {
      key: 'returned',
      label: <span><RollbackOutlined /> Returns</span>,
      children: <ReturnedStockPanel movements={movements} onAdd={addMovement} />,
    },
    {
      key: 'history',
      label: <span><HistoryOutlined /> Movement History</span>,
      children: <StockMovementHistoryPanel movements={movements} />,
    },
    {
      key: 'ledger',
      label: <span><BookOutlined /> Stock Card</span>,
      children: <StockLedgerPanel movements={movements} />,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <Title level={4} className="!mb-1">Stock Management</Title>
          <Text type="secondary">
            Records every movement of inventory — stock in, stock out, adjustments, opening balances, damaged & returned goods, availability, and audit trail
          </Text>
        </div>

        <Card className="!rounded-xl">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            type="card"
            className="stock-management-tabs"
          />
        </Card>
      </div>
    </DashboardLayout>
  );
}
