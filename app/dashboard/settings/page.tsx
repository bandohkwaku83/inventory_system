'use client';

import React, { useState } from 'react';
import {
  TextField,
} from '@mui/material';
import {
  Save as SaveIcon,
  Business as BusinessIcon,
  Receipt as ReceiptIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import DashboardLayout from '../../components/DashboardLayout';

export default function SettingsPage() {
  const [businessInfo, setBusinessInfo] = useState({
    name: 'My Shop',
    address: '123 Main Street',
    phone: '+233 XX XXX XXXX',
    email: 'info@myshop.com',
    taxId: 'TAX-123456',
  });

  const [receiptSettings, setReceiptSettings] = useState({
    showLogo: true,
    showAddress: true,
    showPhone: true,
    showEmail: true,
    footerMessage: 'Thank you for your business!',
  });

  const [units, setUnits] = useState(['kg', 'L', 'pack', 'bottles', 'units', 'pieces']);
  const [categories, setCategories] = useState(['Groceries', 'Beverages', 'Dairy', 'Snacks', 'Household', 'Personal Care']);

  const handleSaveBusinessInfo = () => {
    alert('Business information saved!');
  };

  const handleSaveReceiptSettings = () => {
    alert('Receipt settings saved!');
  };

  return (
    <DashboardLayout>
      <div>
        <h1 className="mb-1 text-xl font-bold text-slate-800">
          Settings
        </h1>
        <p className="text-xs text-slate-500 mb-6">
          Configure your system settings
        </p>

        <div className="flex flex-col gap-6">
          {/* Business Information */}
          <div className="flex-1">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BusinessIcon className="text-teal-600" />
                  <h2 className="text-base font-semibold text-slate-800">Business Information</h2>
                </div>
                <div className="border-t border-slate-200 mb-4"></div>
                <div className="flex flex-col gap-4">
                  <div className="flex-1">
                    <TextField
                      fullWidth
                      label="Business Name"
                      value={businessInfo.name}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                    />
                  </div>
                  <div className="flex-1">
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Address"
                      value={businessInfo.address}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                    />
                  </div>
                  <div className="flex-1">
                    <TextField
                      fullWidth
                      label="Phone"
                      value={businessInfo.phone}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                    />
                  </div>
                  <div className="flex-1">
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={businessInfo.email}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                    />
                  </div>
                  <div className="flex-1">
                    <TextField
                      fullWidth
                      label="Tax ID"
                      value={businessInfo.taxId}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, taxId: e.target.value })}
                    />
                  </div>
                  <div className="flex-1">
                    <button
                      onClick={handleSaveBusinessInfo}
                      className="w-full py-2.5 px-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <SaveIcon />
                      Save Business Info
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Receipt Template Settings */}
          <div className="flex-1">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ReceiptIcon className="text-teal-600" />
                  <h2 className="text-base font-semibold text-slate-800">Receipt Template</h2>
                </div>
                <div className="border-t border-slate-200 mb-4"></div>
                <div className="flex flex-col gap-4">
                  <div className="flex-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={receiptSettings.showLogo}
                        onChange={(e) => setReceiptSettings({ ...receiptSettings, showLogo: e.target.checked })}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                      <span className="text-sm text-slate-700">Show Logo</span>
                    </label>
                  </div>
                  <div className="flex-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={receiptSettings.showAddress}
                        onChange={(e) => setReceiptSettings({ ...receiptSettings, showAddress: e.target.checked })}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                      <span className="text-sm text-slate-700">Show Address</span>
                    </label>
                  </div>
                  <div className="flex-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={receiptSettings.showPhone}
                        onChange={(e) => setReceiptSettings({ ...receiptSettings, showPhone: e.target.checked })}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                      <span className="text-sm text-slate-700">Show Phone</span>
                    </label>
                  </div>
                  <div className="flex-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={receiptSettings.showEmail}
                        onChange={(e) => setReceiptSettings({ ...receiptSettings, showEmail: e.target.checked })}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                      <span className="text-sm text-slate-700">Show Email</span>
                    </label>
                  </div>
                  <div className="flex-1">
                    <TextField
                      fullWidth
                      label="Footer Message"
                      value={receiptSettings.footerMessage}
                      onChange={(e) => setReceiptSettings({ ...receiptSettings, footerMessage: e.target.value })}
                    />
                  </div>
                  <div className="flex-1">
                    <button
                      onClick={handleSaveReceiptSettings}
                      className="w-full py-2.5 px-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <SaveIcon />
                      Save Receipt Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Units and Categories */}
          <div className="flex-1">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <SettingsIcon className="text-teal-600" />
                  <h2 className="text-base font-semibold text-slate-800">Units</h2>
                </div>
                <div className="border-t border-slate-200 mb-4"></div>
                <p className="text-xs text-slate-500 mb-4">
                  Available units: {units.join(', ')}
                </p>
                <TextField
                  fullWidth
                  label="Add New Unit"
                  placeholder="e.g., boxes"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.currentTarget as HTMLInputElement;
                      if (input.value && !units.includes(input.value)) {
                        setUnits([...units, input.value]);
                        input.value = '';
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <SettingsIcon className="text-teal-600" />
                  <h2 className="text-base font-semibold text-slate-800">Categories</h2>
                </div>
                <div className="border-t border-slate-200 mb-4"></div>
                <p className="text-xs text-slate-500 mb-4">
                  Available categories: {categories.join(', ')}
                </p>
                <TextField
                  fullWidth
                  label="Add New Category"
                  placeholder="e.g., Beverages"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.currentTarget as HTMLInputElement;
                      if (input.value && !categories.includes(input.value)) {
                        setCategories([...categories, input.value]);
                        input.value = '';
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* User Roles */}
          <div className="flex-1">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <PeopleIcon className="text-teal-600" />
                  <h2 className="text-base font-semibold text-slate-800">User Roles</h2>
                </div>
                <div className="border-t border-slate-200 mb-4"></div>
                <p className="text-xs text-slate-500">
                  User roles management will be available in a future update.
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Available roles: Admin, Cashier, Manager
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
