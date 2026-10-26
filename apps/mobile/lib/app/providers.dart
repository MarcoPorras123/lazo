import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/networking/callable_client.dart';
import '../core/time/location_time.dart';
import '../features/diagnostics/data/diagnostics_repository.dart';
import '../features/diagnostics/domain/ping_response.dart';
import 'environment.dart';

final configProvider = Provider<AppConfig>(
  (ref) => throw StateError('Bootstrap required'),
);
final callableClientProvider = Provider<CallableClient>(
  (ref) => throw StateError('Bootstrap required'),
);
final clockProvider = Provider<Clock>((ref) => const SystemClock());
final locationTimeProvider = Provider<LocationTime>(
  (ref) => LocationTime(clock: ref.watch(clockProvider)),
);
final diagnosticsRepositoryProvider = Provider<DiagnosticsRepository>(
  (ref) => DiagnosticsRepository(ref.watch(callableClientProvider)),
);

final localeProvider = NotifierProvider<LocaleController, Locale>(
  LocaleController.new,
);

final class LocaleController extends Notifier<Locale> {
  @override
  Locale build() => const Locale('es', 'PE');

  void setLocale(Locale locale) {
    if (locale.languageCode != 'es' ||
        !const {'PE', 'ES'}.contains(locale.countryCode)) {
      throw ArgumentError('Unsupported locale');
    }
    state = locale;
  }
}

final diagnosticsProvider =
    AsyncNotifierProvider<DiagnosticsController, PingResponse?>(
      DiagnosticsController.new,
    );

final class DiagnosticsController extends AsyncNotifier<PingResponse?> {
  @override
  PingResponse? build() => null;

  Future<void> ping() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(diagnosticsRepositoryProvider).ping(),
    );
  }
}
