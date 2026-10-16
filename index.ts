// Background tasks must be defined before anything renders: Android can start the app with no
// screen just to run one.
import './src/features/reminders/background';
import 'expo-router/entry';
