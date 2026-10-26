import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:lazo_mobile/app/bootstrap.dart';
import 'package:lazo_mobile/app/environment.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('app -> callable system-ping -> typed diagnostic result', (
    tester,
  ) async {
    await bootstrap(AppEnvironment.dev);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Diagnóstico'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('ping-button')));
    await tester.pumpAndSettle(const Duration(seconds: 1));
    expect(find.byKey(const Key('ping-success')), findsOneWidget);
  });
}
