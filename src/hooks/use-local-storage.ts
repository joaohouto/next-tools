import {
  useState,
  useEffect,
  useCallback,
  Dispatch,
  SetStateAction,
} from "react";

interface UseLocalStorageOptions {
  serializer?: (value: unknown) => string;
  deserializer?: (value: string) => unknown;
  initializeFromURL?: boolean;
  syncData?: boolean;
}

const defaultSerializer = JSON.stringify;
const defaultDeserializer = JSON.parse;

/**
 * Hook para gerenciar estado sincronizado com localStorage
 * @param key - Chave no localStorage
 * @param initialValue - Valor inicial (usado se nenhum valor salvo for encontrado)
 * @param options - Opções de configuração
 * @returns [value, setValue] - Similar ao useState
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions = {},
): [T, Dispatch<SetStateAction<T>>] {
  const {
    serializer = defaultSerializer,
    deserializer = defaultDeserializer,
    syncData = true,
  } = options;

  // Validar se a chave é válida
  if (!key || typeof key !== "string") {
    throw new Error("useLocalStorage: key deve ser uma string não-vazia");
  }

  // Estado local
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Evitar erros em SSR - localStorage não existe no servidor
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return initialValue;
      }
      return deserializer(item) as T;
    } catch (error) {
      console.warn(
        `useLocalStorage: Erro ao ler "${key}" do localStorage:`,
        error,
      );
      return initialValue;
    }
  });

  // Função para atualizar o valor (setter)
  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (value: SetStateAction<T>) => {
      try {
        // Permite passar uma função ou um valor direto (como setState)
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        // Atualizar estado local
        setStoredValue(valueToStore);

        // Salvar no localStorage se disponível
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, serializer(valueToStore));
          // Disparar evento customizado para sincronizar entre abas
          window.dispatchEvent(
            new StorageEvent("local-storage", {
              key,
              newValue: serializer(valueToStore),
              url: window.location.href,
            }),
          );
        }
      } catch (error) {
        console.error(
          `useLocalStorage: Erro ao salvar "${key}" no localStorage:`,
          error,
        );
      }
    },
    [key, serializer, storedValue],
  );

  // Sincronizar entre abas/janelas
  useEffect(() => {
    if (!syncData || typeof window === "undefined") {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(deserializer(e.newValue) as T);
        } catch (error) {
          console.warn(`useLocalStorage: Erro ao sincronizar "${key}":`, error);
        }
      }
    };

    // Também ouvir evento customizado (para mesma aba)
    const handleLocalStorageChange = (e: Event) => {
      if (e instanceof StorageEvent) {
        handleStorageChange(e);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("local-storage", handleLocalStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-storage", handleLocalStorageChange);
    };
  }, [key, syncData, deserializer]);

  return [storedValue, setValue];
}

/**
 * Hook para múltiplos valores do localStorage com sincronização
 * @param keys - Objeto com chaves e valores iniciais
 * @param options - Opções de configuração
 * @returns Objeto com getters e setters para cada chave
 */
export function useLocalStorageMultiple<T extends Record<string, unknown>>(
  keys: T,
  options: UseLocalStorageOptions = {},
): Record<keyof T, [unknown, Dispatch<SetStateAction<unknown>>]> {
  const result: Record<string, [unknown, Dispatch<SetStateAction<unknown>>]> =
    {};

  for (const [key, initialValue] of Object.entries(keys)) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    result[key] = useLocalStorage(key, initialValue, options);
  }

  return result as Record<
    keyof T,
    [unknown, Dispatch<SetStateAction<unknown>>]
  >;
}

/**
 * Hook para remover um item do localStorage
 */
export function useLocalStorageRemove() {
  return useCallback((key: string) => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
        window.dispatchEvent(
          new StorageEvent("local-storage", {
            key,
            newValue: null,
            url: window.location.href,
          }),
        );
      }
    } catch (error) {
      console.error(`useLocalStorage: Erro ao remover "${key}":`, error);
    }
  }, []);
}

/**
 * Hook para limpar todo o localStorage (cuidado!)
 */
export function useLocalStorageClear() {
  return useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.clear();
        window.dispatchEvent(
          new StorageEvent("local-storage", { url: window.location.href }),
        );
      }
    } catch (error) {
      console.error("useLocalStorage: Erro ao limpar localStorage:", error);
    }
  }, []);
}
