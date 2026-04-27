import { StyleSheet, Text, View } from 'react-native';

export function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>주 활동 기록 그래프 및 한달 기록이 들어갈 자리입니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  text: { fontSize: 16, color: '#4B5563' }
});