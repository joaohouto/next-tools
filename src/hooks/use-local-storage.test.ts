/**
 * Testes do Hook useLocalStorage
 * NOTA: Este arquivo é apenas para REFERÊNCIA. Instale @types/jest para usar em sua suite de testes.
 * 
 * Para rodar os testes:
 * 1. Instale: npm install --save-dev jest @testing-library/react @types/jest
 * 2. Configure Jest no seu package.json ou jest.config.js
 * 3. Execute: npm test
 */

// @ts-nocheck - Desabilitar type checking para este arquivo de testes de referência

import { useLocalStorage, useLocalStorageRemove } from "@/hooks/use-local-storage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("deve inicializar com valor padrão", () => {
    const { result } = renderHook(() => useLocalStorage("test", "default"));
    expect(result.current[0]).toBe("default");
  });

  test("deve salvar valor no localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("test", "default"));
    
    act(() => {
      result.current[1]("novo valor");
    });

    expect(localStorage.getItem("test")).toBe('"novo valor"');
    expect(result.current[0]).toBe("novo valor");
  });

  test("deve carregar valor salvo", () => {
    localStorage.setItem("test", '"valor salvo"');
    
    const { result } = renderHook(() => useLocalStorage("test", "default"));
    expect(result.current[0]).toBe("valor salvo");
  });

  test("deve serializar/deserializar JSON", () => {
    const obj = { name: "João", age: 25 };
    const { result } = renderHook(() => 
      useLocalStorage("test", { name: "", age: 0 })
    );

    act(() => {
      result.current[1](obj);
    });

    expect(JSON.parse(localStorage.getItem("test") || "{}")).toEqual(obj);
  });

  test("deve atualizar com função", () => {
    const { result } = renderHook(() => useLocalStorage("counter", 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
  });

  test("deve sincronizar entre abas", () => {
    const { result: result1 } = renderHook(() => useLocalStorage("shared", ""));
    const { result: result2 } = renderHook(() => useLocalStorage("shared", ""));

    act(() => {
      result1.current[1]("novo valor");
    });

    // Simular evento de storage
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "shared",
          newValue: '"novo valor"',
        })
      );
    });

    expect(result2.current[0]).toBe("novo valor");
  });

  test("deve remover item do localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("test", "value"));
    const { result: removeResult } = renderHook(() => useLocalStorageRemove());

    act(() => {
      removeResult.current("test");
    });

    expect(localStorage.getItem("test")).toBeNull();
  });

  test("deve tratar erros de JSON", () => {
    localStorage.setItem("test", "invalid json");
    
    const spy = jest.spyOn(console, "warn").mockImplementation();
    
    const { result } = renderHook(() => useLocalStorage("test", "default"));
    expect(result.current[0]).toBe("default");
    
    spy.mockRestore();
  });

  test("deve usar custom serializer", () => {
    const { result } = renderHook(() =>
      useLocalStorage("test", "value", {
        serializer: (v) => (v as string).toUpperCase(),
        deserializer: (v) => v.toLowerCase(),
      })
    );

    act(() => {
      result.current[1]("Hello");
    });

    expect(localStorage.getItem("test")).toBe("HELLO");
  });

  test("não deve sincronizar se syncData = false", () => {
    const { result } = renderHook(() =>
      useLocalStorage("test", "value", { syncData: false })
    );

    act(() => {
      result.current[1]("novo");
    });

    const event = new StorageEvent("storage", {
      key: "test",
      newValue: '"outro"',
    });

    act(() => {
      window.dispatchEvent(event);
    });

    // Não deve mudar
    expect(result.current[0]).toBe("novo");
  });
});

/**
 * Testes de Integração - ZapLink
 */

describe("ZapLink com useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("deve salvar e restaurar templates", () => {
    const templates = [
      { id: "1", name: "Saudação", content: "Olá ${nome}" },
      { id: "2", name: "Despedida", content: "Até logo" },
    ];

    localStorage.setItem("zaplink-templates", JSON.stringify(templates));

    const { result } = renderHook(() =>
      useLocalStorage("zaplink-templates", [])
    );

    expect(result.current[0]).toEqual(templates);
  });

  test("deve salvar e restaurar configurações de telefone", () => {
    const settings = {
      autoAddDDD: true,
      defaultDDD: "21",
      autoAddCountryCode: true,
    };

    const { result } = renderHook(() =>
      useLocalStorage("zaplink-phone-settings", {
        autoAddDDD: false,
        defaultDDD: "11",
        autoAddCountryCode: true,
      })
    );

    act(() => {
      result.current[1](settings);
    });

    expect(result.current[0]).toEqual(settings);
  });

  test("deve salvar múltiplos dados independentemente", () => {
    const { result: templates } = renderHook(() =>
      useLocalStorage("zaplink-templates", [])
    );
    const { result: phone } = renderHook(() =>
      useLocalStorage("zaplink-phone", "")
    );

    act(() => {
      templates.current[1]([{ id: "1", name: "Test", content: "Test" }]);
      phone.current[1]("11999999999");
    });

    expect(localStorage.getItem("zaplink-templates")).toBeTruthy();
    expect(localStorage.getItem("zaplink-phone")).toBe('"11999999999"');
  });
});
