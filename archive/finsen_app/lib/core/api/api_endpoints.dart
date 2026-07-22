class ApiEndpoints {
  ApiEndpoints._();

  // Auth
  static const String login = '/auth/login';
  static const String logout = '/auth/logout';
  static const String refreshToken = '/auth/refresh';
  static const String changePassword = '/auth/change-password';
  static const String me = '/auth/me';

  // Locations
  static const String locations = '/locations';
  static String locationById(String id) => '/locations/$id';
  static const String activeLocations = '/locations/active';

  // Materials
  static const String materials = '/materials';
  static String materialById(String id) => '/materials/$id';
  static String materialStock(String id) => '/materials/$id/stock';
  static const String materialSearch = '/materials/search';
  static const String globalMaterialSearch = '/materials/global-search';
  static const String generateMaterialCode = '/materials/generate-code';

  // Inward
  static const String inward = '/inward';
  static String inwardById(String id) => '/inward/$id';
  static const String inwardByLocation = '/inward/by-location';

  // Issues
  static const String issues = '/issues';
  static String issueById(String id) => '/issues/$id';
  static const String issuesByLocation = '/issues/by-location';

  // Transfers
  static const String transfers = '/transfers';
  static String transferById(String id) => '/transfers/$id';

  // Reports
  static const String reports = '/reports';
  static const String reportInward = '/reports/inward';
  static const String reportIssues = '/reports/issues';
  static const String reportTransfers = '/reports/transfers';
  static const String reportStockSummary = '/reports/stock-summary';
  static const String reportExportPdf = '/reports/export/pdf';
  static const String reportExportExcel = '/reports/export/excel';

  // Analytics
  static const String analytics = '/analytics';
  static const String analyticsStockOverview = '/analytics/stock-overview';
  static const String analyticsDailyTrends = '/analytics/daily-trends';
  static const String analyticsMonthly = '/analytics/monthly';
  static const String analyticsSiteComparison = '/analytics/site-comparison';
  static const String analyticsTopConsumed = '/analytics/top-consumed';

  // Users
  static const String users = '/users';
  static String userById(String id) => '/users/$id';
  static String resetUserPassword(String id) => '/users/$id/reset-password';
  static const String userRoles = '/users/roles';

  // Activity
  static const String activity = '/activity';
  static const String activityByLocation = '/activity/by-location';

  // Notifications
  static const String notifications = '/notifications';
  static String markNotificationRead(String id) =>
      '/notifications/$id/read';
  static const String markAllRead = '/notifications/mark-all-read';

  // Dashboard
  static const String dashboardSuperAdmin = '/dashboard/super-admin';
  static const String dashboardSite = '/dashboard/site';
  static const String lowStockAlerts = '/dashboard/low-stock-alerts';

  // Settings
  static const String settings = '/settings';
  static const String fcmToken = '/settings/fcm-token';
}
