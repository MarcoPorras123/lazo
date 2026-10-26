import 'dart:async';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:uuid/uuid.dart';

import '../errors/app_failure.dart';

abstract interface class CallableTransport {
  Future<Map<String, dynamic>> call(
    String name,
    Map<String, dynamic> payload,
    Duration timeout,
  );
}

/// FlutterFire attaches the current Auth and App Check tokens itself.
final class FirebaseCallableTransport implements CallableTransport {
  FirebaseCallableTransport(this.functions);
  final FirebaseFunctions functions;

  @override
  Future<Map<String, dynamic>> call(
    String name,
    Map<String, dynamic> payload,
    Duration timeout,
  ) async {
    final result = await functions
        .httpsCallable(name, options: HttpsCallableOptions(timeout: timeout))
        .call<Map<String, dynamic>>(payload);
    return result.data;
  }
}

typedef RetryDelay = Future<void> Function(Duration duration);

final class CallableClient {
  CallableClient(
    this.transport, {
    this.timeout = const Duration(seconds: 10),
    this.maxAttempts = 3,
    String Function()? newKey,
    RetryDelay? delay,
  }) : _newKey = newKey ?? const Uuid().v4,
       _delay = delay ?? Future<void>.delayed {
    if (maxAttempts < 1 || maxAttempts > 5) {
      throw ArgumentError('Invalid retry count');
    }
  }

  final CallableTransport transport;
  final Duration timeout;
  final int maxAttempts;
  final String Function() _newKey;
  final RetryDelay _delay;

  /// Callers retain [idempotencyKey] for retries initiated after this Future ends.
  /// New user intent must receive a new key; network retries reuse this payload.
  Future<Map<String, dynamic>> invoke(
    String name,
    Map<String, dynamic> body, {
    String? idempotencyKey,
  }) async {
    final key = idempotencyKey ?? _newKey();
    final payload = Map<String, dynamic>.unmodifiable({
      ...body,
      'schemaVersion': 1,
      'idempotencyKey': key,
    });
    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await transport.call(name, payload, timeout).timeout(timeout);
      } catch (error) {
        final failure = _translate(error);
        if (!failure.retryable || attempt + 1 == maxAttempts) throw failure;
        await _delay(Duration(milliseconds: 200 * (1 << attempt)));
      }
    }
    throw const AppFailure(FailureCode.unknown);
  }

  AppFailure _translate(Object error) {
    if (error is AppFailure) return error;
    if (error is TimeoutException) return const AppFailure(FailureCode.timeout);
    if (error is FirebaseFunctionsException) {
      final details = error.details;
      final serverCode = details is Map && details['code'] is String
          ? details['code'] as String
          : error.code;
      final correlation = details is Map && details['correlationId'] is String
          ? details['correlationId'] as String
          : null;
      return AppFailure.fromServer(serverCode, correlationId: correlation);
    }
    return const AppFailure(FailureCode.unknown);
  }
}
