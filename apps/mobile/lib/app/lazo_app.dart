import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'l10n/generated/app_localizations.dart';
import 'providers.dart';
import 'router.dart';
import 'theme.dart';

final class LazoApp extends ConsumerWidget {
  const LazoApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) => MaterialApp.router(
    title: 'Lazo',
    debugShowCheckedModeBanner: false,
    theme: provisionalTheme(),
    locale: ref.watch(localeProvider),
    supportedLocales: const [Locale('es', 'PE'), Locale('es', 'ES')],
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    routerConfig: ref.watch(routerProvider),
  );
}
