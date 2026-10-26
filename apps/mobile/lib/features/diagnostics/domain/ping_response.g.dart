// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ping_response.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PingResponse _$PingResponseFromJson(Map<String, dynamic> json) =>
    $checkedCreate('PingResponse', json, ($checkedConvert) {
      $checkKeys(
        json,
        allowedKeys: const [
          'schemaVersion',
          'environment',
          'version',
          'serverTime',
          'correlationId',
        ],
      );
      final val = PingResponse(
        schemaVersion: $checkedConvert(
          'schemaVersion',
          (v) => PingResponse._version(v),
        ),
        environment: $checkedConvert(
          'environment',
          (v) => $enumDecode(_$AppEnvironmentEnumMap, v),
        ),
        version: $checkedConvert('version', (v) => v as String),
        serverTime: $checkedConvert(
          'serverTime',
          (v) => PingResponse._utc(v as String),
        ),
        correlationId: $checkedConvert('correlationId', (v) => v as String),
      );
      return val;
    });

Map<String, dynamic> _$PingResponseToJson(PingResponse instance) =>
    <String, dynamic>{
      'schemaVersion': instance.schemaVersion,
      'environment': _$AppEnvironmentEnumMap[instance.environment]!,
      'version': instance.version,
      'serverTime': PingResponse._utcJson(instance.serverTime),
      'correlationId': instance.correlationId,
    };

const _$AppEnvironmentEnumMap = {
  AppEnvironment.dev: 'dev',
  AppEnvironment.staging: 'staging',
  AppEnvironment.prod: 'prod',
};
