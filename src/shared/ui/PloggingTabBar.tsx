import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function PloggingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.tabBar, 
      // Android와 iOS의 Safe Area를 동적으로 계산하여 하단 여백 확보
      { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 16) : insets.bottom }
    ]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // 라우트 이름에 따른 아이콘 매핑
        let iconName: any = 'home';
        if (route.name === 'history') iconName = 'bar-chart';
        else if (route.name === 'index') iconName = 'home';
        else if (route.name === 'profile') iconName = 'person';

        return (
          <TouchableOpacity
            key={index}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.tabItem}
          >
            <Ionicons 
              name={isFocused ? iconName : `${iconName}-outline`} 
              size={28} 
              color={isFocused ? '#3B82F6' : '#9CA3AF'} // 활성화 시 파란색, 비활성화 시 회색
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
});