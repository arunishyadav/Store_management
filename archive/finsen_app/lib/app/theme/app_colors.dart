import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Primary palette
  static const Color primary = Color(0xFF1A237E);
  static const Color primaryLight = Color(0xFF534BAE);
  static const Color primaryDark = Color(0xFF000051);
  static const Color secondary = Color(0xFF00BCD4);
  static const Color secondaryLight = Color(0xFF62EFFF);
  static const Color secondaryDark = Color(0xFF008BA3);
  static const Color accent = Color(0xFF00E5FF);

  // Gradient colors
  static const Color gradientStart = Color(0xFF1A237E);
  static const Color gradientMid = Color(0xFF283593);
  static const Color gradientEnd = Color(0xFF00BCD4);

  // Status colors
  static const Color success = Color(0xFF43A047);
  static const Color successLight = Color(0xFFE8F5E9);
  static const Color warning = Color(0xFFFFB300);
  static const Color warningLight = Color(0xFFFFF8E1);
  static const Color danger = Color(0xFFE53935);
  static const Color dangerLight = Color(0xFFFFEBEE);
  static const Color info = Color(0xFF1E88E5);
  static const Color infoLight = Color(0xFFE3F2FD);

  // Stock status colors
  static const Color stockGood = Color(0xFF43A047);
  static const Color stockLow = Color(0xFFFFB300);
  static const Color stockOut = Color(0xFFE53935);
  static const Color stockGoodBg = Color(0xFFE8F5E9);
  static const Color stockLowBg = Color(0xFFFFF8E1);
  static const Color stockOutBg = Color(0xFFFFEBEE);

  // Light theme surface colors
  static const Color surfaceLight = Color(0xFFF5F7FA);
  static const Color cardLight = Color(0xFFFFFFFF);
  static const Color dividerLight = Color(0xFFE0E0E0);
  static const Color textPrimaryLight = Color(0xFF1A1A2E);
  static const Color textSecondaryLight = Color(0xFF6B7280);
  static const Color borderLight = Color(0xFFE5E7EB);

  // Dark theme surface colors
  static const Color surfaceDark = Color(0xFF0F0F1A);
  static const Color cardDark = Color(0xFF1A1A2E);
  static const Color dividerDark = Color(0xFF2D2D44);
  static const Color textPrimaryDark = Color(0xFFF1F5F9);
  static const Color textSecondaryDark = Color(0xFF94A3B8);
  static const Color borderDark = Color(0xFF374151);

  // Role colors
  static const Color roleSuperAdmin = Color(0xFF7C3AED);
  static const Color roleSuperAdminBg = Color(0xFFF5F3FF);
  static const Color roleSiteManager = Color(0xFF1E88E5);
  static const Color roleSiteManagerBg = Color(0xFFE3F2FD);
  static const Color roleViewer = Color(0xFF6B7280);
  static const Color roleViewerBg = Color(0xFFF3F4F6);

  // Chart colors
  static const List<Color> chartColors = [
    Color(0xFF1A237E),
    Color(0xFF00BCD4),
    Color(0xFF43A047),
    Color(0xFFFFB300),
    Color(0xFFE53935),
    Color(0xFF7C3AED),
    Color(0xFFFF6D00),
    Color(0xFF00897B),
  ];

  // Gradient presets
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [gradientStart, gradientEnd],
  );

  static const LinearGradient headerGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF1A237E), Color(0xFF283593), Color(0xFF0097A7)],
  );

  static const LinearGradient successGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF388E3C), Color(0xFF43A047)],
  );

  static const LinearGradient warningGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFF57F17), Color(0xFFFFB300)],
  );

  static const LinearGradient dangerGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFC62828), Color(0xFFE53935)],
  );
}
