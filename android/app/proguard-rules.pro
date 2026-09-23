# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ── General Android ────────────────────────────────────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
-keepattributes *Annotation*, InnerClasses, EnclosingMethod
-keepattributes Signature
-keepattributes Exceptions

# ── Kotlinx Serialization ──────────────────────────────
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class com.tmgl.league.**$$serializer { *; }
-keepclassmembers class com.tmgl.league.** {
    *** Companion;
}
-keepclasseswithmembers class com.tmgl.league.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# ── Ktor ───────────────────────────────────────────────
-keep class io.ktor.** { *; }
-dontwarn io.ktor.**
-keep class io.ktor.client.engine.** { *; }
-keep class io.ktor.serialization.** { *; }

# ── Supabase ───────────────────────────────────────────
-keep class io.github.jan.supabase.** { *; }
-dontwarn io.github.jan.supabase.**

# ── Data Classes ───────────────────────────────────────
-keep class com.tmgl.league.data.model.** { *; }
-keep class com.tmgl.league.data.repository.** { *; }
-keep class com.tmgl.league.data.offline.** { *; }

# ── Firebase ───────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# ── Hilt ───────────────────────────────────────────────
-dontwarn dagger.hilt.**
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-keep class * extends dagger.hilt.android.lifecycle.HiltViewModel
-keepclassmembers class * {
    @dagger.hilt.android.lifecycle.HiltViewModel <init>(...);
}

# ── Biometric ──────────────────────────────────────────
-keep class androidx.biometric.** { *; }
-dontwarn androidx.biometric.**

# ── Coil ───────────────────────────────────────────────
-keep class coil.** { *; }
-dontwarn coil.**

# ── OkHttp ─────────────────────────────────────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# ── Coroutines ─────────────────────────────────────────
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}

# ── Compose ────────────────────────────────────────────
-dontwarn androidx.compose.**
-keep class androidx.compose.** { *; }

# ── DataStore ──────────────────────────────────────────
-keep class androidx.datastore.** { *; }
-dontwarn androidx.datastore.**

# ── Play Core ──────────────────────────────────────────
-keep class com.google.android.play.** { *; }
-dontwarn com.google.android.play.**

# ── Prevent stripping of crashlytics info ──────────────
-keepattributes *Annotation*
-keep class com.crashlytics.** { *; }
-dontwarn com.crashlytics.**

# ── Optimize ───────────────────────────────────────────
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*
-optimizationpasses 5
-repackageclasses ''
-allowaccessmodification
