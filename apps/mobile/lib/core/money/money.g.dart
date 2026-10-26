// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'money.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Money _$MoneyFromJson(Map<String, dynamic> json) => $checkedCreate(
  'Money',
  json,
  ($checkedConvert) {
    $checkKeys(json, allowedKeys: const ['amountMinor', 'currency']);
    final val = Money(
      amountMinor: $checkedConvert('amountMinor', (v) => Money._readInteger(v)),
      currency: $checkedConvert(
        'currency',
        (v) => $enumDecode(_$CurrencyEnumMap, v),
      ),
    );
    return val;
  },
);

Map<String, dynamic> _$MoneyToJson(Money instance) => <String, dynamic>{
  'amountMinor': instance.amountMinor,
  'currency': _$CurrencyEnumMap[instance.currency]!,
};

const _$CurrencyEnumMap = {Currency.PEN: 'PEN', Currency.EUR: 'EUR'};
