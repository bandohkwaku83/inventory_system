'use client';

import React from 'react';
import { Select } from 'antd';
import { LocationOn as LocationIcon } from '@mui/icons-material';
import { BUSINESS_LOCATIONS } from '../lib/enterpriseDummyData';

interface LocationSelectorProps {
  value: string;
  onChange: (locationId: string) => void;
  showAll?: boolean;
  className?: string;
  size?: 'small' | 'middle' | 'large';
}

export default function LocationSelector({
  value,
  onChange,
  showAll = true,
  className,
  size = 'middle',
}: LocationSelectorProps) {
  const options = [
    ...(showAll ? [{ value: 'all', label: 'All locations' }] : []),
    ...BUSINESS_LOCATIONS.filter((l) => l.status === 'active').map((l) => ({
      value: l.id,
      label: `${l.code} — ${l.city}`,
    })),
  ];

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <LocationIcon className="!text-[1rem] text-slate-400" />
      <Select
        value={value}
        onChange={onChange}
        options={options}
        size={size}
        className="min-w-[180px]"
        popupMatchSelectWidth={false}
      />
    </div>
  );
}
