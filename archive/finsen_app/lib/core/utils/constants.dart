class AppConstants {
  AppConstants._();

  // App info
  static const String appName = 'Finsen Store';
  static const String companyName = 'Finsen Riter Limited';
  static const String companyTagline = 'Store Management System';
  static const String appVersion = '1.0.0';

  // API
  static const String baseUrl = 'https://api.finsenriter.com/api/v1';
  static const String wsUrl = 'wss://api.finsenriter.com/ws';
  static const int connectTimeout = 30000;
  static const int receiveTimeout = 30000;
  static const int sendTimeout = 30000;

  // Storage keys
  static const String tokenKey = 'auth_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userKey = 'current_user';
  static const String selectedLocationKey = 'selected_location';
  static const String themeKey = 'app_theme';

  // Hive boxes
  static const String materialsBox = 'materials_box';
  static const String inwardBox = 'inward_box';
  static const String issuesBox = 'issues_box';
  static const String transferBox = 'transfer_box';
  static const String settingsBox = 'settings_box';
  static const String cacheBox = 'cache_box';

  // Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;

  // Stock thresholds
  static const double lowStockThreshold = 20.0; // percentage
  static const double outOfStockThreshold = 0.0;

  // Roles
  static const String roleSuperAdmin = 'super_admin';
  static const String roleSiteManager = 'site_manager';
  static const String roleViewer = 'viewer';

  // Units
  static const List<String> units = [
    'Bundle',
    'Bag',
    'Nos',
    'Kg',
    'Meter',
    'Ton',
    'Liter',
    'Box',
    'Roll',
    'Sheet',
    'Pair',
    'Set',
  ];

  // Categories
  static const List<String> materialCategories = [
    'Electrical',
    'Plumbing',
    'Civil',
    'Mechanical',
    'Safety',
    'Tools',
    'Hardware',
    'Paints & Chemicals',
    'Timber',
    'Steel',
    'Cement & Aggregates',
    'Others',
  ];

  // Date formats
  static const String dateFormat = 'dd MMM yyyy';
  static const String dateTimeFormat = 'dd MMM yyyy, hh:mm a';
  static const String timeFormat = 'hh:mm a';
  static const String apiDateFormat = 'yyyy-MM-dd';
  static const String apiDateTimeFormat = "yyyy-MM-dd'T'HH:mm:ss'Z'";

  // Animation durations
  static const Duration animFast = Duration(milliseconds: 200);
  static const Duration animNormal = Duration(milliseconds: 350);
  static const Duration animSlow = Duration(milliseconds: 600);

  // WebSocket
  static const Duration wsReconnectDelay = Duration(seconds: 3);
  static const int wsMaxRetries = 5;
}
