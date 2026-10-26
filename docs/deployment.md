# Entornos, ejecución y despliegue

Estado: proyectos Firebase reales **no creados** (confirmado por el usuario). No se desplegó a nube. Los IDs `demo-*` de `.firebaserc` son bloqueos seguros para emuladores, no proyectos existentes. La región `europe-west1` es propuesta del ADR 0007; no se aprobó la ubicación física.

## Herramientas fijadas

- Flutter 3.47.8, Dart incluido 3.13.7; `.fvmrc`.
- Node 22.23.4, Java 21, Firebase CLI 15.34.1; `.nvmrc` y `package-lock.json`.
- Dependencias Flutter exactas en `pubspec.yaml` y resolución en `pubspec.lock`.
- Las herramientas descargadas para verificar este equipo están en `.tools/`, excluidas de Git. No se modificó PATH global.

En PowerShell, desde la raíz, cuando se usan las herramientas portables de esta sesión:

```powershell
$env:Path = "$PWD\.tools\node-v22.23.4-win-x64;$PWD\.tools\flutter\bin;$PWD\.tools\jdk-21.0.12.1+1\bin;$env:Path"
$env:JAVA_HOME = "$PWD\.tools\jdk-21.0.12.1+1"
$env:FIREBASE_EMULATORS_PATH = "$PWD\.tools\firebase-emulators"
npm ci
npm run lint
npm test
npm run test:scripts
npm run test:emulator
```

`test:emulator` compila y levanta Auth, Firestore y Functions; ejecuta integración, reglas, ping y seed; apaga emuladores al terminar. No ejecutar mientras los mismos puertos estén ocupados. Para sesión interactiva: `npm run emulators`; interfaz local en `http://127.0.0.1:4000`. Todos escuchan solo loopback. El proyecto es siempre `demo-lazo`.

## Datos DEMO

Con el emulador en otra terminal:

```powershell
$env:GCLOUD_PROJECT = 'demo-lazo'
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
npm run seed:demo
```

En bash: `GCLOUD_PROJECT=demo-lazo FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed:demo`.
El script rechaza cualquier otro proyecto/host y no admite omitir la protección. Repetirlo devuelve la misma operación por mercado, sin duplicar datos. Crea BlackAndWhite DEMO, PE/PEN y ES/EUR, Lima/Madrid DEMO, ocho servicios con precios ilustrativos, auditoría y dos eventos técnicos. No publica el catálogo ni crea identidades, membresías, horarios comerciales o reglas aprobadas.

## Flutter

Desde `apps/mobile`:

```text
flutter pub get --enforce-lockfile
dart run build_runner build --delete-conflicting-outputs
flutter gen-l10n
flutter analyze
flutter test
flutter run --flavor dev -t lib/main_dev.dart --dart-define-from-file=config/dev.emulator.json
```

Android Emulator accede al host por `10.0.2.2`; iOS Simulator usa `config/dev.emulator.ios.json` con `127.0.0.1`. Un dispositivo físico requiere un túnel/port-forward explícito y configuración local; no exponer los emuladores a la red por comodidad. `adb reverse tcp:5001 tcp:5001`, `tcp:8080`, `tcp:9099` permite loopback con el dispositivo autorizado.

Las variantes `staging` y `prod` usan `main_staging.dart`/`main_prod.dart` y un archivo `config/<entorno>.local.json` basado en el ejemplo. Si faltan los valores reales, la app informa la configuración pendiente y no sustituye un proyecto por otro. Diagnóstico solo en dev/staging. La app de producción no incorpora el recorrido de diagnóstico como ruta accesible.

Compilaciones previstas: `flutter build apk --debug --flavor dev -t lib/main_dev.dart` (repetir staging/prod); iOS exige macOS/Xcode: `flutter build ios --simulator --debug --flavor dev -t lib/main_dev.dart` (repetir variantes). Compilar no demuestra conectividad a Firebase ni firma para distribución.

## Alta de nube: pendiente de decisión y configuración real

1. Aprobar región de Firestore y Functions, residencia/acceso y costes. Crear tres proyectos distintos bajo la cuenta/organización indicada por el dueño. La ubicación Firestore no se deduce del mercado ni se cambia con un flag de Functions.
2. Activar facturación requerida por Functions/Cloud Tasks; crear Firestore, Storage y registrar las seis apps Android/iOS (IDs en `docs/mobile.md`). Ninguna credencial de servicio debe copiarse al repo/chat.
3. Sustituir aliases `dev`, `staging`, `prod` en `.firebaserc` con IDs verificados; conservar `default: demo-lazo` para trabajo local. Copiar `config/deployment.example.json` a `config/deployment.local.json` y registrar solo metadatos aprobados.
4. Configurar FlutterFire para cada variante, usando los IDs exactos. Completar los archivos `*.local.json` (config pública de SDK, no secretos). Colocar los archivos nativos Firebase donde indica `docs/mobile.md` para integración de Crashlytics/servicios nativos. Nunca reutilizar los de otro entorno.
5. Crear cuentas de servicio e IAM según `security.md`. Rellenar `backend/functions/.env.<PROJECT_ID>` según `.env.example`: entorno, versión, región y cuentas concretas. El despliegue comprueba los tres IDs distintos, su correspondencia completa con aliases y todos estos parámetros persistidos (no basta exportarlos en la terminal). No mezclar `.env` base ni `.env.dev/staging/prod`; usar únicamente archivos por ID real. Los secretos futuros van a Secret Manager y solo se vinculan a funciones que los necesiten; la declaración de Paso 1 no requiere un valor real.
6. Registrar App Check: depuración solo dev y tokens introducidos por el usuario en consola; Play Integrity/Apple App Attest con alternativa DeviceCheck en staging/prod. Activar enforcement; configurar Crashlytics y símbolos en staging/prod. Verificar una señal real antes de marcarlo operativo.
7. `npm run deploy:checked -- dev` valida IDs/región/App Check/IAM y ejecuta despliegue. El script es una protección de operación, no sustituye permisos IAM. Producción exige además `LAZO_PRODUCTION_RELEASE=<ID_PROD>` y aprobación de la entrega real.
8. Ejecutar ping desde app dev en dispositivo/simulador con App Check. Guardar resultado y evidencia en `docs/verification.md` y CONTEXT. Después promover el mismo commit a staging; prod solo con criterios de publicación cumplidos.

No activar TTL en marcas de deduplicación hasta aprobar su ventana de replay. No usar TTL para disponibilidad. Habilitar PITR, exportaciones y alertas con la región aprobada; verificar recuperación y recepción de alerta.

## CI

`.github/workflows/ci.yml` ejecuta Functions lint/build/tests/emulador/reglas, Flutter generación/análisis/tests, Android tres variantes y iOS Simulator tres variantes con macOS. El repositorio público es [MarcoPorras123/lazo](https://github.com/MarcoPorras123/lazo); consultar el estado real en [Actions](https://github.com/MarcoPorras123/lazo/actions). Una definición YAML o una prueba local aprobada no significa «CI en verde».

El CI de compilación utiliza configuración ausente controlada y no conecta a proyectos reales. Un workflow protegido posterior deberá aportar config por entorno y comprobar App Check/Crashlytics en apps firmadas antes de publicar.
