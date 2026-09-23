import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useScriptStore } from '../../store/scriptStore';
import { useChartStore } from '../../store/chartStore';
import { SCRIPT_TEMPLATES, type TemplateKey } from '../../constants/scriptTemplates';
import { colors, spacing, radius, typography } from '../../theme';
import { alertService } from '../../services/alerts';

/**
 * Built-in script editor.
 *
 * Native: TextInput with mono font + line gutter (Monaco/CodeMirror are web-only;
 * for a full IDE experience on device, embed a WebView pointing at a local
 * CodeMirror bundle — see ScriptEditorWeb.tsx scaffold).
 *
 * Web: same component works; swap to Monaco via @monaco-editor/react when
 * targeting expo-web exclusively.
 */
interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ScriptEditor({ visible, onClose }: Props) {
  const draftSource = useScriptStore((s) => s.draftSource);
  const draftName = useScriptStore((s) => s.draftName);
  const setDraftSource = useScriptStore((s) => s.setDraftSource);
  const setDraftName = useScriptStore((s) => s.setDraftName);
  const loadTemplate = useScriptStore((s) => s.loadTemplate);
  const saveDraft = useScriptStore((s) => s.saveDraft);
  const runDraft = useScriptStore((s) => s.runDraft);
  const lastOutput = useScriptStore((s) => s.lastOutput);
  const isRunning = useScriptStore((s) => s.isRunning);
  const scripts = useScriptStore((s) => s.scripts);
  const loadScript = useScriptStore((s) => s.loadScript);

  const candles = useChartStore((s) => s.candles);
  const symbol = useChartStore((s) => s.symbol);
  const timeframe = useChartStore((s) => s.timeframe);
  const setScriptOutput = useChartStore((s) => s.setScriptOutput);

  const [tplOpen, setTplOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const lineCount = useMemo(() => draftSource.split('\n').length, [draftSource]);
  const gutter = useMemo(
    () =>
      Array.from({ length: lineCount }, (_, i) => String(i + 1)).join('\n'),
    [lineCount],
  );

  const handleRun = () => {
    const out = runDraft(candles, symbol, timeframe);
    setScriptOutput(out.plots, out.hlines, out.markers);
    if (out.errors.length) {
      setStatusMsg(`✗ ${out.errors[0].message}`);
    } else {
      setStatusMsg(
        `✓ ${out.plots.length} plots · ${out.markers.length} markers · ${out.alerts.length} alerts`,
      );
    }
  };

  const handleSave = async () => {
    const saved = await saveDraft();
    setStatusMsg(`Saved “${saved.name}”`);
  };

  const handleSaveAndAlert = async () => {
    const saved = await saveDraft();
    const out = runDraft(candles, symbol, timeframe);
    setScriptOutput(out.plots, out.hlines, out.markers);

    // Register each alertcondition as a live rule
    for (const a of out.alerts) {
      await alertService.addRule({
        name: a.expression,
        scriptId: saved.id,
        symbol,
        timeframe,
        condition: a.expression,
        message: a.message,
        channels: 'both',
        oncePerBar: a.oncePerBar,
      });
    }
    setStatusMsg(
      out.alerts.length
        ? `Saved + ${out.alerts.length} alert rule(s) armed`
        : `Saved “${saved.name}” (no alertconditions)`,
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
          <TextInput
            style={styles.nameInput}
            value={draftName}
            onChangeText={setDraftName}
            placeholder="Script name"
            placeholderTextColor={colors.text.muted}
          />
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.hdrBtn} onPress={() => setTplOpen(true)}>
              <Ionicons name="documents-outline" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.hdrBtn} onPress={() => setSavedOpen(true)}>
              <Ionicons name="folder-open-outline" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.hdrBtn} onPress={handleSave}>
              <Ionicons name="save-outline" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.runBtn, isRunning && { opacity: 0.6 }]}
              onPress={handleRun}
              disabled={isRunning}
            >
              <Ionicons name="play" size={16} color="#fff" />
              <Text style={styles.runText}>Run</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Editor body */}
        <View style={styles.editorBody}>
          <ScrollView
            style={styles.gutterScroll}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.gutter}>{gutter}</Text>
          </ScrollView>
          <TextInput
            style={styles.editor}
            value={draftSource}
            onChangeText={setDraftSource}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            textAlignVertical="top"
            placeholderTextColor={colors.text.muted}
            keyboardAppearance="dark"
          />
        </View>

        {/* Status / errors / logs */}
        <View style={styles.footer}>
          {statusMsg ? <Text style={styles.status}>{statusMsg}</Text> : null}
          {lastOutput?.errors.map((e, i) => (
            <Text key={`e${i}`} style={styles.err}>
              Line {e.line || '?'}: {e.message}
            </Text>
          ))}
          {lastOutput?.logs.slice(0, 5).map((l, i) => (
            <Text key={`l${i}`} style={styles.log}>
              {l}
            </Text>
          ))}
          <View style={styles.footerActions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleSaveAndAlert}>
              <Ionicons name="notifications-outline" size={16} color={colors.accent.blue} />
              <Text style={styles.secondaryBtnText}>Save + Arm Alerts</Text>
            </TouchableOpacity>
            <Text style={styles.meta}>
              {symbol} · {timeframe} · {candles.length} bars
            </Text>
          </View>
        </View>

        {/* Templates modal */}
        <Modal visible={tplOpen} transparent animationType="fade">
          <Pressable style={styles.overlay} onPress={() => setTplOpen(false)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Templates</Text>
              {(Object.keys(SCRIPT_TEMPLATES) as TemplateKey[]).map((key) => {
                const t = SCRIPT_TEMPLATES[key];
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.cardItem}
                    onPress={() => {
                      loadTemplate(key);
                      setTplOpen(false);
                      setStatusMsg(`Loaded template “${t.name}”`);
                    }}
                  >
                    <Text style={styles.cardItemTitle}>{t.name}</Text>
                    <Text style={styles.cardItemDesc}>{t.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Modal>

        {/* Saved scripts */}
        <Modal visible={savedOpen} transparent animationType="fade">
          <Pressable style={styles.overlay} onPress={() => setSavedOpen(false)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Saved Scripts</Text>
              {scripts.length === 0 ? (
                <Text style={styles.cardItemDesc}>No saved scripts yet.</Text>
              ) : (
                scripts.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.cardItem}
                    onPress={() => {
                      loadScript(s.id);
                      setSavedOpen(false);
                    }}
                  >
                    <Text style={styles.cardItemTitle}>{s.name}</Text>
                    <Text style={styles.cardItemDesc}>
                      Updated {new Date(s.updatedAt).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </Pressable>
        </Modal>
      </View>
    </Modal>
  );
}

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.editor.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
  },
  nameInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 6,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hdrBtn: { padding: 8 },
  runBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent.blue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  runText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  editorBody: { flex: 1, flexDirection: 'row' },
  gutterScroll: {
    width: 44,
    backgroundColor: '#181818',
    borderRightWidth: 1,
    borderRightColor: '#2A2A2A',
  },
  gutter: {
    color: colors.text.muted,
    fontFamily: mono,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
    paddingRight: 8,
    paddingTop: spacing.md,
  },
  editor: {
    flex: 1,
    color: colors.text.primary,
    fontFamily: mono,
    fontSize: 13,
    lineHeight: 20,
    padding: spacing.md,
    paddingTop: spacing.md,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    padding: spacing.md,
    gap: 4,
    maxHeight: 140,
  },
  status: { color: colors.status.success, fontSize: 12, fontFamily: mono },
  err: { color: colors.status.error, fontSize: 12, fontFamily: mono },
  log: { color: colors.text.muted, fontSize: 11, fontFamily: mono },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.accent,
  },
  secondaryBtnText: { color: colors.accent.blue, fontSize: 12, fontWeight: '600' },
  meta: { color: colors.text.muted, fontSize: 11 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cardTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  cardItem: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  cardItemTitle: { color: colors.text.primary, fontWeight: '600', fontSize: 14 },
  cardItemDesc: { color: colors.text.muted, fontSize: 12, marginTop: 2 },
});

export default ScriptEditor;
