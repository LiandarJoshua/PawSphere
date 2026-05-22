// Fallback required by expo-router — platform-specific files take priority:
// discovery.web.tsx   → used on web
// discovery.native.tsx → used on iOS/Android
export { default } from './discovery.web';
