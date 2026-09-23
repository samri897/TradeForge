import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useScriptStore } from '../store/scriptStore';
import { SCRIPT_TEMPLATES, type TemplateKey } from '../constants/scriptTemplates';
import { colors, spacing, radius } from '../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface Props {
  navigation: NativeStackNavigationProp<Record<string, object | undefined>>;
}

export function ScriptsScreen({ navigation }: Props) {
  const scripts = useScriptStore((s) => s.scripts);
  const loadScript = useScriptStore((s) => s.loadScript);
  const loadTemplate = useScriptStore((s) => s.loadTemplate);
  const setShowEditor = useScriptStore((s) => s.setShowEditor);
  const deleteScript = useScriptStore((s) => s.deleteScript);

  const openEditor = () => {
    setShowEditor(true);
    navigation.navigate('Chart');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Scripts</Text>
        <TouchableOpacity style={styles.newBtn} onPress={openEditor}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>Templates</Text>
      <FlatList
        horizontal
        data={Object.keys(SCRIPT_TEMPLATES) as TemplateKey[]}
        keyExtractor={(k) => k}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          const t = SCRIPT_TEMPLATES[item];
          return (
            <TouchableOpacity
              style={styles.tplCard}
              onPress={() => {
                loadTemplate(item);
                openEditor();
              }}
            >
              <Text style={styles.tplName}>{t.name}</Text>
              <Text style={styles.tplDesc} numberOfLines={2}>
                {t.description}
              </Text>
            </TouchableOpacity>
          );
        }}
        style={{ flexGrow: 0, marginBottom: spacing.lg }}
      />

      <Text style={styles.section}>Saved ({scripts.length})</Text>
      <FlatList
        data={scripts}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        ListEmptyComponent={
          <Text style={styles.empty}>Save a script from the editor to see it here.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              loadScript(item.id);
              openEditor();
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowMeta}>
                {new Date(item.updatedAt).toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => void deleteScript(item.id)}
              hitSlop={8}
              style={{ padding: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.status.error} />
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { color: colors.text.primary, fontSize: 24, fontWeight: '700' },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent.blue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  section: {
    color: colors.text.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  tplCard: {
    width: 160,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  tplName: { color: colors.text.primary, fontWeight: '700', fontSize: 13, marginBottom: 4 },
  tplDesc: { color: colors.text.muted, fontSize: 11, lineHeight: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    marginBottom: spacing.sm,
  },
  rowTitle: { color: colors.text.primary, fontWeight: '600', fontSize: 14 },
  rowMeta: { color: colors.text.muted, fontSize: 11, marginTop: 2 },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 24 },
});

export default ScriptsScreen;
