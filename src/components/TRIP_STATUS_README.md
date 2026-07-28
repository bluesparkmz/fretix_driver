# Status de Viagem em Tempo Real - Documentação

## Visão Geral

O sistema de **Status em Tempo Real** permite que clientes e proprietários de empresas transportadoras acompanhem o status de suas cargas/viagens **em tempo real** através do WebSocket.

### Componentes Implementados

#### 1. **Hook: `useRealTimeLoadStatus()`**
   - Ativa o listener de eventos de status via WebSocket
   - Atualiza automaticamente as listas quando o status muda
   - Deve ser chamado no componente raiz ou tela de visualização

**Uso:**
```tsx
import { useRealTimeLoadStatus } from '@/hooks/useRealTimeLoadStatus';

export function MyScreen() {
  // Ativa listener em tempo real
  useRealTimeLoadStatus();
  
  return <View>{/* seu conteúdo */}</View>;
}
```

#### 2. **Componente: `TripStatusIndicator`**
   - Exibe o status atual da viagem com ícone, cor e rótulo
   - Suporta diferentes tamanhos (small, medium, large)
   - Pode mostrar barra de progresso
   - Modo compacto para listas

**Uso Básico:**
```tsx
import { TripStatusIndicator, type LoadStatusType } from '@/components/trip-status-indicator';

<TripStatusIndicator 
  status="em_viagem" as LoadStatusType
  size="medium"
  showProgress={true}
/>
```

**Props:**
- `status`: LoadStatusType - Status da viagem
- `size`: 'small' | 'medium' | 'large' - Tamanho do indicador
- `showProgress`: boolean - Mostrar barra de progresso (padrão: false)
- `compact`: boolean - Modo compacto para listas (padrão: false)

#### 3. **Componente: `TripStatusBadge`**
   - Badge compacto para usar em listas
   - Ideal para tabelas e cards

**Uso:**
```tsx
<TripStatusBadge status="disponivel" />
```

#### 4. **Componente: `TripTimeline`**
   - Timeline visual com 3 passos: Coleta → Em Trânsito → Entregue
   - Mostra progresso da viagem

**Uso:**
```tsx
<TripTimeline 
  status="em_viagem"
  currentStep="in_transit"
/>
```

---

## Status Suportados

```typescript
type LoadStatusType = 
  | 'disponivel'    // Verde - Aguardando aceite
  | 'em_andamento'  // Laranja - Aguardando início
  | 'em_viagem'     // Azul - Em trânsito
  | 'concluido'     // Verde - Entregue
  | 'cancelado'     // Vermelho - Cancelada
```

---

## Integração em Telas

### Exemplo 1: Tela de Minhas Cargas (Cliente)

```tsx
import { useRealTimeLoadStatus } from '@/hooks/useRealTimeLoadStatus';
import { TripStatusIndicator, type LoadStatusType } from '@/components/trip-status-indicator';

export default function MyLoadsScreen() {
  // Ativa escuta de eventos em tempo real
  useRealTimeLoadStatus();
  
  const { myLoads } = useAppData();

  return (
    <ScrollView>
      {myLoads.data.map((load) => (
        <View key={load.id} style={styles.card}>
          {/* Status em tempo real */}
          <TripStatusIndicator 
            status={load.status as LoadStatusType}
            size="small"
            compact={true}
          />
          <Text>{load.load_name}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
```

### Exemplo 2: Tela de Detalhes da Carga

```tsx
export function CargoDetailsScreen() {
  useRealTimeLoadStatus();
  
  const [cargo, setCargo] = useState<LoadDetail | null>(null);

  return (
    <View>
      {/* Status com progresso */}
      <TripStatusIndicator 
        status={cargo?.status as LoadStatusType}
        size="large"
        showProgress={true}
      />
      
      {/* Timeline visual */}
      {cargo?.status === 'em_viagem' && (
        <TripTimeline 
          status={cargo.status as LoadStatusType}
          currentStep="in_transit"
        />
      )}
      
      <Text>{cargo?.load_name}</Text>
    </View>
  );
}
```

### Exemplo 3: Marketplace (Loads disponíveis)

```tsx
export default function LoadsScreen() {
  // Ativa escuta de eventos em tempo real
  useRealTimeLoadStatus();
  
  const [availableLoads, setAvailableLoads] = useState<Load[]>([]);

  return (
    <ScrollView>
      {availableLoads.map((load) => (
        <Pressable key={load.id} style={styles.card}>
          <TripStatusBadge status={load.status as LoadStatusType} />
          <Text>{load.load_name}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
```

---

## Fluxo de Atualização em Tempo Real

```
Backend (motorista envia status)
    ↓
WebSocket Event: trip.status_changed
    ↓
WebSocketDataBridge (ouve evento)
    ↓
Chama refreshMyLoads() e refreshMarketplace()
    ↓
AppDataContext (atualiza estado)
    ↓
Componentes renderizam novo status
```

---

## Eventos WebSocket Ouvidos

### Events Automáticos (Integrados no WebSocketDataBridge)

- **trip.status_changed**: Status da viagem mudou
- **trip.location**: Localização do motorista atualizada

Esses eventos automaticamente disparam:
- `refreshMyLoads()` - Atualiza cargas do usuário
- `refreshMarketplace()` - Atualiza marketplace

### Events Manualmente Rastreáveis

Se precisar reagir a eventos específicos:

```tsx
import { useWebSocket } from '@/context/WebSocketContext';

export function MyComponent() {
  const { addListenerForTypes } = useWebSocket();

  useEffect(() => {
    const unsubscribe = addListenerForTypes('trip.status_changed', (event) => {
      console.log('Trip status changed:', event);
      // Seu código aqui
    });

    return unsubscribe;
  }, [addListenerForTypes]);

  return <View>{/* ... */}</View>;
}
```

---

## Styling Customizado

Os componentes usam cores predefinidas, mas você pode criar variantes:

```tsx
// Cores padrão por status
const STATUS_CONFIG: Record<LoadStatusType, StatusConfig> = {
  disponivel: {
    label: 'Disponível',
    color: '#10B981',           // Verde
    backgroundColor: '#D1FAE5', // Verde claro
    icon: 'checkmark-circle-outline',
  },
  em_andamento: {
    label: 'Aguardando',
    color: '#F59E0B',           // Laranja
    backgroundColor: '#FEF3C7', // Laranja claro
    icon: 'hourglass-outline',
    progressPercentage: 25,
  },
  // ... outros status
};
```

---

## Notas Importantes

1. **WebSocket Ativo**: O sistema requer conexão WebSocket ativa. Verificar `useWebSocket().isConnected`

2. **Perfil do Usuário**: Motoristas veem outro app separado. Este sistema é apenas para **clientes** e **empresas transportadoras**

3. **Performance**: As atualizações são automáticas via WebSocket. Não há polling manual.

4. **Reconexão**: Se a conexão cair, o WebSocket se reconecta automaticamente com backoff exponencial.

5. **Permissões**: O backend valida o token JWT e certifica que o usuário tem acesso aos dados.

---

## Troubleshooting

### Status não atualiza em tempo real
- Verificar se `useRealTimeLoadStatus()` está sendo chamado
- Validar que WebSocket está conectado: `useWebSocket().isConnected`
- Verificar console para erros

### Status mostra valor errado
- Fazer refresh manual (pull-to-refresh)
- Verificar se o backend está enviando status correto

### Performance lenta
- Usar `TripStatusBadge` (mais leve) em listas
- Evitar re-renders desnecessários com `useMemo()`

---

## Arquivos Relacionados

- `src/hooks/useRealTimeLoadStatus.ts` - Hook de listener
- `src/components/trip-status-indicator.tsx` - Componentes visuais
- `src/components/websocket-data-bridge.tsx` - Bridge de dados WebSocket
- `src/context/WebSocketContext.tsx` - Gerenciador de WebSocket
- `src/app/my_loads.tsx` - Integração em telas
- `src/app/loads.tsx` - Integração no marketplace
