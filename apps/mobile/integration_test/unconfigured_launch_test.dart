import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:lazo_mobile/app/bootstrap.dart';
import 'package:lazo_mobile/app/bootstrap_failure.dart';
import 'package:lazo_mobile/app/environment.dart';

/// Native launch of staging/prod WITHOUT Firebase configuration.
/// Proves the variant starts and fails closed on configuration; it is not
/// evidence of a connection to a real Firebase project.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('unconfigured staging/prod launch shows configuration failure', (
    tester,
  ) async {
    final environment = AppEnvironment.values.byName(appFlavor!);
    expect(environment, isNot(AppEnvironment.dev));
    BootstrapFailure? failure;
    await bootstrap(environment, onFailure: (value) => failure = value);
    await tester.pumpAndSettle();

    expect(failure?.stage, BootstrapStage.configuration);
    expect(failure?.category, BootstrapFailureCategory.configuration);
    expect(find.byKey(const Key('bootstrap-failure')), findsOneWidget);
    expect(find.text('Lazo · ${environment.name}'), findsOneWidget);
  });
}
