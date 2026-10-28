import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

enum AppEnvironment { dev, staging, prod }

final class AppConfig {
  const AppConfig({
    required this.environment,
    required this.useEmulators,
    required this.projectId,
    this.emulatorHost = '127.0.0.1',
    this.functionsRegion = 'europe-west1',
    this.apiKey = '',
    this.androidAppId = '',
    this.iosAppId = '',
    this.messagingSenderId = '',
    this.storageBucket = '',
  });

  factory AppConfig.fromEnvironment(AppEnvironment environment) {
    const specifiedEnvironment = String.fromEnvironment('APP_ENV');
    if (specifiedEnvironment.isNotEmpty &&
        specifiedEnvironment != environment.name) {
      throw StateError('APP_ENV does not match the selected entry point');
    }
    final emulators = const bool.hasEnvironment('USE_FIREBASE_EMULATORS')
        ? const bool.fromEnvironment('USE_FIREBASE_EMULATORS')
        : environment == AppEnvironment.dev;
    const configuredProject = String.fromEnvironment('FIREBASE_PROJECT_ID');
    return AppConfig(
      environment: environment,
      useEmulators: emulators,
      projectId: configuredProject.isEmpty && emulators
          ? 'demo-lazo'
          : configuredProject,
      emulatorHost: const String.fromEnvironment(
        'EMULATOR_HOST',
        defaultValue: '127.0.0.1',
      ),
      functionsRegion: const String.fromEnvironment(
        'FUNCTIONS_REGION',
        defaultValue: 'europe-west1',
      ),
      apiKey: const String.fromEnvironment('FIREBASE_API_KEY'),
      androidAppId: const String.fromEnvironment('FIREBASE_ANDROID_APP_ID'),
      iosAppId: const String.fromEnvironment('FIREBASE_IOS_APP_ID'),
      messagingSenderId: const String.fromEnvironment(
        'FIREBASE_MESSAGING_SENDER_ID',
      ),
      storageBucket: const String.fromEnvironment('FIREBASE_STORAGE_BUCKET'),
    );
  }

  final AppEnvironment environment;
  final bool useEmulators;
  final String projectId;
  final String emulatorHost;
  final String functionsRegion;
  final String apiKey;
  final String androidAppId;
  final String iosAppId;
  final String messagingSenderId;
  final String storageBucket;

  bool get showDiagnostics => environment != AppEnvironment.prod;
  bool get enableCrashlytics =>
      environment != AppEnvironment.dev && !useEmulators;

  void validate({String? nativeFlavor}) {
    if (nativeFlavor != null && nativeFlavor != environment.name) {
      throw StateError('Native flavor and entry point must match');
    }
    if (useEmulators) {
      if (environment != AppEnvironment.dev || projectId != 'demo-lazo') {
        throw StateError('Emulators are restricted to dev and demo-lazo');
      }
      if (!const {
        '127.0.0.1',
        'localhost',
        '10.0.2.2',
      }.contains(emulatorHost)) {
        throw StateError('Emulators must use a local host');
      }
      return;
    }
    final requiredValues = [
      projectId,
      functionsRegion,
      apiKey,
      androidAppId,
      iosAppId,
      messagingSenderId,
    ];
    if (requiredValues.any(
          (value) => value.isEmpty || value.contains('REPLACE'),
        ) ||
        projectId.startsWith('demo-')) {
      throw StateError('Firebase project configuration is incomplete');
    }
  }

  FirebaseOptions get firebaseOptions => FirebaseOptions(
    apiKey: apiKey,
    appId: defaultTargetPlatform == TargetPlatform.iOS
        ? iosAppId
        : androidAppId,
    messagingSenderId: messagingSenderId,
    projectId: projectId,
    storageBucket: storageBucket.isEmpty ? null : storageBucket,
    iosBundleId: environment == AppEnvironment.prod
        ? 'app.lazo.mobile'
        : 'app.lazo.mobile.${environment.name}',
  );
}
