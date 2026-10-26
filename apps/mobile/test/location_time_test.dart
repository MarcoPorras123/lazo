import 'package:flutter_test/flutter_test.dart';
import 'package:lazo_mobile/core/time/location_time.dart';

void main() {
  setUpAll(LocationTime.initialize);

  test('Lima wall time converts without the device timezone', () {
    expect(
      LocationTime().toUtc(
        const LocalDateTime(2026, 3, 29, 1, 30),
        'America/Lima',
      ),
      DateTime.parse('2026-03-29T06:30:00Z'),
    );
  });

  test('Madrid spring gap is rejected', () {
    expect(
      () => LocationTime().toUtc(
        const LocalDateTime(2026, 3, 29, 2, 30),
        'Europe/Madrid',
      ),
      throwsFormatException,
    );
  });

  test('Madrid autumn overlap requires an explicit choice', () {
    const wall = LocalDateTime(2026, 10, 25, 2, 30);
    final time = LocationTime();
    expect(() => time.toUtc(wall, 'Europe/Madrid'), throwsFormatException);
    expect(
      time.toUtc(wall, 'Europe/Madrid', ambiguity: AmbiguousTimePolicy.earlier),
      DateTime.parse('2026-10-25T00:30:00Z'),
    );
    expect(
      time.toUtc(wall, 'Europe/Madrid', ambiguity: AmbiguousTimePolicy.later),
      DateTime.parse('2026-10-25T01:30:00Z'),
    );
  });

  test('business day and clock are location-bound', () {
    final clock = FixedClock(DateTime.parse('2026-10-25T02:00:00Z'));
    final time = LocationTime(clock: clock);
    expect(time.businessDate(clock.nowUtc(), 'America/Lima'), '2026-10-24');
    expect(time.businessDate(clock.nowUtc(), 'Europe/Madrid'), '2026-10-25');
    expect(time.nowAt('America/Lima').hour, 21);
  });

  test('invalid calendar dates do not normalize silently', () {
    expect(
      () => LocationTime().toUtc(
        const LocalDateTime(2026, 2, 30),
        'America/Lima',
      ),
      throwsFormatException,
    );
  });

  test('non-UTC instants and invalid zones fail closed', () {
    expect(
      () => LocationTime().atLocation(DateTime(2026), 'America/Lima'),
      throwsArgumentError,
    );
    expect(
      () => LocationTime().atLocation(DateTime.utc(2026), 'Madrid'),
      throwsException,
    );
  });
}
