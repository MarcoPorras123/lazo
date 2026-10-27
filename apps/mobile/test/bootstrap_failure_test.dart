import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lazo_mobile/app/bootstrap_failure.dart';

void main() {
  test(
    'bootstrap diagnostics retain a known code without exception details',
    () {
      final failure = BootstrapFailure.fromError(
        BootstrapStage.firebase,
        FirebaseException(
          plugin: 'core',
          code: 'duplicate-app',
          message: 'private project and configuration must not escape',
          stackTrace: StackTrace.fromString('private stack'),
        ),
      );
      expect(failure.toString(), 'firebase/firebase/duplicate-app');
    },
  );

  test('arbitrary platform error codes and messages are redacted', () {
    final failure = BootstrapFailure.fromError(
      BootstrapStage.authEmulator,
      PlatformException(
        code: 'private-token-or-identifier',
        message: 'private configuration',
        details: {'token': 'private token'},
      ),
    );
    expect(failure.toString(), 'authEmulator/platform/unrecognized-code');
  });

  test('configuration failures disclose the stage without StateError text', () {
    final failure = BootstrapFailure.fromError(
      BootstrapStage.configuration,
      StateError('private configuration value'),
    );
    expect(
      failure.toString(),
      'configuration/configuration/invalid-configuration',
    );
  });
}
