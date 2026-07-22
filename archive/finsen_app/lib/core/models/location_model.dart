class LocationModel {
  final String id;
  final String name;
  final String code;
  final String? address;
  final int activeUsers;
  final bool isActive;
  final DateTime? createdAt;

  const LocationModel({
    required this.id,
    required this.name,
    required this.code,
    this.address,
    this.activeUsers = 0,
    this.isActive = true,
    this.createdAt,
  });

  factory LocationModel.fromJson(Map<String, dynamic> json) {
    return LocationModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
      address: json['address']?.toString(),
      activeUsers: json['active_users'] as int? ?? json['activeUsers'] as int? ?? 0,
      isActive: json['is_active'] as bool? ?? json['isActive'] as bool? ?? true,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'code': code,
        'address': address,
        'active_users': activeUsers,
        'is_active': isActive,
        'created_at': createdAt?.toIso8601String(),
      };

  LocationModel copyWith({
    String? id,
    String? name,
    String? code,
    String? address,
    int? activeUsers,
    bool? isActive,
    DateTime? createdAt,
  }) =>
      LocationModel(
        id: id ?? this.id,
        name: name ?? this.name,
        code: code ?? this.code,
        address: address ?? this.address,
        activeUsers: activeUsers ?? this.activeUsers,
        isActive: isActive ?? this.isActive,
        createdAt: createdAt ?? this.createdAt,
      );

  @override
  String toString() => 'LocationModel(id: $id, name: $name, code: $code)';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LocationModel && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}
