'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Typography,
  Table,
  Space,
  Tag,
  Button,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Tabs,
  DatePicker,
  Form,
  Modal,
  Popconfirm,
  InputNumber,
  message,
  Divider,
  Drawer,
  Descriptions,
} from 'antd';
import type { TableProps } from 'antd';
import {
  SearchOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserAddOutlined,
  CalendarOutlined,
  EyeOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import DashboardLayout from '../../components/DashboardLayout';
import {
  datesInRange,
  getWeeksInMonth,
  weekIndexForDate,
  type MonthWeek,
} from '../../lib/attendanceUtils';
import {
  useStaff,
  ATTENDANCE_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  type AttendanceRecord,
  type AttendanceStatus,
  type StaffMember,
} from '../../context/StaffContext';
import { labelizeMetaValue, type StaffEmploymentType } from '../../lib/staffApi';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'green',
  absent: 'red',
  late: 'gold',
  leave: 'blue',
};

type StaffFormValues = Omit<StaffMember, 'id'>;

type WeekGridRow = {
  member: StaffMember;
  days: { date: string; status?: AttendanceStatus }[];
};

function useToday() {
  const [today, setToday] = useState(() => dayjs());

  useEffect(() => {
    const syncToday = () => {
      const now = dayjs();
      setToday((prev) => (prev.isSame(now, 'day') ? prev : now));
    };
    syncToday();
    const timer = window.setInterval(syncToday, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncToday();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return today;
}

export default function StaffManagementPage() {
  const {
    staff,
    staffLoading,
    staffMeta,
    summary: apiSummary,
    attendanceLoading,
    history,
    historyLoading,
    addStaff,
    updateStaff,
    deleteStaff,
    getAttendanceForDate,
    upsertAttendance,
    markAllPresent,
    refreshDaily,
    refreshHistory,
  } = useStaff();

  const [messageApi, contextHolder] = message.useMessage();
  const [savingStaff, setSavingStaff] = useState(false);
  const today = useToday();
  const todayIso = today.format('YYYY-MM-DD');
  const [historyMonth, setHistoryMonth] = useState(() => dayjs().startOf('month'));
  const [historyWeekIndex, setHistoryWeekIndex] = useState(() =>
    Math.max(0, weekIndexForDate(dayjs().startOf('month'), dayjs()))
  );
  const [historySearch, setHistorySearch] = useState('');
  const [historySearchDebounced, setHistorySearchDebounced] = useState('');
  const [staffSearch, setStaffSearch] = useState('');

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [viewingStaff, setViewingStaff] = useState<StaffMember | null>(null);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [staffForm] = Form.useForm<StaffFormValues>();

  const dateIso = todayIso;
  const activeStaff = useMemo(() => staff.filter((s) => s.status === 'active'), [staff]);

  const genderOptions = useMemo(
    () => staffMeta.genders.map((g) => ({ value: g, label: labelizeMetaValue(g) })),
    [staffMeta.genders]
  );
  const relationshipOptions = useMemo(
    () => staffMeta.relationships.map((r) => ({ value: r, label: labelizeMetaValue(r) })),
    [staffMeta.relationships]
  );
  const departmentOptions = useMemo(
    () => staffMeta.departments.map((d) => ({ value: d, label: labelizeMetaValue(d) })),
    [staffMeta.departments]
  );
  const employmentTypeOptions = useMemo(
    () =>
      staffMeta.employmentTypes.map((k) => ({
        value: k,
        label: EMPLOYMENT_TYPE_LABELS[k as StaffEmploymentType] ?? labelizeMetaValue(k),
      })),
    [staffMeta.employmentTypes]
  );
  const statusOptions = useMemo(
    () =>
      (Object.keys(ATTENDANCE_STATUS_LABELS) as AttendanceStatus[]).map((k) => ({
        value: k,
        label: ATTENDANCE_STATUS_LABELS[k],
      })),
    []
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setHistorySearchDebounced(historySearch.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [historySearch]);

  useEffect(() => {
    void refreshDaily(dateIso).catch((e) => {
      messageApi.error(e instanceof Error ? e.message : 'Failed to load daily attendance');
    });
  }, [dateIso, refreshDaily, messageApi]);

  useEffect(() => {
    void refreshHistory({
      year: historyMonth.year(),
      month: historyMonth.month() + 1,
      week: historyWeekIndex + 1,
      q: historySearchDebounced,
    }).catch((e) => {
      messageApi.error(e instanceof Error ? e.message : 'Failed to load attendance history');
    });
  }, [historyMonth, historyWeekIndex, historySearchDebounced, refreshHistory, messageApi]);

  const dayRecords = useMemo(() => getAttendanceForDate(dateIso), [getAttendanceForDate, dateIso]);

  const monthWeeks = useMemo(() => getWeeksInMonth(historyMonth), [historyMonth]);
  const selectedWeek: MonthWeek | undefined = monthWeeks[historyWeekIndex] ?? monthWeeks[0];
  const weekDays = useMemo(() => {
    if (history?.days?.length) {
      return history.days.map((d) => dayjs(d));
    }
    return selectedWeek ? datesInRange(selectedWeek.start, selectedWeek.end) : [];
  }, [history?.days, selectedWeek]);

  const recordByStaffId = useMemo(
    () => new Map(dayRecords.map((r) => [r.staffId, r])),
    [dayRecords]
  );

  const summary = useMemo(
    () => ({
      activeCount: apiSummary?.activeStaff ?? activeStaff.length,
      present: apiSummary?.presentToday ?? dayRecords.filter((r) => r.status === 'present').length,
      absent: apiSummary?.absentToday ?? dayRecords.filter((r) => r.status === 'absent').length,
      late: apiSummary?.lateToday ?? dayRecords.filter((r) => r.status === 'late').length,
      unmarked:
        apiSummary?.unmarked ?? Math.max(0, activeStaff.length - dayRecords.length),
    }),
    [apiSummary, activeStaff.length, dayRecords]
  );

  const dailyRows = useMemo(
    () =>
      activeStaff.map((member) => {
        const record = recordByStaffId.get(member.id);
        return { member, record };
      }),
    [activeStaff, recordByStaffId]
  );

  const weekGridRows = useMemo((): WeekGridRow[] => {
    if (history?.rows?.length) {
      return history.rows.map((row) => ({
        member: {
          id: row.staff.id,
          name: row.staff.fullName,
          role: row.staff.role,
          employeeNumber: row.staff.employeeId,
          phone: '',
          hireDate: '',
          employmentType: 'full_time',
          baseSalary: 0,
          transportAllowance: 0,
          otherAllowances: 0,
          ssnitDeduction: 0,
          payeDeduction: 0,
          status: 'active',
        },
        days: weekDays.map((d) => {
          const date = d.format('YYYY-MM-DD');
          return { date, status: row.attendance[date] };
        }),
      }));
    }
    return [];
  }, [history, weekDays]);

  const handleHistoryMonthChange = (value: Dayjs | null) => {
    if (!value) return;
    const month = value.startOf('month');
    setHistoryMonth(month);
    const idx = month.isSame(dayjs(), 'month')
      ? Math.max(0, weekIndexForDate(month, dayjs()))
      : 0;
    setHistoryWeekIndex(idx);
  };

  const filteredStaff = useMemo(() => {
    if (!staffSearch.trim()) return staff;
    const q = staffSearch.toLowerCase();
    return staff.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        (s.email?.toLowerCase().includes(q) ?? false) ||
        (s.employeeNumber?.toLowerCase().includes(q) ?? false) ||
        (s.department?.toLowerCase().includes(q) ?? false)
    );
  }, [staff, staffSearch]);

  const handleStatusChange = (staffId: string, status: AttendanceStatus) => {
    void upsertAttendance(staffId, dateIso, status)
      .then(() =>
        refreshHistory({
          year: historyMonth.year(),
          month: historyMonth.month() + 1,
          week: historyWeekIndex + 1,
          q: historySearchDebounced,
        })
      )
      .catch(() => undefined);
  };

  const handleMarkAllPresent = () => {
    void markAllPresent(dateIso)
      .then(() =>
        refreshHistory({
          year: historyMonth.year(),
          month: historyMonth.month() + 1,
          week: historyWeekIndex + 1,
          q: historySearchDebounced,
        })
      )
      .catch(() => undefined);
  };

  const openAddStaff = () => {
    setEditingStaff(null);
    staffForm.resetFields();
    staffForm.setFieldsValue({
      employmentType: 'full_time',
      status: 'active',
      baseSalary: 0,
      transportAllowance: 0,
      otherAllowances: 0,
      ssnitDeduction: 0,
      payeDeduction: 0,
      hireDate: dayjs().format('YYYY-MM-DD'),
    });
    setStaffModalOpen(true);
  };

  const openEditStaff = (member: StaffMember) => {
    setEditingStaff(member);
    staffForm.setFieldsValue({ ...member, hireDate: member.hireDate });
    setStaffModalOpen(true);
  };

  const openViewStaff = (member: StaffMember) => {
    setViewingStaff(member);
    setViewDrawerOpen(true);
  };

  const handleSaveStaff = () => {
    void staffForm.validateFields().then(async (values) => {
      const payload = {
        name: values.name.trim(),
        role: values.role.trim(),
        phone: values.phone.trim(),
        email: values.email?.trim() || undefined,
        dateOfBirth: values.dateOfBirth || undefined,
        gender: values.gender,
        ghanaCardId: values.ghanaCardId?.trim() || undefined,
        address: values.address?.trim() || undefined,
        city: values.city?.trim() || undefined,
        department: values.department || undefined,
        emergencyContactName: values.emergencyContactName?.trim() || undefined,
        emergencyContactRelationship: values.emergencyContactRelationship || undefined,
        emergencyContactPhone: values.emergencyContactPhone?.trim() || undefined,
        emergencyContactAltPhone: values.emergencyContactAltPhone?.trim() || undefined,
        bankName: values.bankName?.trim() || undefined,
        bankAccountNumber: values.bankAccountNumber?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
        hireDate: values.hireDate,
        employmentType: values.employmentType,
        baseSalary: values.baseSalary ?? 0,
        transportAllowance: values.transportAllowance ?? 0,
        otherAllowances: values.otherAllowances ?? 0,
        ssnitDeduction: values.ssnitDeduction ?? 0,
        payeDeduction: values.payeDeduction ?? 0,
        status: values.status,
      };
      setSavingStaff(true);
      try {
        if (editingStaff) {
          await updateStaff(editingStaff.id, payload);
        } else {
          await addStaff(payload);
        }
        setStaffModalOpen(false);
      } catch {
        /* toast already shown */
      } finally {
        setSavingStaff(false);
      }
    });
  };

  const dailyColumns: TableProps<{ member: StaffMember; record?: AttendanceRecord }>['columns'] = [
    {
      title: 'Staff',
      key: 'staff',
      width: 180,
      render: (_: unknown, { member }) => (
        <div>
          <div className="text-xs font-semibold text-slate-800">{member.name}</div>
          <div className="text-[11px] text-slate-400">{member.role}</div>
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 160,
      render: (_: unknown, { member, record }) => (
        <Select
          size="small"
          value={record?.status}
          placeholder="Mark status"
          className="w-full"
          options={statusOptions}
          onChange={(v) => handleStatusChange(member.id, v)}
        />
      ),
    },
  ];

  const weekGridColumns: TableProps<WeekGridRow>['columns'] = useMemo(() => {
    const dayColumns = weekDays.map((d) => {
      const dateIso = d.format('YYYY-MM-DD');
      const isToday = dateIso === todayIso;
      return {
        title: (
          <div className={`text-center leading-tight ${isToday ? 'text-[#25395c] font-semibold' : ''}`}>
            <div className="text-[10px] text-slate-400">{d.format('ddd')}</div>
            <div className="text-xs">{d.format('D')}</div>
          </div>
        ),
        key: dateIso,
        width: 76,
        align: 'center' as const,
        render: (_: unknown, row: WeekGridRow) => {
          const status = row.days.find((day) => day.date === dateIso)?.status;
          if (!status) return <span className="text-slate-300 text-xs">—</span>;
          return (
            <Tag color={STATUS_COLORS[status]} className="rounded-full !m-0 text-[10px]">
              {ATTENDANCE_STATUS_LABELS[status].charAt(0)}
            </Tag>
          );
        },
      };
    });

    return [
      {
        title: 'Staff',
        key: 'staff',
        fixed: 'left' as const,
        width: 160,
        render: (_: unknown, row: WeekGridRow) => (
          <div>
            <div className="text-xs font-semibold text-slate-800">{row.member.name}</div>
            <div className="text-[11px] text-slate-400">{row.member.role}</div>
          </div>
        ),
      },
      ...dayColumns,
    ];
  }, [weekDays, todayIso]);

  const staffColumns: TableProps<StaffMember>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (v: string, r) => (
        <div>
          <div className="text-xs font-semibold text-slate-800">{v}</div>
          {r.employeeNumber && (
            <div className="font-mono text-[11px] text-slate-400">{r.employeeNumber}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (v: string) => <span className="text-xs text-slate-600">{v}</span>,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (v: string) => <span className="text-xs text-slate-600">{v}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: StaffMember['status']) => (
        <Tag color={v === 'active' ? 'green' : 'default'} className="rounded-full">
          {v === 'active' ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_: unknown, r) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => openViewStaff(r)}
            className="!px-0"
          >
            View
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditStaff(r)}
            aria-label="Edit staff"
            className="!px-1"
          />
          <Popconfirm
            title="Remove this staff member?"
            description="Their attendance history will also be removed."
            okText="Remove"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteStaff(r.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} className="!px-0" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <DashboardLayout>
      {contextHolder}
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Title level={4} className="!mb-1 !font-bold !text-slate-800">
              Staff Management
            </Title>
            <Text type="secondary">
              Track daily attendance, review history, and manage your team.
            </Text>
          </div>
          <Button type="primary" icon={<UserAddOutlined />} onClick={openAddStaff}>
            Add Staff
          </Button>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={4}>
            <Card className="shadow-sm">
              <Statistic title="Active Staff" value={summary.activeCount} prefix={<TeamOutlined />} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Card className="shadow-sm">
              <Statistic
                title="Present Today"
                value={summary.present}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#25395c' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Card className="shadow-sm">
              <Statistic
                title="Absent Today"
                value={summary.absent}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: summary.absent > 0 ? '#dc2626' : undefined }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Card className="shadow-sm">
              <Statistic
                title="Late Today"
                value={summary.late}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: summary.late > 0 ? '#d97706' : undefined }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Card className="shadow-sm">
              <Statistic
                title="Unmarked"
                value={summary.unmarked}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: summary.unmarked > 0 ? '#6366f1' : '#25395c' }}
              />
            </Card>
          </Col>
        </Row>

        <Tabs
          defaultActiveKey="daily"
          items={[
            {
              key: 'daily',
              label: 'Daily Attendance',
              children: (
                <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
                  <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Text className="text-sm font-medium text-slate-700 block">
                        Today — {today.format('dddd, MMMM D, YYYY')}
                      </Text>
                      <Text type="secondary" className="text-xs">
                        A fresh sheet each day. Yesterday&apos;s marks stay in history.
                      </Text>
                    </div>
                    <Button
                      size="small"
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      onClick={handleMarkAllPresent}
                    >
                      Mark All Present
                    </Button>
                  </div>
                  <div className="p-2 sm:p-3 overflow-x-auto">
                    <Table
                      rowKey={(r) => r.member.id}
                      columns={dailyColumns}
                      dataSource={dailyRows}
                      loading={staffLoading || attendanceLoading}
                      pagination={false}
                      size="small"
                      scroll={{ x: 400 }}
                      locale={{ emptyText: 'No active staff. Add staff in the Add Staff tab.' }}
                    />
                  </div>
                </Card>
              ),
            },
            {
              key: 'history',
              label: 'Attendance History',
              children: (
                <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
                  <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
                    <Text type="secondary" className="text-sm">
                      View attendance by week within a month.
                    </Text>
                    <Space wrap>
                      <DatePicker
                        picker="month"
                        value={historyMonth}
                        onChange={handleHistoryMonthChange}
                        allowClear={false}
                        size="small"
                        format="MMMM YYYY"
                      />
                      <Select
                        size="small"
                        value={monthWeeks[historyWeekIndex]?.key ?? monthWeeks[0]?.key}
                        onChange={(key) => {
                          const idx = monthWeeks.findIndex((w) => w.key === key);
                          if (idx >= 0) setHistoryWeekIndex(idx);
                        }}
                        className="min-w-[220px]"
                        options={monthWeeks.map((w) => ({ value: w.key, label: w.label }))}
                      />
                      <Input
                        allowClear
                        prefix={<SearchOutlined className="text-slate-400" />}
                        placeholder="Search staff..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="w-40"
                        size="small"
                      />
                    </Space>
                  </div>
                  <div className="px-4 py-2 border-b border-slate-100 flex flex-wrap gap-3 text-[11px] text-slate-500">
                    <span>
                      <Tag color="green" className="rounded-full !mr-1">P</Tag> Present
                    </span>
                    <span>
                      <Tag color="red" className="rounded-full !mr-1">A</Tag> Absent
                    </span>
                    <span>
                      <Tag color="gold" className="rounded-full !mr-1">L</Tag> Late
                    </span>
                    <span>
                      <Tag color="blue" className="rounded-full !mr-1">O</Tag> On Leave
                    </span>
                  </div>
                  <div className="p-2 sm:p-3 overflow-x-auto">
                    <Table<WeekGridRow>
                      rowKey={(r) => r.member.id}
                      columns={weekGridColumns}
                      dataSource={weekGridRows}
                      loading={historyLoading}
                      pagination={false}
                      size="small"
                      scroll={{ x: Math.max(480, 160 + weekDays.length * 76) }}
                    />
                  </div>
                </Card>
              ),
            },
            {
              key: 'staff',
              label: 'Add Staff',
              children: (
                <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
                  <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
                    <Text type="secondary" className="text-sm">
                      Add new team members or manage existing staff records.
                    </Text>
                    <Space wrap>
                      <Input
                        allowClear
                        prefix={<SearchOutlined className="text-slate-400" />}
                        placeholder="Search staff..."
                        value={staffSearch}
                        onChange={(e) => setStaffSearch(e.target.value)}
                        className="w-44"
                        size="small"
                      />
                      <Button
                        type="primary"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={openAddStaff}
                      >
                        Add Staff
                      </Button>
                    </Space>
                  </div>
                  <div className="p-2 sm:p-3 overflow-x-auto">
                    <Table<StaffMember>
                      rowKey="id"
                      columns={staffColumns}
                      dataSource={filteredStaff}
                      loading={staffLoading}
                      pagination={{ pageSize: 8, size: 'small', showSizeChanger: false }}
                      size="small"
                      scroll={{ x: 640 }}
                    />
                  </div>
                </Card>
              ),
            },
          ]}
        />
      </div>

      <Modal
        title={editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
        open={staffModalOpen}
        onCancel={() => setStaffModalOpen(false)}
        onOk={handleSaveStaff}
        okText={editingStaff ? 'Save Changes' : 'Add Staff'}
        confirmLoading={savingStaff}
        width={640}
        destroyOnHidden
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form form={staffForm} layout="vertical" className="!mt-2">
          <Divider titlePlacement="left" className="!mt-0 !text-xs !text-slate-500">
            Personal details
          </Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Full Name"
                rules={[{ required: true, message: 'Name is required' }]}
              >
                <Input placeholder="e.g. Kwaku Boateng" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="employeeNumber" label="Employee ID">
                <Input
                  placeholder={editingStaff ? undefined : 'Assigned automatically'}
                  disabled
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="dateOfBirth" label="Date of Birth">
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gender" label="Gender">
                <Select allowClear placeholder="Select gender" options={genderOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ghanaCardId" label="Ghana Card ID">
                <Input placeholder="GHA-XXXXXXXXX-X" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Phone"
                rules={[{ required: true, message: 'Phone is required' }]}
              >
                <Input placeholder="024 000 0000" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ type: 'email', message: 'Enter a valid email' }]}
              >
                <Input placeholder="name@example.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="city" label="City / Town">
                <Input placeholder="e.g. Accra" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="Residential Address">
            <Input placeholder="Street address" />
          </Form.Item>

          <Divider titlePlacement="left" className="!text-xs !text-slate-500">
            Emergency contact
          </Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="emergencyContactName"
                label="Full Name"
                rules={[{ required: true, message: 'Emergency contact name is required' }]}
              >
                <Input placeholder="Next of kin" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="emergencyContactRelationship"
                label="Relationship"
                rules={[{ required: true, message: 'Relationship is required' }]}
              >
                <Select allowClear placeholder="Select relationship" options={relationshipOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="emergencyContactPhone"
                label="Phone"
                rules={[{ required: true, message: 'Emergency contact phone is required' }]}
              >
                <Input placeholder="024 000 0000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="emergencyContactAltPhone" label="Alternate Phone">
                <Input placeholder="Optional second number" />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left" className="!text-xs !text-slate-500">
            Employment
          </Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label="Role / Position"
                rules={[{ required: true, message: 'Role is required' }]}
              >
                <Input placeholder="e.g. Cashier" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="department" label="Department">
                <Select allowClear placeholder="Select department" options={departmentOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="hireDate"
                label="Hire Date"
                rules={[{ required: true, message: 'Hire date is required' }]}
              >
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="employmentType" label="Employment Type">
                <Select options={employmentTypeOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="status" label="Status">
            <Select
              options={staffMeta.statuses.map((s) => ({
                value: s,
                label: labelizeMetaValue(s),
              }))}
            />
          </Form.Item>

          <Divider titlePlacement="left" className="!text-xs !text-slate-500">
            Salary & deductions
          </Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="baseSalary" label="Base Salary (GHS)">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="transportAllowance" label="Transport">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="otherAllowances" label="Other Allowances">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ssnitDeduction" label="SSNIT Deduction">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="payeDeduction" label="PAYE Deduction">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left" className="!text-xs !text-slate-500">
            Bank details
          </Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bankName" label="Bank Name">
                <Input placeholder="e.g. GCB Bank" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bankAccountNumber" label="Account Number">
                <Input placeholder="Account number" />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left" className="!text-xs !text-slate-500">
            Notes
          </Divider>
          <Form.Item name="notes" label="Additional notes">
            <TextArea rows={3} placeholder="Any other information about this staff member..." />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Staff Details"
        open={viewDrawerOpen}
        onClose={() => {
          setViewDrawerOpen(false);
          setViewingStaff(null);
        }}
        width={560}
        styles={{ body: { paddingTop: 20, paddingBottom: 28 } }}
        extra={
          viewingStaff ? (
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setViewDrawerOpen(false);
                openEditStaff(viewingStaff);
              }}
            >
              Edit
            </Button>
          ) : null
        }
      >
        {viewingStaff && (
          <div className="space-y-8">
            <div className="flex items-center gap-4 pb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25395c]/10 text-[#25395c]">
                <UserOutlined className="text-lg" />
              </div>
              <div>
                <div className="text-base font-semibold text-slate-800">{viewingStaff.name}</div>
                <div className="mt-0.5 text-sm text-slate-500">
                  {[viewingStaff.role, viewingStaff.department].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Personal details
              </Text>
              <Descriptions column={1} size="middle" bordered>
                <Descriptions.Item label="Employee ID">
                  {viewingStaff.employeeNumber || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={viewingStaff.status === 'active' ? 'green' : 'default'} className="rounded-full">
                    {viewingStaff.status === 'active' ? 'Active' : 'Inactive'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Phone">{viewingStaff.phone}</Descriptions.Item>
                <Descriptions.Item label="Email">{viewingStaff.email || '—'}</Descriptions.Item>
                <Descriptions.Item label="Date of Birth">
                  {viewingStaff.dateOfBirth
                    ? dayjs(viewingStaff.dateOfBirth).format('MMM D, YYYY')
                    : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Gender">
                  {viewingStaff.gender
                    ? viewingStaff.gender.charAt(0).toUpperCase() + viewingStaff.gender.slice(1)
                    : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Ghana Card">
                  {viewingStaff.ghanaCardId || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Address">
                  {[viewingStaff.address, viewingStaff.city].filter(Boolean).join(', ') || '—'}
                </Descriptions.Item>
              </Descriptions>
            </div>

            <div className="space-y-3">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Emergency contact
              </Text>
              <Descriptions column={1} size="middle" bordered>
                <Descriptions.Item label="Name">
                  {viewingStaff.emergencyContactName || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Relationship">
                  {viewingStaff.emergencyContactRelationship
                    ? labelizeMetaValue(viewingStaff.emergencyContactRelationship)
                    : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Phone">
                  {viewingStaff.emergencyContactPhone || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Alt. Phone">
                  {viewingStaff.emergencyContactAltPhone || '—'}
                </Descriptions.Item>
              </Descriptions>
            </div>

            <div className="space-y-3">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Employment
              </Text>
              <Descriptions column={1} size="middle" bordered>
                <Descriptions.Item label="Hire Date">
                  {dayjs(viewingStaff.hireDate).format('MMM D, YYYY')}
                </Descriptions.Item>
                <Descriptions.Item label="Type">
                  {EMPLOYMENT_TYPE_LABELS[viewingStaff.employmentType] ??
                    labelizeMetaValue(viewingStaff.employmentType)}
                </Descriptions.Item>
                <Descriptions.Item label="Department">
                  {viewingStaff.department
                    ? labelizeMetaValue(viewingStaff.department)
                    : '—'}
                </Descriptions.Item>
              </Descriptions>
            </div>

            <div className="space-y-3">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Salary
              </Text>
              <Descriptions column={1} size="middle" bordered>
                <Descriptions.Item label="Base Salary">
                  GHS {viewingStaff.baseSalary.toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="Transport">
                  GHS {viewingStaff.transportAllowance.toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="Other Allowances">
                  GHS {viewingStaff.otherAllowances.toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="SSNIT">
                  GHS {viewingStaff.ssnitDeduction.toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="PAYE">
                  GHS {viewingStaff.payeDeduction.toFixed(2)}
                </Descriptions.Item>
              </Descriptions>
            </div>

            <div className="space-y-3">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Bank details
              </Text>
              <Descriptions column={1} size="middle" bordered>
                <Descriptions.Item label="Bank">{viewingStaff.bankName || '—'}</Descriptions.Item>
                <Descriptions.Item label="Account">
                  {viewingStaff.bankAccountNumber || '—'}
                </Descriptions.Item>
              </Descriptions>
            </div>

            {viewingStaff.notes && (
              <div className="space-y-3">
                <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Notes
                </Text>
                <Text className="block text-sm leading-relaxed text-slate-600">
                  {viewingStaff.notes}
                </Text>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </DashboardLayout>
  );
}
