import 'package:flutter/material.dart';

/// Provisional only. Step 2 owns tokens, accessibility and final components.
ThemeData provisionalTheme() => ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF183E3B)),
  inputDecorationTheme: const InputDecorationTheme(
    border: OutlineInputBorder(),
  ),
);
