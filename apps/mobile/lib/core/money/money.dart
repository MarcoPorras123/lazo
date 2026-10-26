import 'package:json_annotation/json_annotation.dart';

part 'money.g.dart';

// ISO 4217 symbols are also the stable JSON wire values.
// ignore: constant_identifier_names
enum Currency { PEN, EUR }

/// Explicit policy: an exact half cent is rounded away from zero.
enum RoundingMode { halfUp, towardZero }

/// JSON uses integers shared with JavaScript. Intermediate arithmetic is BigInt.
@JsonSerializable()
final class Money {
  Money({required this.amountMinor, required this.currency}) {
    if (amountMinor < -maxSafeMinor || amountMinor > maxSafeMinor) {
      throw RangeError.range(amountMinor, -maxSafeMinor, maxSafeMinor);
    }
  }

  static const maxSafeMinor = 9007199254740991;

  @JsonKey(fromJson: _readInteger)
  final int amountMinor;
  final Currency currency;

  factory Money.fromJson(Map<String, dynamic> json) => _$MoneyFromJson(json);

  Map<String, dynamic> toJson() => _$MoneyToJson(this);

  static int _readInteger(Object? value) {
    if (value is! int) {
      throw const FormatException('amountMinor must be an integer');
    }
    return value;
  }

  Money operator +(Money other) {
    _sameCurrency(other);
    return _fromBigInt(
      BigInt.from(amountMinor) + BigInt.from(other.amountMinor),
    );
  }

  Money operator -(Money other) {
    _sameCurrency(other);
    return _fromBigInt(
      BigInt.from(amountMinor) - BigInt.from(other.amountMinor),
    );
  }

  /// 100 basis points = 1%. No floating-point arithmetic is used.
  Money percentage(int basisPoints, {required RoundingMode rounding}) {
    if (basisPoints < -maxSafeMinor || basisPoints > maxSafeMinor) {
      throw RangeError('Invalid basis points');
    }
    final numerator = BigInt.from(amountMinor) * BigInt.from(basisPoints);
    final denominator = BigInt.from(10000);
    final magnitude = numerator.abs();
    final rounded = switch (rounding) {
      RoundingMode.halfUp =>
        (magnitude + denominator ~/ BigInt.two) ~/ denominator,
      RoundingMode.towardZero => magnitude ~/ denominator,
    };
    return _fromBigInt(numerator.isNegative ? -rounded : rounded);
  }

  Money _fromBigInt(BigInt value) {
    if (value.abs() > BigInt.from(maxSafeMinor)) {
      throw RangeError('Money exceeds the shared JSON safe integer range');
    }
    return Money(amountMinor: value.toInt(), currency: currency);
  }

  void _sameCurrency(Money other) {
    if (currency != other.currency) {
      throw ArgumentError('Currencies must match');
    }
  }

  /// Lazo's Spanish display contract deliberately uses a comma in both markets.
  /// Formats digits directly to avoid precision loss for large amounts.
  String format({required String locale}) {
    if (!const {'es-PE', 'es_PE', 'es-ES', 'es_ES'}.contains(locale)) {
      throw ArgumentError.value(locale, 'locale', 'Use es-PE or es-ES');
    }
    final digits = amountMinor.abs().toString().padLeft(3, '0');
    final integer = digits.substring(0, digits.length - 2);
    final grouped = integer.replaceAllMapped(
      RegExp(r'\B(?=(\d{3})+(?!\d))'),
      (_) => '.',
    );
    final decimal = '$grouped,${digits.substring(digits.length - 2)}';
    final sign = amountMinor < 0 ? '-' : '';
    return switch (currency) {
      Currency.PEN => 'S/ $sign$decimal',
      Currency.EUR => '$sign$decimal €',
    };
  }

  @override
  bool operator ==(Object other) =>
      other is Money &&
      amountMinor == other.amountMinor &&
      currency == other.currency;

  @override
  int get hashCode => Object.hash(amountMinor, currency);
}
