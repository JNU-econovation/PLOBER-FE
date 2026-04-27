import { NaverMapView } from '@mj-studio/react-native-naver-map';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // 자유모드 vs AI 경로추천 상태 관리
  const [mode, setMode] = useState<'FREE' | 'AI'>('FREE');

  return (
    <View style={styles.container}>
      {/* 1. 배경 지도 */}
      {/* 스마트 플로깅 앱의 핵심이므로 지도가 전체 화면을 차지하도록 설정 */}
      <NaverMapView 
        style={StyleSheet.absoluteFillObject} 
        isShowLocationButton={false} // 커스텀 UI를 얹기 위해 기본 버튼은 숨김 처리
      />

      {/* 2. 상단 모드 전환 토글 (Safe Area 고려하여 노치 아래에 배치) */}
      <View style={[styles.topToggleContainer, { top: insets.top + 16 }]}>
        <View style={styles.toggleWrapper}>
          <TouchableOpacity 
            style={[styles.toggleButton, mode === 'FREE' && styles.activeToggle]}
            onPress={() => setMode('FREE')}
          >
            <Text style={mode === 'FREE' ? styles.activeText : styles.inactiveText}>자유모드</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleButton, mode === 'AI' && styles.activeToggle]}
            onPress={() => setMode('AI')}
          >
            <Text style={mode === 'AI' ? styles.activeText : styles.inactiveText}>AI 경로추천</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. 우측 플로팅 버튼들 (임시 이모지 사용) */}
      <View style={[styles.rightFloatingContainer, { top: insets.top + 80 }]}>
         <TouchableOpacity style={styles.circleButton}>
            <Text style={styles.iconText}>☀️</Text>
         </TouchableOpacity>
         <TouchableOpacity style={styles.circleButton}>
            <Text style={styles.iconText}>🗑️</Text>
         </TouchableOpacity>
         {/* 내 위치 버튼 등 추가 가능 */}
      </View>

      {/* 4. 하단 액션 영역 (시작 버튼 및 제보 버튼) */}
      <View style={styles.bottomContainer}>
        {/* 중앙 시작 버튼 */}
        <TouchableOpacity 
          style={styles.startButton}
          onPress={() => router.push('/plogging')} // 진행(Active) 화면으로 이동
        >
          <Text style={styles.startButtonText}>시작</Text>
        </TouchableOpacity>

        {/* 우측 하단 쓰레기 제보 버튼 */}
        <TouchableOpacity style={styles.reportButton}>
          <Text style={styles.reportSmallText}>쓰레기 제보</Text>
          <View style={styles.cameraIconPlaceholder}>
            <Text style={styles.iconText}>📷</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  topToggleContainer: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  activeToggle: {
    backgroundColor: '#F3F4F6',
  },
  activeText: {
    fontWeight: '600',
    color: '#111827',
  },
  inactiveText: {
    color: '#6B7280',
  },
  rightFloatingContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    gap: 12,
  },
  circleButton: {
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconText: {
    fontSize: 20,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  startButton: {
    width: 100,
    height: 100,
    backgroundColor: '#3DA2D5', // 피그마 메인 블루 컬러 유사값
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3DA2D5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  reportButton: {
    position: 'absolute',
    right: 20,
    bottom: 0,
    alignItems: 'center',
  },
  reportSmallText: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 4,
    fontWeight: '600',
  },
  cameraIconPlaceholder: {
    width: 50,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});