import 'package:hive/hive.dart';
import '../../core/utils/constants.dart';

part 'user_model.g.dart';

@HiveType(typeId: 0)
class UserModel {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String userId;

  @HiveField(2)
  final String name;

  @HiveField(3)
  final String role;

  @HiveField(4)
  final String? locationId;

  @HiveField(5)
  final String? locationName;

  @HiveField(6)
  final bool isActive;

  @HiveField(7)
  String? token;

  @HiveField(8)
  String? refreshToken;

  @HiveField(9)
  final DateTime? createdAt;

  UserModel({
    required this.id,
    required this.userId,
    required this.name,
    required this.role,
    this.locationId,
    this.locationName,
    required this.isActive,
    this.token,
    this.refreshToken,
    this.createdAt,
  });

  bool get isSuperAdmin => role == AppConstants.roleSuperAdmin;
  bool get isSiteManager => role == AppConstants.roleSiteManager;
  bool get isViewer => role == AppConstants.roleViewer;

  String get roleDisplay {
    switch (role) {
      case AppConstants.roleSuperAdmin:
        return 'Super Admin';
      case AppConstants.roleSiteManager:
        return 'Site Manager';
      case AppConstants.roleViewer:
        return 'Viewer';
      default:
        return role;
    }
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? json['userId']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      role: json['role']?.toString() ?? AppConstants.roleViewer,
      locationId: json['location_id']?.toString() ?? json['locationId']?.toString(),
      locationName: json['location_name']?.toString() ?? json['locationName']?.toString(),
      isActive: json['is_active'] as bool? ?? json['isActive'] as bool? ?? true,
      token: json['token']?.toString(),
      refreshToken: json['refresh_token']?.toString() ?? json['refreshToken']?.toString(),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'name': name,
      'role': role,
      'location_id': locationId,
      'location_name': locationName,
      'is_active': isActive,
      'created_at': createdAt?.toIso8601String(),
    };
  }

  UserModel copyWith({
    String? id,
    String? userId,
    String? name,
    String? role,
    String? locationId,
    String? locationName,
    bool? isActive,
    String? token,
    String? refreshToken,
    DateTime? createdAt,
  }) {
    return UserModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      name: name ?? this.name,
      role: role ?? this.role,
      locationId: locationId ?? this.locationId,
      locationName: locationName ?? this.locationName,
      isActive: isActive ?? this.isActive,
      token: token ?? this.token,
      refreshToken: refreshToken ?? this.refreshToken,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  String toString() =>
      'UserModel(id: $id, userId: $userId, name: $name, role: $role)';
}
