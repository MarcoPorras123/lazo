import 'package:flutter_test/flutter_test.dart';
import 'package:lazo_mobile/core/errors/app_failure.dart';
import 'package:lazo_mobile/core/networking/callable_client.dart';

final class FakeTransport implements CallableTransport {
  FakeTransport(this.handler);
  final Future<Map<String, dynamic>> Function(int attempt) handler;
  final payloads = <Map<String, dynamic>>[];

  @override
  Future<Map<String, dynamic>> call(
    String name,
    Map<String, dynamic> payload,
    Duration timeout,
  ) {
    payloads.add(payload);
    return handler(payloads.length);
  }
}

void main() {
  test('automatic retries reuse the exact request and key', () async {
    final transport = FakeTransport((attempt) async {
      if (attempt < 3) throw const AppFailure(FailureCode.unavailable);
      return {'ok': true};
    });
    var keysCreated = 0;
    final client = CallableClient(
      transport,
      newKey: () {
        keysCreated++;
        return 'same-intent';
      },
      delay: (_) async {},
    );
    expect(await client.invoke('example', {'value': 1}), {'ok': true});
    expect(keysCreated, 1);
    expect(transport.payloads.length, 3);
    expect(
      transport.payloads.every((p) => p['idempotencyKey'] == 'same-intent'),
      isTrue,
    );
    expect(
      transport.payloads.every((p) => identical(p, transport.payloads.first)),
      isTrue,
    );
  });

  test('user retry can retain the original key after timeout', () async {
    final transport = FakeTransport((_) async => {'ok': true});
    final client = CallableClient(transport);
    await client.invoke('example', const {}, idempotencyKey: 'retained-key');
    await client.invoke('example', const {}, idempotencyKey: 'retained-key');
    expect(
      transport.payloads.map((p) => p['idempotencyKey']),
      everyElement('retained-key'),
    );
  });

  test('permissions are not retried and details stay typed', () async {
    final transport = FakeTransport(
      (_) async => throw const AppFailure(
        FailureCode.permissionDenied,
        correlationId: 'reference',
      ),
    );
    final client = CallableClient(transport, delay: (_) async {});
    await expectLater(
      client.invoke('example', const {}),
      throwsA(
        isA<AppFailure>()
            .having((e) => e.code, 'code', FailureCode.permissionDenied)
            .having((e) => e.correlationId, 'correlation', 'reference'),
      ),
    );
    expect(transport.payloads.length, 1);
  });

  test('retry count is bounded', () async {
    final transport = FakeTransport(
      (_) async => throw const AppFailure(FailureCode.unavailable),
    );
    final client = CallableClient(transport, delay: (_) async {});
    await expectLater(
      client.invoke('example', const {}),
      throwsA(isA<AppFailure>()),
    );
    expect(transport.payloads.length, 3);
  });
}
