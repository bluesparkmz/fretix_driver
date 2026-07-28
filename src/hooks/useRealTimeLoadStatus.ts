import { useEffect } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { useWebSocket } from '@/context/WebSocketContext';

/**
 * Hook que ouve mudanças de status de viagem em tempo real
 * Atualiza automaticamente as listas de cargas quando o status muda
 *
 * Eventos ouvidos:
 * - trip.status_changed: quando o status da viagem muda
 * - trip.location: quando a localização é atualizada
 */
export function useRealTimeLoadStatus() {
    const { addListenerForTypes } = useWebSocket();
    const { refreshMyLoads, refreshMarketplace } = useAppData();

    useEffect(() => {
        // Ouve mudanças de status de viagem
        const unsubscribeStatus = addListenerForTypes('trip.status_changed', (event) => {
            console.log('Trip status changed:', event);
            // Atualiza ambas as listas quando status muda
            void refreshMyLoads();
            void refreshMarketplace();
        });

        // Ouve atualizações de localização (motorista enviando GPS)
        const unsubscribeLocation = addListenerForTypes('trip.location', (event) => {
            console.log('Trip location updated:', event);
            // Apenas atualiza para não sobrecarregar com refresh constante
            // Se precisar de dados de localização, handle específico aqui
        });

        return () => {
            unsubscribeStatus();
            unsubscribeLocation();
        };
    }, [addListenerForTypes, refreshMyLoads, refreshMarketplace]);
}
