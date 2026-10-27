import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:lazo_mobile/app/bootstrap.dart';
import 'package:lazo_mobile/app/bootstrap_failure.dart';
import 'package:lazo_mobile/app/environment.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('app -> callable system-ping -> typed diagnostic result', (
    tester,
  ) async {
    BootstrapFailure? bootstrapFailure;
    await bootstrap(
      AppEnvironment.dev,
      onFailure: (failure) => bootstrapFailure = failure,
    );
    await tester.pumpAndSettle();
    expect(
      bootstrapFailure,
      isNull,
      reason: 'Bootstrap failed at $bootstrapFailure (sanitized metadata only)',
    );
    expect(find.byKey(const Key('bootstrap-failure')), findsNothing);
    await tester.scrollUntilVisible(
      find.text('Diagnóstico'),
      150,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('Diagnóstico'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('ping-button')));
    await tester.pumpAndSettle(const Duration(seconds: 1));
    expect(find.byKey(const Key('ping-success')), findsOneWidget);
  });
}
