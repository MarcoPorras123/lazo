import 'package:flutter_test/flutter_test.dart';
import 'package:lazo_mobile/core/money/money.dart';

void main() {
  test('sum and subtraction preserve currency and exact minor units', () {
    final a = Money(amountMinor: 3500, currency: Currency.PEN);
    final b = Money(amountMinor: 101, currency: Currency.PEN);
    expect((a + b).amountMinor, 3601);
    expect((a - b).amountMinor, 3399);
    expect((a + b).currency, Currency.PEN);
  });

  test('mixed currencies are rejected in both directions', () {
    final pen = Money(amountMinor: 1, currency: Currency.PEN);
    final eur = Money(amountMinor: 1, currency: Currency.EUR);
    expect(() => pen + eur, throwsArgumentError);
    expect(() => pen - eur, throwsArgumentError);
  });

  test('intermediate arithmetic does not overflow or round large amounts', () {
    final large = Money(
      amountMinor: Money.maxSafeMinor,
      currency: Currency.EUR,
    );
    expect(large.percentage(10000, rounding: RoundingMode.halfUp), large);
    expect(
      () => large + Money(amountMinor: 1, currency: Currency.EUR),
      throwsRangeError,
    );
    expect(
      () => large.percentage(10001, rounding: RoundingMode.halfUp),
      throwsRangeError,
    );
  });

  test('half cent ties round away from zero', () {
    for (final sign in [-1, 1]) {
      final money = Money(amountMinor: sign, currency: Currency.PEN);
      expect(
        money.percentage(5000, rounding: RoundingMode.halfUp).amountMinor,
        sign,
      );
      expect(
        money.percentage(4999, rounding: RoundingMode.halfUp).amountMinor,
        0,
      );
    }
  });

  test('toward-zero rounding is explicit for both signs', () {
    for (final amount in [-3, 3]) {
      expect(
        Money(
          amountMinor: amount,
          currency: Currency.EUR,
        ).percentage(5000, rounding: RoundingMode.towardZero).amountMinor,
        amount < 0 ? -1 : 1,
      );
    }
  });

  test('minimum native integer cannot bypass the safe JSON bounds', () {
    final minimumNative = int.parse('-9223372036854775808');
    expect(() => Money(amountMinor: minimumNative, currency: Currency.PEN), throwsRangeError);
    expect(() => Money(amountMinor: 1, currency: Currency.PEN)
        .percentage(minimumNative, rounding: RoundingMode.halfUp), throwsRangeError);
  });
}
