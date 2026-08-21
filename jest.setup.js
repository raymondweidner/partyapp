jest.mock('@react-native-firebase/app', () => {
  return {
    app: jest.fn(() => ({
      utils: jest.fn(() => ({})),
    })),
    initializeApp: jest.fn(),
  };
});

jest.mock('@react-native-firebase/auth', () => {
  return () => ({
    signInAnonymously: jest.fn(),
    onAuthStateChanged: jest.fn(),
    signOut: jest.fn(),
    useEmulator: jest.fn(),
  });
});

jest.mock('@react-native-firebase/messaging', () => {
  return () => ({
    hasPermission: jest.fn(() => Promise.resolve(true)),
    subscribeToTopic: jest.fn(),
    unsubscribeFromTopic: jest.fn(),
    requestPermission: jest.fn(() => Promise.resolve(true)),
    getToken: jest.fn(() => Promise.resolve('myMockToken')),
  });
});

jest.mock('firebase/app', () => ({
  getApp: jest.fn(),
  initializeApp: jest.fn(),
}));

jest.mock('firebase/messaging', () => ({
  getMessaging: jest.fn(),
  getToken: jest.fn(),
  isSupported: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(() => Promise.resolve(false)),
  unregisterTaskAsync: jest.fn(),
  unregisterAllTasksAsync: jest.fn(),
}));
