plugins {
    id("com.android.application")
    id("dev.flutter.flutter-gradle-plugin")
    id("com.google.firebase.crashlytics") apply false
    id("com.google.gms.google-services") apply false
}

// Real Firebase registration files are absent until the three projects exist.
if (providers.gradleProperty("firebaseConfigured").orNull == "true") {
    apply(plugin = "com.google.gms.google-services")
    apply(plugin = "com.google.firebase.crashlytics")
}

android {
    namespace = "app.lazo.mobile"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    buildFeatures {
        // AGP 9 disables generated resource values unless explicitly enabled.
        resValues = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "app.lazo.mobile"
        // Flutter 3.47.8 sets API 24, matching the pinned FlutterFire plugins.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        manifestPlaceholders["crashlyticsEnabled"] = "false"
    }

    flavorDimensions += "environment"
    productFlavors {
        create("dev") {
            dimension = "environment"
            applicationIdSuffix = ".dev"
            resValue("string", "app_name", "Lazo DEV")
        }
        create("staging") {
            dimension = "environment"
            applicationIdSuffix = ".staging"
            resValue("string", "app_name", "Lazo STAGING")
        }
        create("prod") {
            dimension = "environment"
            resValue("string", "app_name", "Lazo")
        }
    }

    buildTypes {
        release {
            // Store signing belongs to Step 10. No debug signing for release.
            isMinifyEnabled = false
            // Flutter enables both shrinking flags; keep them consistent until Step 10.
            isShrinkResources = false
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
