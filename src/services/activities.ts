import api from '@/services/api';

export interface Activity {
  id: string;
  route: string;
  cargo: string;
  status: string;
  statusColor: string;
  iconColor: string;
  time: string;
}

export interface ActivityApiResponse {
  load_id: number;
  code: string;
  origin: string;
  destination: string;
  weight: number;
  weight_unit: string;
  load_type: string;
  display_status: string;
  activity_at: string;
}

const getCargoTypeName = (type: string) => {
  const map: Record<string, string> = {
    areia: 'Areia',
    cimento: 'Cimento',
    cascalho: 'Cascalho',
    combustivel: 'Combustível',
    ferro: 'Ferro',
    madeira: 'Madeira',
    graos: 'Grãos',
    mercadoria_geral: 'Mercadoria Geral',
  };
  return map[type] || type;
};

const getStatusColors = (status: string) => {
  switch (status) {
    case 'em_andamento':
      return { statusColor: '#22C55E', iconColor: '#22C55E' };
    case 'em_negociacao':
      return { statusColor: '#3B82F6', iconColor: '#3B82F6' };
    case 'concluida':
    case 'concluído':
      return { statusColor: '#8D949E', iconColor: '#8D949E' };
    case 'disponivel':
      return { statusColor: '#FFC107', iconColor: '#FFC107' };
    default:
      return { statusColor: '#8D949E', iconColor: '#8D949E' };
  }
};

const formatActivityTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `Hoje, ${hours}:${minutes}`;
    } else if (diffDays === 1) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `Ontem, ${hours}:${minutes}`;
    } else {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch (e) {
    return dateString;
  }
};

export const mapActivities = (data: ActivityApiResponse[]): Activity[] => {
  return data.map((item) => {
    const colors = getStatusColors(item.display_status);
    return {
      id: item.code,
      route: `${item.origin} -> ${item.destination}`,
      cargo: `${item.weight} ${item.weight_unit} · ${getCargoTypeName(item.load_type)}`,
      status: item.display_status === 'em_andamento' ? 'Em andamento' :
              item.display_status === 'em_negociacao' ? 'Em negociação' :
              item.display_status === 'concluida' ? 'Concluída' :
              item.display_status === 'disponivel' ? 'Disponível' :
              item.display_status,
      statusColor: colors.statusColor,
      iconColor: colors.iconColor,
      time: formatActivityTime(item.activity_at),
    };
  });
};

export const activityService = {
  async getMyActivities(limit: number = 20): Promise<ActivityApiResponse[]> {
    const response = await api.get('/clients/me/activities', { params: { limit } });
    return response.data;
  },
};
