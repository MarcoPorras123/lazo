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
