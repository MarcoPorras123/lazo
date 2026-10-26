import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lazo_mobile/core/money/money.dart';
import 'package:lazo_mobile/core/time/location_time.dart';
import 'package:lazo_mobile/features/diagnostics/domain/ping_response.dart';

Map<String, dynamic> fixture(String name) =>
    jsonDecode(
          File('../../packages/contracts/fixtures/$name').readAsStringSync(),
        )
        as Map<String, dynamic>;

void main() {
  setUpAll(LocationTime.initialize);

  group('shared money fixtures', () {
    final cases = fixture('money.json');
    for (final item in (cases['cases'] as List).cast<Map<String, dynamic>>()) {
      test(item['name'] as String, () {
        final json = item['money'] as Map<String, dynamic>;
        final money = Money.fromJson(json);
        expect(money.toJson(), json);
        expect(
          money.format(
            locale: money.currency == Currency.PEN ? 'es-PE' : 'es-ES',
          ),
          item['formatted'],
        );
      });
    }
    for (final item
        in (cases['percentages'] as List).cast<Map<String, dynamic>>()) {
      test('percentage ${item['amountMinor']} / ${item['basisPoints']}', () {
        final money = Money.fromJson({
          'amountMinor': item['amountMinor'],
          'currency': item['currency'],
        });
        expect(
          money
              .percentage(
                item['basisPoints'] as int,
                rounding: RoundingMode.halfUp,
              )
              .amountMinor,
          item['expectedMinor'],
        );
      });
    }
    for (final item
        in (fixture('invalid-money.json')['cases'] as List)
            .cast<Map<String, dynamic>>()) {
      test('reject ${item['name']}', () {
        expect(
          () => Money.fromJson(item['money'] as Map<String, dynamic>),
          throwsException,
        );
      });
    }
  });

  group('shared time fixtures', () {
    for (final item
        in (fixture('time.json')['cases'] as List)
            .cast<Map<String, dynamic>>()) {
      test(item['name'] as String, () {
        final instant = DateTime.parse(item['utc'] as String);
        final local = LocationTime().atLocation(
          instant,
          item['zone'] as String,
        );
        final expected = DateTime.parse('${item['local']}Z');
        expect(local.year, expected.year);
        expect(local.month, expected.month);
        expect(local.day, expected.day);
        expect(local.hour, expected.hour);
        expect(local.minute, expected.minute);
        expect(local.second, expected.second);
        expect(local.timeZoneOffset.inMinutes, item['offsetMinutes']);
        expect(local.toUtc(), instant);
      });
    }
  });

  test('shared ping response round trip', () {
    final json = fixture('ping-response.json');
    expect(PingResponse.fromJson(json).toJson(), json);
  });

  for (final item
      in (fixture('invalid-ping.json')['cases'] as List)
          .cast<Map<String, dynamic>>()) {
    test('shared ping rejects ${item['name']}', () {
      expect(
        () => PingResponse.fromJson(item['response'] as Map<String, dynamic>),
        throwsException,
      );
    });
  }

  test('ping rejects malformed identity and calendar timestamps', () {
    final json = fixture('ping-response.json');
    for (final invalid in [
      {...json, 'correlationId': 'not-a-uuid'},
      {...json, 'serverTime': '2026-02-30T12:34:56.000Z'},
      {...json, 'serverTime': '2026-10-25T12:34:56.000+01:00'},
      {...json, 'schemaVersion': 1.5},
      {...json, 'extra': true},
    ]) {
      expect(() => PingResponse.fromJson(invalid), throwsException);
    }
  });
}
