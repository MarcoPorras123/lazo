import 'package:flutter_test/flutter_test.dart';
import 'package:lazo_mobile/core/errors/app_failure.dart';

void main() {
  test('server errors become useful user-facing messages', () {
    final failure = AppFailure.fromServer(
      'IDEMPOTENCY_CONFLICT',
      correlationId: 'reference',
    );
    expect(failure.code, FailureCode.idempotencyConflict);
    expect(failure.userMessage, contains('Revisa su estado'));
    expect(failure.correlationId, 'reference');
  });

  test('domain codes use the same meanings as the server', () {
    expect(
      AppFailure.fromServer('FORBIDDEN').code,
      FailureCode.permissionDenied,
    );
    expect(
      AppFailure.fromServer('BAD_REQUEST').code,
      FailureCode.invalidArgument,
    );
    expect(
      AppFailure.fromServer('MONEY_CURRENCY_MISMATCH').code,
      FailureCode.currencyMismatch,
    );
    expect(
      AppFailure.fromServer('TIME_AMBIGUOUS').code,
      FailureCode.ambiguousTime,
    );
    expect(
      AppFailure.fromServer('TIME_NONEXISTENT').code,
      FailureCode.nonexistentTime,
    );
  });
}
