# Hook `useLocalStorage`

Hook robusto e profissional para gerenciar estado sincronizado com localStorage em Next.js (Client Components).

## Características

✅ **SSR-Safe**: Funciona corretamente com Next.js e Server-Side Rendering  
✅ **Type-Safe**: Suporte completo a TypeScript com genéricos  
✅ **Error Handling**: Tratamento robusto de erros de serialização  
✅ **Multi-tab Sync**: Sincroniza dados entre abas/janelas automaticamente  
✅ **Custom Serializers**: Suporte a serializadores customizados  
✅ **Debouncing**: Integração fácil com debounce para economizar espaço  

## Instalação

Já está disponível em `@/hooks/use-local-storage`

## Uso Básico

```typescript
import { useLocalStorage } from "@/hooks/use-local-storage";

export function MyComponent() {
  // Uso simples - similar ao useState()
  const [name, setName] = useLocalStorage("user-name", "João");

  return (
    <input
      value={name}
      onChange={(e) => setName(e.target.value)}
      placeholder="Digite seu nome"
    />
  );
}
```

## Exemplos Avançados

### Com Tipagem Explícita

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

const [user, setUser] = useLocalStorage<User>("current-user", {
  id: "1",
  name: "João",
  email: "joao@example.com",
});
```

### Com Função de Atualização (como useState)

```typescript
const [count, setCount] = useLocalStorage("counter", 0);

// Atualizar com valor direto
setCount(10);

// Atualizar com função (acesso ao valor anterior)
setCount((prev) => prev + 1);
```

### Desabilitar Sincronização entre Abas

```typescript
const [draft, setDraft] = useLocalStorage("article-draft", "", {
  syncData: false, // Não sincroniza entre abas
});
```

### Com Serializador Customizado

```typescript
import dayjs from "dayjs";

const [date, setDate] = useLocalStorage(
  "selected-date",
  dayjs(),
  {
    serializer: (value) => value.toISOString(),
    deserializer: (value) => dayjs(value),
  }
);
```

## API Completa

### `useLocalStorage<T>(key, initialValue, options?)`

**Parâmetros:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `key` | `string` | Chave única no localStorage (obrigatório) |
| `initialValue` | `T` | Valor inicial se nenhum for encontrado |
| `options` | `UseLocalStorageOptions` | Configurações opcionais |

**Retorno:**

`[value, setValue]` - Assim como `useState`, com sincronização automática no localStorage

**Opções:**

```typescript
interface UseLocalStorageOptions {
  serializer?: (value: unknown) => string;      // JSON.stringify por padrão
  deserializer?: (value: string) => unknown;    // JSON.parse por padrão
  syncData?: boolean;                           // true por padrão (sincroniza entre abas)
}
```

---

### `useLocalStorageRemove()`

Remove um item do localStorage.

```typescript
const removeItem = useLocalStorageRemove();

// Remover um item
removeItem("user-name");
```

---

### `useLocalStorageClear()`

Limpa todo o localStorage.

```typescript
const clear = useLocalStorageClear();

// Limpar tudo
clear();
```

---

### `useLocalStorageMultiple<T>(keys, options?)`

Gerenciar múltiplos valores simultaneamente.

```typescript
const values = useLocalStorageMultiple(
  {
    name: "João",
    age: 25,
    theme: "dark",
  },
  { syncData: true }
);

const [name, setName] = values.name;
const [age, setAge] = values.age;
const [theme, setTheme] = values.theme;
```

## Correções Implementadas no ZapLink

### Antes (Problemas)

```typescript
// ❌ Múltiplos useEffect (ineficiente)
React.useEffect(() => {
  const saved = localStorage.getItem("key");
  if (saved) setState(JSON.parse(saved));
}, []);

React.useEffect(() => {
  localStorage.setItem("key", JSON.stringify(state));
}, [state]);

// ❌ Sem tratamento de SSR
const item = localStorage.getItem("key"); // ERRO em SSR
```

### Depois (Otimizado)

```typescript
// ✅ Tudo em um hook
const [state, setState] = useLocalStorage("key", initialValue);

// ✅ SSR-safe automático
// ✅ Sincronização entre abas
// ✅ Tratamento de erros robusto
```

## Boas Práticas

### 1. **Use nomes de chave únicos e descritivos**

```typescript
// ✅ Bom
useLocalStorage("zaplink-templates", [])
useLocalStorage("user-preferences", {})

// ❌ Evite
useLocalStorage("data", [])
useLocalStorage("x", {})
```

### 2. **Sempre forneça um valor inicial apropriado**

```typescript
// ✅ Bom
useLocalStorage<User[]>("users", [])

// ❌ Evitar null sem tratamento
useLocalStorage<User[]>("users", null as any)
```

### 3. **Combine com debounce para operações custosas**

```typescript
import { useDebounce } from "@/hooks/use-debounce";

const [text, setText] = useState("");
const debouncedText = useDebounce(text, 1000);

const [saved, setSaved] = useLocalStorage("draft", "");

useEffect(() => {
  setSaved(debouncedText);
}, [debouncedText]);
```

### 4. **Trate erros de quota de armazenamento**

```typescript
try {
  setSaved(largeData);
} catch (error) {
  console.error("localStorage cheio:", error);
  toast.error("Não há espaço suficiente para salvar");
}
```

## Compatibilidade

- ✅ Next.js 13+ (App Router)
- ✅ React 16.8+
- ✅ TypeScript 4.5+
- ✅ Todos os navegadores modernos
- ✅ SSR-safe (Chrome, Firefox, Safari, Edge)

## Performance

- **Sem overhead**: Usa `useState` internamente
- **Lazy initialization**: Carrega do localStorage apenas quando necessário
- **Otimizado**: Não dispara renders extras

## Troubleshooting

### "localStorage is not defined"

Isso significa que você está tentando usar em um Server Component. Solução:

```typescript
// ❌ Errado - Server Component
export default function Page() {
  const [value, setValue] = useLocalStorage("key", "");
  return <div>{value}</div>;
}

// ✅ Correto - Client Component
"use client";

export default function Page() {
  const [value, setValue] = useLocalStorage("key", "");
  return <div>{value}</div>;
}
```

### Dados não sincronizam entre abas

Certifique-se que `syncData: true` (padrão):

```typescript
const [value, setValue] = useLocalStorage("key", "", {
  syncData: true, // Importante!
});
```

### Erro ao deserializar

Se receber "Erro ao ler do localStorage", verifique se o formato salvo corresponde ao esperado:

```typescript
// Debugar
const item = localStorage.getItem("zaplink-templates");
console.log(item); // Ver o que está armazenado
```

## Referências

- [MDN: localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [MDN: StorageEvent](https://developer.mozilla.org/en-US/docs/Web/API/StorageEvent)
