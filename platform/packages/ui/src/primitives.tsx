// Primitivas de layout construidas sobre @tamagui/core. Mantem o `ui`
// leve (sem o pacote umbrella) e funciona em web e nativo.

import { styled, View, Text } from '@tamagui/core';

export const YStack = styled(View, {
  flexDirection: 'column',
});

export const XStack = styled(View, {
  flexDirection: 'row',
});

export const Card = styled(View, {
  backgroundColor: '$cardBg',
  borderRadius: '$5',
  padding: '$4',
});

export const Heading = styled(Text, {
  fontFamily: '$heading',
  color: '$text',
  fontWeight: '800',
});

export const Body = styled(Text, {
  fontFamily: '$body',
  color: '$text',
});

export { View, Text };
