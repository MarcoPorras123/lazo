import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/l10n/generated/app_localizations.dart';
import '../../../app/providers.dart';
import '../../../core/errors/app_failure.dart';

final class DiagnosticsScreen extends ConsumerWidget {
  const DiagnosticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = AppLocalizations.of(context);
    final config = ref.watch(configProvider);
    final result = ref.watch(diagnosticsProvider);
    return Scaffold(
      appBar: AppBar(title: Text(strings.diagnostics)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            if (config.useEmulators) Chip(label: Text(strings.demoLabel)),
            Text('${strings.environment}: ${config.environment.name}'),
            Text('${strings.project}: ${config.projectId}'),
            const SizedBox(height: 24),
            FilledButton.icon(
              key: const Key('ping-button'),
              onPressed: result.isLoading
                  ? null
                  : () => ref.read(diagnosticsProvider.notifier).ping(),
              icon: const Icon(Icons.network_check),
              label: Text(
                result.isLoading
                    ? strings.checkingConnection
                    : strings.checkConnection,
              ),
            ),
            const SizedBox(height: 24),
            result.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) {
                final failure = error is AppFailure
                    ? error
                    : const AppFailure(FailureCode.unknown);
                return Semantics(
                  liveRegion: true,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(failure.userMessage),
                      if (failure.correlationId != null)
                        SelectableText(
                          '${strings.correlation}: ${failure.correlationId}',
                        ),
                    ],
                  ),
                );
              },
              data: (ping) => ping == null
                  ? const SizedBox.shrink()
                  : Semantics(
                      liveRegion: true,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            strings.connectionReady,
                            key: const Key('ping-success'),
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            '${strings.environment}: ${ping.environment.name}',
                          ),
                          Text('${strings.serverVersion}: ${ping.version}'),
                          Text(
                            '${strings.serverTime}: ${ping.serverTime.toIso8601String()}',
                          ),
                          SelectableText(
                            '${strings.correlation}: ${ping.correlationId}',
                          ),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
