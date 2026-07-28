import { Image, type ImageStyle, type StyleProp } from 'react-native';

import api from '@/services/api';

function resolvePhotoUri(photo: string | null | undefined): string | null {
  if (!photo) return null;
  if (photo.startsWith('data:') || photo.startsWith('http://') || photo.startsWith('https://')) {
    return photo;
  }
  if (photo.startsWith('/')) {
    return `${api.defaults.baseURL}${photo}`;
  }
  return photo;
}

type UserAvatarProps = {
  photo?: string | null;
  style: StyleProp<ImageStyle>;
};

export function UserAvatar({ photo, style }: UserAvatarProps) {
  const uri = resolvePhotoUri(photo);

  if (uri) {
    return <Image source={{ uri }} style={style} />;
  }

  return <Image source={undefined} style={style} />;
}
