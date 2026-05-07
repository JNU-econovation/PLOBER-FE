import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type PloggingSessionContextValue = {
  photoUris: string[];
  addPhoto: (uri: string) => void;
  removePhoto: (uri: string) => void;
  resetSession: () => void;
};

const PloggingSessionContext =
  createContext<PloggingSessionContextValue | null>(null);

export function PloggingSessionProvider({ children }: { children: ReactNode }) {
  const [photoUris, setPhotoUris] = useState<string[]>([]);

  const addPhoto = useCallback((uri: string) => {
    setPhotoUris((prev) => (prev.includes(uri) ? prev : [...prev, uri]));
  }, []);

  const removePhoto = useCallback((uri: string) => {
    setPhotoUris((prev) => prev.filter((existing) => existing !== uri));
  }, []);

  const resetSession = useCallback(() => {
    setPhotoUris([]);
  }, []);

  const value = useMemo<PloggingSessionContextValue>(
    () => ({ addPhoto, photoUris, removePhoto, resetSession }),
    [addPhoto, photoUris, removePhoto, resetSession]
  );

  return (
    <PloggingSessionContext.Provider value={value}>
      {children}
    </PloggingSessionContext.Provider>
  );
}

export function usePloggingSession() {
  const value = useContext(PloggingSessionContext);
  if (!value) {
    throw new Error(
      "usePloggingSession must be used within PloggingSessionProvider."
    );
  }
  return value;
}
