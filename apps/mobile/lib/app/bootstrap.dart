import 'dart:async';
import 'dart:ui';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/networking/callable_client.dart';
import '../core/time/location_time.dart';
import 'environment.dart';
import 'lazo_app.dart';
import 'providers.dart';
import 'theme.dart';

Future<void> bootstrap(AppEnvironment environment) async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    final config = AppConfig.fromEnvironment(environment);
    config.validate(nativeFlavor: appFlavor);
    LocationTime.initialize();

    final app = config.useEmulators
        ? await Firebase.initializeApp(demoProjectId: 'demo-lazo')
        : await Firebase.initializeApp(options: config.firebaseOptions);
    final functions = FirebaseFunctions.instanceFor(
      app: app,
      region: config.functionsRegion,
    );

    if (config.useEmulators) {
      // No App Check backend exists locally. This bypass cannot reach real projects.
      functions.useFunctionsEmulator(config.emulatorHost, 5001);
      await FirebaseAuth.instanceFor(
        app: app,
      ).useAuthEmulator(config.emulatorHost, 9099);
      FirebaseFirestore.instanceFor(
        app: app,
      ).useFirestoreEmulator(config.emulatorHost, 8080);
    } else {
      await FirebaseAppCheck.instanceFor(app: app).activate(
        providerAndroid: environment == AppEnvironment.dev
            ? const AndroidDebugProvider()
            : const AndroidPlayIntegrityProvider(),
        providerApple: environment == AppEnvironment.dev
            ? const AppleDebugProvider()
            : const AppleAppAttestWithDeviceCheckFallbackProvider(),
      );
      await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(
        config.enableCrashlytics,
      );
      if (config.enableCrashlytics) {
        FlutterError.onError =
            FirebaseCrashlytics.instance.recordFlutterFatalError;
        PlatformDispatcher.instance.onError = (error, stack) {
          unawaited(
            FirebaseCrashlytics.instance.recordError(error, stack, fatal: true),
          );
          return true;
        };
      }
    }

    runApp(
      ProviderScope(
        overrides: [
          configProvider.overrideWithValue(config),
          callableClientProvider.overrideWithValue(
            CallableClient(FirebaseCallableTransport(functions)),
          ),
        ],
        child: const LazoApp(),
      ),
    );
  } catch (_) {
    // Never render raw platform errors (they can contain config or identifiers).
    runApp(
      MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: provisionalTheme(),
        home: Scaffold(
          appBar: AppBar(title: Text('Lazo · ${environment.name}')),
          body: const SafeArea(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                'Falta configurar este entorno o no se pudo inicializar Firebase. '
                'Revisa la variante y su archivo de configuración. Consulta docs/mobile.md.',
              ),
            ),
          ),
        ),
      ),
    );
  }
}
