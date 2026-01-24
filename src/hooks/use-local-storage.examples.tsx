/**
 * Exemplos de uso do hook useLocalStorage
 * Este arquivo demonstra diferentes formas de utilizar o hook em diversos cenários
 */

import { useLocalStorage, useLocalStorageRemove } from "@/hooks/use-local-storage";
import { useEffect, useState } from "react";

// ============================================================================
// EXEMPLO 1: Dados Simples (String, Number, Boolean)
// ============================================================================

export function SimpleDataExample() {
  const [username, setUsername] = useLocalStorage("username", "");
  const [fontSize, setFontSize] = useLocalStorage("fontSize", 16);
  const [darkMode, setDarkMode] = useLocalStorage("darkMode", false);

  return (
    <div>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
      />
      <input
        type="number"
        value={fontSize}
        onChange={(e) => setFontSize(Number(e.target.value))}
      />
      <button onClick={() => setDarkMode(!darkMode)}>
        {darkMode ? "🌙 Dark" : "☀️ Light"}
      </button>
    </div>
  );
}

// ============================================================================
// EXEMPLO 2: Objetos Complexos (com TypeScript)
// ============================================================================

interface UserProfile {
  id: string;
  name: string;
  email: string;
  preferences: {
    language: "pt" | "en" | "es";
    notifications: boolean;
    theme: "light" | "dark";
  };
}

export function ComplexObjectExample() {
  const defaultProfile: UserProfile = {
    id: "1",
    name: "",
    email: "",
    preferences: {
      language: "pt",
      notifications: true,
      theme: "light",
    },
  };

  const [profile, setProfile] = useLocalStorage<UserProfile>(
    "user-profile",
    defaultProfile
  );

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const updatePreference = (key: keyof UserProfile["preferences"], value: any) => {
    setProfile((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, [key]: value },
    }));
  };

  return (
    <div>
      <input
        value={profile.name}
        onChange={(e) => updateProfile({ name: e.target.value })}
        placeholder="Nome"
      />
      <select
        value={profile.preferences.language}
        onChange={(e) =>
          updatePreference("language", e.target.value as "pt" | "en" | "es")
        }
      >
        <option value="pt">Português</option>
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
    </div>
  );
}

// ============================================================================
// EXEMPLO 3: Arrays (Lista de Tarefas)
// ============================================================================

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export function TodoListExample() {
  const [todos, setTodos] = useLocalStorage<Todo[]>("todos", []);
  const [input, setInput] = useState("");

  const addTodo = () => {
    if (input.trim()) {
      setTodos((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          title: input,
          completed: false,
          createdAt: new Date().toISOString(),
        },
      ]);
      setInput("");
    }
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const removeTodo = (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  return (
    <div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={addTodo}>Adicionar</button>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span>{todo.title}</span>
            <button onClick={() => removeTodo(todo.id)}>Remover</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// EXEMPLO 4: Sincronização Entre Abas
// ============================================================================

export function MultiTabSyncExample() {
  const [sharedValue, setSharedValue] = useLocalStorage(
    "shared-value",
    "inicial",
    { syncData: true } // Sincronizar entre abas
  );

  const [timestamp, setTimestamp] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    // Atualizar timestamp quando o valor muda
    setTimestamp(new Date().toLocaleTimeString());
  }, [sharedValue]);

  return (
    <div>
      <p>Valor compartilhado: {sharedValue}</p>
      <p>Última atualização: {timestamp}</p>
      <input
        value={sharedValue}
        onChange={(e) => setSharedValue(e.target.value)}
        placeholder="Digite algo e veja sincronizar em outras abas"
      />
      <p className="text-sm text-gray-500">
        Abra este site em outra aba e veja as mudanças sincronizarem
      </p>
    </div>
  );
}

// ============================================================================
// EXEMPLO 5: Remover Dados do localStorage
// ============================================================================

export function RemoveDataExample() {
  const [data, setData] = useLocalStorage("temp-data", "valor temporário");
  const removeItem = useLocalStorageRemove();

  const handleClear = () => {
    removeItem("temp-data");
    // Após remover, o estado volta ao valor inicial no próximo render
  };

  return (
    <div>
      <p>Dados: {data}</p>
      <button onClick={() => setData("novo valor")}>Atualizar</button>
      <button onClick={handleClear}>Remover do localStorage</button>
    </div>
  );
}

// ============================================================================
// EXEMPLO 6: Com Debounce para Salvar Rascunho
// ============================================================================

export function DraftWithDebounceExample() {
  const [draft, setDraft] = useLocalStorage("article-draft", "");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

  const [localValue, setLocalValue] = useState(draft);

  // Simular debounce (em produção, use o hook useDebounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDraft(localValue);
      setIsSaving(false);
      setLastSavedTime(new Date());
    }, 1000);

    return () => clearTimeout(timer);
  }, [localValue, setDraft]);

  const handleChange = (value: string) => {
    setLocalValue(value);
    setIsSaving(true);
  };

  return (
    <div>
      <textarea
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Escreva seu artigo aqui..."
        style={{ width: "100%", minHeight: "200px" }}
      />
      <div>
        {isSaving ? (
          <p>Salvando...</p>
        ) : lastSavedTime ? (
          <p>Salvo em {lastSavedTime.toLocaleTimeString()}</p>
        ) : (
          <p>Não salvo</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLO 7: Preferências do Usuário com Valores Aninhados
// ============================================================================

interface AppSettings {
  ui: {
    theme: "light" | "dark";
    sidebarCollapsed: boolean;
    fontSize: number;
  };
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    profilePublic: boolean;
    showOnlineStatus: boolean;
  };
}

export function DeepSettingsExample() {
  const defaultSettings: AppSettings = {
    ui: { theme: "light", sidebarCollapsed: false, fontSize: 14 },
    notifications: { email: true, push: true, sms: false },
    privacy: { profilePublic: false, showOnlineStatus: true },
  };

  const [settings, setSettings] = useLocalStorage<AppSettings>(
    "app-settings",
    defaultSettings
  );

  const updateNestedSetting = <K extends keyof AppSettings>(
    section: K,
    key: keyof AppSettings[K],
    value: any
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  return (
    <div>
      <label>
        Tema:
        <select
          value={settings.ui.theme}
          onChange={(e) =>
            updateNestedSetting(
              "ui",
              "theme",
              e.target.value as "light" | "dark"
            )
          }
        >
          <option value="light">Claro</option>
          <option value="dark">Escuro</option>
        </select>
      </label>

      <label>
        <input
          type="checkbox"
          checked={settings.notifications.email}
          onChange={(e) =>
            updateNestedSetting("notifications", "email", e.target.checked)
          }
        />
        Notificações por Email
      </label>

      <label>
        Tamanho da Fonte:
        <input
          type="number"
          value={settings.ui.fontSize}
          onChange={(e) =>
            updateNestedSetting("ui", "fontSize", Number(e.target.value))
          }
        />
      </label>
    </div>
  );
}

// ============================================================================
// EXEMPLO 8: Sem Sincronização (Dados Locais apenas)
// ============================================================================

export function LocalOnlyDataExample() {
  // Este valor NÃO será sincronizado entre abas
  const [session, setSession] = useLocalStorage("session-id", "", {
    syncData: false, // Não sincronizar
  });

  return (
    <div>
      <p>ID da Sessão (não sincronizado):</p>
      <input
        value={session}
        onChange={(e) => setSession(e.target.value)}
        placeholder="Este valor não sincroniza entre abas"
      />
    </div>
  );
}
