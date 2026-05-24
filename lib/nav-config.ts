export interface NavItem {
  label: string
  href: string
  iconName: string
  section: string
  badge?: number
}

export const NAV_CONFIG: Record<string, NavItem[]> = {
  ADMIN: [
    { label: 'Dashboard', href: '/admin', iconName: 'LayoutDashboard', section: 'Main' },
    { label: 'Analytics & Reports', href: '/admin/analytics', iconName: 'BarChart2', section: 'Main' },
    { label: 'All Reports', href: '/admin/reports', iconName: 'FileText', section: 'Management' },
    { label: 'Team Members', href: '/admin/members', iconName: 'Users', section: 'Management' },
    { label: 'Service Teams', href: '/admin/teams', iconName: 'Users', section: 'Management' },
    { label: 'User Management', href: '/admin/users', iconName: 'UserCog', section: 'Management' },
    { label: 'Settings & SMTP', href: '/admin/settings', iconName: 'Settings', section: 'System' },
    { label: 'Backup & Restore', href: '/admin/backup', iconName: 'HardDrive', section: 'System' },
  ],
  PASTOR: [
    { label: 'Dashboard', href: '/head', iconName: 'LayoutDashboard', section: 'Main' },
    { label: 'Analytics', href: '/head/analytics', iconName: 'BarChart2', section: 'Main' },
    { label: 'All Reports', href: '/head/reports', iconName: 'FileText', section: 'Reports' },
    { label: 'Service Teams', href: '/head/teams', iconName: 'Users', section: 'Teams' },
  ],
  HEAD_OF_SUPERVISOR: [
    { label: 'Dashboard', href: '/head', iconName: 'LayoutDashboard', section: 'Main' },
    { label: 'Analytics', href: '/head/analytics', iconName: 'BarChart2', section: 'Main' },
    { label: 'All Reports', href: '/head/reports', iconName: 'FileText', section: 'Reports' },
    { label: 'Service Teams', href: '/head/teams', iconName: 'Users', section: 'Teams' },
  ],
  SUPERVISOR_PASTOR: [
    { label: 'Dashboard', href: '/pastor', iconName: 'LayoutDashboard', section: 'Main' },
    { label: 'Analytics', href: '/pastor/analytics', iconName: 'BarChart2', section: 'Main' },
    { label: 'Team Reports', href: '/pastor/reports', iconName: 'FileText', section: 'Reports' },
    { label: 'My Service Teams', href: '/pastor/teams', iconName: 'Users', section: 'Teams' },
  ],
  HOD: [
    { label: 'Dashboard', href: '/hod', iconName: 'LayoutDashboard', section: 'Main' },
    { label: 'Analytics', href: '/hod/analytics', iconName: 'BarChart2', section: 'Main' },
    { label: 'Submit Report', href: '/hod/report', iconName: 'FilePlus', section: 'My Department' },
    { label: 'My Team Members', href: '/hod/members', iconName: 'Users', section: 'My Department' },
    { label: 'My Reports History', href: '/hod/reports', iconName: 'History', section: 'My Department' },
  ],
}
