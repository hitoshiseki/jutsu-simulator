import React, { createContext, useContext, useState, useCallback } from 'react';

interface SoundContextValue {
  soundEnabled: boolean;
  toggleSound: () => void;
}

const SoundContext = createContext<SoundContextValue>({
  soundEnabled: true,
  toggleSound: () => {},
});

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState(true);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  return (
    <SoundContext.Provider value={{ soundEnabled, toggleSound }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSoundContext = () => useContext(SoundContext);
