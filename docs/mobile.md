# App móvil: fundamentos y variantes

Actualizado: 2026-10-28 · Paso 1. El código usa Flutter 3.47.8 y Dart 3.13.7. `.fvmrc`, `pubspec.yaml` y `pubspec.lock` fijan el SDK y las dependencias. Android e iOS se generaron con las plantillas oficiales de esa versión. Los proyectos Firebase reales todavía no existen; el arranque con emuladores usa exclusivamente `demo-lazo`.

## Estructura y límites

- `apps/mobile/lib/app`: arranque, configuración, localización, proveedores Riverpod, enrutador y tema provisional.
- `apps/mobile/lib/core`: Money, reloj y zonas IANA, errores y cliente callable.
- `apps/mobile/lib/features/diagnostics/{data,domain,presentation}`: único recorrido completo de este paso, `system-ping`.
- `apps/mobile/lib/features/session/domain`: estado de sesión sin autenticación ni permisos concedidos. El Paso 3 reemplaza el proveedor con sesión real y alcance validado en servidor.

Las rutas provisionales son `/`, `/session`, `/diagnostics`, `/client`, `/staff` y `/owner`. Las tres últimas son pantallas sin negocio y exigen sesión/rol en la navegación; esas guardas no autorizan ninguna operación de servidor. Producción no registra la ruta de diagnóstico y redirige su URL al inicio.

## Variantes nativas

| Variante | Android applicationId / iOS bundle ID | Entrada | Diagnóstico | App Check en nube | Crashlytics |
|---|---|---|---|---|---|
| dev | `app.lazo.mobile.dev` | `lib/main_dev.dart` | Sí | Depuración | Desactivado |
| staging | `app.lazo.mobile.staging` | `lib/main_staging.dart` | Sí | Play Integrity / App Attest con DeviceCheck como alternativa | Se activa tras configurar Firebase real |
| prod | `app.lazo.mobile` | `lib/main_prod.dart` | No | Play Integrity / App Attest con DeviceCheck como alternativa | Se activa tras configurar Firebase real |

Los IDs son una propuesta técnica todavía no registrada en las tiendas. Confirmar su propiedad antes del alta de apps. Cada entrada valida que `APP_ENV` y el flavor nativo coincidan. La configuración incompleta muestra una pantalla de preparación; no aparenta una conexión real.

Android usa `productFlavors` con dimensión `environment`. El tráfico HTTP se permite únicamente en dev hacia `localhost`, `127.0.0.1` o `10.0.2.2`; staging y prod no incluyen esa excepción. El manifiesto desactiva la colección automática de Crashlytics hasta que el arranque la habilita expresamente en staging/prod.

iOS usa los schemes compartidos `dev`, `staging` y `prod`, cada uno con `Debug-*`, `Profile-*` y `Release-*`, replicados en proyecto, Runner y RunnerTests. La plantilla Flutter 3.47.8 usa **Swift Package Manager**, por lo que no hay Podfile. `Info-dev.plist` permite conexiones locales; `Info.plist` de staging/prod no incluye esa excepción. Los entitlements de App Attest se añaden en staging/prod. Su activación en el identificador Apple y la firma quedan pendientes.

`tool/configure_ios_flavors.mjs` documenta y reproduce la transformación de una plantilla nueva. Rechaza ejecutarse de nuevo sobre el proyecto ya configurado; no debe utilizarse para sobrescribir cambios futuros de Xcode.

## Ejecución local

Desde la raíz, iniciar primero los emuladores con los comandos de `CONTEXT.md`. Después:

```sh
cd apps/mobile
flutter pub get --enforce-lockfile
dart run build_runner build
flutter gen-l10n
flutter run --flavor dev --target lib/main_dev.dart --dart-define-from-file=config/dev.emulator.json
```

El archivo anterior apunta al host Android Emulator `10.0.2.2`. Para iOS Simulator:

```sh
flutter run --flavor dev --target lib/main_dev.dart --dart-define-from-file=config/dev.emulator.ios.json
```

Los puertos son Functions 5001, Auth 9099 y Firestore 8080. En un teléfono Android por USB se puede usar `adb reverse tcp:5001 tcp:5001`, `adb reverse tcp:8080 tcp:8080` y `adb reverse tcp:9099 tcp:9099`, con el archivo cuyo host sea `127.0.0.1`. No se necesita lector, proveedor comercial ni credenciales para los emuladores. El arranque rechaza un proyecto real en modo emulador y rechaza hosts arbitrarios.

En desarrollo local App Check no se inicia porque no tiene backend emulado. Ese caso exige simultáneamente variante dev y proyecto `demo-lazo`. En dev conectado a la nube sí se usa el proveedor de depuración; sus tokens se registran directamente en Firebase Console, nunca en el repositorio ni en el chat.

## Configurar Firebase real después de crear los proyectos

1. Confirmar región e IDs de proyecto en `CONTEXT.md`; registrar cada applicationId/bundle ID en su proyecto correspondiente.
2. Copiar `config/<entorno>.example.json` a `config/<entorno>.local.json` y rellenar los valores de registro públicos de Firebase en local. No añadir cuentas de servicio ni secretos a estos archivos. Los archivos reales están ignorados por Git.
3. Android: guardar el archivo descargado en `android/app/src/<entorno>/google-services.json`. Habilitar los plugins con la variable de entorno `ORG_GRADLE_PROJECT_firebaseConfigured=true`. Sin esa variable el build sirve para comprobar el esqueleto; no acredita Crashlytics real.
4. iOS: guardar `GoogleService-Info.plist` en `ios/config/<entorno>/`. Un paso de Xcode copia únicamente el archivo del scheme seleccionado al bundle; otro carga símbolos de Crashlytics en staging/prod, excepto simuladores. Revisar la resolución del SDK Firebase por SPM en macOS.
5. Configurar App Check y su enforcement en la consola, registrar certificados Android y habilitar App Attest/DeviceCheck en Apple. El backend exige App Check fuera del emulador. Verificar un crash de prueba de staging en Firebase antes de declarar Crashlytics validado.

```sh
flutter run --flavor dev --target lib/main_dev.dart --dart-define-from-file=config/dev.local.json
flutter run --flavor staging --target lib/main_staging.dart --dart-define-from-file=config/staging.local.json
flutter run --flavor prod --target lib/main_prod.dart --dart-define-from-file=config/prod.local.json
```

Las claves públicas de configuración Firebase no sustituyen la autorización ni App Check. Los secretos de servicios permanecen en Secret Manager del servidor. La firma de distribución Android/iOS corresponde al Paso 10; los builds Android release no usan la clave de depuración.

## Contratos y utilidades

Money serializa `{amountMinor, currency}`. Rechaza fracciones, campos desconocidos, monedas distintas y valores fuera de ±9007199254740991. La suma, resta y los porcentajes usan BigInt en cálculos intermedios. El porcentaje se expresa en puntos básicos: 100 equivale a 1 %. El modo se exige en cada llamada: `halfUp` redondea los empates alejándose de cero y `towardZero` trunca. El modo inicial de negocio propuesto es `halfUp`. El formato contractual español es `S/ 35,00` o `35,00 €`, sin convertir a punto flotante.

`LocationTime` usa la base IANA de `timezone` fijada en el lockfile y un `Clock` inyectable. No consulta la zona del teléfono. Se rechazan fechas inválidas, horas inexistentes y horas ambiguas sin decisión explícita (`earlier` o `later`). Los tests cubren los cambios de Madrid del 29/03/2026 y 25/10/2026 y las mismas fechas en Lima. La actualización de tzdata debe repetir esas pruebas de contrato.

`CallableClient` añade versión y clave de idempotencia, limita tiempo de espera y reintenta solo indisponibilidad/timeout con la misma petición y la misma clave. Una acción que cambia datos debe conservar la clave si el usuario reintenta después de agotados los intentos automáticos; su persistencia offline se implementará al añadir esas funcionalidades. FlutterFire adjunta los tokens de sesión y App Check. Los mensajes de error se traducen por código y no muestran excepciones crudas ni datos de la petición.

`PingResponse` es inmutable, usa serialización generada estricta y valida versión, entorno, UUID de correlación e instante UTC canónico con milisegundos. `packages/contracts/fixtures/` es la misma fuente de ejemplos que lee TypeScript.

## Comprobaciones

```sh
dart format --output=none --set-exit-if-changed lib test integration_test
dart run build_runner build
flutter analyze
flutter test --reporter expanded
flutter test integration_test/system_ping_test.dart --flavor dev --dart-define-from-file=config/dev.emulator.json
flutter build apk --debug --flavor dev --target lib/main_dev.dart --dart-define-from-file=config/dev.emulator.json
```

La prueba de integración necesita un emulador/dispositivo Android o iOS iniciado; `flutter test` a secas ejecuta tests unitarios y de widgets sin dispositivo. Para verificar dev real, ejecutar la misma prueba de integración con `config/dev.local.json` y App Check configurado. En macOS se puede compilar `flutter build ios --simulator --flavor dev --target lib/main_dev.dart --dart-define-from-file=config/dev.emulator.ios.json`.

Las evidencias ejecutadas y los pendientes están en `CONTEXT.md` y `docs/verification.md`. La ejecución #4 de GitHub Actions aprobó los ocho jobs, incluidas las compilaciones Android e iOS Simulator para dev/staging/prod, y 58 pruebas Flutter. Además, el [segundo humo Android dev](https://github.com/MarcoPorras123/lazo/actions/runs/40611649473) aprobó el arranque y la conexión app → `system.ping` con emuladores, tras corregir la inicialización Firebase predeterminada DEMO en `300c79b`. Las compilaciones iOS y staging/prod todavía requieren verificar arranque y configuración real.

## Humo nativo manual en GitHub Actions

El workflow `.github/workflows/mobile-smoke.yml`, **Lazo native DEMO smoke**, inicia un Android Emulator API 34 y Firebase Emulator Suite en el mismo runner. Después ejecuta `integration_test/system_ping_test.dart` en la app dev. El helper `backend/scripts/ci/mobile-smoke.sh` exige el proyecto `demo-lazo` y hosts loopback; no requiere un proyecto Firebase real ni secretos.

Se inicia desde Actions → Lazo native DEMO smoke → Run workflow → rama `main`, o mediante GitHub CLI con sesión autorizada:

```sh
gh workflow run mobile-smoke.yml --repo MarcoPorras123/lazo --ref main
gh run list --workflow mobile-smoke.yml --repo MarcoPorras123/lazo
gh run watch <RUN_ID> --repo MarcoPorras123/lazo --exit-status
```

El log Flutter se conserva durante siete días como artefacto `android-dev-demo-smoke`, cuando la ejecución alcanza esa fase. El alcance es Android dev → callable `system.ping` en emuladores DEMO. No acredita App Check real, Firebase dev cloud, staging/prod, iOS, firma ni distribución. El resultado comprobado de cada ejecución se registra en `docs/verification.md`.

## Referencias oficiales

- [Arquitectura Flutter](https://docs.flutter.dev/app-architecture)
- [Flavors Android](https://docs.flutter.dev/deployment/flavors) y [schemes iOS](https://docs.flutter.dev/deployment/flavors-ios)
- [App Check Flutter](https://firebase.google.com/docs/app-check/flutter/default-providers) y [API actual del plugin](https://pub.dev/documentation/firebase_app_check/latest/firebase_app_check/FirebaseAppCheck/activate.html)
- [Crashlytics Flutter](https://firebase.google.com/docs/crashlytics/flutter/get-started)
- [Serialización tipada](https://pub.dev/packages/json_serializable) y [base IANA de timezone](https://pub.dev/packages/timezone)
