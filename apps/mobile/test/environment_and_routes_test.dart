import 'package:flutter_test/flutter_test.dart';
import 'package:lazo_mobile/app/environment.dart';
import 'package:lazo_mobile/app/router.dart';
import 'package:lazo_mobile/features/session/domain/session.dart';

void main() {
  const dev = AppConfig(
    environment: AppEnvironment.dev,
    useEmulators: true,
    projectId: 'demo-lazo',
  );
  const prod = AppConfig(
    environment: AppEnvironment.prod,
    useEmulators: false,
    projectId: 'unconfigured',
  );

  test('dev emulator configuration is explicit and safe', () {
    expect(() => dev.validate(nativeFlavor: 'dev'), returnsNormally);
    expect(() => dev.validate(nativeFlavor: 'prod'), throwsStateError);
    expect(
      () => const AppConfig(
        environment: AppEnvironment.dev,
        useEmulators: true,
        projectId: 'real-project',
      ).validate(),
      throwsStateError,
    );
    expect(
      () => const AppConfig(
        environment: AppEnvironment.staging,
        useEmulators: true,
        projectId: 'demo-lazo',
      ).validate(),
      throwsStateError,
    );
  });

  test('real environments require their Firebase configuration', () {
    expect(() => prod.validate(), throwsStateError);
  });

  test('real environments require an approved Functions region', () {
    AppConfig real(String region) => AppConfig(
      environment: AppEnvironment.staging,
      useEmulators: false,
      projectId: 'lazo-staging-test',
      functionsRegion: region,
      apiKey: 'public-api-key',
      androidAppId: '1:1:android:1',
      iosAppId: '1:1:ios:1',
      messagingSenderId: '1',
    );
    expect(() => real('europe-west1').validate(), returnsNormally);
    expect(() => real('').validate(), throwsStateError);
    expect(
      () => real('REPLACE_WITH_APPROVED_REGION').validate(),
      throwsStateError,
    );
  });

  test('App Check debug token is limited to dev debug builds', () {
    const token = '00000000-0000-4000-8000-000000000000';
    AppConfig withToken(AppEnvironment environment, String value) => AppConfig(
      environment: environment,
      useEmulators: false,
      projectId: 'lazo-${environment.name}-test',
      apiKey: 'public-api-key',
      androidAppId: '1:1:android:1',
      iosAppId: '1:1:ios:1',
      messagingSenderId: '1',
      appCheckDebugToken: value,
    );
    expect(
      () => withToken(AppEnvironment.dev, token).validate(releaseMode: false),
      returnsNormally,
    );
    expect(
      () => withToken(AppEnvironment.dev, '').validate(releaseMode: true),
      returnsNormally,
    );
    for (final environment in [AppEnvironment.staging, AppEnvironment.prod]) {
      expect(
        () => withToken(environment, token).validate(releaseMode: false),
        throwsStateError,
      );
    }
    expect(
      () => withToken(AppEnvironment.dev, token).validate(releaseMode: true),
      throwsStateError,
    );
    expect(
      () => withToken(
        AppEnvironment.dev,
        'not-a-token',
      ).validate(releaseMode: false),
      throwsStateError,
    );
  });

  test('diagnostics cannot be reached in prod', () {
    expect(
      routeRedirect('/diagnostics', prod, const SessionSnapshot.signedOut()),
      '/',
    );
    expect(
      routeRedirect('/diagnostics', dev, const SessionSnapshot.signedOut()),
      isNull,
    );
  });

  test('session and role guards are independent of hidden controls', () {
    expect(
      routeRedirect('/owner', dev, const SessionSnapshot.signedOut()),
      '/session',
    );
    expect(
      routeRedirect(
        '/owner',
        dev,
        const SessionSnapshot(uid: 'customer', role: AppRole.customer),
      ),
      '/',
    );
    expect(
      routeRedirect(
        '/owner',
        dev,
        const SessionSnapshot(uid: 'owner', role: AppRole.owner),
      ),
      isNull,
    );
    expect(
      routeRedirect(
        '/staff',
        dev,
        const SessionSnapshot(uid: 'unscoped', role: null),
      ),
      '/',
    );
  });
}
