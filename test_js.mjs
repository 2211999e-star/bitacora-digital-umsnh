import fs from 'fs';
import path from 'path';

// Mock browser environment
global.window = {
  innerWidth: 1024,
  location: { reload: () => {} },
  addEventListener: () => {},
  document: {
    getElementById: () => ({ classList: { remove: () => {}, add: () => {} } }),
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {},
    documentElement: { classList: { add: () => {}, remove: () => {} } }
  },
  supabaseClient: { from: () => ({ select: () => ({ order: () => ({ eq: () => ({ limit: () => ({ single: () => Promise.resolve({data: null}) }) }) }) }) }) },
  localStorage: { getItem: () => null, setItem: () => {} },
  matchMedia: () => ({ matches: false }),
  Chart: class {}
};
global.document = window.document;
global.localStorage = window.localStorage;

async function test() {
  try {
    await import('./js/utils.js?v=1.5.4'.replace('?v=1.5.4', ''));
    console.log('utils loaded');
    await import('./js/permissions.js?v=1.5.4'.replace('?v=1.5.4', ''));
    console.log('permissions loaded');
    await import('./js/dashboard.js?v=1.5.4'.replace('?v=1.5.4', ''));
    console.log('dashboard loaded');
    await import('./js/eventos.js?v=1.5.4'.replace('?v=1.5.4', ''));
    console.log('eventos loaded');
    await import('./js/reportes.js?v=1.5.4'.replace('?v=1.5.4', ''));
    console.log('reportes loaded');
    await import('./js/app.js?v=1.5.4'.replace('?v=1.5.4', ''));
    console.log('app loaded');
  } catch (err) {
    console.error('ERROR LOADING:', err);
  }
}
test();
