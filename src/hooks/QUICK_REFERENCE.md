# ⚡ Quick Reference - useLocalStorage

## TL;DR

Use este hook como você usaria `useState`, mas com persistência automática no localStorage.

```typescript
import { useLocalStorage } from "@/hooks/use-local-storage";

// ✅ Simples como useState
const [name, setName] = useLocalStorage("user-name", "João");

// ✅ Com TypeScript
const [count, setCount] = useLocalStorage<number>("counter", 0);

// ✅ Com objetos
const [user, setUser] = useLocalStorage<User>("user", initialUser);
```

---

## Uso Básico

```typescript
"use client";

import { useLocalStorage } from "@/hooks/use-local-storage";

export function MyComponent() {
  const [value, setValue] = useLocalStorage("my-key", "default");
  
  return (
    <input 
      value={value} 
      onChange={(e) => setValue(e.target.value)} 
    />
  );
}
```

---

## Com Tipagem

```typescript
interface Settings {
  theme: "light" | "dark";
  fontSize: number;
}

const [settings, setSettings] = useLocalStorage<Settings>(
  "app-settings",
  { theme: "light", fontSize: 14 }
);
```

---

## Atualizar com Função

```typescript
// Atualizar direto
setCount(10);

// Atualizar com função (acesso ao valor anterior)
setCount((prev) => prev + 1);
```

---

## Opciones Avançadas

```typescript
useLocalStorage(
  "my-key",
  "default",
  {
    // Sincronizar entre abas (padrão: true)
    syncData: true,
    
    // Serializador customizado
    serializer: (value) => JSON.stringify(value),
    
    // Desserializador customizado
    deserializer: (value) => JSON.parse(value),
  }
);
```

---

## Remover Item

```typescript
const removeItem = useLocalStorageRemove();

removeItem("my-key");
```

---

## Exemplos Reais

### Formulário com Rascunho
```typescript
const [formData, setFormData] = useLocalStorage("form-draft", {
  name: "",
  email: "",
});
```

### Tema do Usuário
```typescript
const [theme, setTheme] = useLocalStorage<"light" | "dark">(
  "app-theme",
  "light"
);
```

### Lista de Tarefas
```typescript
const [todos, setTodos] = useLocalStorage<Todo[]>("todos", []);

// Adicionar
setTodos((prev) => [...prev, newTodo]);

// Remover
setTodos((prev) => prev.filter((t) => t.id !== id));
```

---

## Checklist

- ✅ Seu componente tem `"use client"` no topo?
- ✅ Você está usando `setValue`, não apenas `value`?
- ✅ Os dados aparecem após recarregar a página?
- ✅ Os dados sincronizam em outras abas?

---

## Erros Comuns

### ❌ Esqueceu de "use client"
```typescript
// ERRADO - vai dar erro em SSR
export function MyComponent() {
  const [value, setValue] = useLocalStorage("key", "");
  return <div>{value}</div>;
}

// CORRETO
"use client";
export function MyComponent() {
  const [value, setValue] = useLocalStorage("key", "");
  return <div>{value}</div>;
}
```

### ❌ Dados não salvam
```typescript
// ERRADO - não chama setValue
const [value, setValue] = useLocalStorage("key", "");
value = "novo"; // ❌ Não funciona!

// CORRETO
setValue("novo"); // ✅ Funciona!
```

---

## Performance

- ✅ Sem overhead
- ✅ Lazy loading
- ✅ Sem re-renders extras
- ✅ Otimizado para produção

---

## Documentação Completa

- **Docs:** `src/hooks/USE_LOCAL_STORAGE.md`
- **Exemplos:** `src/hooks/use-local-storage.examples.tsx`
- **Testes:** `src/hooks/use-local-storage.test.ts`
- **Código:** `src/hooks/use-local-storage.ts`

---

**Pronto para usar! 🚀**
