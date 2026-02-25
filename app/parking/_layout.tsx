import { Stack } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function ParkingLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.white },
        headerTintColor: Colors.primary,
        headerTitleStyle: { fontWeight: '700', color: Colors.text },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="start"
        options={{ title: 'Parcheggia' }}
      />
      <Stack.Screen
        name="confirm"
        options={{
          title: 'Riepilogo',
          headerBackTitle: 'Indietro',
        }}
      />
      <Stack.Screen
        name="extend"
        options={{
          title: 'Modifica durata',
          headerBackTitle: 'Indietro',
        }}
      />
      <Stack.Screen
        name="active"
        options={{
          title: 'Parcheggio attivo',
          headerBackTitle: 'Indietro',
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
