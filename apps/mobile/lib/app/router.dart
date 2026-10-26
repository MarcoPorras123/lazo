import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/diagnostics/presentation/diagnostics_screen.dart';
import '../features/session/domain/session.dart';
import 'environment.dart';
import 'l10n/generated/app_localizations.dart';
import 'providers.dart';

/// UI guard only. Every backend command must independently authorize its scope.
String? routeRedirect(String path, AppConfig config, SessionSnapshot session) {
  if (path == '/diagnostics' && !config.showDiagnostics) return '/';
  final requiredRole = switch (path) {
    '/client' => AppRole.customer,
    '/staff' => AppRole.barber,
    '/owner' => AppRole.owner,
    _ => null,
  };
  if (requiredRole == null) return null;
  if (!session.isSignedIn) return '/session';
  if (session.role != requiredRole) return '/';
  return null;
}

final routerProvider = Provider<GoRouter>((ref) {
  final config = ref.watch(configProvider);
  final session = ref.watch(sessionProvider);
  final router = GoRouter(
    initialLocation: '/',
    redirect: (context, state) =>
        routeRedirect(state.uri.path, config, session),
    routes: [
      GoRoute(path: '/', builder: (context, state) => const FoundationScreen()),
      GoRoute(
        path: '/session',
        builder: (context, state) => const PlaceholderScreen(isSession: true),
      ),
      if (config.showDiagnostics)
        GoRoute(
          path: '/diagnostics',
          builder: (context, state) => const DiagnosticsScreen(),
        ),
      for (final path in ['/client', '/staff', '/owner'])
        GoRoute(
          path: path,
          builder: (context, state) => const PlaceholderScreen(),
        ),
    ],
    errorBuilder: (context, state) =>
        const PlaceholderScreen(unknownRoute: true),
  );
  ref.onDispose(router.dispose);
  return router;
});

final class FoundationScreen extends ConsumerWidget {
  const FoundationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = AppLocalizations.of(context);
    final config = ref.watch(configProvider);
    final locale = ref.watch(localeProvider);
    return Scaffold(
      appBar: AppBar(title: Text(strings.appTitle)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            if (config.useEmulators)
              Align(
                alignment: Alignment.centerLeft,
                child: Chip(label: Text(strings.demoLabel)),
              ),
            if (!config.useEmulators &&
                config.environment != AppEnvironment.prod)
              Align(
                alignment: Alignment.centerLeft,
                child: Chip(label: Text(config.environment.name)),
              ),
            const SizedBox(height: 16),
            Text(
              strings.foundationTitle,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 16),
            Text(strings.foundationBody),
            const SizedBox(height: 32),
            DropdownButtonFormField<Locale>(
              initialValue: locale,
              decoration: InputDecoration(labelText: strings.locale),
              items: const [
                DropdownMenuItem(
                  value: Locale('es', 'PE'),
                  child: Text('Español · Perú'),
                ),
                DropdownMenuItem(
                  value: Locale('es', 'ES'),
                  child: Text('Español · España'),
                ),
              ],
              onChanged: (value) {
                if (value != null) {
                  ref.read(localeProvider.notifier).setLocale(value);
                }
              },
            ),
            const SizedBox(height: 24),
            if (config.showDiagnostics)
              FilledButton.icon(
                onPressed: () => context.push('/diagnostics'),
                icon: const Icon(Icons.network_check),
                label: Text(strings.diagnostics),
              ),
            TextButton(
              onPressed: () => context.push('/session'),
              child: Text(strings.session),
            ),
          ],
        ),
      ),
    );
  }
}

final class PlaceholderScreen extends StatelessWidget {
  const PlaceholderScreen({
    super.key,
    this.isSession = false,
    this.unknownRoute = false,
  });
  final bool isSession;
  final bool unknownRoute;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(isSession ? strings.session : strings.appTitle),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                unknownRoute
                    ? strings.unknownRoute
                    : isSession
                    ? strings.sessionPending
                    : strings.notAvailable,
              ),
              const SizedBox(height: 24),
              TextButton(
                onPressed: () => context.go('/'),
                child: Text(strings.goHome),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
