import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lazo_mobile/app/environment.dart';
import 'package:lazo_mobile/app/lazo_app.dart';
import 'package:lazo_mobile/app/providers.dart';

void main() {
  testWidgets('dev visibly labels DEMO and exposes diagnostics', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          configProvider.overrideWithValue(
            const AppConfig(
              environment: AppEnvironment.dev,
              useEmulators: true,
              projectId: 'demo-lazo',
            ),
          ),
        ],
        child: const LazoApp(),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('DEMO · emuladores locales'), findsOneWidget);
    expect(find.text('Diagnóstico'), findsOneWidget);
    await tester.tap(find.text('Sesión'));
    await tester.pumpAndSettle();
    expect(
      find.text('El inicio de sesión se implementará en el Paso 3.'),
      findsOneWidget,
    );
  });

  testWidgets('prod has no diagnostic control', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          configProvider.overrideWithValue(
            const AppConfig(
              environment: AppEnvironment.prod,
              useEmulators: false,
              projectId: 'test-configuration',
            ),
          ),
        ],
        child: const LazoApp(),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Diagnóstico'), findsNothing);
    expect(find.byType(DropdownButtonFormField<Locale>), findsOneWidget);
  });
}
