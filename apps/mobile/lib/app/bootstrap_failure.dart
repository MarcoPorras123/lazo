import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/services.dart';

enum BootstrapStage {
  configuration,
  timeZones,
  firebase,
  functions,
  authEmulator,
  firestoreEmulator,
  appCheck,
  crashlytics,
  app,
}

enum BootstrapFailureCategory { configuration, firebase, platform, unexpected }

/// Diagnostic metadata only: never retain the exception, message or stack.
final class BootstrapFailure {
  const BootstrapFailure({
    required this.stage,
    required this.category,
    required this.code,
  });

  factory BootstrapFailure.fromError(BootstrapStage stage, Object error) {
    final category = switch (error) {
      FirebaseException() => BootstrapFailureCategory.firebase,
      PlatformException() => BootstrapFailureCategory.platform,
      StateError() => BootstrapFailureCategory.configuration,
      _ => BootstrapFailureCategory.unexpected,
    };
    final rawCode = switch (error) {
      FirebaseException(:final code) => code,
      PlatformException(:final code) => code,
      StateError() => 'invalid-configuration',
      _ => 'unknown',
    };
    // A platform can put arbitrary content even in `code`; emit only fixed codes.
    const allowedCodes = {
      'no-app',
      'duplicate-app',
      'invalid-api-key',
      'app-not-authorized',
      'channel-error',
      'invalid-argument',
      'invalid-configuration',
      'internal',
      'unknown',
    };
    return BootstrapFailure(
      stage: stage,
      category: category,
      code: allowedCodes.contains(rawCode) ? rawCode : 'unrecognized-code',
    );
  }

  final BootstrapStage stage;
  final BootstrapFailureCategory category;
  final String code;

  @override
  String toString() => '${stage.name}/${category.name}/$code';
}
