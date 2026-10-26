import 'package:json_annotation/json_annotation.dart';

import '../../../app/environment.dart';

part 'ping_response.g.dart';

@JsonSerializable()
final class PingResponse {
  PingResponse({
    required this.schemaVersion,
    required this.environment,
    required this.version,
    required this.serverTime,
    required this.correlationId,
  }) {
    if (schemaVersion != 1 ||
        version.isEmpty ||
        version.length > 64 ||
        !_uuid.hasMatch(correlationId) ||
        !serverTime.isUtc) {
      throw const FormatException('Unsupported ping contract');
    }
  }

  @JsonKey(fromJson: _version)
  final int schemaVersion;
  final AppEnvironment environment;
  final String version;
  @JsonKey(fromJson: _utc, toJson: _utcJson)
  final DateTime serverTime;
  final String correlationId;

  static final _uuid = RegExp(
    r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$',
  );

  static int _version(Object? value) {
    if (value is! int) {
      throw const FormatException('schemaVersion must be an integer');
    }
    return value;
  }

  static DateTime _utc(String value) {
    if (!RegExp(
      r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$',
    ).hasMatch(value)) {
      throw const FormatException('Canonical UTC ISO timestamp required');
    }
    final parsed = DateTime.parse(value);
    if (parsed.toIso8601String() != value) {
      throw const FormatException('Invalid UTC calendar date');
    }
    return parsed;
  }

  static String _utcJson(DateTime value) => value.toUtc().toIso8601String();

  factory PingResponse.fromJson(Map<String, dynamic> json) =>
      _$PingResponseFromJson(json);
  Map<String, dynamic> toJson() => _$PingResponseToJson(this);
}
