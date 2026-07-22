class AppValidators {
  AppValidators._();

  static String? required(String? value, [String fieldName = 'This field']) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName is required';
    }
    return null;
  }

  static String? userId(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'User ID is required';
    }
    if (value.trim().length < 3) {
      return 'User ID must be at least 3 characters';
    }
    return null;
  }

  static String? password(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password is required';
    }
    if (value.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  }

  static String? materialName(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Material name is required';
    }
    if (value.trim().length < 2) {
      return 'Name must be at least 2 characters';
    }
    if (value.trim().length > 100) {
      return 'Name must be less than 100 characters';
    }
    return null;
  }

  static String? quantity(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Quantity is required';
    }
    final qty = double.tryParse(value.trim());
    if (qty == null) {
      return 'Enter a valid number';
    }
    if (qty <= 0) {
      return 'Quantity must be greater than 0';
    }
    return null;
  }

  static String? quantityAvailable(String? value, double available) {
    final baseError = quantity(value);
    if (baseError != null) return baseError;
    final qty = double.parse(value!.trim());
    if (qty > available) {
      return 'Exceeds available stock ($available)';
    }
    return null;
  }

  static String? minQuantity(String? value) {
    if (value == null || value.trim().isEmpty) return null;
    final qty = double.tryParse(value.trim());
    if (qty == null) {
      return 'Enter a valid number';
    }
    if (qty < 0) {
      return 'Cannot be negative';
    }
    return null;
  }

  static String? phone(String? value) {
    if (value == null || value.trim().isEmpty) return null;
    final phoneRegex = RegExp(r'^\+?[0-9]{10,15}$');
    if (!phoneRegex.hasMatch(value.trim())) {
      return 'Enter a valid phone number';
    }
    return null;
  }

  static String? email(String? value) {
    if (value == null || value.trim().isEmpty) return null;
    final emailRegex = RegExp(r'^[^@]+@[^@]+\.[^@]+$');
    if (!emailRegex.hasMatch(value.trim())) {
      return 'Enter a valid email address';
    }
    return null;
  }

  static String? materialCode(String? value) {
    if (value == null || value.trim().isEmpty) return null;
    final codeRegex = RegExp(r'^[A-Z0-9\-_]{3,20}$');
    if (!codeRegex.hasMatch(value.trim().toUpperCase())) {
      return 'Code must be 3-20 alphanumeric chars (A-Z, 0-9, -, _)';
    }
    return null;
  }

  static String? vehicleNumber(String? value) {
    if (value == null || value.trim().isEmpty) return null;
    if (value.trim().length < 4) {
      return 'Enter a valid vehicle number';
    }
    return null;
  }
}
