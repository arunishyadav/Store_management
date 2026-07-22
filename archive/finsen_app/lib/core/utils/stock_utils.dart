import 'package:flutter/material.dart';
import '../../../app/theme/app_colors.dart';
import 'constants.dart';

enum StockStatus { inStock, lowStock, outOfStock }

class StockUtils {
  StockUtils._();

  static StockStatus getStatus({
    required double currentStock,
    required double minQuantity,
  }) {
    if (currentStock <= AppConstants.outOfStockThreshold) {
      return StockStatus.outOfStock;
    }
    if (minQuantity > 0) {
      final percentage = (currentStock / minQuantity) * 100;
      if (percentage <= AppConstants.lowStockThreshold) {
        return StockStatus.lowStock;
      }
    }
    return StockStatus.inStock;
  }

  static String getStatusLabel(StockStatus status) {
    switch (status) {
      case StockStatus.inStock:
        return 'In Stock';
      case StockStatus.lowStock:
        return 'Low Stock';
      case StockStatus.outOfStock:
        return 'Out of Stock';
    }
  }

  static String getStatusEmoji(StockStatus status) {
    switch (status) {
      case StockStatus.inStock:
        return '🟢';
      case StockStatus.lowStock:
        return '🟡';
      case StockStatus.outOfStock:
        return '🔴';
    }
  }

  static Color getStatusColor(StockStatus status) {
    switch (status) {
      case StockStatus.inStock:
        return AppColors.stockGood;
      case StockStatus.lowStock:
        return AppColors.stockLow;
      case StockStatus.outOfStock:
        return AppColors.stockOut;
    }
  }

  static Color getStatusBgColor(StockStatus status) {
    switch (status) {
      case StockStatus.inStock:
        return AppColors.stockGoodBg;
      case StockStatus.lowStock:
        return AppColors.stockLowBg;
      case StockStatus.outOfStock:
        return AppColors.stockOutBg;
    }
  }

  static String formatQuantity(double qty, String unit) {
    if (qty == qty.roundToDouble()) {
      return '${qty.toInt()} $unit';
    }
    return '${qty.toStringAsFixed(2)} $unit';
  }

  static double parseQuantity(String value) {
    return double.tryParse(value.trim()) ?? 0.0;
  }
}
