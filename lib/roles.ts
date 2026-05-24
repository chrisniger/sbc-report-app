export const ROLES = {
  ADMIN: 'ADMIN',
  PASTOR: 'PASTOR',
  HEAD_OF_SUPERVISOR: 'HEAD_OF_SUPERVISOR',
  SUPERVISOR_PASTOR: 'SUPERVISOR_PASTOR',
  HOD: 'HOD',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

// Routes accessible by each role (role → path prefixes it can access)
export const ROLE_ROUTES: Record<Role, string[]> = {
  ADMIN: ['/admin', '/dashboard', '/reports', '/teams', '/members', '/settings'],
  PASTOR: ['/head', '/dashboard', '/reports', '/reviews/head', '/teams', '/members'],
  HEAD_OF_SUPERVISOR: ['/head', '/dashboard', '/reports', '/reviews/head', '/teams', '/members'],
  SUPERVISOR_PASTOR: ['/pastor', '/dashboard', '/reports', '/reviews/pastor', '/teams', '/members'],
  HOD: ['/hod', '/dashboard', '/reports/my', '/teams/my', '/members'],
}

// Permission flags per role
export const PERMISSIONS: Record<Role, Record<string, boolean>> = {
  ADMIN: {
    manageUsers: true,
    viewAllReports: true,
    viewAllReviews: true,
    submitReport: false,
    submitPastorReview: false,
    submitHeadReview: false,
    manageSettings: true,
    lockReportPeriods: true,
    viewActivityLogs: true,
    manageTeams: true,
    manageMembers: true,
  },
  PASTOR: {
    manageUsers: false,
    viewAllReports: true,
    viewAllReviews: true,
    submitReport: false,
    submitPastorReview: false,
    submitHeadReview: false,
    manageSettings: false,
    lockReportPeriods: false,
    viewActivityLogs: false,
    manageTeams: false,
    manageMembers: false,
  },
  HEAD_OF_SUPERVISOR: {
    manageUsers: false,
    viewAllReports: true,
    viewAllReviews: true,
    submitReport: false,
    submitPastorReview: false,
    submitHeadReview: false,
    manageSettings: false,
    lockReportPeriods: false,
    viewActivityLogs: false,
    manageTeams: false,
    manageMembers: false,
  },
  SUPERVISOR_PASTOR: {
    manageUsers: false,
    viewAllReports: false,
    viewAllReviews: false,
    submitReport: false,
    submitPastorReview: true,
    submitHeadReview: false,
    manageSettings: false,
    lockReportPeriods: false,
    viewActivityLogs: false,
    manageTeams: false,
    manageMembers: false,
  },
  HOD: {
    manageUsers: false,
    viewAllReports: false,
    viewAllReviews: false,
    submitReport: true,
    submitPastorReview: false,
    submitHeadReview: false,
    manageSettings: false,
    lockReportPeriods: false,
    viewActivityLogs: false,
    manageTeams: false,
    manageMembers: true,
  },
}

export function hasRole(userRoles: string[], role: Role): boolean {
  return userRoles.includes(role)
}

export function hasAnyRole(userRoles: string[], roles: Role[]): boolean {
  return roles.some((r) => userRoles.includes(r))
}

export function can(userRoles: string[], permission: string): boolean {
  return userRoles.some((role) => PERMISSIONS[role as Role]?.[permission] === true)
}

// Ordered from most to least privileged — used for display/fallback logic
export const ROLE_HIERARCHY: Role[] = [
  ROLES.ADMIN,
  ROLES.PASTOR,
  ROLES.HEAD_OF_SUPERVISOR,
  ROLES.SUPERVISOR_PASTOR,
  ROLES.HOD,
]

export function primaryRole(userRoles: string[]): Role | null {
  return ROLE_HIERARCHY.find((r) => userRoles.includes(r)) ?? null
}
