import 'package:intl/intl.dart';
import 'package:timezone/data/latest.dart' as database;
import 'package:timezone/timezone.dart' as tz;

abstract interface class Clock {
  DateTime nowUtc();
}

final class SystemClock implements Clock {
  const SystemClock();
  @override
  DateTime nowUtc() => DateTime.now().toUtc();
}

final class FixedClock implements Clock {
  FixedClock(DateTime instant) : _instant = instant.toUtc();
  final DateTime _instant;
  @override
  DateTime nowUtc() => _instant;
}

enum AmbiguousTimePolicy { reject, earlier, later }

/// A wall-clock value is not a phone-local DateTime and is never an instant.
final class LocalDateTime {
  const LocalDateTime(
    this.year,
    this.month,
    this.day, [
    this.hour = 0,
    this.minute = 0,
    this.second = 0,
  ]);
  final int year;
  final int month;
  final int day;
  final int hour;
  final int minute;
  final int second;

  bool matches(DateTime value) =>
      year == value.year &&
      month == value.month &&
      day == value.day &&
      hour == value.hour &&
      minute == value.minute &&
      second == value.second;
}

final class LocationTime {
  LocationTime({this.clock = const SystemClock()});
  final Clock clock;

  static void initialize() => database.initializeTimeZones();

  tz.TZDateTime atLocation(DateTime instant, String zone) {
    if (!instant.isUtc) throw ArgumentError('Business instants must be UTC');
    return tz.TZDateTime.from(instant, tz.getLocation(zone));
  }

  tz.TZDateTime nowAt(String zone) => atLocation(clock.nowUtc(), zone);

  /// Rejects nonexistent times and requires an explicit overlap choice.
  /// Candidate offsets are sampled around the requested day, independently
  /// from the phone zone. UTC -> local -> UTC round trips validate candidates.
  DateTime toUtc(
    LocalDateTime wall,
    String zone, {
    AmbiguousTimePolicy ambiguity = AmbiguousTimePolicy.reject,
  }) {
    final location = tz.getLocation(zone);
    final naive = DateTime.utc(
      wall.year,
      wall.month,
      wall.day,
      wall.hour,
      wall.minute,
      wall.second,
    );
    if (!wall.matches(naive)) throw const FormatException('Invalid local date');
    final offsets = <Duration>{};
    for (var hours = -48; hours <= 48; hours += 6) {
      offsets.add(
        tz.TZDateTime.from(
          naive.add(Duration(hours: hours)),
          location,
        ).timeZoneOffset,
      );
    }
    final candidates =
        offsets
            .map(naive.subtract)
            .where(
              (candidate) =>
                  wall.matches(tz.TZDateTime.from(candidate, location)),
            )
            .toList()
          ..sort();
    if (candidates.isEmpty) {
      throw const FormatException('Nonexistent local time');
    }
    if (candidates.length > 1 && ambiguity == AmbiguousTimePolicy.reject) {
      throw const FormatException(
        'Ambiguous local time; choose earlier or later',
      );
    }
    return ambiguity == AmbiguousTimePolicy.later
        ? candidates.last
        : candidates.first;
  }

  String businessDate(DateTime instant, String zone) {
    final date = atLocation(instant, zone);
    return '${date.year.toString().padLeft(4, '0')}-'
        '${date.month.toString().padLeft(2, '0')}-'
        '${date.day.toString().padLeft(2, '0')}';
  }

  String format(DateTime instant, String zone, {required String locale}) =>
      '${DateFormat('dd/MM/yyyy HH:mm', locale).format(atLocation(instant, zone))} ($zone)';
}
